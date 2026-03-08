export type UserRole = "user" | "driver" | "admin";

export interface User {
  id: number;
  email: string;
  name: string;
  role: UserRole;
}

export interface Ride {
  id: number;
  user_id: number;
  driver_id: number | null;
  pickup_address: string;
  dropoff_address: string;
  status: "pending" | "accepted" | "ongoing" | "completed" | "cancelled";
  fare: number;
  created_at: string;
}

export interface Driver {
  id: number;
  user_id: number;
  vehicle_type: string;
  vehicle_number: string;
  status: "available" | "busy" | "offline";
  lat: number;
  lng: number;
}
