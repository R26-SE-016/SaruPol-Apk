import api from './api';

export interface PathologyInput {
  imageBase64: string;
  part: string;      // crown, trunk, leaf, nut, root, inflorescence
  system?: 'A' | 'B' | 'C';
}

export interface FeedbackInput {
  predictionId: string;
  isCorrect: boolean;
  correctLabel?: string;
  comments?: string;
}

export const classifyImage = async (input: PathologyInput) => {
  const response = await api.post('/pathology/classify', {
    image: input.imageBase64,
    part: input.part,
    system: input.system || 'B' // B is the primary unified multi-label classifier
  });
  return response.data;
};

export const submitDiagnosisFeedback = async (input: FeedbackInput) => {
  const response = await api.post('/pathology/feedback', input);
  return response.data;
};
