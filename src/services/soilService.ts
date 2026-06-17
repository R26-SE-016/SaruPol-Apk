import api from './api';

export interface SoilAnalysisInput {
  pH: number;
  N: number;
  P: number;
  K: number;
  Organic_Carbon: number;
  EC: number;
  Moisture: number;
  Sand_pct: number;
  Clay_pct: number;
  Silt_pct: number;
  Soil_Type: string;
}

export const analyzeSoilNutrients = async (input: SoilAnalysisInput) => {
  const response = await api.post('/soil/analyze', input);
  return response.data;
};
