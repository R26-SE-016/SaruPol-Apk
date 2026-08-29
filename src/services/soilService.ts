import api from './api';

export interface SoilReading {
  N: number;
  P: number;
  K: number;
  pH?: number;
  moisture?: number;
  temperature?: number;
  EC?: number;
}

export interface TriangulatedSoilPayload {
  tree_no: number;
  point_a: SoilReading;
  point_b: SoilReading;
  point_c: SoilReading;
}



export interface PredictionResult {
  tree_no: number;
  sampling_method: string;
  average_soil_npk: { N: number; P: number; K: number };
  predicted_14th_leaf_npk: { N: number; P: number; K: number };
  health_status: string;
  fertilizer_recommendation_grams_per_year: {
    Urea: number;
    Eppawala_Rock_Phosphate_ERP: number;
    Muriate_of_Potash_MOP: number;
    Dolomite: number;
  };
  nutrient_evaluation: {
    Nitrogen_N: string;
    Phosphorus_P: string;
    Potassium_K: string;
    Soil_pH: string;
  };
  agronomic_advice: string[];
  model_used: string;
}

export const predictTriangulatedSoil = async (payload: TriangulatedSoilPayload): Promise<PredictionResult> => {
  const response = await api.post('/soil/predict/triangulated', payload);
  return response.data;
};

export const getMakanduraTrees = async () => {
  const response = await api.get('/soil/trees');
  return response.data;
};

export const getAgroClimaticZone = async (latitude: number, longitude: number) => {
  const response = await api.post('/soil/location/agro-zone', { latitude, longitude });
  return response.data;
};

export interface SoilAnalysisStartResponse {
  analysis_id: string;
  tree_no: string;
  status: string;
  message: string;
}

export const startSoilAnalysis = async (treeNo: string): Promise<SoilAnalysisStartResponse> => {
  const response = await api.post('/soil/analysis/start', { tree_no: treeNo });
  return response.data;
};

export const addSoilReading = async (payload: {
  analysis_id: string;
  tree_no: string;
  point_name: string;
  reading: SoilReading;
}) => {
  const response = await api.post('/soil/analysis/reading', payload);
  return response.data;
};

export const completeSoilAnalysis = async (payload: {
  analysis_id: string;
  tree_no: string;
}) => {
  const response = await api.post('/soil/analysis/complete', payload);
  return response.data;
};
