import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';
import LocationBubble from './LocationBubble';

const QUICK_REACTS = ['👍','❤️','😂','😮','😢','🔥'];

export default function MessageBubble({ msg, isGroup, onReact, onReply, onEdit, onDelete, onImageClick }) {
  const { user } = useAuth();
  const isMe = msg.sender_id === user.id;
  const [ctx, setCtx] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState(msg.content);

  const openCtx = (e) => { e.preventDefault(); setCtx({ x: e.clientX, y: e.clientY }); };
  const closeCtx = () => setCtx(null);

  const doEdit = () => {
    if (editVal.trim() && editVal !== msg.content) onEdit(msg.id, editVal.trim());
    setEditing(false);
  };

  const fmt = (dt) => new Date(dt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const isImage    = msg.type === 'image';
  const isLocation = msg.type === 'location';

  return (
    <div className={`msg-row ${isMe ? 'me' : 'them'}`} onContextMenu={openCtx}>
      {!isMe && <Avatar username={msg.sender_username} avatarUrl={msg.sender_avatar} size="sm" className="msg-av" />}
      <div className="msg-group">
        {!isMe && isGroup && <div className="bubble-sender">{msg.sender_username}</div>}
        {msg.reply_to && msg.reply_username && (
          <div className="reply-preview">
            <div className="rp-name">↩ {msg.reply_username}</div>
            <div>{msg.reply_content?.slice(0, 60)}{msg.reply_content?.length > 60 ? '…' : ''}</div>
          </div>
        )}
        {editing ? (
          <div>
            <textarea className="edit-input" value={editVal} onChange={e => setEditVal(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doEdit(); } if (e.key === 'Escape') setEditing(false); }}
              autoFocus rows={2} />
            <div className="edit-actions">
              <button className="edit-btn cancel" onClick={() => setEditing(false)}>Annuler</button>
              <button className="edit-btn save" onClick={doEdit}>Sauvegarder</button>
            </div>
          </div>
        ) : isLocation ? (
          <LocationBubble content={msg.content} isMe={isMe} />
        ) : (
          <div className={`bubble ${isMe ? 'me' : 'them'}${msg.deleted ? ' deleted' : ''}${isImage ? ' image' : ''}`}>
            {isImage ? <img src={msg.content} alt="Image" onClick={() => onImageClick(msg.content)} /> : msg.content}
          </div>
        )}
        {msg.reactions?.length > 0 && (
          <div className="reactions-row">
            {msg.reactions.map(r => {
              const mine = r.users?.some(u => u.id === user.id);
              return (
                <div key={r.emoji} className={`react-chip${mine ? ' mine' : ''}`} onClick={() => onReact(msg.id, r.emoji)} title={r.users?.map(u => u.username).join(', ')}>
                  {r.emoji} <span>{r.count}</span>
                </div>
              );
            })}
          </div>
        )}
        <div className="msg-meta">
          <span>{fmt(msg.created_at)}</span>
          {msg.edited && !msg.deleted && <span className="edited-tag">(modifié)</span>}
          {isMe && <svg className="check-icon read" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>}
        </div>
      </div>
      {ctx && (
        <>
          <div style={{ position: 'fixed', inset: 0, zIndex: 9998 }} onClick={closeCtx} />
          <div className="ctx-menu" style={{ left: Math.min(ctx.x, window.innerWidth - 180), top: Math.min(ctx.y, window.innerHeight - 280) }}>
            <div className="react-bar">
              {QUICK_REACTS.map(e => <button key={e} className="react-btn" onClick={() => { onReact(msg.id, e); closeCtx(); }}>{e}</button>)}
            </div>
            {!msg.deleted && (
              <>
                <div className="ctx-item" onClick={() => { onReply(msg); closeCtx(); }}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/></svg>
                  Répondre
                </div>
                {isMe && !isImage && !isLocation && (
                  <div className="ctx-item" onClick={() => { setEditing(true); setEditVal(msg.content); closeCtx(); }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    Modifier
                  </div>
                )}
                {isMe && (
                  <div className="ctx-item danger" onClick={() => { onDelete(msg.id); closeCtx(); }}>
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/></svg>
                    Supprimer
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
