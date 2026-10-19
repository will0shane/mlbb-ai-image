import React from "react";
import { LogOut, KeyRound, RefreshCw, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext";

interface NavbarProps {
  onRefresh: () => void;
  refreshing: boolean;
  onOpenCreateModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onRefresh, refreshing, onOpenCreateModal }) => {
  const { user, logout } = useAuth();

  return (
    <header className="border-b border-navy-800 bg-navy-900/90 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-gold-600 to-gold-400 p-0.5 flex items-center justify-center shadow-lg shadow-gold-500/20">
            <div className="w-full h-full bg-navy-900 rounded-[10px] flex items-center justify-center">
              <KeyRound className="w-5 h-5 text-gold-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg text-slate-100 tracking-tight">MLBB Collage</span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gold-500/10 border border-gold-500/30 text-gold-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" /> Admin
              </span>
            </div>
            <p className="text-xs text-slate-400 hidden sm:block">Product Keys & Subscription Manager</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-navy-800 rounded-lg transition-colors border border-navy-800"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin text-gold-400" : ""}`} />
          </button>

          <button
            onClick={onOpenCreateModal}
            className="px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-navy-950 font-bold text-sm rounded-lg shadow-md shadow-gold-500/20 hover:shadow-gold-500/30 transition-all flex items-center gap-2 active:scale-95"
          >
            <KeyRound className="w-4 h-4" />
            <span>Generate Keys</span>
          </button>

          <div className="h-6 w-px bg-navy-800 mx-1 hidden sm:block" />

          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 hidden md:block max-w-[150px] truncate" title={user?.email || ""}>
              {user?.email}
            </span>
            <button
              onClick={() => logout()}
              className="px-3 py-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 border border-rose-500/20 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
