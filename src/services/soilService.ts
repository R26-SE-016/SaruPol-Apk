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
  const response = await api.post('/api/v1/predict/triangulated', payload);
  return response.data;
};

export const getMakanduraTrees = async () => {
  const response = await api.get('/api/v1/trees');
  return response.data;
};
