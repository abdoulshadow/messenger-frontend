import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axios';

const Ctx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem('token');
    if (!t) { setLoading(false); return; }
    api.get('/users/me').then((r) => setUser(r.data)).catch(() => localStorage.removeItem('token')).finally(() => setLoading(false));
  }, []);

  const login = (token, u) => { localStorage.setItem('token', token); setUser(u); };
  const logout = () => { localStorage.removeItem('token'); setUser(null); };
  const updateUser = (u) => setUser((p) => ({ ...p, ...u }));

  return <Ctx.Provider value={{ user, loading, login, logout, updateUser }}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
