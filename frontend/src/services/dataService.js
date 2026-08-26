import api from './api';

export const labelService = {
  getAll: () => api.get('/labels'),
  create: (data) => api.post('/labels', data),
  update: (id, data) => api.put(`/labels/${id}`, data),
  delete: (id) => api.delete(`/labels/${id}`),
  addToEmail: (labelId, emailId) => api.post(`/labels/${labelId}/emails/${emailId}`),
  removeFromEmail: (labelId, emailId) => api.delete(`/labels/${labelId}/emails/${emailId}`),
};

export const templateService = {
  getAll: (params = {}) => api.get('/templates', { params }),
  getById: (id) => api.get(`/templates/${id}`),
  create: (data) => api.post('/templates', data),
  update: (id, data) => api.put(`/templates/${id}`, data),
  delete: (id) => api.delete(`/templates/${id}`),
};

export const analyticsService = {
  getStats: () => api.get('/analytics/stats'),
  getSentiment: () => api.get('/analytics/sentiment'),
  getCategories: () => api.get('/analytics/categories'),
  getActivity: () => api.get('/analytics/activity'),
};
