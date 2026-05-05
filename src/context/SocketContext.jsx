import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';

const Ctx = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!user) return;

    // En prod on se connecte au backend Render, en local au proxy Vite
    const SERVER_URL = import.meta.env.VITE_API_URL || window.location.origin;

    const s = io(SERVER_URL, {
      auth: { token: localStorage.getItem('token') },
      transports: ['websocket'],
      path: '/socket.io',
    });

    setSocket(s);
    s.on('users:online', (ids) => setOnlineUsers(ids.map(Number)));
    s.on('user:online',  (id)  => setOnlineUsers((p) => [...new Set([...p, Number(id)])]));
    s.on('user:offline', (id)  => setOnlineUsers((p) => p.filter((x) => x !== Number(id))));

    return () => { s.disconnect(); setSocket(null); };
  }, [user?.id]);

  return <Ctx.Provider value={{ socket, onlineUsers }}>{children}</Ctx.Provider>;
}

export const useSocket = () => useContext(Ctx);
