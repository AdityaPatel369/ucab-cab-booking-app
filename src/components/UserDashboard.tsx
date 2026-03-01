import { useState, useEffect } from "react";
import { MapPin, Navigation, Clock, CreditCard, Search, Star, ShieldCheck, Zap, Car } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User, Ride } from "../types";

interface UserDashboardProps {
  user: User;
  token: string;
  onRideBooked: (rideId: number) => void;
}

const CAB_TYPES = [
  { id: "mini", name: "Ucab Mini", icon: Zap, price: 1.2, time: "2 min", desc: "Compact & affordable" },
  { id: "sedan", name: "Ucab Sedan", icon: ShieldCheck, price: 1.8, time: "4 min", desc: "Comfortable sedans" },
  { id: "prime", name: "Ucab Prime", icon: Star, price: 2.5, time: "6 min", desc: "Top-rated drivers" },
];

export default function UserDashboard({ user, token, onRideBooked }: UserDashboardProps) {
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [selectedCab, setSelectedCab] = useState(CAB_TYPES[0]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Ride[]>([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/rides/history/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setHistory(data);
    } catch (err) {
      console.error("Failed to fetch history");
    }
  };

  const handleBook = async () => {
    if (!pickup || !dropoff) return;
    setLoading(true);
    try {
      const fare = Math.floor(Math.random() * 20) + 10 * selectedCab.price;
      const res = await fetch("/api/rides/book", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: user.id, pickup, dropoff, fare }),
      });
      const data = await res.json();
      if (res.ok) {
        onRideBooked(data.rideId);
        fetchHistory();
      }
    } catch (err) {
      console.error("Booking failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pt-24 pb-12 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Booking Section */}
      <div className="lg:col-span-5 space-y-6">
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-3xl shadow-xl shadow-zinc-200/50 p-8 border border-zinc-100"
        >
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <Navigation className="text-emerald-500" />
            Where to?
          </h2>

          <div className="space-y-4 relative">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 w-0.5 h-12 bg-zinc-200 z-0" />
            
            <div className="relative z-10">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-emerald-500 bg-white" />
              <input
                type="text"
                placeholder="Pickup Location"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
              />
            </div>

            <div className="relative z-10">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 bg-zinc-900 rounded-sm" />
              <input
                type="text"
                placeholder="Drop-off Location"
                className="w-full bg-zinc-50 border border-zinc-200 rounded-xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all font-medium"
                value={dropoff}
                onChange={(e) => setDropoff(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-8">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-wider mb-4">Select Ride Type</h3>
            <div className="space-y-3">
              {CAB_TYPES.map((cab) => (
                <button
                  key={cab.id}
                  onClick={() => setSelectedCab(cab)}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                    selectedCab.id === cab.id 
                      ? "border-emerald-500 bg-emerald-50/50" 
                      : "border-zinc-100 hover:border-zinc-200 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl ${selectedCab.id === cab.id ? "bg-emerald-500 text-white" : "bg-zinc-100 text-zinc-500"}`}>
                      <cab.icon className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-zinc-900">{cab.name}</p>
                      <p className="text-xs text-zinc-500 font-medium">{cab.desc}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-zinc-900">₹{(15 * cab.price).toFixed(0)}</p>
                    <p className="text-xs text-emerald-600 font-bold">{cab.time}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleBook}
            disabled={loading || !pickup || !dropoff}
            className="w-full mt-8 bg-zinc-900 text-white py-4 rounded-2xl font-bold hover:bg-zinc-800 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 group"
          >
            {loading ? "Finding Cabs..." : "Book Now"}
            {!loading && <Search className="w-5 h-5 group-hover:scale-110 transition-transform" />}
          </button>
        </motion.div>
      </div>

      {/* History Section */}
      <div className="lg:col-span-7 space-y-6">
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-3xl shadow-xl shadow-zinc-200/50 p-8 border border-zinc-100 min-h-[600px]"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Clock className="text-emerald-500" />
              Recent Rides
            </h2>
            <button onClick={fetchHistory} className="text-emerald-600 font-bold text-sm hover:underline">Refresh</button>
          </div>

          <div className="space-y-4">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                <div className="bg-zinc-50 p-6 rounded-full mb-4">
                  <Car className="w-12 h-12 opacity-20" />
                </div>
                <p className="font-medium">No rides yet. Start your first journey!</p>
              </div>
            ) : (
              history.map((ride) => (
                <div key={ride.id} className="p-5 rounded-2xl bg-zinc-50 border border-zinc-100 hover:border-zinc-200 transition-all group">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="bg-white p-2 rounded-lg shadow-sm">
                        <Car className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div>
                        <p className="font-bold text-zinc-900">Ride #{ride.id}</p>
                        <p className="text-xs text-zinc-400 font-medium">{new Date(ride.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        ride.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                        ride.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {ride.status}
                      </span>
                      <p className="mt-1 font-bold text-zinc-900">₹{ride.fare}</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-3 text-zinc-600">
                      <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                      <span className="truncate">{ride.pickup_address}</span>
                    </div>
                    <div className="flex items-center gap-3 text-zinc-600">
                      <MapPin className="w-4 h-4 text-zinc-900 shrink-0" />
                      <span className="truncate">{ride.dropoff_address}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
