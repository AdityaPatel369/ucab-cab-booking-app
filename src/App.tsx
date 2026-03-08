import { useState, useEffect, useCallback } from "react";
import { User, UserRole } from "./types";
import Navbar from "./components/Navbar";
import Auth from "./components/Auth";
import UserDashboard from "./components/UserDashboard";
import DriverDashboard from "./components/DriverDashboard";
import { motion, AnimatePresence } from "motion/react";
import { Car, MapPin, Shield, Star, Clock, Zap, ArrowRight, ShieldCheck, Heart } from "lucide-react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [page, setPage] = useState("home");
  const [ws, setWs] = useState<WebSocket | null>(null);

  const connectWS = useCallback((authToken: string) => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${protocol}//${window.location.host}`);
    
    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "auth", token: authToken }));
    };

    socket.onclose = () => {
      setTimeout(() => connectWS(authToken), 3000);
    };

    setWs(socket);
  }, []);

  useEffect(() => {
    const savedUser = localStorage.getItem("ucab_user");
    const savedToken = localStorage.getItem("ucab_token");
    if (savedUser && savedToken) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setToken(savedToken);
      connectWS(savedToken);
      setPage("dashboard");
    }
  }, [connectWS]);

  const handleAuth = (userData: User, authToken: string) => {
    setUser(userData);
    setToken(authToken);
    localStorage.setItem("ucab_user", JSON.stringify(userData));
    localStorage.setItem("ucab_token", authToken);
    connectWS(authToken);
    setPage("dashboard");
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem("ucab_user");
    localStorage.removeItem("ucab_token");
    if (ws) ws.close();
    setPage("home");
  };

  const renderPage = () => {
    if (page === "login") return <Auth onAuth={handleAuth} />;
    
    if (page === "dashboard") {
      if (!user) return <Auth onAuth={handleAuth} />;
      return user.role === "driver" 
        ? <DriverDashboard user={user} token={token!} ws={ws} />
        : <UserDashboard user={user} token={token!} onRideBooked={() => {}} />;
    }

    if (page === "history") {
      if (!user) return <Auth onAuth={handleAuth} />;
      return <UserDashboard user={user} token={token!} onRideBooked={() => {}} />;
    }

    return (
      <div className="pt-16">
        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex items-center px-6 overflow-hidden">
          <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
            <motion.div
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 px-4 py-2 rounded-full text-sm font-bold mb-6">
                <Zap className="w-4 h-4" />
                <span>Fastest Cab Service in Town</span>
              </div>
              <h1 className="text-6xl lg:text-8xl font-black tracking-tight text-zinc-900 leading-[0.9] mb-8">
                Ride with <br />
                <span className="text-emerald-500">Confidence.</span>
              </h1>
              <p className="text-xl text-zinc-500 font-medium max-w-lg mb-10 leading-relaxed">
                Ucab is the simplest way to get around. Book a ride in seconds, track your driver, and arrive safely at your destination.
              </p>
              <div className="flex flex-wrap gap-4">
                <button 
                  onClick={() => setPage("login")}
                  className="bg-zinc-900 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:bg-zinc-800 transition-all active:scale-95 flex items-center gap-3 group shadow-xl shadow-zinc-200"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button className="bg-white text-zinc-900 border-2 border-zinc-100 px-8 py-4 rounded-2xl font-bold text-lg hover:bg-zinc-50 transition-all active:scale-95">
                  Learn More
                </button>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="relative hidden lg:block"
            >
              <div className="relative z-10 bg-white p-8 rounded-[40px] shadow-2xl shadow-zinc-200 border border-zinc-100">
                <img 
                  src="https://picsum.photos/seed/cab/800/600" 
                  alt="Cab" 
                  className="rounded-[32px] w-full h-[400px] object-cover mb-8"
                  referrerPolicy="no-referrer"
                />
                <div className="grid grid-cols-3 gap-6">
                  <div className="text-center">
                    <p className="text-3xl font-black text-zinc-900">10k+</p>
                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">Drivers</p>
                  </div>
                  <div className="text-center border-x border-zinc-100">
                    <p className="text-3xl font-black text-zinc-900">50k+</p>
                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">Users</p>
                  </div>
                  <div className="text-center">
                    <p className="text-3xl font-black text-zinc-900">4.9</p>
                    <p className="text-xs text-zinc-400 font-bold uppercase tracking-widest">Rating</p>
                  </div>
                </div>
              </div>
              {/* Decorative elements */}
              <div className="absolute -top-12 -right-12 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl" />
              <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl" />
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24 px-6 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-black text-zinc-900 mb-4">Why Choose Ucab?</h2>
              <p className="text-zinc-500 font-medium">Experience the future of urban mobility</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                { icon: ShieldCheck, title: "Safe & Secure", desc: "All our drivers are verified and rides are tracked in real-time for your safety." },
                { icon: Star, title: "Premium Experience", desc: "From mini to prime, we offer a range of vehicles to suit your comfort and budget." },
                { icon: Heart, title: "Community First", desc: "We support local drivers and offer donation options for every ride you take." }
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  className="p-8 rounded-3xl bg-zinc-50 border border-zinc-100 hover:border-emerald-200 transition-all group"
                >
                  <div className="bg-white p-4 rounded-2xl shadow-sm inline-block mb-6 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                    <feature.icon className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold mb-4">{feature.title}</h3>
                  <p className="text-zinc-500 font-medium leading-relaxed">{feature.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-6">
          <div className="max-w-5xl mx-auto bg-zinc-900 rounded-[40px] p-12 lg:p-20 text-center relative overflow-hidden">
            <div className="relative z-10">
              <h2 className="text-4xl lg:text-6xl font-black text-white mb-8">Ready to ride?</h2>
              <p className="text-zinc-400 text-xl mb-12 max-w-2xl mx-auto">Join thousands of happy riders and drivers today. Download the app or book online.</p>
              <button 
                onClick={() => setPage("login")}
                className="bg-emerald-500 text-white px-12 py-5 rounded-2xl font-bold text-xl hover:bg-emerald-600 transition-all active:scale-95 shadow-2xl shadow-emerald-500/20"
              >
                Sign Up Now
              </button>
            </div>
            <div className="absolute top-0 left-0 w-full h-full opacity-10">
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] border border-white rounded-full animate-pulse" />
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-white rounded-full" />
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 px-6 border-t border-zinc-100">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-2">
              <div className="bg-emerald-500 p-2 rounded-lg">
                <Car className="text-white w-5 h-5" />
              </div>
              <span className="text-xl font-bold tracking-tight">Ucab</span>
            </div>
            <div className="flex gap-8 text-sm font-bold text-zinc-400 uppercase tracking-widest">
              <a href="#" className="hover:text-zinc-900 transition-colors">About</a>
              <a href="#" className="hover:text-zinc-900 transition-colors">Privacy</a>
              <a href="#" className="hover:text-zinc-900 transition-colors">Terms</a>
              <a href="#" className="hover:text-zinc-900 transition-colors">Support</a>
            </div>
            <p className="text-zinc-400 text-sm font-medium">© 2026 Ucab Inc. All rights reserved.</p>
          </div>
        </footer>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-zinc-50">
      <Navbar user={user} onLogout={handleLogout} onNavigate={setPage} />
      <AnimatePresence mode="wait">
        <motion.div
          key={page}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {renderPage()}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
