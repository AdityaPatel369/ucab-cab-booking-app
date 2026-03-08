import { User, UserRole } from "../types";
import { Car, User as UserIcon, LogOut, History, LayoutDashboard } from "lucide-react";

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

export default function Navbar({ user, onLogout, onNavigate }: NavbarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-md border-b border-zinc-100 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div 
          className="flex items-center gap-2 cursor-pointer group"
          onClick={() => onNavigate("home")}
        >
          <div className="bg-emerald-500 p-2 rounded-lg group-hover:scale-110 transition-transform">
            <Car className="text-white w-5 h-5" />
          </div>
          <span className="text-2xl font-black tracking-tighter text-zinc-900">Ucab</span>
        </div>

        <div className="flex items-center gap-6">
          {user ? (
            <>
              <button 
                onClick={() => onNavigate("dashboard")}
                className="flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </button>
              <button 
                onClick={() => onNavigate("history")}
                className="flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                <History className="w-4 h-4" />
                History
              </button>
              <div className="h-6 w-px bg-zinc-100" />
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-bold text-zinc-900">{user.name}</p>
                  <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">{user.role}</p>
                </div>
                <div className="bg-zinc-100 p-2 rounded-full">
                  <UserIcon className="w-5 h-5 text-zinc-500" />
                </div>
                <button 
                  onClick={onLogout}
                  className="p-2 text-zinc-400 hover:text-red-500 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </>
          ) : (
            <button 
              onClick={() => onNavigate("login")}
              className="bg-zinc-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm hover:bg-zinc-800 transition-all active:scale-95"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
