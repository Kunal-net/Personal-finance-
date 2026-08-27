import axios from 'axios';

const client = axios.create({
  baseURL: 'http://localhost:8000',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 — clear token and redirect to login
client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

export default client;

// ── Auth ──────────────────────────────────────────────────────────────────────
export const authApi = {
  login: (email, password) =>
    client.post('/auth/login', { email, password }),
  register: (email, password, name) =>
    client.post('/auth/register', { email, password, name }),
  me: () => client.get('/me'),
};

// ── Transactions ──────────────────────────────────────────────────────────────
export const transactionsApi = {
  list: (params = {}) => client.get('/transactions', { params }),
};

// ── Analytics ─────────────────────────────────────────────────────────────────
export const analyticsApi = {
  overview: () => client.get('/analytics/overview'),
  byCategory: () => client.get('/analytics/by-category'),
  byMonth: () => client.get('/analytics/by-month'),
};

// ── AI ────────────────────────────────────────────────────────────────────────
export const aiApi = {
  predict: () => client.get('/ai/predict'),
  savingsPlan: () => client.get('/ai/savings-plan'),
  anomalies: () => client.get('/ai/anomalies'),
  healthScore: () => client.get('/ai/health-score'),
};

// ── Upload ────────────────────────────────────────────────────────────────────
export const uploadApi = {
  statement: (file, onUploadProgress) => {
    const form = new FormData();
    form.append('file', file);
    return client.post('/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress,
    });
  },
};
