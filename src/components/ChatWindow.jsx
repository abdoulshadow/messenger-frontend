import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Avatar from './Avatar';
import MessageBubble from './MessageBubble';
import EmojiPicker from './EmojiPicker';

export default function ChatWindow({ conversation, onNewMessage }) {
  const { user } = useAuth();
  const { socket, onlineUsers } = useSocket();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [typing, setTyping] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [lightbox, setLightbox] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const bottomRef = useRef();
  const typingTimer = useRef();
  const fileRef = useRef();
  const inputRef = useRef();

  const isGroup = conversation.type === 'group';
  const otherId = conversation.other?.id;
  const isOnline = !isGroup && onlineUsers.includes(otherId);

  useEffect(() => {
    setLoading(true);
    api.get(`/messages/${conversation.id}?limit=50`)
      .then(r => { setMessages(r.data.messages); setHasMore(r.data.hasMore); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [conversation.id]);

  useEffect(() => {
    if (!loading) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }, [messages.length, loading]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('conv:join', { conversationId: conversation.id });

    const onNew = ({ conversationId, message }) => {
      if (conversationId !== conversation.id) return;
      setMessages(p => [...p, message]);
      setTyping(null);
      onNewMessage(conversationId, message);
      socket.emit('read:mark', { conversationId, lastMessageId: message.id });
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    };
    const onEdited = ({ conversationId, messageId, content }) => {
      if (conversationId !== conversation.id) return;
      setMessages(p => p.map(m => m.id === messageId ? { ...m, content, edited: true } : m));
    };
    const onDeleted = ({ conversationId, messageId }) => {
      if (conversationId !== conversation.id) return;
      setMessages(p => p.map(m => m.id === messageId ? { ...m, content: 'Message supprimé', deleted: true } : m));
    };
    const onReaction = ({ conversationId, messageId, reactions }) => {
      if (conversationId !== conversation.id) return;
      setMessages(p => p.map(m => m.id === messageId ? { ...m, reactions } : m));
    };
    const onTypingStart = ({ conversationId, userId, username }) => {
      if (conversationId === conversation.id && userId !== user.id) setTyping(username);
    };
    const onTypingStop = ({ conversationId, userId }) => {
      if (conversationId === conversation.id && userId !== user.id) setTyping(null);
    };

    socket.on('msg:new', onNew);
    socket.on('msg:edited', onEdited);
    socket.on('msg:deleted', onDeleted);
    socket.on('reaction:update', onReaction);
    socket.on('typing:start', onTypingStart);
    socket.on('typing:stop', onTypingStop);

    return () => {
      socket.off('msg:new', onNew);
      socket.off('msg:edited', onEdited);
      socket.off('msg:deleted', onDeleted);
      socket.off('reaction:update', onReaction);
      socket.off('typing:start', onTypingStart);
      socket.off('typing:stop', onTypingStop);
    };
  }, [socket, conversation.id]);

  const handleInput = (e) => {
    setInput(e.target.value);
    if (!socket) return;
    socket.emit('typing:start', { conversationId: conversation.id });
    clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => socket.emit('typing:stop', { conversationId: conversation.id }), 1500);
  };

  const send = useCallback(() => {
    if ((!input.trim() && !filePreview) || !socket) return;
    if (filePreview) {
      socket.emit('msg:send', { conversationId: conversation.id, content: filePreview.url, type: 'image', replyTo: replyTo?.id });
      setFilePreview(null);
    } else {
      socket.emit('msg:send', { conversationId: conversation.id, content: input.trim(), type: 'text', replyTo: replyTo?.id });
    }
    socket.emit('typing:stop', { conversationId: conversation.id });
    clearTimeout(typingTimer.current);
    setInput(''); setReplyTo(null); setShowEmoji(false);
  }, [input, socket, conversation.id, replyTo, filePreview]);

  const sendLocation = () => {
    if (!navigator.geolocation) return alert('Géolocalisation non supportée');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        socket?.emit('location:share', { conversationId: conversation.id, lat: coords.latitude, lng: coords.longitude });
      },
      () => alert('Impossible d\'obtenir ta position. Autorise la localisation dans ton navigateur.')
    );
  };

  const onKey = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData(); fd.append('file', file);
    try {
      const { data } = await api.post('/upload/file', fd);
      setFilePreview({ url: data.url, name: data.name, type: data.type });
    } catch {}
    e.target.value = '';
  };

  const doSearch = async () => {
    if (!searchQ.trim()) { setSearchResults([]); return; }
    const { data } = await api.get(`/messages/${conversation.id}/search?q=${encodeURIComponent(searchQ)}`);
    setSearchResults(data);
  };

  const headerName = isGroup ? conversation.name : conversation.other?.username;
  const headerSub  = isGroup
    ? `${conversation.members?.length || 0} membres`
    : isOnline ? 'En ligne' : conversation.other?.last_seen
      ? `Vu ${new Date(conversation.other.last_seen).toLocaleString('fr-FR', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}`
      : 'Hors ligne';

  const groupByDate = (msgs) => {
    const out = []; let last = null;
    msgs.forEach(m => {
      const d = new Date(m.created_at).toDateString();
      if (d !== last) { out.push({ type: 'date', date: m.created_at }); last = d; }
      out.push({ type: 'msg', msg: m });
    });
    return out;
  };

  const fmtDate = (dt) => {
    const d = new Date(dt), now = new Date();
    if (d.toDateString() === now.toDateString()) return 'Aujourd\'hui';
    const yesterday = new Date(now); yesterday.setDate(now.getDate()-1);
    if (d.toDateString() === yesterday.toDateString()) return 'Hier';
    return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  };

  return (
    <div className="chat">
      {/* Header */}
      <div className="chat-header">
        {isGroup
          ? <Avatar username={conversation.name} members={conversation.members} size="md" />
          : <Avatar username={conversation.other?.username} avatarUrl={conversation.other?.avatar_url} size="md" online={isOnline} />
        }
        <div className="chat-header-info">
          <div className="chat-header-name">{headerName}</div>
          <div className={`chat-header-sub${isOnline ? ' on' : ''}`}>{headerSub}</div>
        </div>
        <div className="chat-actions">
          {/* Audio call */}
          {!isGroup && (
            <button className="icon-btn" title="Appel audio" onClick={() => window._startCall?.(otherId, conversation.other?.username, 'audio')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.26 9.4 19.79 19.79 0 0 1 1.2.77 2 2 0 0 1 3.18-1.2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.16 7.1a16 16 0 0 0 6.13 6.13l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
            </button>
          )}
          {/* Video call */}
          {!isGroup && (
            <button className="icon-btn" title="Appel vidéo" onClick={() => window._startCall?.(otherId, conversation.other?.username, 'video')}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2"/></svg>
            </button>
          )}
          <button className="icon-btn" onClick={() => { setShowSearch(!showSearch); setSearchResults([]); setSearchQ(''); }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
        </div>
      </div>

      {/* Search panel */}
      {showSearch && (
        <div className="chat-search-panel">
          <input className="chat-search-input" placeholder="Rechercher..." value={searchQ}
            onChange={e => setSearchQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && doSearch()} autoFocus />
          <button className="icon-btn" onClick={doSearch}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </button>
        </div>
      )}
      {searchResults.length > 0 && (
        <div style={{ padding: '8px 20px', borderBottom: '1px solid var(--bd)', maxHeight: 200, overflowY: 'auto' }}>
          {searchResults.map(m => (
            <div key={m.id} className="search-result-msg">
              <div className="srm-sender">{m.sender_username}</div>
              <div className="srm-content">{m.content}</div>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="msgs">
        {loading ? (
          <div style={{ margin: 'auto' }}><span className="spinner" /></div>
        ) : (
          <>
            {hasMore && (
              <button className="load-more-btn" onClick={() => {
                api.get(`/messages/${conversation.id}?before=${messages[0]?.id}&limit=50`)
                  .then(r => { setMessages(p => [...r.data.messages, ...p]); setHasMore(r.data.hasMore); });
              }}>Charger les messages précédents</button>
            )}
            {groupByDate(messages).map((item, i) =>
              item.type === 'date' ? (
                <div key={`d${i}`} className="day-label">{fmtDate(item.date)}</div>
              ) : (
                <MessageBubble
                  key={item.msg.id || item.msg._id}
                  msg={item.msg}
                  isGroup={isGroup}
                  onReact={(id, emoji) => socket?.emit('reaction:toggle', { messageId: id, emoji })}
                  onReply={m => { setReplyTo(m); inputRef.current?.focus(); }}
                  onEdit={(id, content) => socket?.emit('msg:edit', { messageId: id, content })}
                  onDelete={id => socket?.emit('msg:delete', { messageId: id })}
                  onImageClick={url => setLightbox(url)}
                />
              )
            )}
            {typing && (
              <div className="typing-row">
                <Avatar username={typing} size="sm" />
                <div className="typing-bub"><span/><span/><span/></div>
              </div>
            )}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Reply bar */}
      {replyTo && (
        <div className="reply-bar">
          <div className="rb-info">
            <div className="rb-to">↩ Répondre à {replyTo.sender_username}</div>
            <div className="rb-text">{replyTo.content?.slice(0, 80)}</div>
          </div>
          <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => setReplyTo(null)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

      {/* File preview */}
      {filePreview && (
        <div className="file-preview">
          {filePreview.type === 'image'
            ? <img src={filePreview.url} style={{ width: 48, height: 48, borderRadius: 8, objectFit: 'cover' }} />
            : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent-h)" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
          }
          <span className="file-preview-name">{filePreview.name}</span>
          <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => setFilePreview(null)}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      )}

      {/* Input */}
      <div className="input-wrap" style={{ position: 'relative' }}>
        {showEmoji && (
          <div style={{ position: 'absolute', bottom: '100%', left: 16 }}>
            <EmojiPicker onSelect={e => { setInput(p => p + e); setShowEmoji(false); inputRef.current?.focus(); }} onClose={() => setShowEmoji(false)} />
          </div>
        )}
        <div className="input-row">
          <button className="input-action" onClick={() => setShowEmoji(!showEmoji)}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
          </button>
          <button className="input-action" onClick={() => fileRef.current.click()}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
          </button>
          {/* Location button */}
          <button className="input-action" onClick={sendLocation} title="Partager ma position">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
          </button>
          <input type="file" ref={fileRef} style={{ display: 'none' }} accept="image/*,video/*,.pdf,.zip,.txt" onChange={handleFileUpload} />
          <textarea ref={inputRef} className="msg-textarea"
            placeholder={`Message ${isGroup ? conversation.name : conversation.other?.username}...`}
            value={input} onChange={handleInput} onKeyDown={onKey} rows={1}
            onClick={() => setShowEmoji(false)} />
          <button className="send-btn" onClick={send} disabled={!input.trim() && !filePreview}>
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          </button>
        </div>
      </div>

      {lightbox && (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Plein ecran" />
        </div>
      )}
    </div>
  );
}
