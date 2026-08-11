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
  zone_id: string;
  point_a: SoilReading;
  point_b: SoilReading;
  point_c: SoilReading;
}

export interface SinglePointSoilPayload {
  tree_no: number;
  zone_id: string;
  reading: SoilReading;
}

export interface PredictionResult {
  tree_no: number;
  zone_id: string;
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

export const analyzeSoilNutrients = async (input: SoilAnalysisInput) => {
  try {
    const response = await api.post('/soil/analyze', input);
    return response.data;
  } catch (err) {
    return await predictSingleSoil({
      tree_no: 1,
      zone_id: "Standard Zone",
      reading: { N: input.N, P: input.P, K: input.K, pH: input.pH }
    });
  }
};

export const predictTriangulatedSoil = async (payload: TriangulatedSoilPayload): Promise<PredictionResult> => {
  const response = await api.post('/api/v1/predict/triangulated', payload);
  return response.data;
};

export const predictSingleSoil = async (payload: SinglePointSoilPayload): Promise<PredictionResult> => {
  const response = await api.post('/api/v1/predict/single', payload);
  return response.data;
};

export const getMakanduraTrees = async () => {
  const response = await api.get('/api/v1/trees');
  return response.data;
};
