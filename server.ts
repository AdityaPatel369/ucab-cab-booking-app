import express from "express";
import { createServer as createViteServer } from "vite";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import Database from "better-sqlite3";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const JWT_SECRET = process.env.JWT_SECRET || "ucab-secret-key";
const db = new Database("ucab.db");

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE,
    password TEXT,
    name TEXT,
    phone TEXT,
    role TEXT DEFAULT 'user'
  );

  CREATE TABLE IF NOT EXISTS drivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    vehicle_type TEXT,
    vehicle_number TEXT,
    status TEXT DEFAULT 'available',
    lat REAL,
    lng REAL,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS rides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    driver_id INTEGER,
    pickup_address TEXT,
    dropoff_address TEXT,
    pickup_lat REAL,
    pickup_lng REAL,
    dropoff_lat REAL,
    dropoff_lng REAL,
    status TEXT DEFAULT 'pending',
    fare REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(driver_id) REFERENCES drivers(id)
  );
`);

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server });

  app.use(express.json());

  // WebSocket handling
  const clients = new Map<number, WebSocket>(); // userId -> socket

  wss.on("connection", (ws, req) => {
    let currentUserId: number | null = null;

    ws.on("message", (message) => {
      try {
        const data = JSON.parse(message.toString());
        if (data.type === "auth") {
          const token = data.token;
          const decoded = jwt.verify(token, JWT_SECRET) as any;
          currentUserId = decoded.id;
          if (currentUserId) clients.set(currentUserId, ws);
        }

        if (data.type === "location_update" && currentUserId) {
          // Update driver location
          const { lat, lng } = data;
          db.prepare("UPDATE drivers SET lat = ?, lng = ? WHERE user_id = ?").run(lat, lng, currentUserId);
          
          // Broadcast to relevant users (e.g., user who booked this driver)
          const ride = db.prepare("SELECT user_id FROM rides WHERE driver_id = (SELECT id FROM drivers WHERE user_id = ?) AND status IN ('accepted', 'ongoing')").get(currentUserId) as any;
          if (ride && clients.has(ride.user_id)) {
            clients.get(ride.user_id)?.send(JSON.stringify({ type: "driver_location", lat, lng }));
          }
        }
      } catch (e) {
        console.error("WS Error:", e);
      }
    });

    ws.on("close", () => {
      if (currentUserId) clients.delete(currentUserId);
    });
  });

  // Auth Routes
  app.post("/api/auth/register", (req, res) => {
    const { email, password, name, phone, role, vehicle_type, vehicle_number } = req.body;
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      const result = db.prepare("INSERT INTO users (email, password, name, phone, role) VALUES (?, ?, ?, ?, ?)").run(email, hashedPassword, name, phone, role);
      const userId = result.lastInsertRowid as number;

      if (role === "driver") {
        db.prepare("INSERT INTO drivers (user_id, vehicle_type, vehicle_number) VALUES (?, ?, ?)").run(userId, vehicle_type, vehicle_number);
      }

      const token = jwt.sign({ id: userId, role }, JWT_SECRET);
      res.json({ token, user: { id: userId, email, name, role } });
    } catch (e) {
      res.status(400).json({ error: "User already exists or invalid data" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email) as any;
    if (user && bcrypt.compareSync(password, user.password)) {
      const token = jwt.sign({ id: user.id, role: user.role }, JWT_SECRET);
      res.json({ token, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // Ride Routes
  app.post("/api/rides/book", (req, res) => {
    const { userId, pickup, dropoff, fare } = req.body;
    const result = db.prepare("INSERT INTO rides (user_id, pickup_address, dropoff_address, fare) VALUES (?, ?, ?, ?)").run(userId, pickup, dropoff, fare);
    const rideId = result.lastInsertRowid;
    
    // Notify nearby drivers (simplified: notify all available drivers)
    const availableDrivers = db.prepare("SELECT user_id FROM drivers WHERE status = 'available'").all() as any[];
    availableDrivers.forEach(d => {
      if (clients.has(d.user_id)) {
        clients.get(d.user_id)?.send(JSON.stringify({ type: "new_ride_request", rideId, pickup, dropoff, fare }));
      }
    });

    res.json({ rideId });
  });

  app.post("/api/rides/accept", (req, res) => {
    const { rideId, driverUserId } = req.body;
    const driver = db.prepare("SELECT id FROM drivers WHERE user_id = ?").get(driverUserId) as any;
    if (!driver) return res.status(404).json({ error: "Driver not found" });

    db.prepare("UPDATE rides SET driver_id = ?, status = 'accepted' WHERE id = ?").run(driver.id, rideId);
    db.prepare("UPDATE drivers SET status = 'busy' WHERE id = ?").run(driver.id);

    const ride = db.prepare("SELECT user_id FROM rides WHERE id = ?").get(rideId) as any;
    if (ride && clients.has(ride.user_id)) {
      clients.get(ride.user_id)?.send(JSON.stringify({ type: "ride_accepted", rideId, driverId: driver.id }));
    }

    res.json({ success: true });
  });

  app.get("/api/rides/history/:userId", (req, res) => {
    const rides = db.prepare("SELECT * FROM rides WHERE user_id = ? ORDER BY created_at DESC").all(req.params.userId);
    res.json(rides);
  });

  app.get("/api/drivers/nearby", (req, res) => {
    const drivers = db.prepare("SELECT * FROM drivers WHERE status = 'available'").all();
    res.json(drivers);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  const PORT = 3000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
