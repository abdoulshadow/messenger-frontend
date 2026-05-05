import { useState } from 'react';
import { useAuth } from './context/AuthContext';
import { SocketProvider } from './context/SocketContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Chat from './pages/Chat';
import InstallBanner from './components/InstallBanner';
import CallManager from './components/CallManager';
import { usePushNotifications } from './hooks/usePushNotifications';

function AppInner() {
  usePushNotifications();
  const { user } = useAuth();
  return (
    <>
      <Chat />
      <CallManager user={user} />
      <InstallBanner />
    </>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  const [showRegister, setShowRegister] = useState(false);

  if (loading) return <div className="loading-screen"><span className="spinner" style={{ width: 36, height: 36 }} /></div>;

  if (!user) return (
    <>
      {showRegister ? <Register onSwitch={() => setShowRegister(false)} /> : <Login onSwitch={() => setShowRegister(true)} />}
      <InstallBanner />
    </>
  );

  return (
    <SocketProvider>
      <AppInner />
    </SocketProvider>
  );
}
