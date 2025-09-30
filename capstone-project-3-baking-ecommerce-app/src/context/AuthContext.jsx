import { createContext, useContext, useEffect, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem("token"));
  const [loading, setLoading] = useState(false);

  function setAuth({ user, token }) {
    setUser(user);
    setToken(token);
    localStorage.setItem("user", JSON.stringify(user));
    localStorage.setItem("token", token);
  }

  function clearAuth() {
    setUser(null);
    setToken(null);
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  }

  async function login(email, password) {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/login", { email, password });
      setAuth({ user: data.user, token: data.token });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.response?.data?.error || "Login failed" };
    } finally {
      setLoading(false);
    }
  }

  async function signup(email, password) {
    setLoading(true);
    try {
      const { data } = await api.post("/auth/signup", { email, password });
      setAuth({ user: data.user, token: data.token });
      return { ok: true };
    } catch (err) {
      return { ok: false, error: err.response?.data?.error || "Signup failed" };
    } finally {
      setLoading(false);
    }
  }

  async function fetchMe() {
    if (!token) return null;
    try {
      const { data } = await api.get("/auth/me");
      setUser(data);
      localStorage.setItem("user", JSON.stringify(data));
      return data;
    } catch {
      clearAuth();
      return null;
    }
  }

  useEffect(() => {
    if (token && !user) fetchMe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, clearAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
