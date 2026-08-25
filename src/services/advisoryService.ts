import api from './api';

// ─── Single-LLM RAG Query ────────────────────────────────────────────────────
// Gateway: POST /api/advisory/ask  →  Advisory Service: POST /ask
export const sendAdvisoryMessage = async (
  question: string,
  context?: string | null,
  language?: string,
  sessionId?: string | null,
  latitude?: number | null,
  longitude?: number | null
) => {
  const response = await api.post('/advisory/ask', {
    question,
    context: context || null,
    language: language || 'en',
    session_id: sessionId || null,
    latitude: latitude ?? null,
    longitude: longitude ?? null
  }, {
    timeout: 60000 // 60s for RAG query + conversation memory + translation
  });
  return response.data;
};

// ─── Batch Translation ────────────────────────────────────────────────────────
// Gateway: POST /api/advisory/translate-batch  →  Advisory Service: POST /translate-batch
export interface TranslateItem {
  id: string;
  text: string;
}

export const translateMessagesBatch = async (messages: TranslateItem[], targetLang: 'en' | 'si' | 'ta') => {
  const response = await api.post('/advisory/translate-batch', {
    messages,
    target_lang: targetLang
  }, {
    timeout: 60000
  });
  return response.data;
};

// ─── Text-to-Speech URL Builder ───────────────────────────────────────────────
// Gateway: GET /api/advisory/tts?text=...&lang=...  →  Advisory Service: GET /tts
export const getTtsUrl = (text: string, lang: string) => {
  const baseUrl = api.defaults.baseURL || 'http://localhost:8000/api';
  return `${baseUrl}/advisory/tts?text=${encodeURIComponent(text)}&lang=${lang}`;
};

// ─── Multi-LLM Consensus Query ────────────────────────────────────────────────
// Gateway: POST /api/advisory/ask-multi  →  Advisory Service: POST /ask-multi
export const sendMultiLLMQuery = async (
  question: string,
  latitude: number | undefined,
  longitude: number | undefined,
  language: string,
  sessionId?: string | null
) => {
  const response = await api.post('/advisory/ask-multi', {
    question,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
    language,
    session_id: sessionId ?? null,
  }, {
    timeout: 120000, // 120s — this endpoint runs 3 LLMs + judge + translations
  });
  return response.data;
};

// ─── Speech-to-Text Transcription ─────────────────────────────────────────────
// Gateway: POST /api/advisory/transcribe  →  Advisory Service: POST /transcribe
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

  const response = await api.post('/advisory/transcribe', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 45000,
  });

  return response.data;
};
