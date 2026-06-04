import axios from 'axios';

const api = axios.create({ baseURL: '/api', timeout: 10000 });

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error.response?.data || error);
  }
);

export const auth = {
  login: (data) => api.post('/login', data),
  register: (data) => api.post('/register', data),
  getProfile: () => api.get('/profile'),
  updateProfile: (data) => api.put('/profile', data),
  uploadAvatar: (avatar) => api.post('/avatar', { avatar }),
};

export const items = {
  list: (params) => api.get('/items', { params }),
  get: (id) => api.get(`/items/${id}`),
  create: (data) => api.post('/items', data),
  update: (id, data) => api.put(`/items/${id}`, data),
  delete: (id) => api.delete(`/items/${id}`),
};

export const categories = {
  list: (params) => api.get('/categories', { params }),
  create: (data) => api.post('/categories', data),
  update: (id, data) => api.put(`/categories/${id}`, data),
  delete: (id) => api.delete(`/categories/${id}`),
};

export const modules = {
  list: () => api.get('/modules'),
  get: (id) => api.get(`/modules/${id}`),
  create: (data) => api.post('/modules', data),
  update: (id, data) => api.put(`/modules/${id}`, data),
  delete: (id) => api.delete(`/modules/${id}`),
};

export const families = {
  list: () => api.get('/families'),
  get: (id) => api.get(`/families/${id}`),
  create: (data) => api.post('/families', data),
  update: (id, data) => api.put(`/families/${id}`, data),
  delete: (id) => api.delete(`/families/${id}`),
  addMember: (id, data) => api.post(`/families/${id}/members`, data),
  updateMember: (id, userId, data) => api.put(`/families/${id}/members/${userId}`, data),
  removeMember: (id, userId) => api.delete(`/families/${id}/members/${userId}`),
};

export const stats = { get: (params) => api.get('/stats', { params }) };
export const search = { query: (params) => api.get('/search', { params }) };
export const ai = {
  chat: (message) => api.post('/ai/chat', { message }),
  analyzeImage: (image) => api.post('/ai/analyze-image', { image }),
  processScanResult: (content) => api.post('/ai/scan-result', { content }),
};
export const reminders = {
  list: (params) => api.get('/reminders', { params }),
  dismiss: (id) => api.put(`/reminders/${id}/dismiss`),
};

export const boxes = {
  list: (params) => api.get('/boxes', { params }),
  listHome: () => api.get('/boxes', { params: { home: '1' } }),
  get: (id) => api.get(`/boxes/${id}`),
  create: (data) => api.post('/boxes', data),
  update: (id, data) => api.put(`/boxes/${id}`, data),
  delete: (id) => api.delete(`/boxes/${id}`),
  toggleHome: (id, show) => api.patch(`/boxes/${id}/home`, { show_on_home: show }),
};

export default api;
