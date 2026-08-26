import api from './api';

export const aiService = {
  composeAssist: (data) => api.post('/ai/compose-assist', data),
  smartReply: (data) => api.post('/ai/smart-reply', data),
  summarize: (data) => api.post('/ai/summarize', data),
  sentiment: (data) => api.post('/ai/sentiment', data),
  detectSpam: (data) => api.post('/ai/detect-spam', data),
  generateSubject: (data) => api.post('/ai/generate-subject', data),
  categorize: (data) => api.post('/ai/categorize', data),
  generateTemplate: (data) => api.post('/ai/generate-template', data),
};
