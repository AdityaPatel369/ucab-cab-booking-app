import { Car, User, LogOut, History, LayoutDashboard } from "lucide-react";
import { User as UserType } from "../types";

interface NavbarProps {
  user: UserType | null;
  onLogout: () => void;
  onNavigate: (page: string) => void;
}

export default function Navbar({ user, onLogout, onNavigate }: NavbarProps) {
  return (
    <nav className="fixed top-0 left-0 right-0 h-16 glass z-50 flex items-center justify-between px-6">
      <div 
        className="flex items-center gap-2 cursor-pointer" 
        onClick={() => onNavigate("home")}
      >
        <div className="bg-emerald-500 p-2 rounded-xl">
          <Car className="text-white w-6 h-6" />
        </div>
        <span className="text-xl font-bold tracking-tight">Ucab</span>
      </div>

      <div className="flex items-center gap-6">
        {user ? (
          <>
            <button 
              onClick={() => onNavigate("dashboard")}
              className="flex items-center gap-2 text-zinc-600 hover:text-emerald-600 transition-colors"
            >
              <LayoutDashboard className="w-5 h-5" />
              <span className="hidden sm:inline font-medium">Dashboard</span>
            </button>
            <button 
              onClick={() => onNavigate("history")}
              className="flex items-center gap-2 text-zinc-600 hover:text-emerald-600 transition-colors"
            >
              <History className="w-5 h-5" />
              <span className="hidden sm:inline font-medium">History</span>
            </button>
            <div className="flex items-center gap-3 pl-4 border-l border-zinc-200">
              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold">{user.name}</span>
                <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">{user.role}</span>
              </div>
              <button 
                onClick={onLogout}
                className="p-2 hover:bg-zinc-100 rounded-lg transition-colors text-zinc-400 hover:text-red-500"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </>
        ) : (
          <button 
            onClick={() => onNavigate("login")}
            className="bg-zinc-900 text-white px-6 py-2 rounded-xl font-semibold hover:bg-zinc-800 transition-all active:scale-95"
          >
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
}
