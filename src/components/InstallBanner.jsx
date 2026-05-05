import { useState, useEffect } from 'react';

export default function InstallBanner() {
  const [prompt, setPrompt] = useState(null);
  const [visible, setVisible] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Déjà installée ?
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const handler = (e) => {
      e.preventDefault();
      setPrompt(e);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', () => { setInstalled(true); setVisible(false); });

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!prompt) return;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    if (outcome === 'accepted') setVisible(false);
  };

  if (!visible || installed) return null;

  return (
    <div className="pwa-banner">
      <img src="/icons/icon-96x96.png" className="pwa-banner-icon" alt="Messenger" />
      <div className="pwa-banner-text">
        <strong>Installer Messenger</strong>
        <span>Accès rapide depuis ton écran d'accueil</span>
      </div>
      <button className="pwa-install-btn" onClick={install}>
        Installer
      </button>
      <button className="pwa-close-btn" onClick={() => setVisible(false)}>×</button>
    </div>
  );
}
