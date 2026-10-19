import React, { useState } from "react";
import { KeyRound, Lock, Mail, Loader2, AlertCircle } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export const LoginPage: React.FC = () => {
  const { login, authError } = useAuth();
  const [email, setEmail] = useState("mlbbaiimage@gmail.com");
  const [password, setPassword] = useState("mlbb03brimage");
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);
    setLoading(true);

    try {
      await login(email.trim(), password);
    } catch (err: any) {
      setLocalError(err.message || "Failed to sign in.");
    } finally {
      setLoading(false);
    }
  };

  const displayError = localError || authError;

  return (
    <div className="min-h-screen bg-navy-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gold-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-80 h-80 bg-sky-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex p-3 bg-gradient-to-tr from-gold-600 to-gold-400 rounded-2xl shadow-xl shadow-gold-500/20 mb-4">
            <div className="bg-navy-900 p-3 rounded-[13px]">
              <KeyRound className="w-8 h-8 text-gold-400" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">
            MLBB Collage Admin
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Sign in with your authorized administrator account
          </p>
        </div>

        {/* Card */}
        <div className="bg-navy-900 border border-navy-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl">
          {displayError && (
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              <div className="text-sm text-rose-300 font-medium">
                {displayError}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Admin Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@example.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-navy-950 border border-navy-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500 transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-navy-950 border border-navy-700 rounded-xl text-slate-100 text-sm focus:outline-none focus:border-gold-500 transition-colors"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-400 hover:to-gold-500 text-navy-950 font-bold text-sm rounded-xl shadow-lg shadow-gold-500/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 active:scale-98"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <span>Sign In</span>
                )}
              </button>
            </div>
          </form>
        </div>

        <p className="text-center text-xs text-slate-500 mt-6">
          Protected by Firebase Authentication with custom admin claims.
        </p>
      </div>
    </div>
  );
};
