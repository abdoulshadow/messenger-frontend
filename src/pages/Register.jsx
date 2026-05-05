import { useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Register({ onSwitch }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ username: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { const { data } = await api.post('/auth/register', form); login(data.token, data.user); }
    catch (err) { setError(err.response?.data?.error || 'Erreur lors de l\'inscription'); }
    finally { setLoading(false); }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-box">
        <div className="auth-brand">
          <div className="auth-brand-icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          </div>
          <span>Messenger</span>
        </div>
        <h1 className="auth-h">Créer un compte 🚀</h1>
        <p className="auth-sub">Rejoins tes amis sur Messenger</p>
        {error && <div className="err">{error}</div>}
        <form onSubmit={submit}>
          <div className="field"><label>Pseudo</label><input type="text" placeholder="tonpseudo" value={form.username} onChange={(e) => setForm({...form, username: e.target.value})} required /></div>
          <div className="field"><label>Email</label><input type="email" placeholder="toi@exemple.com" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required /></div>
          <div className="field"><label>Mot de passe</label><input type="password" placeholder="6 caractères minimum" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required /></div>
          <button className="btn-acc" type="submit" disabled={loading}>{loading ? <span className="spinner"/> : 'Créer mon compte'}</button>
        </form>
        <p className="auth-swap">Déjà un compte ? <a onClick={onSwitch}>Se connecter</a></p>
      </div>
    </div>
  );
}
