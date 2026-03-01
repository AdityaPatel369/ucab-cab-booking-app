import { useState, useEffect } from "react";
import { Car, MapPin, CheckCircle2, XCircle, Navigation2, AlertCircle, DollarSign, Activity } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User, Ride } from "../types";

interface DriverDashboardProps {
  user: User;
  token: string;
  ws: WebSocket | null;
}

export default function DriverDashboard({ user, token, ws }: DriverDashboardProps) {
  const [status, setStatus] = useState<"available" | "busy" | "offline">("available");
  const [requests, setRequests] = useState<any[]>([]);
  const [currentRide, setCurrentRide] = useState<Ride | null>(null);
  const [earnings, setEarnings] = useState(0);

  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      if (data.type === "new_ride_request") {
        setRequests(prev => [...prev, data]);
      }
    };

    ws.addEventListener("message", handleMessage);
    return () => ws.removeEventListener("message", handleMessage);
  }, [ws]);

  const handleAccept = async (rideId: number) => {
    try {
      const res = await fetch("/api/rides/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rideId, driverUserId: user.id }),
      });
      if (res.ok) {
        setRequests(prev => prev.filter(r => r.rideId !== rideId));
        setStatus("busy");
        // In a real app, we'd fetch the full ride details here
      }
    } catch (err) {
      console.error("Failed to accept ride");
    }
  };

  const handleReject = (rideId: number) => {
    setRequests(prev => prev.filter(r => r.rideId !== rideId));
  };

  return (
    <div className="pt-24 pb-12 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Status & Stats */}
      <div className="lg:col-span-4 space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-3xl shadow-xl shadow-zinc-200/50 p-8 border border-zinc-100"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-bold">Driver Status</h2>
            <div className={`w-3 h-3 rounded-full animate-pulse ${
              status === 'available' ? 'bg-emerald-500' : status === 'busy' ? 'bg-amber-500' : 'bg-zinc-300'
            }`} />
          </div>

          <div className="grid grid-cols-3 gap-2 bg-zinc-100 p-1 rounded-2xl mb-8">
            {(['available', 'busy', 'offline'] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                  status === s ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-700"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-emerald-500 p-2 rounded-lg text-white">
                  <DollarSign className="w-5 h-5" />
                </div>
                <span className="font-bold text-zinc-700">Today's Earnings</span>
              </div>
              <span className="text-xl font-black text-emerald-600">₹{earnings}</span>
            </div>
            <div className="p-4 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-zinc-900 p-2 rounded-lg text-white">
                  <Activity className="w-5 h-5" />
                </div>
                <span className="font-bold text-zinc-700">Rides Completed</span>
              </div>
              <span className="text-xl font-black text-zinc-900">0</span>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-zinc-900 rounded-3xl p-8 text-white relative overflow-hidden group"
        >
          <div className="relative z-10">
            <h3 className="text-lg font-bold mb-2">Driver Support</h3>
            <p className="text-zinc-400 text-sm mb-6">Need help with a ride or have a question? Our support team is here 24/7.</p>
            <button className="bg-white text-zinc-900 px-6 py-2 rounded-xl font-bold text-sm hover:bg-zinc-100 transition-colors">
              Contact Support
            </button>
          </div>
          <AlertCircle className="absolute -right-4 -bottom-4 w-32 h-32 text-white/5 rotate-12 group-hover:rotate-0 transition-transform duration-500" />
        </motion.div>
      </div>

      {/* Requests Section */}
      <div className="lg:col-span-8 space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl shadow-xl shadow-zinc-200/50 p-8 border border-zinc-100 min-h-[600px]"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Navigation2 className="text-emerald-500" />
              Incoming Requests
            </h2>
            <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold">
              {requests.length} New
            </span>
          </div>

          <div className="space-y-4">
            <AnimatePresence mode="popLayout">
              {requests.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center py-20 text-zinc-400"
                >
                  <div className="bg-zinc-50 p-6 rounded-full mb-4">
                    <Activity className="w-12 h-12 opacity-20 animate-pulse" />
                  </div>
                  <p className="font-medium">Waiting for new ride requests...</p>
                </motion.div>
              ) : (
                requests.map((req) => (
                  <motion.div
                    key={req.rideId}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="p-6 rounded-3xl bg-zinc-50 border border-zinc-100 hover:border-emerald-200 transition-all group relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between mb-6 relative z-10">
                      <div className="flex items-center gap-4">
                        <div className="bg-white p-3 rounded-2xl shadow-sm">
                          <Car className="w-6 h-6 text-emerald-500" />
                        </div>
                        <div>
                          <p className="font-bold text-zinc-900 text-lg">New Ride Request</p>
                          <p className="text-sm text-zinc-400 font-medium">Estimated Fare: <span className="text-emerald-600 font-bold">₹{req.fare}</span></p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleReject(req.rideId)}
                          className="p-3 bg-white hover:bg-red-50 text-zinc-400 hover:text-red-500 rounded-2xl border border-zinc-100 transition-all shadow-sm"
                        >
                          <XCircle className="w-6 h-6" />
                        </button>
                        <button 
                          onClick={() => handleAccept(req.rideId)}
                          className="p-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-200 transition-all active:scale-95"
                        >
                          <CheckCircle2 className="w-6 h-6" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-4 relative z-10">
                      <div className="flex items-center gap-4">
                        <div className="w-8 flex flex-col items-center gap-1">
                          <div className="w-2.5 h-2.5 rounded-full border-2 border-emerald-500 bg-white" />
                          <div className="w-0.5 h-6 bg-zinc-200" />
                          <div className="w-2.5 h-2.5 bg-zinc-900 rounded-sm" />
                        </div>
                        <div className="flex-1 space-y-4">
                          <div className="bg-white p-3 rounded-xl border border-zinc-100">
                            <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold mb-1">Pickup</p>
                            <p className="text-sm font-bold text-zinc-700 truncate">{req.pickup}</p>
                          </div>
                          <div className="bg-white p-3 rounded-xl border border-zinc-100">
                            <p className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold mb-1">Drop-off</p>
                            <p className="text-sm font-bold text-zinc-700 truncate">{req.dropoff}</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
