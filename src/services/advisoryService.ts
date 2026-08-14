import api from './api';

export const sendAdvisoryMessage = async (
  question: string,
  context?: string | null,
  language?: string,
  sessionId?: string | null,
  latitude?: number | null,
  longitude?: number | null
) => {
  const response = await api.post('/ask', {
    question,
    context: context || null,
    language: language || 'en',
    session_id: sessionId || null,
    latitude: latitude ?? null,
    longitude: longitude ?? null
  });
  return response.data;
};
export interface TranslateItem {
  id: string;
  text: string;
}

export const translateMessagesBatch = async (messages: TranslateItem[], targetLang: 'en' | 'si' | 'ta') => {
  const response = await api.post('/translate-batch', {
    messages,
    target_lang: targetLang
  });
  return response.data;
};

export const getTtsUrl = (text: string, lang: string) => {
  const baseUrl = api.defaults.baseURL || 'http://localhost:8000';
  return `${baseUrl}/tts?text=${encodeURIComponent(text)}&lang=${lang}`;
};

export const sendMultiLLMQuery = async (question: string, latitude: number | undefined, longitude: number | undefined, language: string) => {
  const response = await api.post('/ask-multi', {
    question,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    language
  }, {
    timeout: 120000, // 120s — this endpoint runs 3 LLMs + judge + translations
  });
  return response.data;
};
