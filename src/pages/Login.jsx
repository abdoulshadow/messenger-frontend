import { useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';

export default function Login({ onSwitch }) {
  const { login } = useAuth();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true);
    try { const { data } = await api.post('/auth/login', form); login(data.token, data.user); }
    catch (err) { setError(err.response?.data?.error || 'Erreur de connexion'); }
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
        <h1 className="auth-h">Bon retour 👋</h1>
        <p className="auth-sub">Connecte-toi pour discuter avec tes amis</p>
        {error && <div className="err">{error}</div>}
        <form onSubmit={submit}>
          <div className="field"><label>Email</label><input name="email" type="email" placeholder="toi@exemple.com" value={form.email} onChange={(e) => setForm({...form, email: e.target.value})} required /></div>
          <div className="field"><label>Mot de passe</label><input name="password" type="password" placeholder="••••••••" value={form.password} onChange={(e) => setForm({...form, password: e.target.value})} required /></div>
          <button className="btn-acc" type="submit" disabled={loading}>{loading ? <span className="spinner"/> : 'Se connecter'}</button>
        </form>
        <p className="auth-swap">Pas de compte ? <a onClick={onSwitch}>S'inscrire gratuitement</a></p>
      </div>
    </div>
  );
}
