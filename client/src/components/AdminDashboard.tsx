import { useState, useEffect } from "react";
import { User } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { 
  Users, 
  Car, 
  TrendingUp, 
  History, 
  Search, 
  Filter, 
  MoreVertical, 
  ShieldCheck, 
  AlertCircle,
  X
} from "lucide-react";

interface AdminDashboardProps {
  user: User;
  token: string;
}

export default function AdminDashboard({ user, token }: AdminDashboardProps) {
  const [stats, setStats] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "users" | "drivers">("overview");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchStats();
    fetchUsers();
    fetchDrivers();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/admin/stats", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setStats(data);
    } catch (err) {
      console.error("Failed to fetch stats");
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      console.error("Failed to fetch users");
    }
  };

  const fetchDrivers = async () => {
    try {
      const res = await fetch("/api/admin/drivers", {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setDrivers(data);
    } catch (err) {
      console.error("Failed to fetch drivers");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50">
        <motion.div 
          animate={{ rotate: 360 }} 
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="pt-24 pb-12 px-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
        <div>
          <h1 className="text-5xl font-black tracking-tighter text-zinc-900 mb-2">Admin Control</h1>
          <p className="text-zinc-500 font-medium">Manage Ucab ecosystem and monitor performance.</p>
        </div>
        
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-zinc-100">
          {(["overview", "users", "drivers"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2.5 rounded-xl text-sm font-bold uppercase tracking-widest transition-all ${
                activeTab === tab 
                  ? "bg-zinc-900 text-white shadow-lg" 
                  : "text-zinc-400 hover:text-zinc-600"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "overview" && (
          <motion.div
            key="overview"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8"
          >
            {/* Stats Bento Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-8 rounded-[40px] shadow-sm border border-zinc-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-emerald-500/10 transition-all" />
                <Users className="text-emerald-500 mb-6 w-8 h-8" />
                <p className="text-4xl font-black text-zinc-900 mb-1">{stats?.users}</p>
                <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Total Riders</p>
              </div>
              
              <div className="bg-white p-8 rounded-[40px] shadow-sm border border-zinc-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-blue-500/10 transition-all" />
                <Car className="text-blue-500 mb-6 w-8 h-8" />
                <p className="text-4xl font-black text-zinc-900 mb-1">{stats?.drivers}</p>
                <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Active Drivers</p>
              </div>

              <div className="bg-white p-8 rounded-[40px] shadow-sm border border-zinc-100 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-amber-500/10 transition-all" />
                <History className="text-amber-500 mb-6 w-8 h-8" />
                <p className="text-4xl font-black text-zinc-900 mb-1">{stats?.rides}</p>
                <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">Total Rides</p>
              </div>

              <div className="bg-zinc-900 p-8 rounded-[40px] shadow-xl shadow-zinc-200 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                <TrendingUp className="text-emerald-400 mb-6 w-8 h-8" />
                <p className="text-4xl font-black text-white mb-1">₹{stats?.earnings.toLocaleString()}</p>
                <p className="text-xs font-black text-zinc-500 uppercase tracking-widest">Total Revenue</p>
              </div>
            </div>

            {/* Recent Activity Table */}
            <div className="bg-white rounded-[40px] shadow-sm border border-zinc-100 overflow-hidden">
              <div className="p-8 border-b border-zinc-100 flex justify-between items-center">
                <h3 className="text-xl font-black text-zinc-900">Recent Rides</h3>
                <button className="text-xs font-black text-emerald-500 uppercase tracking-widest hover:text-emerald-600 transition-all">View All</button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-zinc-50/50">
                      <th className="px-8 py-4 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">Rider</th>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">Driver</th>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">Fare</th>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">Status</th>
                      <th className="px-8 py-4 text-left text-[10px] font-black text-zinc-400 uppercase tracking-widest">Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {stats?.recentRides.map((ride: any) => (
                      <tr key={ride.id} className="hover:bg-zinc-50/50 transition-all">
                        <td className="px-8 py-6">
                          <p className="font-bold text-zinc-900">{ride.rider_name}</p>
                          <p className="text-[10px] text-zinc-400 font-medium truncate max-w-[150px]">{ride.pickup_address}</p>
                        </td>
                        <td className="px-8 py-6">
                          <p className="font-bold text-zinc-900">{ride.driver_name || "Unassigned"}</p>
                        </td>
                        <td className="px-8 py-6 font-black text-zinc-900">₹{ride.fare}</td>
                        <td className="px-8 py-6">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                            ride.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                            ride.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {ride.status}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-xs text-zinc-500 font-medium">
                          {new Date(ride.created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {(activeTab === "users" || activeTab === "drivers") && (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
                <input 
                  type="text" 
                  placeholder={`Search ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-white border border-zinc-100 rounded-2xl py-4 pl-12 pr-6 focus:outline-none focus:border-emerald-500 font-bold shadow-sm"
                />
              </div>
              <button className="bg-white border border-zinc-100 p-4 rounded-2xl text-zinc-400 hover:text-zinc-600 shadow-sm transition-all">
                <Filter className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(activeTab === "users" ? users : drivers)
                .filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.email.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((item) => (
                <motion.div 
                  key={item.id}
                  layout
                  className="bg-white p-8 rounded-[40px] shadow-sm border border-zinc-100 hover:border-emerald-200 transition-all group"
                >
                  <div className="flex justify-between items-start mb-6">
                    <img 
                      src={`https://picsum.photos/seed/${activeTab === 'users' ? 'user' : 'driver'}${item.id}/80/80`} 
                      className="w-16 h-16 rounded-[24px] shadow-lg" 
                      alt="avatar" 
                    />
                    <button className="p-2 hover:bg-zinc-50 rounded-xl transition-all text-zinc-400">
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <h4 className="text-xl font-black text-zinc-900 mb-1">{item.name}</h4>
                  <p className="text-xs font-bold text-zinc-400 mb-6">{item.email}</p>
                  
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 text-sm font-medium text-zinc-600">
                      <AlertCircle className="w-4 h-4 text-zinc-300" />
                      {item.phone || "No phone provided"}
                    </div>
                    
                    {activeTab === "drivers" && (
                      <div className="pt-4 border-t border-zinc-100 space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Vehicle</span>
                          <span className="text-xs font-bold">{item.vehicle_type} • {item.vehicle_number}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">Status</span>
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-widest ${
                            item.status === 'available' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                          }`}>
                            {item.status}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="mt-8 flex gap-3">
                    <button className="flex-1 bg-zinc-900 text-white py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all">
                      Edit Profile
                    </button>
                    <button className="px-4 bg-red-50 text-red-500 py-3 rounded-xl hover:bg-red-100 transition-all">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
