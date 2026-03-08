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
    role TEXT DEFAULT 'user',
    home_address TEXT,
    work_address TEXT
  );

  CREATE TABLE IF NOT EXISTS drivers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    vehicle_type TEXT,
    vehicle_number TEXT,
    car_image TEXT,
    status TEXT DEFAULT 'available',
    lat REAL,
    lng REAL,
    rating REAL DEFAULT 5.0,
    total_ratings INTEGER DEFAULT 0,
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
    discount REAL DEFAULT 0,
    donation REAL DEFAULT 0,
    refreshments TEXT,
    payment_method TEXT,
    rating INTEGER,
    review TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    FOREIGN KEY(driver_id) REFERENCES drivers(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ride_id INTEGER,
    sender_id INTEGER,
    text TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(ride_id) REFERENCES rides(id),
    FOREIGN KEY(sender_id) REFERENCES users(id)
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

        if (data.type === "chat_message" && currentUserId) {
          const { rideId, text, receiverId } = data;
          db.prepare("INSERT INTO messages (ride_id, sender_id, text) VALUES (?, ?, ?)").run(rideId, currentUserId, text);
          
          if (clients.has(receiverId)) {
            clients.get(receiverId)?.send(JSON.stringify({
              type: "new_chat_message",
              rideId,
              senderId: currentUserId,
              text,
              timestamp: new Date().toISOString()
            }));
          }
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
    const { email, password, name, phone, role, vehicle_type, vehicle_number, car_image } = req.body;
    try {
      const hashedPassword = bcrypt.hashSync(password, 10);
      const result = db.prepare("INSERT INTO users (email, password, name, phone, role) VALUES (?, ?, ?, ?, ?)").run(email, hashedPassword, name, phone, role);
      const userId = result.lastInsertRowid as number;

      if (role === "driver") {
        db.prepare("INSERT INTO drivers (user_id, vehicle_type, vehicle_number, car_image, lat, lng) VALUES (?, ?, ?, ?, ?, ?)").run(
          userId, 
          vehicle_type, 
          vehicle_number,
          car_image || `https://picsum.photos/seed/car${userId}/400/300`,
          12.9716 + (Math.random() - 0.5) * 0.05,
          77.5946 + (Math.random() - 0.5) * 0.05
        );
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
      let userData = { id: user.id, email: user.email, name: user.name, role: user.role, home_address: user.home_address, work_address: user.work_address, phone: user.phone };
      
      if (user.role === "driver") {
        const driver = db.prepare("SELECT rating, total_ratings FROM drivers WHERE user_id = ?").get(user.id) as any;
        if (driver) {
          userData = { ...userData, ...driver };
        }
      }
      
      res.json({ token, user: userData });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  app.post("/api/user/profile", (req, res) => {
    const { userId, name, phone, home_address, work_address } = req.body;
    db.prepare("UPDATE users SET name = ?, phone = ?, home_address = ?, work_address = ? WHERE id = ?").run(name, phone, home_address, work_address, userId);
    res.json({ success: true });
  });

  app.post("/api/drivers/vehicle", (req, res) => {
    const { userId, vehicle_type, vehicle_number, car_image } = req.body;
    db.prepare("UPDATE drivers SET vehicle_type = ?, vehicle_number = ?, car_image = ? WHERE user_id = ?").run(vehicle_type, vehicle_number, car_image, userId);
    res.json({ success: true });
  });

  app.post("/api/rides/rate", (req, res) => {
    const { rideId, rating, review } = req.body;
    db.prepare("UPDATE rides SET rating = ?, review = ? WHERE id = ?").run(rating, review, rideId);
    
    // Update driver's average rating
    const ride = db.prepare("SELECT driver_id FROM rides WHERE id = ?").get(rideId) as any;
    if (ride && ride.driver_id) {
      const driver = db.prepare("SELECT rating, total_ratings FROM drivers WHERE id = ?").get(ride.driver_id) as any;
      const newTotal = (driver.total_ratings || 0) + 1;
      const newRating = ((driver.rating * (newTotal - 1)) + rating) / newTotal;
      db.prepare("UPDATE drivers SET rating = ?, total_ratings = ? WHERE id = ?").run(newRating, newTotal, ride.driver_id);
    }
    res.json({ success: true });
  });

  app.post("/api/support/chat", async (req, res) => {
    const { message } = req.body;
    try {
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: message,
        config: {
          systemInstruction: "You are Ucab Support, a friendly AI assistant for a cab booking app. Help users with booking, fares, safety, and app features. Keep responses concise and helpful.",
        }
      });
      res.json({ reply: response.text });
    } catch (e) {
      res.status(500).json({ error: "AI Support unavailable" });
    }
  });

  // Ride Routes
  app.post("/api/rides/book", (req, res) => {
    const { userId, pickup, dropoff, fare, discount, donation, refreshments, paymentMethod } = req.body;
    const result = db.prepare("INSERT INTO rides (user_id, pickup_address, dropoff_address, fare, discount, donation, refreshments, payment_method) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(userId, pickup, dropoff, fare, discount || 0, donation || 0, JSON.stringify(refreshments || []), paymentMethod || 'cash');
    const rideId = result.lastInsertRowid;
    
    // Notify nearby drivers (simplified: notify all available drivers)
    const availableDrivers = db.prepare("SELECT user_id FROM drivers WHERE status = 'available'").all() as any[];
    availableDrivers.forEach(d => {
      if (clients.has(d.user_id)) {
        clients.get(d.user_id)?.send(JSON.stringify({ type: "new_ride_request", rideId, pickup, dropoff, fare, refreshments }));
      }
    });

    res.json({ rideId });
  });

  app.post("/api/drivers/status", (req, res) => {
    const { userId, status } = req.body;
    db.prepare("UPDATE drivers SET status = ? WHERE user_id = ?").run(status, userId);
    res.json({ success: true });
  });

  app.post("/api/rides/cancel", (req, res) => {
    const { rideId } = req.body;
    db.prepare("UPDATE rides SET status = 'cancelled' WHERE id = ?").get(rideId);
    
    const ride = db.prepare("SELECT user_id, driver_id FROM rides WHERE id = ?").get(rideId) as any;
    if (ride) {
      if (clients.has(ride.user_id)) {
        clients.get(ride.user_id)?.send(JSON.stringify({ type: "ride_cancelled", rideId }));
      }
      if (ride.driver_id) {
        const driver = db.prepare("SELECT user_id FROM drivers WHERE id = ?").get(ride.driver_id) as any;
        if (driver && clients.has(driver.user_id)) {
          clients.get(driver.user_id)?.send(JSON.stringify({ type: "ride_cancelled", rideId }));
          db.prepare("UPDATE drivers SET status = 'available' WHERE id = ?").run(ride.driver_id);
        }
      }
    }
    res.json({ success: true });
  });

  app.post("/api/rides/start", (req, res) => {
    const { rideId } = req.body;
    db.prepare("UPDATE rides SET status = 'ongoing' WHERE id = ?").run(rideId);
    
    const ride = db.prepare("SELECT user_id FROM rides WHERE id = ?").get(rideId) as any;
    if (ride && clients.has(ride.user_id)) {
      clients.get(ride.user_id)?.send(JSON.stringify({ type: "ride_started", rideId }));
    }
    res.json({ success: true });
  });

  app.post("/api/rides/complete", (req, res) => {
    const { rideId, driverUserId } = req.body;
    db.prepare("UPDATE rides SET status = 'completed' WHERE id = ?").run(rideId);
    db.prepare("UPDATE drivers SET status = 'available' WHERE user_id = ?").run(driverUserId);
    
    const ride = db.prepare("SELECT user_id FROM rides WHERE id = ?").get(rideId) as any;
    if (ride && clients.has(ride.user_id)) {
      clients.get(ride.user_id)?.send(JSON.stringify({ type: "ride_completed", rideId }));
    }
    res.json({ success: true });
  });

  app.post("/api/rides/accept", (req, res) => {
    const { rideId, driverUserId } = req.body;
    const driver = db.prepare("SELECT d.*, u.name as driver_name FROM drivers d JOIN users u ON d.user_id = u.id WHERE d.user_id = ?").get(driverUserId) as any;
    if (!driver) return res.status(404).json({ error: "Driver not found" });

    db.prepare("UPDATE rides SET driver_id = ?, status = 'accepted' WHERE id = ?").run(driver.id, rideId);
    db.prepare("UPDATE drivers SET status = 'busy' WHERE id = ?").run(driver.id);

    const ride = db.prepare("SELECT user_id FROM rides WHERE id = ?").get(rideId) as any;
    if (ride && clients.has(ride.user_id)) {
      clients.get(ride.user_id)?.send(JSON.stringify({ 
        type: "ride_accepted", 
        rideId, 
        driver: {
          id: driver.id,
          name: driver.driver_name,
          vehicle: driver.vehicle_type,
          plate: driver.vehicle_number
        }
      }));
    }

    res.json({ success: true });
  });

  app.get("/api/rides/history/:userId", (req, res) => {
    const rides = db.prepare(`
      SELECT r.*, u.name as driver_name, d.vehicle_type, d.vehicle_number 
      FROM rides r 
      LEFT JOIN drivers d ON r.driver_id = d.id 
      LEFT JOIN users u ON d.user_id = u.id 
      WHERE r.user_id = ? 
      ORDER BY r.created_at DESC
    `).all(req.params.userId) as any[];
    
    // Format to match the frontend expectations
    const formattedRides = rides.map(r => ({
      ...r,
      driver: r.driver_id ? {
        name: r.driver_name,
        vehicle: r.vehicle_type,
        plate: r.vehicle_number
      } : null
    }));
    
    res.json(formattedRides);
  });

  app.get("/api/rides/pending", (req, res) => {
    const rides = db.prepare("SELECT * FROM rides WHERE status = 'pending' ORDER BY created_at DESC").all();
    res.json(rides);
  });

  app.get("/api/drivers/nearby", (req, res) => {
    const drivers = db.prepare("SELECT d.*, u.name FROM drivers d JOIN users u ON d.user_id = u.id WHERE d.status = 'available'").all();
    res.json(drivers);
  });

  app.get("/api/drivers/:driverUserId/reviews", (req, res) => {
    const reviews = db.prepare(`
      SELECT r.rating, r.review, r.created_at, u.name as user_name, u.id as user_id
      FROM rides r
      JOIN users u ON r.user_id = u.id
      WHERE r.driver_id = (SELECT id FROM drivers WHERE user_id = ?) AND r.rating IS NOT NULL
      ORDER BY r.created_at DESC
    `).all(req.params.driverUserId);
    res.json(reviews);
  });

  app.get("/api/rides/:rideId/messages", (req, res) => {
    const messages = db.prepare("SELECT * FROM messages WHERE ride_id = ? ORDER BY timestamp ASC").all(req.params.rideId);
    res.json(messages);
  });

  // Admin Routes
  app.get("/api/admin/stats", (req, res) => {
    const totalUsers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'user'").get() as any;
    const totalDrivers = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'driver'").get() as any;
    const totalRides = db.prepare("SELECT COUNT(*) as count FROM rides").get() as any;
    const totalEarnings = db.prepare("SELECT SUM(fare) as total FROM rides WHERE status = 'completed'").get() as any;
    const recentRides = db.prepare(`
      SELECT r.*, u.name as rider_name, d_u.name as driver_name 
      FROM rides r 
      JOIN users u ON r.user_id = u.id 
      LEFT JOIN drivers d ON r.driver_id = d.id 
      LEFT JOIN users d_u ON d.user_id = d_u.id 
      ORDER BY r.created_at DESC LIMIT 10
    `).all();

    res.json({
      users: totalUsers.count,
      drivers: totalDrivers.count,
      rides: totalRides.count,
      earnings: totalEarnings.total || 0,
      recentRides
    });
  });

  app.get("/api/admin/users", (req, res) => {
    const users = db.prepare("SELECT id, email, name, phone, role, home_address, work_address FROM users").all();
    res.json(users);
  });

  app.get("/api/admin/drivers", (req, res) => {
    const drivers = db.prepare(`
      SELECT u.id, u.email, u.name, u.phone, d.vehicle_type, d.vehicle_number, d.car_image, d.status, d.rating 
      FROM users u 
      JOIN drivers d ON u.id = d.user_id
    `).all();
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
    app.use(express.static(path.join(__dirname, "../dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "../dist/index.html"));
    });
  }

  const PORT = 3000;
  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
