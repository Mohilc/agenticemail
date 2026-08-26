import api from './api';

export const authService = {
  signup: (data) => api.post('/auth/signup', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
  searchUsers: (search) => api.get(`/auth/users?search=${search}`),
};
