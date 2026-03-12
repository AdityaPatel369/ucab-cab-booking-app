# Ucab 🚖

### MERN Stack Cab Booking Application

## 📌 Overview

**Ucab** is a simple and user-friendly cab booking application that allows users to quickly book rides, track them in real time, and manage their bookings efficiently. The application is built using the **MERN Stack (MongoDB, Express.js, React.js, Node.js)** and includes both **User and Admin dashboards** for managing rides, users, and vehicles.

With Ucab, users can choose pickup and drop locations, view available cabs, estimate fares, and confirm bookings. Admins can manage users, vehicles, and bookings through a dedicated admin panel.

Example:
When **Sarah needed to reach the airport urgently**, she used Ucab to book a nearby cab and arrived on time.

---

# ✨ Features

## User Features

* User registration and login
* Browse available cabs
* Book a cab with pickup and drop locations
* View estimated fare and arrival time
* Track cab in real-time
* View booking history
* Automatic payment using saved methods
* Discount offers
* Option to purchase refreshments during rides
* Donation option

## Admin Features

* Admin authentication
* Manage users
* Manage cab listings
* View and manage bookings
* Add new vehicles
* Upload car images and documents

---

# 🛠 Tech Stack

## Frontend

* React.js
* Axios
* HTML / CSS

## Backend

* Node.js
* Express.js

## Database

* MongoDB
* Mongoose

## Other Tools

* JWT Authentication
* Multer (File Uploads)
* CORS
* REST API Architecture

---

# 📁 Project Structure

```
Ucab/
│
├── client/                 # React Frontend
│
└── server/                 # Node.js Backend
    │
    ├── controllers/        # Business logic for routes
    │   ├── adminController.js
    │   ├── bookingController.js
    │   ├── carController.js
    │   └── userController.js
    │
    ├── db/
    │   └── config.js       # MongoDB connection
    │
    ├── middlewares/
    │   ├── authMiddleware.js
    │   └── multer.js
    │
    ├── models/
    │   ├── AdminSchema.js
    │   ├── UserSchema.js
    │   ├── CarSchema.js
    │   └── MyBookingSchema.js
    │
    ├── routes/
    │   ├── adminRoutes.js
    │   ├── userRoutes.js
    │   ├── carRoutes.js
    │   └── bookingRoutes.js
    │
    ├── uploads/            # Stores uploaded files
    │
    └── server.js           # Entry point of backend
```

---

# ⚙️ Backend Architecture

## Controllers

Controllers handle the main logic for API requests.

* **adminController.js** – Admin operations such as managing users and cars
* **bookingController.js** – Booking functionality like booking rides and retrieving bookings
* **carController.js** – CRUD operations for car details
* **userController.js** – User registration, login, and profile management

---

## Database Configuration

`db/config.js` handles the connection to MongoDB using **Mongoose**.

Example:

```javascript
mongoose.connect(process.env.MONGO_URI)
```

---

## Middleware

### authMiddleware.js

* Verifies JWT tokens
* Protects private routes

### multer.js

* Handles file uploads
* Used for uploading car images and documents

---

# 🗄 Database Schemas

### AdminSchema

Stores admin information.

Fields may include:

* name
* email
* password

### UserSchema

Stores user account information.

### CarSchema

Stores cab information such as:

* car name
* model
* seats
* plate number
* image

### MyBookingSchema

Stores booking details including:

* user ID
* car ID
* pickup location
* drop location
* booking date

---

# 🌐 API Routes

## Admin Routes

`/api/admin`

* Admin login
* Manage users
* Manage vehicles

## User Routes

`/api/users`

* Register
* Login
* Profile

## Car Routes

`/api/cars`

* Fetch all cars
* Add new car
* Edit car

## Booking Routes

`/api/bookings`

* Book cab
* Fetch user bookings

---

# 💻 Frontend Components

## User Side

### Home

Landing page with introduction and navigation.

### Login / Register

Handles authentication and communicates with backend using **Axios**.

### Uhome

User dashboard showing welcome information and quick links.

### Cabs

Displays available cabs retrieved from backend.

### BookCab

Allows users to book a cab.

Route example:

```
/bookcab/:id
```

### MyBookings

Displays all bookings made by the logged-in user.

### Unav

Navigation bar for user dashboard.

---

## Admin Side

### Alogin / Aregister

Admin authentication pages.

### Ahome

Admin dashboard.

### Anav

Navigation bar for admin pages.

### Users

Displays all registered users with edit or delete options.

### UserEdit

Allows editing user details.

### Bookings

Displays all bookings made by users.

### Acabs

Displays all available cabs in the system.

### Acabedit

Allows editing cab information.

### Addcar

Form for adding new cab details.

---

# 🚀 Installation & Setup

## 1️⃣ Clone the Repository

```bash
git clone https://github.com/yourusername/ucab.git
cd ucab
```

## 2️⃣ Install Backend Dependencies

```bash
cd server
npm install
```

## 3️⃣ Install Frontend Dependencies

```bash
cd client
npm install
```

## 4️⃣ Run Backend Server

```bash
cd server
npm start
```

Server runs on:

```
http://localhost:8000
```

## 5️⃣ Run Frontend

```bash
cd client
npm start
```

Frontend runs on:

```
http://localhost:3000
```

---

# 🔮 Future Improvements

* GPS-based real-time cab tracking
* Integrated payment gateway
* Driver mobile application
* Rating and review system
* Ride sharing feature

---

# 📄 License

This project is developed for **educational purposes** and learning MERN stack development.

---

# 👨‍💻 Author

Developed as a **MERN Stack Project – Ucab Cab Booking Application**.

