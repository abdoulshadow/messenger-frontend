import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Avatar from './Avatar';
import GroupModal from './GroupModal';
import ProfileModal from './ProfileModal';

export default function Sidebar({ conversations, setConversations, activeId, onSelect, onOpenStatus }) {
  const { user, logout } = useAuth();
  const { onlineUsers } = useSocket();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [showGroup, setShowGroup] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const timerRef = useRef();

  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!query.trim()) { setResults([]); return; }
    timerRef.current = setTimeout(async () => {
      const { data } = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
      setResults(data);
    }, 280);
  }, [query]);

  const startDirect = async (u) => {
    setQuery(''); setResults([]);
    const { data } = await api.post('/messages/conversations/direct', { targetUserId: u.id });
    const existing = conversations.find(c => c.id === data.conversationId);
    if (existing) { onSelect(existing); return; }
    const newC = { id: data.conversationId, type: 'direct', other: { id: u.id, username: u.username, avatar_url: u.avatar_url, last_seen: u.last_seen }, last_message: null, last_at: null, unread: 0 };
    setConversations(p => [newC, ...p]);
    onSelect(newC);
  };

  const onGroupCreated = (data) => {
    const newC = { id: data.conversationId, type: 'group', name: data.name, members: data.members, last_message: null, last_at: null, unread: 0 };
    setConversations(p => [newC, ...p]);
    onSelect(newC);
  };

  const fmt = (dt) => {
    if (!dt) return '';
    const d = new Date(dt), now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    const diffDays = Math.floor((now - d) / 86400000);
    if (diffDays < 7) return d.toLocaleDateString('fr-FR', { weekday: 'short' });
    return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' });
  };

  const getConvName = (c) => c.type === 'group' ? c.name : c.other?.username || '?';
  const getConvAvatar = (c) => c.type === 'group'
    ? <Avatar username={c.name} members={c.members} size="md" />
    : <Avatar username={c.other?.username} avatarUrl={c.other?.avatar_url} size="md" online={onlineUsers.includes(c.other?.id)} />;

  return (
    <>
      <div className="sidebar">
        <div className="sb-header">
          <span className="sb-title">Messages</span>
          {/* Status button */}
          <button className="icon-btn" onClick={onOpenStatus} title="Statuts">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          </button>
          <button className="icon-btn accent" onClick={() => setShowGroup(true)} title="Nouveau groupe">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
          </button>
        </div>

        <div className="sb-search">
          <div className="search-wrap" style={{ position: 'relative' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            <input className="search-inp" value={query} onChange={e => setQuery(e.target.value)} placeholder="Chercher un ami..." />
            {results.length > 0 && (
              <div className="search-dropdown">
                {results.map(u => (
                  <div key={u.id} className="search-item" onClick={() => startDirect(u)}>
                    <Avatar username={u.username} avatarUrl={u.avatar_url} size="sm" online={onlineUsers.includes(u.id)} />
                    <div>
                      <div className="search-item-name">{u.username}</div>
                      {u.bio && <div className="search-item-sub">{u.bio}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="conv-list">
          {conversations.length === 0 && (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--t3)', fontSize: 13 }}>
              Recherche un ami ou crée un groupe
            </div>
          )}
          {conversations.map(c => (
            <div key={c.id} className={`conv-row${activeId === c.id ? ' active' : ''}`} onClick={() => onSelect(c)}>
              {getConvAvatar(c)}
              <div className="conv-info">
                <div className="conv-name">
                  <span>{getConvName(c)}</span>
                  <span className="conv-time">{fmt(c.last_at)}</span>
                </div>
                <div className="conv-preview">
                  <span>{c.last_message || 'Commencer la discussion'}</span>
                </div>
              </div>
              {c.unread > 0 && <div className="unread-pill">{c.unread > 99 ? '99+' : c.unread}</div>}
            </div>
          ))}
        </div>

        <div className="sb-footer">
          <div style={{ cursor: 'pointer' }} onClick={() => setShowProfile(true)}>
            <Avatar username={user?.username} avatarUrl={user?.avatar_url} size="md" online />
          </div>
          <div className="conv-info" style={{ cursor: 'pointer' }} onClick={() => setShowProfile(true)}>
            <div className="sb-user-name">{user?.username}</div>
            <div className="sb-user-status">En ligne</div>
          </div>
          <button className="icon-btn" onClick={logout} title="Se déconnecter">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </div>

      {showGroup && <GroupModal onClose={() => setShowGroup(false)} onCreated={onGroupCreated} />}
      {showProfile && <ProfileModal onClose={() => setShowProfile(false)} />}
    </>
  );
}
