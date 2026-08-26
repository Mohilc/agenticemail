import api from './api';

export const emailService = {
  compose: (data) => api.post('/emails', data),
  getByFolder: (folder, params = {}) =>
    api.get(`/emails/${folder}`, { params }),
  getById: (id) => api.get(`/emails/detail/${id}`),
  getThread: (id) => api.get(`/emails/thread/${id}`),
  update: (id, data) => api.patch(`/emails/${id}`, data),
  moveToTrash: (id) => api.patch(`/emails/${id}/trash`),
  delete: (id) => api.delete(`/emails/${id}`),
  search: (q, params = {}) =>
    api.get('/emails/search', { params: { q, ...params } }),
  getCounts: () => api.get('/emails/counts'),
};
