import api from './api';

export const sendAdvisoryMessage = async (question: string, context?: string | null) => {
  const response = await api.post('/ask', {
    question,
    context: context || null
  });
  return response.data;
};
export interface TranslateItem {
  id: string;
  text: string;
}

export const translateMessagesBatch = async (messages: TranslateItem[], targetLang: 'en' | 'si') => {
  const response = await api.post('/translate-batch', {
    messages,
    target_lang: targetLang
  });
  return response.data;
};
