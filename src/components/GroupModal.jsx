import { useState } from 'react';
import api from '../api/axios';
import Avatar from './Avatar';

export default function GroupModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);

  const search = async (q) => {
    setQuery(q);
    if (!q.trim()) { setResults([]); return; }
    const { data } = await api.get(`/users/search?q=${encodeURIComponent(q)}`);
    setResults(data.filter((u) => !members.find((m) => m.id === u.id)));
  };

  const add = (u) => { setMembers((p) => [...p, u]); setResults([]); setQuery(''); };
  const remove = (id) => setMembers((p) => p.filter((u) => u.id !== id));

  const create = async () => {
    if (!name.trim() || members.length === 0) return;
    setLoading(true);
    try {
      const { data } = await api.post('/messages/conversations/group', {
        name: name.trim(),
        memberIds: members.map((m) => m.id),
      });
      onCreated(data);
      onClose();
    } catch { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Nouveau groupe</h2>
        <div className="field">
          <label>Nom du groupe</label>
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex: Les potes de l'école" />
        </div>
        <div className="field" style={{ position: 'relative' }}>
          <label>Ajouter des membres</label>
          <input type="text" value={query} onChange={(e) => search(e.target.value)} placeholder="Chercher un ami..." />
          {results.length > 0 && (
            <div className="search-dropdown">
              {results.map((u) => (
                <div key={u.id} className="search-item" onClick={() => add(u)}>
                  <Avatar username={u.username} size="sm" />
                  <div><div className="search-item-name">{u.username}</div></div>
                </div>
              ))}
            </div>
          )}
        </div>
        {members.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
            {members.map((m) => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent-bg)', border: '1px solid var(--accent-bd)', borderRadius: 'var(--r-pill)', padding: '4px 10px' }}>
                <span style={{ fontSize: 13, color: 'var(--accent-h)' }}>{m.username}</span>
                <span style={{ cursor: 'pointer', color: 'var(--t3)', fontSize: 14 }} onClick={() => remove(m.id)}>×</span>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '11px', borderRadius: 'var(--r-sm)', background: 'var(--bg3)', color: 'var(--t2)', fontSize: 14, fontWeight: 600 }}>Annuler</button>
          <button onClick={create} disabled={!name.trim() || members.length === 0 || loading} className="btn-acc" style={{ flex: 2, marginTop: 0 }}>
            {loading ? <span className="spinner" /> : `Créer le groupe (${members.length} membres)`}
          </button>
        </div>
      </div>
    </div>
  );
}
