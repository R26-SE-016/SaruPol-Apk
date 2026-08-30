import api from './api';
import { Platform } from 'react-native';
import { useAppStore } from '../store/appStore';

export interface NutrientPrediction {
  nutrient: string;
  class: string;
  confidence: number;
}

export interface ImageRecommendation {
  source: string;
  assessment_type: string;
  advice: string;
}

export interface NutrientAnalysisResponse {
  success: boolean;
  status: 'success' | 'uncertain' | 'error';
  message: string | null;
  prediction: NutrientPrediction | null;
  recommendation: ImageRecommendation | null;
  visual_features?: Record<string, number>;
}

/**
 * Sends a leaf image to the FastAPI backend for visual nutrient deficiency analysis.
 */
export const analyzeLeafImage = async (imageUri: string): Promise<NutrientAnalysisResponse> => {
  try {
    const formData = new FormData();
    const filename = imageUri.split('/').pop() || 'leaf.jpg';

    if (Platform.OS === 'web') {
      // On Web, expo-image-picker returns a blob URL or base64. 
      // We MUST fetch it and append as a Blob, otherwise it sends as a string "[object Object]".
      const res = await fetch(imageUri);
      const blob = await res.blob();
      formData.append('image', blob, filename);
    } else {
      // On Native Android/iOS
      const match = /\.(\w+)$/.exec(filename);
      const type = match ? `image/${match[1]}` : `image/jpeg`;
      
      formData.append('image', {
        uri: Platform.OS === 'ios' ? imageUri.replace('file://', '') : imageUri,
        name: filename,
        type,
      } as any);
    }

    // Use native fetch API instead of Axios for FormData.
    // Axios in React Native has known bugs with appending boundaries to multipart/form-data.
    const token = useAppStore.getState().token;
    const baseUrl = api.defaults.baseURL || 'http://localhost:8000/api';
    const endpoint = `${baseUrl}/soil/nutrient-analysis/predict`;

    const fetchResponse = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        // DO NOT set Content-Type, fetch will set it automatically with the boundary!
      },
    });

    if (!fetchResponse.ok) {
      let errData;
      try { errData = await fetchResponse.json(); } catch (e) {}
      throw new Error(errData?.detail || errData?.message || `Server error: ${fetchResponse.status}`);
    }

    const data: NutrientAnalysisResponse = await fetchResponse.json();
    return data;
  } catch (error: any) {
    throw new Error(error.message || 'An unexpected error occurred.');
  }
};

export interface SaveScanPayload {
  user_id: string;
  palm_age: string;
  palm_stage: string;
  zone: string;
  image_uri: string;
  prediction: NutrientPrediction | null;
  recommendation: ImageRecommendation | null;
}

export interface SavedNutrientScan {
  id: string;
  user_id: string;
  palm_age: string;
  palm_stage: string;
  zone: string;
  image_uri: string;
  prediction: NutrientPrediction | null;
  recommendation: ImageRecommendation | null;
  timestamp: string;
}

export interface DeficiencyDetail {
  id: string;
  nameEn: string;
  chemicalSymbol: string;
  criticalRange: string;
  overview: string;
  symptoms: string[];
  causes: string[];
  correctiveMeasures: string[];
  themeColor: string;
  description: string;
  advice: string;
}

/**
 * Saves a leaf nutrient scan result to Firestore.
 */
export const saveNutrientScan = async (payload: SaveScanPayload): Promise<{ success: boolean; message: string; id: string }> => {
  const response = await api.post('/soil/nutrient-analysis/scans', payload);
  return response.data;
};

/**
 * Fetches the leaf nutrient scan history for a user from Firestore.
 */
export const getNutrientScans = async (userId: string): Promise<SavedNutrientScan[]> => {
  const response = await api.get('/soil/nutrient-analysis/scans', { params: { user_id: userId } });
  return response.data;
};

/**
 * Fetches the dynamic deficiency details from Firestore.
 */
export const getDeficiencies = async (): Promise<DeficiencyDetail[]> => {
  const response = await api.get('/soil/nutrient-analysis/deficiencies');
  return response.data;
};

export interface LabRecommendationRequest {
  nitrogen: number;
  phosphorus: number;
  potassium: number;
  magnesium?: number | null;
  palm_age: number;
  zone: string;
}

export interface LabRecommendationResponse {
  urea: number;
  erp_or_tsp: number;
  mop: number;
  dolomite: number;
  phosphate_type: string;
  evalN: string;
  evalP: string;
  evalK: string;
  evalMg: string;
  health_status: string;
  agronomic_advice: string[];
}

/**
 * Fetches fertilizer recommendation for lab test entries from the backend.
 */
export const getLabRecommendation = async (payload: LabRecommendationRequest): Promise<LabRecommendationResponse> => {
  const response = await api.post('/soil/nutrient-analysis/lab-recommendation', payload);
  return response.data;
};


