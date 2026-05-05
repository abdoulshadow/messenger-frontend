import axios from 'axios';

// En production, utilise l'URL du backend Render
// En dev local, utilise le proxy Vite (vide = relatif)
const BASE_URL = import.meta.env.VITE_API_URL || '';

const api = axios.create({ baseURL: `${BASE_URL}/api` });

api.interceptors.request.use((c) => {
  const t = localStorage.getItem('token');
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export default api;
