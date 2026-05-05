import { useState, useEffect, useCallback } from 'react';
import api from '../api/axios';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import ChatWindow from '../components/ChatWindow';
import StatusPage from '../components/StatusPage';

export default function Chat() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [active, setActive] = useState(null);
  const [showStatus, setShowStatus] = useState(false);

  useEffect(() => {
    api.get('/messages/conversations').then(r => setConversations(r.data)).catch(console.error);
  }, []);

  const onNewMessage = useCallback((conversationId, message) => {
    setConversations(prev =>
      prev.map(c => c.id === conversationId
        ? { ...c, last_message: message.deleted ? 'Message supprimé' : message.content, last_at: message.created_at,
            unread: active?.id === conversationId ? 0 : (c.unread || 0) + 1 }
        : c
      ).sort((a, b) => new Date(b.last_at || 0) - new Date(a.last_at || 0))
    );
  }, [active?.id]);

  const selectConvo = (c) => {
    setActive(c);
    setConversations(prev => prev.map(cv => cv.id === c.id ? { ...cv, unread: 0 } : cv));
  };

  return (
    <div className="layout">
      <Sidebar
        conversations={conversations}
        setConversations={setConversations}
        activeId={active?.id}
        onSelect={selectConvo}
        onOpenStatus={() => setShowStatus(true)}
      />
      {active ? (
        <ChatWindow key={active.id} conversation={active} onNewMessage={onNewMessage} />
      ) : (
        <div className="empty-state">
          <div className="empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.5"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <p>Sélectionne une conversation</p>
          <small>ou recherche un ami pour commencer</small>
        </div>
      )}
      {showStatus && <StatusPage onClose={() => setShowStatus(false)} />}
    </div>
  );
}
