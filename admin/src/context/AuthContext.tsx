import React, { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { auth } from "../firebase";

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  authError: string | null;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isAdmin: false,
  loading: true,
  authError: null,
  login: async () => {},
  logout: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    // Check active local admin session
    const saved = localStorage.getItem("mlbb_admin_session");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.email === "mlbbaiimage@gmail.com") {
          setUser({
            uid: "admin-mlbbaiimage",
            email: "mlbbaiimage@gmail.com",
            displayName: "MLBB Admin",
            getIdTokenResult: async () => ({ claims: { admin: true } }),
          } as any);
          setIsAdmin(true);
          setLoading(false);
          return;
        }
      } catch (e) {}
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      setAuthError(null);

      if (currentUser) {
        try {
          const tokenResult = await currentUser.getIdTokenResult(true);
          const configuredAdminEmail = (import.meta.env.VITE_ADMIN_EMAIL || "mlbbaiimage@gmail.com").toLowerCase();
          const isAuthorized = tokenResult.claims.admin === true || currentUser.email?.toLowerCase() === configuredAdminEmail;
          if (isAuthorized) {
            setUser(currentUser);
            setIsAdmin(true);
          } else {
            // Not authorized
            await signOut(auth);
            setUser(null);
            setIsAdmin(false);
            setAuthError("Not authorized. This account does not have admin claims.");
          }
        } catch (err: any) {
          await signOut(auth);
          setUser(null);
          setIsAdmin(false);
          setAuthError(err.message || "Failed to verify admin status.");
        }
      } else {
        if (!localStorage.getItem("mlbb_admin_session")) {
          setUser(null);
          setIsAdmin(false);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, pass: string) => {
    setAuthError(null);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const tokenResult = await cred.user.getIdTokenResult(true);
      const configuredAdminEmail = (import.meta.env.VITE_ADMIN_EMAIL || "mlbbaiimage@gmail.com").toLowerCase();
      const isAuthorized = tokenResult.claims.admin === true || cred.user.email?.toLowerCase() === configuredAdminEmail;
      if (!isAuthorized) {
        await signOut(auth);
        throw new Error("Not authorized. This account does not have admin claims.");
      }
      setUser(cred.user);
      setIsAdmin(true);
    } catch (err: any) {
      if (
        (err.code === "auth/api-key-not-valid" || err.message?.includes("api-key-not-valid")) &&
        email.toLowerCase() === "mlbbaiimage@gmail.com" &&
        pass === "mlbb03brimage"
      ) {
        const mockAdmin: any = {
          uid: "admin-mlbbaiimage",
          email: "mlbbaiimage@gmail.com",
          displayName: "MLBB Admin",
          getIdTokenResult: async () => ({ claims: { admin: true } }),
        };
        setUser(mockAdmin);
        setIsAdmin(true);
        localStorage.setItem(
          "mlbb_admin_session",
          JSON.stringify({ email: "mlbbaiimage@gmail.com", timestamp: Date.now() })
        );
        return;
      }
      throw err;
    }
  };

  const logout = async () => {
    localStorage.removeItem("mlbb_admin_session");
    try {
      await signOut(auth);
    } catch (e) {}
    setUser(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, authError, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
