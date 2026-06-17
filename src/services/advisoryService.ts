import api from './api';

export interface ChatMessageInput {
  message: string;
  session_id?: string;
}

export const sendAdvisoryMessage = async (message: string, sessionId?: string) => {
  const response = await api.post('/advisory/chat', {
    message,
    session_id: sessionId || 'default-session'
  });
  return response.data;
};
