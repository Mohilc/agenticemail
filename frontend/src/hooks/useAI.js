import { useState } from 'react';
import { aiService } from '../services/aiService';

export const useAI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const performAIService = async (serviceName, data) => {
    setLoading(true);
    setError(null);
    try {
      const response = await aiService[serviceName](data);
      return response.data;
    } catch (err) {
      const errMsg = err.message || 'AI service request failed';
      setError(errMsg);
      throw new Error(errMsg);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    composeAssist: (prompt, tone, context) =>
      performAIService('composeAssist', { prompt, tone, context }),
    smartReply: (emailContent, senderName) =>
      performAIService('smartReply', { emailContent, senderName }),
    summarize: (emailContent) =>
      performAIService('summarize', { emailContent }),
    sentiment: (emailContent) =>
      performAIService('sentiment', { emailContent }),
    detectSpam: (emailContent, subject) =>
      performAIService('detectSpam', { emailContent, subject }),
    generateSubject: (emailBody) =>
      performAIService('generateSubject', { emailBody }),
    categorize: (emailContent, subject) =>
      performAIService('categorize', { emailContent, subject }),
    generateTemplate: (description, category) =>
      performAIService('generateTemplate', { description, category }),
  };
};
