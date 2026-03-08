import { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, Clock, CreditCard, Search, Star, ShieldCheck, Zap, Car, Gift, Heart, Coffee, Check, X, Phone, MessageSquare, MoreHorizontal, ArrowRight, Home, Briefcase, User as UserIcon, Send } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { User, Ride } from "../types";

interface UserDashboardProps {
  user: User;
  token: string;
  ws: WebSocket | null;
  onRideBooked: (rideId: number) => void;
  onUserUpdate: (user: User) => void;
}

const CAB_TYPES = [
  { id: "mini", name: "Ucab Mini", icon: Zap, price: 1.2, time: "2 min", desc: "Compact & affordable" },
  { id: "sedan", name: "Ucab Sedan", icon: ShieldCheck, price: 1.8, time: "4 min", desc: "Comfortable sedans" },
  { id: "prime", name: "Ucab Prime", icon: Star, price: 2.5, time: "6 min", desc: "Top-rated drivers" },
];

const REFRESHMENTS = [
  { id: "water", name: "Mineral Water", price: 20 },
  { id: "soda", name: "Cold Soda", price: 40 },
  { id: "snacks", name: "Light Snacks", price: 50 },
];

const PAYMENT_METHODS = [
  { id: "card_1234", name: "•••• 1234", type: "Visa" },
  { id: "card_5678", name: "•••• 5678", type: "Mastercard" },
  { id: "cash", name: "Cash on Delivery", type: "Cash" },
];

const VirtualMap = ({ active, drivers }: { active: boolean, drivers: any[] }) => {
  return (
    <div className="relative w-full h-full bg-zinc-100 overflow-hidden rounded-3xl border border-zinc-200">
      {/* Grid Lines */}
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      
      {/* Simulated Roads */}
      <svg className="absolute inset-0 w-full h-full opacity-20">
        <line x1="0" y1="20%" x2="100%" y2="20%" stroke="black" strokeWidth="2" />
        <line x1="0" y1="50%" x2="100%" y2="50%" stroke="black" strokeWidth="2" />
        <line x1="0" y1="80%" x2="100%" y2="80%" stroke="black" strokeWidth="2" />
        <line x1="30%" y1="0" x2="30%" y2="100%" stroke="black" strokeWidth="2" />
        <line x1="70%" y1="0" x2="70%" y2="100%" stroke="black" strokeWidth="2" />
      </svg>
 
      {/* Real Drivers from DB */}
      {drivers.map(driver => {
        // Simple mapping of lat/lng to percentage for the virtual map
        // Assuming Bangalore area for mock data (12.97, 77.59)
        const x = ((driver.lng - 77.5) * 1000) % 100;
        const y = ((driver.lat - 12.9) * 1000) % 100;
        
        return (
          <motion.div
            key={driver.id}
            initial={{ x: `${x}%`, y: `${y}%` }}
            animate={{ 
              x: `${x}%`,
              y: `${y}%`
            }}
            transition={{ duration: 2 }}
            className="absolute w-4 h-4 bg-emerald-500 rounded-full shadow-lg shadow-emerald-500/50 flex items-center justify-center z-10"
          >
            <Car className="w-2.5 h-2.5 text-white" />
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] font-black text-zinc-400 uppercase tracking-widest">
              {driver.name}
            </div>
          </motion.div>
        );
      })}
 
      {active && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-900/10 backdrop-blur-[2px]">
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="w-4 h-4 bg-emerald-500 rounded-full relative"
          >
            <div className="absolute inset-0 bg-emerald-500 rounded-full animate-ping opacity-50" />
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default function UserDashboard({ user, token, ws, onRideBooked, onUserUpdate }: UserDashboardProps) {
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [selectedCab, setSelectedCab] = useState(CAB_TYPES[0]);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<Ride[]>([]);
  const [activeRide, setActiveRide] = useState<any | null>(null);
  const [driverLocation, setDriverLocation] = useState<{lat: number, lng: number} | null>(null);
  const [nearbyDrivers, setNearbyDrivers] = useState<any[]>([]);
  
  // New Features State
  const [discountCode, setDiscountCode] = useState("");
  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [isDonating, setIsDonating] = useState(false);
  const [selectedRefreshments, setSelectedRefreshments] = useState<string[]>([]);
  const [selectedPayment, setSelectedPayment] = useState(PAYMENT_METHODS[0]);
  const [showExtras, setShowExtras] = useState(false);

  // Profile & Support
  const [showProfile, setShowProfile] = useState(false);
  const [showSupport, setShowSupport] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<{sender_id: number, text: string, timestamp: string}[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [showDriverProfile, setShowDriverProfile] = useState(false);
  const [supportMessage, setSupportMessage] = useState("");
  const [supportChat, setSupportChat] = useState<{role: 'user' | 'ai', text: string}[]>([]);
  const [isSupportLoading, setIsSupportLoading] = useState(false);
  const [showRating, setShowRating] = useState<number | null>(null);
  const [selectedRideDetails, setSelectedRideDetails] = useState<Ride | null>(null);
  const [ratingValue, setRatingValue] = useState(5);
  const [reviewText, setReviewText] = useState("");

  const [profileData, setProfileData] = useState({
    name: user.name,
    phone: user.phone || "",
    home_address: user.home_address || "",
    work_address: user.work_address || ""
  });

  useEffect(() => {
    fetchHistory();
    fetchNearbyDrivers();
    const interval = setInterval(fetchNearbyDrivers, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchNearbyDrivers = async () => {
    try {
      const res = await fetch("/api/drivers/nearby", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setNearbyDrivers(data);
    } catch (err) {
      console.error("Failed to fetch nearby drivers");
    }
  };

  useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      if (data.type === "ride_accepted") {
        setActiveRide(prev => ({ ...prev, ...data, status: 'accepted' }));
        fetchHistory();
      }
      if (data.type === "ride_started") {
        setActiveRide(prev => ({ ...prev, status: 'ongoing' }));
      }
      if (data.type === "ride_completed") {
        setShowRating(data.rideId);
        setActiveRide(null);
        setDriverLocation(null);
        fetchHistory();
      }
      if (data.type === "driver_location") {
        setDriverLocation({ lat: data.lat, lng: data.lng });
      }
      if (data.type === "new_chat_message") {
        setChatMessages(prev => [...prev, { sender_id: data.senderId, text: data.text, timestamp: data.timestamp }]);
      }
    };

    ws.addEventListener("message", handleMessage);
    return () => ws.removeEventListener("message", handleMessage);
  }, [ws]);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`/api/rides/history/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setHistory(data);
      
      // Check for active ride
      const active = data.find((r: Ride) => r.status === 'pending' || r.status === 'accepted' || r.status === 'ongoing');
      if (active) setActiveRide(active);
    } catch (err) {
      console.error("Failed to fetch history");
    }
  };

  const applyDiscount = () => {
    if (discountCode.toLowerCase() === "ucab50") {
      setAppliedDiscount(50);
    } else {
      alert("Invalid discount code");
    }
  };

  const toggleRefreshment = (id: string) => {
    setSelectedRefreshments(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBook = async () => {
    if (!pickup || !dropoff) return;
    setLoading(true);
    try {
      const baseFare = Math.floor(Math.random() * 20) + 10 * selectedCab.price;
      const refreshmentTotal = selectedRefreshments.reduce((acc, id) => {
        const item = REFRESHMENTS.find(r => r.id === id);
        return acc + (item?.price || 0);
      }, 0);
      
      const finalFare = Math.max(0, baseFare + refreshmentTotal + (isDonating ? 10 : 0) - appliedDiscount);

      const res = await fetch("/api/rides/book", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          userId: user.id, 
          pickup, 
          dropoff, 
          fare: finalFare,
          discount: appliedDiscount,
          donation: isDonating ? 10 : 0,
          refreshments: selectedRefreshments,
          paymentMethod: selectedPayment.id
        }),
      });
      const data = await res.json();
      if (res.ok) {
        onRideBooked(data.rideId);
        await fetchHistory();
        // Reset states
        setPickup("");
        setDropoff("");
        setDiscountCode("");
        setAppliedDiscount(0);
        setIsDonating(false);
        setSelectedRefreshments([]);
        setShowExtras(false);
      }
    } catch (err) {
      console.error("Booking failed");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const res = await fetch("/api/user/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId: user.id, ...profileData }),
      });
      if (res.ok) {
        onUserUpdate({ ...user, ...profileData });
        setShowProfile(false);
      }
    } catch (err) {
      console.error("Failed to update profile");
    }
  };

  const handleSendSupport = async () => {
    if (!supportMessage.trim()) return;
    const userMsg = supportMessage;
    setSupportChat(prev => [...prev, { role: 'user', text: userMsg }]);
    setSupportMessage("");
    setIsSupportLoading(true);
    try {
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ message: userMsg }),
      });
      const data = await res.json();
      setSupportChat(prev => [...prev, { role: 'ai', text: data.reply }]);
    } catch (err) {
      setSupportChat(prev => [...prev, { role: 'ai', text: "Sorry, I'm having trouble connecting to support right now." }]);
    } finally {
      setIsSupportLoading(false);
    }
  };

  const handleSubmitRating = async () => {
    if (!showRating) return;
    try {
      await fetch("/api/rides/rate", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rideId: showRating, rating: ratingValue, review: reviewText }),
      });
      setShowRating(null);
      setRatingValue(5);
      setReviewText("");
      fetchHistory();
    } catch (err) {
      console.error("Failed to submit rating");
    }
  };

  const handleCancelRide = async (rideId: number) => {
    try {
      const res = await fetch("/api/rides/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rideId }),
      });
      if (res.ok) {
        setActiveRide(null);
        fetchHistory();
      }
    } catch (err) {
      console.error("Failed to cancel ride");
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
    if (!chatInput.trim() || !activeRide || !ws) return;
    const receiverId = activeRide.driver?.user_id || activeRide.driver_id;
    if (!receiverId) return;

    const msg = {
      type: "chat_message",
      rideId: activeRide.id || activeRide.rideId,
      text: chatInput,
      receiverId
    };
    ws.send(JSON.stringify(msg));
    setChatMessages(prev => [...prev, { sender_id: user.id, text: chatInput, timestamp: new Date().toISOString() }]);
    setChatInput("");
  };

  return (
    <div className="pt-24 pb-12 px-6 max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 relative">
      {/* Profile Modal */}
      <AnimatePresence>
        {showProfile && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowProfile(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] p-10 shadow-2xl overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-2xl" />
              <h2 className="text-3xl font-black mb-8 flex items-center gap-3">
                <UserIcon className="text-emerald-500" />
                Your Profile
              </h2>
              
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Full Name</label>
                  <input 
                    type="text" 
                    value={profileData.name}
                    onChange={(e) => setProfileData({...profileData, name: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl py-4 px-6 focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Phone Number</label>
                  <input 
                    type="text" 
                    value={profileData.phone}
                    onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl py-4 px-6 focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Home Address</label>
                  <input 
                    type="text" 
                    value={profileData.home_address}
                    onChange={(e) => setProfileData({...profileData, home_address: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl py-4 px-6 focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-2 block">Work Address</label>
                  <input 
                    type="text" 
                    value={profileData.work_address}
                    onChange={(e) => setProfileData({...profileData, work_address: e.target.value})}
                    className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl py-4 px-6 focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>
                
                <div className="pt-4 flex gap-3">
                  <button 
                    onClick={handleUpdateProfile}
                    className="flex-1 bg-zinc-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-zinc-800 transition-all"
                  >
                    Save Changes
                  </button>
                  <button 
                    onClick={() => setShowProfile(false)}
                    className="px-6 bg-zinc-100 text-zinc-500 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-zinc-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Ride Details Modal */}
      <AnimatePresence>
        {selectedRideDetails && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRideDetails(null)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-white rounded-[40px] p-10 shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-black">Ride Details</h2>
                <button onClick={() => setSelectedRideDetails(null)} className="p-2 bg-zinc-100 rounded-xl text-zinc-400 hover:text-zinc-600 transition-all">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-8">
                <div className="flex items-center justify-between p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                  <div>
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Total Fare</p>
                    <p className="text-4xl font-black text-zinc-900">₹{selectedRideDetails.fare}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Status</p>
                    <span className="px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-widest">
                      {selectedRideDetails.status}
                    </span>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Pickup</p>
                      <p className="font-bold text-zinc-700">{selectedRideDetails.pickup_address}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-zinc-100 flex items-center justify-center shrink-0">
                      <Navigation className="w-5 h-5 text-zinc-400" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Drop-off</p>
                      <p className="font-bold text-zinc-700">{selectedRideDetails.dropoff_address}</p>
                    </div>
                  </div>
                </div>

                {selectedRideDetails.driver && (
                  <div className="p-6 bg-zinc-900 rounded-3xl text-white">
                    <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-4">Your Driver</p>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <img src={`https://picsum.photos/seed/driver${selectedRideDetails.driver_id}/48/48`} className="w-12 h-12 rounded-2xl border-2 border-white/20" alt="driver" />
                        <div>
                          <p className="font-black">{selectedRideDetails.driver.name}</p>
                          <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">{selectedRideDetails.driver.vehicle} • {selectedRideDetails.driver.plate}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 text-amber-400">
                        <Star className="w-4 h-4 fill-current" />
                        <span className="text-sm font-black">4.9</span>
                      </div>
                    </div>
                    {selectedRideDetails.driver.car_image && (
                      <div className="rounded-2xl overflow-hidden border border-white/10">
                        <img src={selectedRideDetails.driver.car_image} className="w-full h-32 object-cover" alt="car" />
                      </div>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Date</p>
                    <p className="text-sm font-bold">{new Date(selectedRideDetails.created_at).toLocaleDateString()}</p>
                  </div>
                  <div className="p-4 bg-zinc-50 rounded-2xl border border-zinc-100">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Payment</p>
                    <p className="text-sm font-bold uppercase">{selectedRideDetails.payment_method}</p>
                  </div>
                </div>

                {/* Receipt Breakdown */}
                <div className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100 space-y-3">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4">Fare Breakdown</p>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500 font-medium">Base Fare</span>
                    <span className="font-bold">₹{selectedRideDetails.fare + selectedRideDetails.discount - selectedRideDetails.donation - (JSON.parse(selectedRideDetails.refreshments || "[]") as string[]).reduce((acc, r) => acc + (REFRESHMENTS.find(item => item.id === r)?.price || 0), 0)}</span>
                  </div>
                  {(JSON.parse(selectedRideDetails.refreshments || "[]") as string[]).map(r => (
                    <div key={r} className="flex justify-between text-sm">
                      <span className="text-zinc-500 font-medium">{REFRESHMENTS.find(item => item.id === r)?.name}</span>
                      <span className="font-bold">₹{REFRESHMENTS.find(item => item.id === r)?.price}</span>
                    </div>
                  ))}
                  {selectedRideDetails.donation > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500 font-medium">Charity Donation</span>
                      <span className="font-bold">₹{selectedRideDetails.donation}</span>
                    </div>
                  )}
                  {selectedRideDetails.discount > 0 && (
                    <div className="flex justify-between text-sm text-emerald-600">
                      <span className="font-medium">Promo Discount</span>
                      <span className="font-bold">-₹{selectedRideDetails.discount}</span>
                    </div>
                  )}
                  <div className="pt-3 border-t border-zinc-200 flex justify-between items-center">
                    <span className="font-black text-zinc-900">Total Paid</span>
                    <span className="text-xl font-black text-zinc-900">₹{selectedRideDetails.fare}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Driver Profile Modal */}
      <AnimatePresence>
        {showDriverProfile && activeRide?.driver && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              onClick={() => setShowDriverProfile(false)}
              className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-md bg-white rounded-[40px] p-10 shadow-2xl overflow-hidden"
            >
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <img src={`https://picsum.photos/seed/driver${activeRide.driver.id}/120/120`} className="w-32 h-32 rounded-[40px] border-4 border-emerald-500 shadow-xl" alt="driver" />
                  <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white p-2 rounded-2xl shadow-lg">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                </div>
                <h2 className="text-3xl font-black mb-1">{activeRide.driver.name}</h2>
                <p className="text-xs font-black text-zinc-400 uppercase tracking-widest mb-6">Professional Driver • 4.9 ★</p>
                
                {activeRide.driver.car_image && (
                  <div className="w-full mb-6 rounded-3xl overflow-hidden border border-zinc-100 shadow-sm">
                    <img src={activeRide.driver.car_image} className="w-full h-40 object-cover" alt="car" />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 w-full mb-8">
                  <div className="bg-zinc-50 p-4 rounded-3xl border border-zinc-100">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Vehicle</p>
                    <p className="font-bold">{activeRide.driver.vehicle}</p>
                  </div>
                  <div className="bg-zinc-50 p-4 rounded-3xl border border-zinc-100">
                    <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">Plate</p>
                    <p className="font-bold">{activeRide.driver.plate}</p>
                  </div>
                </div>

                <div className="w-full space-y-4">
                  <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <Zap className="w-5 h-5 text-emerald-500" />
                      <span className="text-sm font-bold">500+ Rides Completed</span>
                    </div>
                    <Check className="w-4 h-4 text-emerald-500" />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-zinc-50 rounded-2xl">
                    <div className="flex items-center gap-3">
                      <ShieldCheck className="w-5 h-5 text-zinc-400" />
                      <span className="text-sm font-bold">Background Verified</span>
                    </div>
                    <Check className="w-4 h-4 text-emerald-500" />
                  </div>
                </div>

                <button 
                  onClick={() => setShowDriverProfile(false)}
                  className="mt-8 w-full bg-zinc-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-zinc-800 transition-all"
                >
                  Close Profile
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Driver Chat Modal */}
      <AnimatePresence>
        {showChat && activeRide && (
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
                  <img src={`https://picsum.photos/seed/driver${activeRide.driver?.id}/40/40`} className="w-10 h-10 rounded-xl border border-white/20" alt="driver" />
                  <div>
                    <p className="font-black">{activeRide.driver?.name || 'Driver'}</p>
                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">Online • In-ride Chat</p>
                  </div>
                </div>
                <button onClick={() => setShowChat(false)} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                  <X className="w-6 h-6" />
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
                    <Send className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {activeRide && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 w-[90%] max-w-lg"
          >
            <div className="glass p-6 rounded-[32px] flex items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500 flex items-center justify-center text-white relative">
                  <Car className="w-8 h-8" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full animate-ping" />
                </div>
                <div>
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">
                    {activeRide.status === 'pending' ? 'Searching for Driver' : 
                     activeRide.status === 'accepted' ? 'Driver is Arriving' : 'Ride in Progress'}
                  </p>
                  <p className="text-lg font-black text-zinc-900">
                    {activeRide.status === 'pending' ? 'Finding your ride...' : 
                     activeRide.status === 'accepted' ? 'Driver is on the way' : 'Heading to destination'}
                  </p>
                  <button 
                    onClick={() => activeRide.driver && setShowDriverProfile(true)}
                    className="text-xs text-zinc-500 font-medium hover:text-emerald-600 transition-colors"
                  >
                    {activeRide.status === 'pending' ? 'Nearby drivers notified' : `${activeRide.driver?.vehicle} • ${activeRide.driver?.plate}`}
                  </button>
                </div>
              </div>
              <div className="flex gap-2">
                <button className="p-3 bg-zinc-100 rounded-xl hover:bg-zinc-200 transition-all">
                  <Phone className="w-5 h-5 text-zinc-600" />
                </button>
                <button 
                  onClick={() => {
                    setShowChat(true);
                    fetchChatMessages(activeRide.id || activeRide.rideId);
                  }}
                  className="p-3 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-all relative"
                >
                  <MessageSquare className="w-5 h-5 text-white" />
                </button>
                <button 
                  onClick={() => handleCancelRide(activeRide.id || activeRide.rideId)}
                  className="p-3 bg-zinc-900 rounded-xl hover:bg-zinc-800 transition-all"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
                <button 
                  onClick={() => alert("SOS Alert Sent to Emergency Services and Emergency Contacts!")}
                  className="p-3 bg-red-500 rounded-xl hover:bg-red-600 transition-all shadow-lg shadow-red-200"
                >
                  <ShieldCheck className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Booking Section */}
      <div className="lg:col-span-5 space-y-6">
        {/* Nearby Drivers Indicator */}
        <div className="bg-emerald-500 rounded-3xl p-6 text-white flex items-center justify-between shadow-2xl shadow-emerald-200/50 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:scale-150 transition-transform duration-700" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider opacity-80">Nearby Cabs</p>
              <p className="text-2xl font-black">{nearbyDrivers.length} Available</p>
            </div>
          </div>
          <div className="flex -space-x-3 relative z-10">
            {nearbyDrivers.slice(0, 4).map((driver, i) => (
              <div key={driver.id} className="w-10 h-10 rounded-full border-4 border-emerald-500 bg-zinc-100 overflow-hidden shadow-lg">
                <img src={`https://picsum.photos/seed/driver${driver.id}/40/40`} alt="driver" referrerPolicy="no-referrer" />
              </div>
            ))}
          </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-[40px] shadow-2xl shadow-zinc-200/50 p-8 border border-zinc-100"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-display font-black flex items-center gap-2">
              <Navigation className="text-emerald-500" />
              Book a Ride
            </h2>
            <div className="flex gap-2">
              <button onClick={() => setShowProfile(true)} className="p-3 bg-zinc-50 rounded-2xl text-zinc-400 hover:text-emerald-500 transition-all">
                <UserIcon className="w-5 h-5" />
              </button>
              <div className="flex gap-1 items-center">
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <div className="w-2 h-2 rounded-full bg-zinc-200" />
              </div>
            </div>
          </div>

          <div className="space-y-4 relative mb-8">
            <div className="absolute left-6 top-1/2 -translate-y-1/2 w-0.5 h-12 bg-zinc-100 z-0" />
            
            <div className="relative z-10">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-emerald-500 bg-white" />
              <input
                type="text"
                placeholder="Pickup Location"
                className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl py-5 pl-12 pr-24 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-zinc-900"
                value={pickup}
                onChange={(e) => setPickup(e.target.value)}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1">
                {user.home_address && (
                  <button onClick={() => setPickup(user.home_address!)} className="p-2 bg-white rounded-lg text-zinc-400 hover:text-emerald-500 shadow-sm transition-all">
                    <Home className="w-4 h-4" />
                  </button>
                )}
                {user.work_address && (
                  <button onClick={() => setPickup(user.work_address!)} className="p-2 bg-white rounded-lg text-zinc-400 hover:text-emerald-500 shadow-sm transition-all">
                    <Briefcase className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="relative z-10">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 bg-zinc-900 rounded-sm" />
              <input
                type="text"
                placeholder="Drop-off Location"
                className="w-full bg-zinc-50 border border-zinc-100 rounded-2xl py-5 pl-12 pr-24 focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-zinc-900"
                value={dropoff}
                onChange={(e) => setDropoff(e.target.value)}
              />
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1">
                {user.home_address && (
                  <button onClick={() => setDropoff(user.home_address!)} className="p-2 bg-white rounded-lg text-zinc-400 hover:text-emerald-500 shadow-sm transition-all">
                    <Home className="w-4 h-4" />
                  </button>
                )}
                {user.work_address && (
                  <button onClick={() => setDropoff(user.work_address!)} className="p-2 bg-white rounded-lg text-zinc-400 hover:text-emerald-500 shadow-sm transition-all">
                    <Briefcase className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em]">Select Ride Type</h3>
              <button className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">View All</button>
            </div>
            <div className="grid grid-cols-1 gap-3">
              {CAB_TYPES.map((cab) => (
                <button
                  key={cab.id}
                  onClick={() => setSelectedCab(cab)}
                  className={`w-full flex items-center justify-between p-5 rounded-3xl border-2 transition-all duration-300 ${
                    selectedCab.id === cab.id 
                      ? "border-emerald-500 bg-emerald-50/30 shadow-lg shadow-emerald-500/5" 
                      : "border-zinc-50 hover:border-zinc-200 bg-white"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-2xl transition-colors ${selectedCab.id === cab.id ? "bg-emerald-500 text-white" : "bg-zinc-100 text-zinc-500"}`}>
                      <cab.icon className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <p className="font-black text-zinc-900 text-lg">{cab.name}</p>
                      <p className="text-xs text-zinc-400 font-bold">{cab.desc}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-zinc-900 text-lg">₹{(15 * cab.price).toFixed(0)}</p>
                    <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">{cab.time}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Payment Method */}
          <div className="mb-8">
            <h3 className="text-xs font-black text-zinc-400 uppercase tracking-[0.2em] mb-4">Payment Method</h3>
            <div className="flex gap-3 overflow-x-auto pb-4 no-scrollbar">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.id}
                  onClick={() => setSelectedPayment(method)}
                  className={`shrink-0 flex items-center gap-4 px-6 py-4 rounded-2xl border-2 transition-all ${
                    selectedPayment.id === method.id ? "border-emerald-500 bg-emerald-50" : "border-zinc-50 bg-white hover:border-zinc-200"
                  }`}
                >
                  <div className={`p-2 rounded-lg ${selectedPayment.id === method.id ? "bg-emerald-500 text-white" : "bg-zinc-100 text-zinc-400"}`}>
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-black text-zinc-900">{method.name}</p>
                    <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">{method.type}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Extras Toggle */}
          <button 
            onClick={() => setShowExtras(!showExtras)}
            className="w-full mb-8 flex items-center justify-between p-5 bg-zinc-50 rounded-3xl text-zinc-600 hover:bg-zinc-100 transition-all font-black text-xs uppercase tracking-widest"
          >
            Add Extras & Discounts
            <MoreHorizontal className={`w-5 h-5 transition-transform ${showExtras ? 'rotate-90' : ''}`} />
          </button>

          <AnimatePresence>
            {showExtras && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden space-y-6 mb-8"
              >
                {/* Discount */}
                <div className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                    <Gift className="w-3 h-3" /> Promo Code
                  </p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Enter UCAB50"
                      className="flex-1 bg-white border border-zinc-200 rounded-2xl py-3 px-5 focus:outline-none focus:border-emerald-500 text-sm font-bold"
                      value={discountCode}
                      onChange={(e) => setDiscountCode(e.target.value)}
                    />
                    <button 
                      onClick={applyDiscount}
                      className="bg-zinc-900 text-white px-6 py-3 rounded-2xl text-sm font-black uppercase tracking-widest hover:bg-zinc-800 transition-all"
                    >
                      Apply
                    </button>
                  </div>
                  {appliedDiscount > 0 && (
                    <p className="text-emerald-600 text-[10px] font-black uppercase tracking-widest mt-2">✓ ₹{appliedDiscount} discount applied!</p>
                  )}
                </div>

                {/* Donation */}
                <div className="flex items-center justify-between p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                  <div className="flex items-center gap-4">
                    <div className="bg-white p-3 rounded-2xl text-emerald-500 shadow-sm">
                      <Heart className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="text-sm font-black text-zinc-900">Donate to Charity</p>
                      <p className="text-[10px] text-emerald-600 font-black uppercase tracking-widest">Add ₹10 to your ride</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setIsDonating(!isDonating)}
                    className={`w-14 h-8 rounded-full transition-all relative ${isDonating ? 'bg-emerald-500' : 'bg-zinc-200'}`}
                  >
                    <div className={`absolute top-1.5 w-5 h-5 bg-white rounded-full transition-all shadow-sm ${isDonating ? 'left-7.5' : 'left-1.5'}`} />
                  </button>
                </div>

                {/* Refreshments */}
                <div className="p-6 bg-zinc-50 rounded-3xl border border-zinc-100">
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                    <Coffee className="w-3 h-3" /> In-Ride Refreshments
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                    {REFRESHMENTS.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => toggleRefreshment(item.id)}
                        className={`flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                          selectedRefreshments.includes(item.id) ? "border-emerald-500 bg-emerald-50/50" : "border-white bg-white hover:border-zinc-200"
                        }`}
                      >
                        <span className="text-sm font-bold text-zinc-700">{item.name}</span>
                        <div className="flex items-center gap-4">
                          <span className="text-sm font-black text-zinc-900">₹{item.price}</span>
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                            selectedRefreshments.includes(item.id) ? "bg-emerald-500 border-emerald-500" : "border-zinc-200"
                          }`}>
                            {selectedRefreshments.includes(item.id) && <Check className="w-3 h-3 text-white" />}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={handleBook}
            disabled={loading || !pickup || !dropoff}
            className="w-full bg-zinc-900 text-white py-6 rounded-3xl font-black text-lg uppercase tracking-[0.1em] hover:bg-zinc-800 transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 group shadow-2xl shadow-zinc-900/20"
          >
            {loading ? (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                Finding Cabs...
              </div>
            ) : (
              <>
                Confirm Booking
                <ArrowRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </motion.div>
      </div>

      {/* Map & History Section */}
      <div className="lg:col-span-7 space-y-6">
        {/* Virtual Map */}
        <div className="h-[400px] w-full relative">
          <VirtualMap active={!!activeRide} drivers={nearbyDrivers} />
          <div className="absolute top-6 left-6 glass px-4 py-2 rounded-full flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest text-zinc-900">Live Traffic Updates</span>
          </div>
        </div>

        {/* History */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="bg-white rounded-[40px] shadow-2xl shadow-zinc-200/50 p-8 border border-zinc-100"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-display font-black flex items-center gap-2">
              <Clock className="text-emerald-500" />
              Ride History
            </h2>
            <button 
              onClick={fetchHistory} 
              className="bg-zinc-50 p-3 rounded-2xl text-zinc-400 hover:text-emerald-500 hover:bg-emerald-50 transition-all"
            >
              <Zap className="w-5 h-5" />
            </button>
          </div>

          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 no-scrollbar">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-300">
                <div className="bg-zinc-50 p-8 rounded-[32px] mb-6">
                  <Car className="w-16 h-16 opacity-10" />
                </div>
                <p className="font-black uppercase tracking-widest text-xs">No rides yet</p>
              </div>
            ) : (
              history.map((ride) => {
                const refreshments = JSON.parse(ride.refreshments || "[]") as string[];
                return (
                  <motion.div 
                    key={ride.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    onClick={() => setSelectedRideDetails(ride)}
                    className="p-6 rounded-[32px] bg-zinc-50/50 border border-zinc-100 hover:border-emerald-200 hover:bg-white transition-all group cursor-pointer"
                  >
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="bg-white p-3 rounded-2xl shadow-sm group-hover:bg-emerald-500 group-hover:text-white transition-all">
                          <Car className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="font-black text-zinc-900">Ride #{ride.id}</p>
                          <p className="text-[10px] text-zinc-400 font-black uppercase tracking-widest">{new Date(ride.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                          ride.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                          ride.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {ride.status}
                        </span>
                        <p className="mt-2 font-black text-xl text-zinc-900">₹{ride.fare}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-4 relative">
                      <div className="absolute left-2 top-1/2 -translate-y-1/2 w-0.5 h-6 bg-zinc-200" />
                      <div className="flex items-center gap-4 text-sm">
                        <div className="w-4 h-4 rounded-full border-2 border-emerald-500 bg-white shrink-0" />
                        <span className="font-bold text-zinc-600 truncate">{ride.pickup_address}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="w-4 h-4 bg-zinc-900 rounded-sm shrink-0" />
                        <span className="font-bold text-zinc-600 truncate">{ride.dropoff_address}</span>
                      </div>
                    </div>

                    {(refreshments.length > 0 || ride.donation > 0 || ride.discount > 0) && (
                      <div className="mt-6 pt-6 border-t border-zinc-100 flex flex-wrap gap-2">
                        {refreshments.map(r => (
                          <span key={r} className="text-[10px] bg-zinc-100 text-zinc-500 px-3 py-1 rounded-full font-black uppercase tracking-widest">
                            {r}
                          </span>
                        ))}
                        {ride.donation > 0 && (
                          <span className="text-[10px] bg-emerald-50 text-emerald-600 px-3 py-1 rounded-full font-black uppercase tracking-widest">
                            Donation
                          </span>
                        )}
                        {ride.discount > 0 && (
                          <span className="text-[10px] bg-blue-50 text-blue-600 px-3 py-1 rounded-full font-black uppercase tracking-widest">
                            -₹{ride.discount} OFF
                          </span>
                        )}
                      </div>
                    )}
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
