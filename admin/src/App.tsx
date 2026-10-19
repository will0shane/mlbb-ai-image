import React from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { DashboardPage } from "./pages/DashboardPage";
import { Loader2 } from "lucide-react";

const AppContent: React.FC = () => {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-navy-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-8 h-8 text-gold-400 animate-spin" />
        <span className="text-sm font-semibold tracking-wide">Authenticating Admin Session...</span>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <LoginPage />;
  }

  return <DashboardPage />;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
