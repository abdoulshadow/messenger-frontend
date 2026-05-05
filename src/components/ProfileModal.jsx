import { useState, useRef } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import Avatar from './Avatar';

export default function ProfileModal({ onClose }) {
  const { user, updateUser } = useAuth();
  const [username, setUsername] = useState(user.username);
  const [bio, setBio] = useState(user.bio || '');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [err, setErr] = useState('');
  const fileRef = useRef();

  const save = async () => {
    setSaving(true); setErr('');
    try {
      const { data } = await api.patch('/users/me', { username, bio });
      updateUser(data);
      onClose();
    } catch (e) {
      setErr(e.response?.data?.error || 'Erreur');
    } finally { setSaving(false); }
  };

  const uploadAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const fd = new FormData(); fd.append('avatar', file);
    try {
      const { data } = await api.post('/upload/avatar', fd);
      updateUser({ avatar_url: data.url });
    } finally { setUploading(false); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Mon profil</h2>
        {err && <div className="err">{err}</div>}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <div className="profile-av-wrap">
            <Avatar username={user.username} avatarUrl={user.avatar_url} size="lg" />
            <div className="profile-av-change" onClick={() => fileRef.current.click()}>
              {uploading ? <span className="spinner" style={{ width:14, height:14 }} /> : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              )}
            </div>
            <input type="file" ref={fileRef} accept="image/*" style={{ display: 'none' }} onChange={uploadAvatar} />
          </div>
        </div>
        <div className="field">
          <label>Pseudo</label>
          <input value={username} onChange={(e) => setUsername(e.target.value)} />
        </div>
        <div className="field">
          <label>Bio</label>
          <input value={bio} onChange={(e) => setBio(e.target.value)} placeholder="Dis quelque chose sur toi..." />
        </div>
        <div style={{ fontSize: 12, color: 'var(--t3)', marginBottom: 20 }}>
          Membre depuis {new Date(user.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 11, borderRadius: 'var(--r-sm)', background: 'var(--bg3)', color: 'var(--t2)', fontWeight: 600 }}>Annuler</button>
          <button onClick={save} disabled={saving} className="btn-acc" style={{ flex: 2, marginTop: 0 }}>
            {saving ? <span className="spinner" /> : 'Sauvegarder'}
          </button>
        </div>
      </div>
    </div>
  );
}
