import { useState, useEffect, useRef } from "react";
import { Car, MapPin, CheckCircle2, XCircle, Navigation2, AlertCircle, DollarSign, Activity, Phone, MessageSquare, Star, Clock, ShieldCheck, Zap } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User, Ride } from "../types";

interface DriverDashboardProps {
  user: User;
  token: string;
  ws: WebSocket | null;
}

const VirtualMap = ({ active, pickup }: { active: boolean, pickup?: string }) => {
  return (
    <div className="relative w-full h-full bg-zinc-100 overflow-hidden rounded-3xl border border-zinc-200">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      <svg className="absolute inset-0 w-full h-full opacity-20">
        <line x1="0" y1="30%" x2="100%" y2="30%" stroke="black" strokeWidth="2" />
        <line x1="0" y1="60%" x2="100%" y2="60%" stroke="black" strokeWidth="2" />
        <line x1="40%" y1="0" x2="40%" y2="100%" stroke="black" strokeWidth="2" />
        <line x1="80%" y1="0" x2="80%" y2="100%" stroke="black" strokeWidth="2" />
      </svg>
      
      {/* Driver Position */}
      <motion.div 
        animate={{ x: [200, 210, 200], y: [150, 160, 150] }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-20"
      >
        <div className="w-8 h-8 bg-zinc-900 rounded-full flex items-center justify-center shadow-xl border-2 border-white">
          <Car className="w-4 h-4 text-white" />
        </div>
        <div className="absolute inset-0 bg-zinc-900 rounded-full animate-ping opacity-20" />
      </motion.div>

      {active && pickup && (
        <motion.div 
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute left-[30%] top-[20%] z-10"
        >
          <div className="bg-emerald-500 p-2 rounded-lg shadow-lg flex items-center gap-2">
            <MapPin className="w-4 h-4 text-white" />
            <span className="text-[10px] font-black text-white uppercase tracking-widest whitespace-nowrap">Pickup: {pickup}</span>
          </div>
          <div className="w-0.5 h-12 bg-emerald-500/20 mx-auto" />
        </motion.div>
      )}
    </div>
  );
};

export default function DriverDashboard({ user, token, ws }: DriverDashboardProps) {
  const [status, setStatus] = useState<"available" | "busy" | "offline">("available");
  const [requests, setRequests] = useState<any[]>([]);
  const [currentRide, setCurrentRide] = useState<any | null>(null);
  const [earnings, setEarnings] = useState(1250);
  const [completedRides, setCompletedRides] = useState(8);
  const [showChat, setShowChat] = useState(false);
  const [showReviews, setShowReviews] = useState(false);
  const [showVehicleSettings, setShowVehicleSettings] = useState(false);
  const [vehicleData, setVehicleData] = useState({
    type: (user as any).vehicle_type || "",
    number: (user as any).vehicle_number || "",
    image: (user as any).car_image || ""
  });
  const [reviews, setReviews] = useState<any[]>([]);
  const [chatMessages, setChatMessages] = useState<{sender_id: number, text: string, timestamp: string}[]>([]);
  const [chatInput, setChatInput] = useState("");

  useEffect(() => {
    handleStatusChange("available");
    fetchPendingRides();
  }, []);

  const fetchPendingRides = async () => {
    try {
      const res = await fetch("/api/rides/pending", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      // Normalize data to match WebSocket format
      const normalized = data.map((r: any) => ({
        ...r,
        rideId: r.id,
        pickup: r.pickup_address,
        dropoff: r.dropoff_address
      }));
      setRequests(normalized);
    } catch (err) {
      console.error("Failed to fetch pending rides");
    }
  };

  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      if (data.type === "new_ride_request") {
        setRequests(prev => [...prev, data]);
      }
      if (data.type === "new_chat_message") {
        setChatMessages(prev => [...prev, { sender_id: data.senderId, text: data.text, timestamp: data.timestamp }]);
      }
      if (data.type === "ride_cancelled") {
        if (currentRide && (currentRide.rideId === data.rideId || currentRide.id === data.rideId)) {
          setCurrentRide(null);
          setStatus("available");
          alert("The rider has cancelled the ride.");
        }
      }
    };

    ws.addEventListener("message", handleMessage);
    return () => ws.removeEventListener("message", handleMessage);
  }, [ws]);

  const handleStatusChange = async (newStatus: "available" | "busy" | "offline") => {
    setStatus(newStatus);
    try {
      await fetch("/api/drivers/status", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: user.id, status: newStatus }),
      });
    } catch (err) {
      console.error("Failed to update status");
    }
  };

  useEffect(() => {
    if (!ws || status === "offline") return;
    
    const interval = setInterval(() => {
      ws.send(JSON.stringify({
        type: "location_update",
        lat: 12.9716 + (Math.random() - 0.5) * 0.05,
        lng: 77.5946 + (Math.random() - 0.5) * 0.05
      }));
    }, 5000);

    return () => clearInterval(interval);
  }, [ws, status]);

  const handleAccept = async (ride: any) => {
    try {
      const res = await fetch("/api/rides/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rideId: ride.rideId, driverUserId: user.id }),
      });
      if (res.ok) {
        setRequests(prev => prev.filter(r => r.rideId !== ride.rideId));
        setStatus("busy");
        setCurrentRide(ride);
      }
    } catch (err) {
      console.error("Failed to accept ride");
    }
  };

  const handleReject = (rideId: number) => {
    setRequests(prev => prev.filter(r => r.rideId !== rideId));
  };

  const handleStart = async () => {
    try {
      const res = await fetch("/api/rides/start", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rideId: currentRide.rideId || currentRide.id }),
      });
      if (res.ok) {
        setCurrentRide((prev: any) => ({ ...prev, status: 'ongoing' }));
      }
    } catch (err) {
      console.error("Failed to start ride");
    }
  };

  const handleComplete = async () => {
    try {
      const res = await fetch("/api/rides/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rideId: currentRide.rideId, driverUserId: user.id }),
      });
      if (res.ok) {
        setEarnings(prev => prev + (currentRide?.fare || 0));
        setCompletedRides(prev => prev + 1);
        setCurrentRide(null);
        setStatus("available");
      }
    } catch (err) {
      console.error("Failed to complete ride");
    }
  };

  const fetchReviews = async () => {
    try {
      const res = await fetch(`/api/drivers/${user.id}/reviews`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setReviews(data);
      setShowReviews(true);
    } catch (err) {
      console.error("Failed to fetch reviews");
    }
  };

  const fetchChatMessages = async (rideId: number) => {
    try {
      const res = await fetch(`/api/rides/${rideId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setChatMessages(data);
    } catch (err) {
      console.error("Failed to fetch messages");
    }
  };

  const handleSendMessage = () => {
    if (!chatInput.trim() || !currentRide || !ws) return;
    const receiverId = currentRide.user_id;
    if (!receiverId) return;

    const msg = {
      type: "chat_message",
      rideId: currentRide.rideId || currentRide.id,
      text: chatInput,
      receiverId
    };
    ws.send(JSON.stringify(msg));
    setChatMessages(prev => [...prev, { sender_id: user.id, text: chatInput, timestamp: new Date().toISOString() }]);
    setChatInput("");
  };

  const handleUpdateVehicle = async () => {
    try {
      const res = await fetch("/api/drivers/vehicle", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          userId: user.id, 
          vehicle_type: vehicleData.type, 
          vehicle_number: vehicleData.number, 
          car_image: vehicleData.image 
        }),
      });
      if (res.ok) {
        setShowVehicleSettings(false);
        alert("Vehicle details updated successfully!");
      }
    } catch (err) {
      console.error("Failed to update vehicle");
    }
  };

  return (
    <div className="pt-24 pb-12 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Status & Stats */}
      <div className="lg:col-span-4 space-y-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-[40px] shadow-2xl shadow-zinc-200/50 p-8 border border-zinc-100"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-display font-black">Driver Console</h2>
            <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
              status === 'available' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
            }`}>
              <div className={`w-2 h-2 rounded-full animate-pulse ${
                status === 'available' ? 'bg-emerald-500' : 'bg-amber-500'
              }`} />
              {status}
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 bg-zinc-50 p-1.5 rounded-2xl mb-8">
            {(['available', 'busy', 'offline'] as const).map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className={`py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  status === s ? "bg-white text-zinc-900 shadow-lg shadow-zinc-200" : "text-zinc-400 hover:text-zinc-600"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            <div className="p-6 rounded-3xl bg-zinc-50 border border-zinc-100 flex items-center justify-between group hover:bg-emerald-500 hover:text-white transition-all duration-500">
              <div className="flex items-center gap-4">
                <div className="bg-white p-3 rounded-2xl text-emerald-500 shadow-sm group-hover:bg-white/20 group-hover:text-white transition-all">
                  <DollarSign className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Earnings</p>
                  <p className="text-2xl font-black">₹{earnings}</p>
                </div>
              </div>
              <div className="text-right">
                <button 
                  onClick={fetchReviews}
                  className="flex items-center gap-1 text-amber-400 group-hover:text-white transition-colors"
                >
                  <Star className="w-4 h-4 fill-current" />
                  <span className="text-sm font-black">{(user as any).rating || 5.0}</span>
                </button>
                <p className="text-[8px] font-black uppercase tracking-widest opacity-40 group-hover:opacity-60">{(user as any).total_ratings || 0} reviews</p>
              </div>
            </div>
            
            <div className="p-6 rounded-3xl bg-zinc-50 border border-zinc-100 flex items-center justify-between group hover:bg-zinc-900 hover:text-white transition-all duration-500">
              <div className="flex items-center gap-4">
                <div className="bg-white p-3 rounded-2xl text-zinc-900 shadow-sm group-hover:bg-white/20 group-hover:text-white transition-all">
                  <Activity className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Rides</p>
                  <p className="text-2xl font-black">{completedRides}</p>
                </div>
              </div>
              <ShieldCheck className="w-5 h-5 opacity-20" />
            </div>

            <div className="p-6 rounded-3xl bg-zinc-50 border border-zinc-100 flex items-center justify-between group hover:bg-zinc-900 hover:text-white transition-all duration-500">
              <div className="flex items-center gap-4">
                <div className="bg-white p-3 rounded-2xl text-zinc-900 shadow-sm group-hover:bg-white/20 group-hover:text-white transition-all">
                  <Car className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Vehicle</p>
                  <p className="text-sm font-black">{(user as any).vehicle_type} • {(user as any).vehicle_number}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowVehicleSettings(true)}
                className="text-[10px] font-black text-emerald-500 uppercase tracking-widest hover:text-emerald-600"
              >
                Edit
              </button>
            </div>
          </div>
        </motion.div>

        <div className="h-[300px] w-full">
          <VirtualMap active={!!currentRide} pickup={currentRide?.pickup} />
        </div>
      </div>

      {/* Requests Section */}
      <div className="lg:col-span-8 space-y-6">
        <AnimatePresence mode="wait">
          {currentRide ? (
            <motion.div
              key="active-ride"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-900 rounded-[40px] p-10 text-white shadow-2xl shadow-zinc-900/20 relative overflow-hidden"
            >
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-4">
                    <div className="bg-emerald-500 p-4 rounded-3xl shadow-lg shadow-emerald-500/20">
                      <Navigation2 className="w-8 h-8 text-white" />
                    </div>
                    <div>
                      <p className="text-xs font-black text-emerald-500 uppercase tracking-[0.2em] mb-1">Active Mission</p>
                      <h2 className="text-3xl font-display font-black">Heading to Pickup</h2>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black">₹{currentRide.fare}</p>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Fixed Fare</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-10">
                  <div className="space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                        <MapPin className="w-5 h-5 text-emerald-500" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Pickup Point</p>
                        <p className="text-lg font-bold leading-tight">{currentRide.pickup}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
                        <Navigation2 className="w-5 h-5 text-zinc-400" />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Destination</p>
                        <p className="text-lg font-bold leading-tight">{currentRide.dropoff}</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white/5 rounded-3xl p-6 border border-white/10">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Passenger Details</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <img src="https://picsum.photos/seed/passenger/48/48" className="w-12 h-12 rounded-2xl border-2 border-white/20" alt="passenger" />
                        <div>
                          <p className="font-black">Sarah Jenkins</p>
                          <div className="flex items-center gap-1 text-amber-400">
                            <Star className="w-3 h-3 fill-current" />
                            <span className="text-[10px] font-black">4.9</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => {
                            setShowChat(true);
                            fetchChatMessages(currentRide.rideId || currentRide.id);
                          }}
                          className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all"
                        >
                          <MessageSquare className="w-5 h-5" />
                        </button>
                        <button className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center hover:bg-white/20 transition-all">
                          <Phone className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-4">
                  {currentRide.status === 'accepted' ? (
                    <button 
                      onClick={handleStart}
                      className="flex-1 bg-emerald-500 text-white py-5 rounded-3xl font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20"
                    >
                      Start Ride
                    </button>
                  ) : (
                    <button 
                      onClick={handleComplete}
                      className="flex-1 bg-emerald-500 text-white py-5 rounded-3xl font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-xl shadow-emerald-500/20"
                    >
                      Complete Ride
                    </button>
                  )}
                  <button className="px-8 bg-white/10 text-white py-5 rounded-3xl font-black uppercase tracking-widest hover:bg-white/20 transition-all">
                    Cancel
                  </button>
                </div>
              </div>
              
              <div className="absolute bottom-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl" />
            </motion.div>
          ) : (
            <motion.div 
              key="requests-list"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-[40px] shadow-2xl shadow-zinc-200/50 p-10 border border-zinc-100 min-h-[600px]"
            >
              <div className="flex items-center justify-between mb-10">
                <h2 className="text-3xl font-display font-black flex items-center gap-4">
                  <div className="bg-emerald-500 p-3 rounded-2xl text-white shadow-lg shadow-emerald-200">
                    <Zap className="w-6 h-6" />
                  </div>
                  Live Requests
                </h2>
                <div className="flex items-center gap-2 px-4 py-2 bg-zinc-50 rounded-2xl">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Scanning Area...</span>
                </div>
              </div>

              <div className="space-y-6">
                <AnimatePresence mode="popLayout">
                  {requests.length === 0 ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex flex-col items-center justify-center py-32 text-zinc-300"
                    >
                      <div className="bg-zinc-50 p-10 rounded-[40px] mb-8">
                        <Activity className="w-20 h-20 opacity-10 animate-pulse" />
                      </div>
                      <p className="font-black uppercase tracking-[0.2em] text-xs">No active requests nearby</p>
                    </motion.div>
                  ) : (
                    requests.map((req) => (
                      <motion.div
                        key={req.rideId}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="p-8 rounded-[32px] bg-zinc-50/50 border border-zinc-100 hover:border-emerald-200 hover:bg-white transition-all group relative overflow-hidden"
                      >
                        <div className="flex items-start justify-between mb-8 relative z-10">
                          <div className="flex items-center gap-5">
                            <div className="bg-white p-4 rounded-2xl shadow-sm group-hover:bg-emerald-500 group-hover:text-white transition-all">
                              <Car className="w-8 h-8" />
                            </div>
                            <div>
                              <p className="font-black text-zinc-900 text-xl">Ride Request #{req.rideId}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-emerald-600 font-black text-lg">₹{req.fare}</span>
                                <span className="w-1 h-1 rounded-full bg-zinc-300" />
                                <span className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">2.4 km away</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-3">
                            <button 
                              onClick={() => handleReject(req.rideId)}
                              className="w-14 h-14 flex items-center justify-center bg-white hover:bg-red-50 text-zinc-300 hover:text-red-500 rounded-2xl border border-zinc-100 transition-all shadow-sm"
                            >
                              <XCircle className="w-7 h-7" />
                            </button>
                            <button 
                              onClick={() => handleAccept(req)}
                              className="px-8 h-14 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-emerald-200 transition-all active:scale-95"
                            >
                              Accept
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                          <div className="flex items-start gap-4 bg-white p-4 rounded-2xl border border-zinc-100">
                            <MapPin className="w-5 h-5 text-emerald-500 mt-1 shrink-0" />
                            <div>
                              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Pickup</p>
                              <p className="text-sm font-bold text-zinc-700 leading-tight">{req.pickup}</p>
                            </div>
                          </div>
                          <div className="flex items-start gap-4 bg-white p-4 rounded-2xl border border-zinc-100">
                            <Navigation2 className="w-5 h-5 text-zinc-400 mt-1 shrink-0" />
                            <div>
                              <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Drop-off</p>
                              <p className="text-sm font-bold text-zinc-700 leading-tight">{req.dropoff}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full -mr-24 -mt-24 blur-3xl group-hover:bg-emerald-500/10 transition-colors" />
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Vehicle Settings Modal */}
      <AnimatePresence>
        {showVehicleSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowVehicleSettings(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] p-10 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-black">Vehicle Settings</h2>
                <button onClick={() => setShowVehicleSettings(false)} className="p-2 bg-zinc-100 rounded-xl text-zinc-400 hover:text-zinc-600 transition-all">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Vehicle Type</label>
                  <select 
                    value={vehicleData.type}
                    onChange={(e) => setVehicleData({ ...vehicleData, type: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl py-4 px-6 focus:outline-none focus:border-emerald-500 font-bold"
                  >
                    <option value="Mini">Mini</option>
                    <option value="Prime">Prime</option>
                    <option value="SUV">SUV</option>
                    <option value="Luxury">Luxury</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Plate Number</label>
                  <input 
                    type="text" 
                    value={vehicleData.number}
                    onChange={(e) => setVehicleData({ ...vehicleData, number: e.target.value })}
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl py-4 px-6 focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Car Image URL</label>
                  <input 
                    type="text" 
                    value={vehicleData.image}
                    onChange={(e) => setVehicleData({ ...vehicleData, image: e.target.value })}
                    placeholder="https://example.com/car.jpg"
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl py-4 px-6 focus:outline-none focus:border-emerald-500 font-bold"
                  />
                  {vehicleData.image && (
                    <div className="mt-4 rounded-2xl overflow-hidden border border-zinc-100">
                      <img src={vehicleData.image} alt="Car preview" className="w-full h-32 object-cover" />
                    </div>
                  )}
                </div>

                <button 
                  onClick={handleUpdateVehicle}
                  className="w-full bg-zinc-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-zinc-800 transition-all"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reviews Modal */}
      <AnimatePresence>
        {showReviews && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowReviews(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] p-10 shadow-2xl overflow-hidden flex flex-col h-[600px]"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-black">Recent Reviews</h2>
                <button onClick={() => setShowReviews(false)} className="p-2 bg-zinc-100 rounded-xl text-zinc-400 hover:text-zinc-600 transition-all">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-2 no-scrollbar">
                {reviews.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-300">
                    <Star className="w-12 h-12 mb-4 opacity-10" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No reviews yet</p>
                  </div>
                ) : (
                  reviews.map((review, i) => (
                    <div key={i} className="p-6 rounded-3xl bg-zinc-50 border border-zinc-100">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <img src={`https://picsum.photos/seed/user${review.user_id}/40/40`} className="w-10 h-10 rounded-xl" alt="user" />
                          <div>
                            <p className="font-black text-sm">{review.user_name || 'Anonymous'}</p>
                            <p className="text-[8px] text-zinc-400 font-black uppercase tracking-widest">{new Date(review.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-amber-400">
                          <Star className="w-3 h-3 fill-current" />
                          <span className="text-sm font-black">{review.rating}</span>
                        </div>
                      </div>
                      <p className="text-sm text-zinc-600 font-medium italic">"{review.review || 'No comment provided'}"</p>
                    </div>
                  ))
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Chat Modal */}
      <AnimatePresence>
        {showChat && currentRide && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowChat(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] shadow-2xl overflow-hidden flex flex-col h-[600px]"
            >
              <div className="p-6 border-b border-zinc-100 flex items-center justify-between bg-zinc-900 text-white">
                <div className="flex items-center gap-4">
                  <img src="https://picsum.photos/seed/passenger/40/40" className="w-10 h-10 rounded-xl border border-white/20" alt="passenger" />
                  <div>
                    <p className="font-black">Sarah Jenkins</p>
                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">Passenger • In-ride Chat</p>
                  </div>
                </div>
                <button onClick={() => setShowChat(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-4 no-scrollbar bg-zinc-50">
                {chatMessages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-4 rounded-3xl text-sm font-medium shadow-sm ${
                      msg.sender_id === user.id 
                        ? 'bg-emerald-500 text-white rounded-tr-none' 
                        : 'bg-white text-zinc-700 rounded-tl-none border border-zinc-100'
                    }`}>
                      {msg.text}
                      <p className={`text-[8px] mt-1 font-black uppercase tracking-widest ${msg.sender_id === user.id ? 'text-white/60' : 'text-zinc-400'}`}>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                {chatMessages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-zinc-300">
                    <MessageSquare className="w-12 h-12 mb-4 opacity-10" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No messages yet</p>
                  </div>
                )}
              </div>

              <div className="p-6 bg-white border-t border-zinc-100">
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Type a message..."
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1 bg-zinc-50 border border-zinc-100 rounded-2xl py-4 px-6 focus:outline-none focus:border-emerald-500 font-bold text-sm"
                  />
                  <button 
                    onClick={handleSendMessage}
                    className="bg-emerald-500 text-white p-4 rounded-2xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-200"
                  >
                    <Navigation2 className="w-6 h-6 rotate-90" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
