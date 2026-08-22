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

export interface TranscribeResponse {
  success: boolean;
  transcribed_text: string;
  detected_language: string;
  duration_ms: number;
  error?: string;
}

export const transcribeAudio = async (
  audioUri: string,
  language: string = 'auto'
): Promise<TranscribeResponse> => {
  const formData = new FormData();
  
  const uriParts = audioUri.split('/');
  const fileName = uriParts[uriParts.length - 1] || 'recording.m4a';
  const fileType = fileName.endsWith('.wav') 
    ? 'audio/wav' 
    : fileName.endsWith('.mp3') 
    ? 'audio/mpeg' 
    : 'audio/m4a';

  formData.append('audio', {
    uri: audioUri,
    name: fileName,
    type: fileType,
  } as any);
  
  formData.append('language', language || 'auto');

  const response = await api.post('/transcribe', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 45000,
  });

  return response.data;
};

