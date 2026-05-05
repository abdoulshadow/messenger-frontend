import { useEffect } from 'react';
import api from '../api/axios';

export function usePushNotifications() {
  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    const setup = async () => {
      try {
        const reg = await navigator.serviceWorker.ready;
        const { data } = await api.get('/push/vapid-public-key');
        if (!data.key) return;

        const existing = await reg.pushManager.getSubscription();
        if (existing) { await api.post('/push/subscribe', { subscription: existing }); return; }

        const sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(data.key),
        });
        await api.post('/push/subscribe', { subscription: sub });
      } catch {}
    };

    if (Notification.permission === 'granted') {
      setup();
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(p => { if (p === 'granted') setup(); });
    }
  }, []);
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}
