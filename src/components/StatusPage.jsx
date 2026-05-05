import { useState, useEffect, useRef } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';

const BG_COLORS = ['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#ec4899','#8b5cf6','#06b6d4'];

export default function StatusPage({ onClose }) {
  const { user } = useAuth();
  const [statuses, setStatuses] = useState([]);
  const [viewing, setViewing] = useState(null); // { userStatuses, index }
  const [creating, setCreating] = useState(false);
  const [text, setText] = useState('');
  const [bg, setBg] = useState(BG_COLORS[0]);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef();
  const timerRef = useRef();

  useEffect(() => {
    api.get('/status').then(r => { setStatuses(r.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  // Auto-advance status after 5 seconds
  useEffect(() => {
    if (!viewing) return;
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const next = viewing.index + 1;
      if (next < viewing.userStatuses.items.length) {
        setViewing(v => ({ ...v, index: next }));
      } else {
        setViewing(null);
      }
    }, 5000);
    return () => clearTimeout(timerRef.current);
  }, [viewing]);

  const openStatus = async (userStatus) => {
    setViewing({ userStatuses: userStatus, index: 0 });
    // Mark first as viewed
    if (userStatus.items[0]) {
      await api.post(`/status/${userStatus.items[0].id}/view`).catch(() => {});
    }
  };

  const postStatus = async () => {
    if (!text.trim()) return;
    setPosting(true);
    try {
      await api.post('/status', { text, bg_color: bg });
      const r = await api.get('/status');
      setStatuses(r.data);
      setText(''); setCreating(false);
    } finally { setPosting(false); }
  };

  const postImageStatus = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPosting(true);
    try {
      const fd = new FormData();
      fd.append('media', file);
      await api.post('/status', fd);
      const r = await api.get('/status');
      setStatuses(r.data);
    } finally { setPosting(false); e.target.value = ''; }
  };

  const deleteStatus = async (id) => {
    await api.delete(`/status/${id}`).catch(() => {});
    const r = await api.get('/status');
    setStatuses(r.data);
    setViewing(null);
  };

  const fmt = (dt) => {
    const d = new Date(dt);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  };

  const progress = (created, expires) => {
    const now = Date.now();
    const start = new Date(created).getTime();
    const end = new Date(expires).getTime();
    return Math.min(100, ((now - start) / (end - start)) * 100);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg0)', zIndex: 500, display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--bd)', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onClose} style={{ background: 'none', color: 'var(--t2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
        </button>
        <h2 style={{ fontSize: 18, fontWeight: 700 }}>Statuts</h2>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
        {/* My status */}
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Mon statut</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ position: 'relative', cursor: 'pointer' }} onClick={() => setCreating(true)}>
              <Avatar username={user.username} avatarUrl={user.avatar_url} size="lg" />
              <div style={{ position: 'absolute', bottom: 0, right: 0, width: 20, height: 20, borderRadius: '50%', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px solid var(--bg0)' }}>
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600 }}>Ajouter un statut</div>
              <div style={{ fontSize: 12, color: 'var(--t2)' }}>Texte ou photo, visible 24h</div>
            </div>
            <button onClick={() => fileRef.current.click()} style={{ marginLeft: 'auto', background: 'var(--bg3)', border: '1px solid var(--bd)', borderRadius: 8, padding: '6px 10px', color: 'var(--t2)', cursor: 'pointer' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            </button>
            <input type="file" ref={fileRef} accept="image/*" style={{ display: 'none' }} onChange={postImageStatus} />
          </div>
        </div>

        {/* Contact statuses */}
        {!loading && statuses.filter(s => !s.isMe).length > 0 && (
          <div>
            <p style={{ fontSize: 12, color: 'var(--t3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 10 }}>Statuts récents</p>
            {statuses.filter(s => !s.isMe).map(us => {
              const allViewed = us.items.every(i => i.viewed);
              return (
                <div key={us.userId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', cursor: 'pointer', borderBottom: '1px solid var(--bd)' }} onClick={() => openStatus(us)}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', padding: 2, background: allViewed ? 'var(--bd2)' : 'linear-gradient(135deg, #6366f1, #ec4899)' }}>
                      <Avatar username={us.username} avatarUrl={us.avatar_url} size="md" />
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600 }}>{us.username}</div>
                    <div style={{ fontSize: 12, color: 'var(--t2)' }}>{fmt(us.items[us.items.length-1]?.created_at)}</div>
                  </div>
                  <div style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--t3)' }}>{us.items.length} statut{us.items.length > 1 ? 's' : ''}</div>
                </div>
              );
            })}
          </div>
        )}

        {loading && <div style={{ textAlign: 'center', color: 'var(--t3)', padding: 40 }}><span className="spinner" /></div>}
        {!loading && statuses.filter(s => !s.isMe).length === 0 && (
          <div style={{ textAlign: 'center', color: 'var(--t3)', padding: 40, fontSize: 14 }}>
            Aucun statut pour le moment.<br />Tes amis doivent poster un statut !
          </div>
        )}
      </div>

      {/* Create text status modal */}
      {creating && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.7)' }}>
          <div style={{ width: '90%', maxWidth: 400, background: 'var(--bg2)', borderRadius: 20, padding: 28, border: '1px solid var(--bd2)' }}>
            <h3 style={{ marginBottom: 20, fontSize: 16, fontWeight: 700 }}>Nouveau statut</h3>
            <div style={{ borderRadius: 16, padding: 24, background: bg, marginBottom: 16, minHeight: 120, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <textarea value={text} onChange={e => setText(e.target.value)} placeholder="Écris quelque chose..." style={{ background: 'transparent', border: 'none', outline: 'none', color: '#fff', fontSize: 18, fontWeight: 600, textAlign: 'center', resize: 'none', width: '100%', fontFamily: 'inherit' }} rows={3} />
            </div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
              {BG_COLORS.map(c => (
                <div key={c} onClick={() => setBg(c)} style={{ width: 28, height: 28, borderRadius: '50%', background: c, cursor: 'pointer', border: bg === c ? '3px solid #fff' : '2px solid transparent', transition: 'all 0.15s' }} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setCreating(false)} style={{ flex: 1, padding: 11, borderRadius: 8, background: 'var(--bg3)', color: 'var(--t2)', fontWeight: 600, cursor: 'pointer' }}>Annuler</button>
              <button onClick={postStatus} disabled={!text.trim() || posting} style={{ flex: 2, padding: 11, borderRadius: 8, background: 'var(--accent)', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: (!text.trim() || posting) ? 0.5 : 1 }}>
                {posting ? <span className="spinner" /> : 'Publier'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View status */}
      {viewing && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 700, background: '#000', display: 'flex', flexDirection: 'column' }} onClick={() => setViewing(null)}>
          {/* Progress bars */}
          <div style={{ display: 'flex', gap: 4, padding: '12px 12px 0' }}>
            {viewing.userStatuses.items.map((item, i) => (
              <div key={item.id} style={{ flex: 1, height: 3, background: 'rgba(255,255,255,0.3)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{ height: '100%', background: '#fff', width: i < viewing.index ? '100%' : i === viewing.index ? `${progress(item.created_at, item.expires_at)}%` : '0%', transition: 'width 0.1s' }} />
              </div>
            ))}
          </div>

          {/* Status header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px' }} onClick={e => e.stopPropagation()}>
            <Avatar username={viewing.userStatuses.username} avatarUrl={viewing.userStatuses.avatar_url} size="sm" />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: '#fff' }}>{viewing.userStatuses.username}</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{fmt(viewing.userStatuses.items[viewing.index]?.created_at)}</div>
            </div>
            {viewing.userStatuses.isMe && (
              <button onClick={() => deleteStatus(viewing.userStatuses.items[viewing.index]?.id)} style={{ background: 'none', color: 'rgba(255,255,255,0.7)', display: 'flex' }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6m4-6v6"/><path d="M9 6V4h6v2"/></svg>
              </button>
            )}
          </div>

          {/* Status content */}
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {(() => {
              const item = viewing.userStatuses.items[viewing.index];
              if (!item) return null;
              if (item.media_url && item.media_type === 'image') {
                return <img src={item.media_url} style={{ maxWidth: '100%', maxHeight: '80vh', objectFit: 'contain' }} />;
              }
              return (
                <div style={{ background: item.bg_color || '#6366f1', borderRadius: 20, padding: '40px 32px', margin: '0 20px', width: '90%', textAlign: 'center' }}>
                  <p style={{ fontSize: 22, fontWeight: 700, color: '#fff', lineHeight: 1.4 }}>{item.text}</p>
                </div>
              );
            })()}
          </div>

          {/* Nav */}
          <div style={{ display: 'flex', padding: 16, gap: 12 }} onClick={e => e.stopPropagation()}>
            <button onClick={() => setViewing(v => ({ ...v, index: Math.max(0, v.index - 1) }))} style={{ flex: 1, padding: 12, background: 'rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>◀ Précédent</button>
            <button onClick={() => {
              const next = viewing.index + 1;
              if (next < viewing.userStatuses.items.length) setViewing(v => ({ ...v, index: next }));
              else setViewing(null);
            }} style={{ flex: 1, padding: 12, background: 'rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Suivant ▶</button>
          </div>
        </div>
      )}
    </div>
  );
}
