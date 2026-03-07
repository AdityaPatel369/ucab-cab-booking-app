# 🚖 Ucab – Cab Booking Application

Ucab is a simple and easy-to-use **cab booking application** that helps people book rides quickly and comfortably. Built using the **MERN stack (MongoDB, Express.js, React.js, Node.js)**, Ucab allows users to book nearby cabs, track rides in real-time, and manage bookings efficiently.

Whether you're commuting to work, heading to the airport, or exploring a new city, **Ucab makes travel simple, reliable, and stress-free.**

---

# 📌 Features

- 🔐 **User Authentication**
  - Secure login and signup using JWT.

- 📍 **Ride Booking**
  - Select pickup and drop locations.
  - Choose from available cab types.

- 🚗 **Nearby Cab Detection**
  - Displays nearby available drivers.

- 💰 **Estimated Fare Calculation**
  - Fare calculated based on distance and time.

- 📡 **Real-Time Ride Tracking**
  - Track the cab location during the ride.

- 💳 **Automatic Payments**
  - Pay using saved payment methods.

- 📜 **Ride History**
  - Users can view previous bookings.

- 🎁 **Additional Features**
  - Discounts and promo offers.
  - Donation options.
  - Ability to purchase refreshments during the ride.

---

# 🧑‍💻 Example Use Case

When **Sarah needed to reach the airport urgently**, she opened Ucab, selected her pickup and drop location, and instantly booked a nearby cab. The app showed her the estimated fare and arrival time, and she reached the airport comfortably and on time.

---

# 🏗️ Technical Architecture

The application follows a **layered architecture** for better scalability and maintainability.

## 1️⃣ Client Layer (React.js)

The frontend interface where users interact with the application.

Components include:

- Login & Signup pages
- Cab selection screen
- Ride booking form
- Real-time tracking screen
- Booking history dashboard

---

## 2️⃣ API Layer (Express.js)

Acts as the **middleware** between the frontend and backend services.

Example APIs:

POST /api/rides/book → Book a ride  
GET /api/users/:id → Get user profile  
PUT /api/rides/:id → Update ride status  
DELETE /api/rides/:id → Cancel ride  

---

## 3️⃣ Service Layer

Contains the **core business logic** of the application.

Responsibilities:

- Fare calculation based on distance and time
- Matching users with nearby drivers
- Managing ride lifecycle
- Handling ride updates

---

## 4️⃣ Data Access Layer (Mongoose ODM)

This layer connects the application to **MongoDB** using **Mongoose**.

Responsibilities:

- Define schemas and models
- Perform CRUD operations
- Manage database queries

Example models:

- User
- Driver
- Ride
- Payment

---

# 🔄 Data Flow Example (Ride Booking)

1. User selects destination on the **React frontend**.
2. A request is sent to `POST /api/rides/book`.
3. Backend processes the request.
4. Nearby drivers are identified.
5. Ride details are saved in **MongoDB**.
6. Driver and user receive ride updates.

---

# 🗂️ Project Structure

ucab/
│
├── client/ # React frontend
│ ├── src/
│ ├── components/
│ ├── pages/
│ └── App.js
│
├── server/ # Node + Express backend
│ ├── controllers/
│ ├── routes/
│ ├── services/
│ ├── models/
│ └── server.js
│
├── config/
├── .env
├── package.json
└── README.md


---

# ⚙️ Installation & Setup

## Clone the Repository

git clone https://github.com/yourusername/ucab.git  
cd ucab

## Install Backend Dependencies

cd server  
npm install

## Install Frontend Dependencies

cd ../client  
npm install

## Environment Variables

Create a `.env` file inside the **server folder**.

PORT=5000  
MONGO_URI=your_mongodb_connection_string  
JWT_SECRET=your_secret_key  

## Run Backend Server

cd server  
npm start

## Run Frontend

cd client  
npm start

The application will start at:

http://localhost:3000

---

# 🧰 Technologies Used

### Frontend
- React.js
- Axios
- React Router
- Socket.io Client

### Backend
- Node.js
- Express.js
- JWT Authentication
- Socket.io

### Database
- MongoDB
- Mongoose

---
