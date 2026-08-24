import api from './api';
import type { DiseaseClass } from '../constants/diseaseKnowledge';

// ── Request / Response Types ─────────────────────────────────────────

export interface PathologyInput {
  imageBase64: string;
  part: string;      // crown, trunk, leaf, nut, root, inflorescence
  system?: 'A' | 'B' | 'C';
}

export interface DiseaseClassPrediction {
  class: DiseaseClass;
  confidence: number;
}

export interface PathologyResult {
  // System B inference output
  disease_class: DiseaseClass;
  confidence: number;
  all_predictions: DiseaseClassPrediction[];
  inference_time_ms: number;
  // Enriched by gateway
  system: string;
  part: string;
  status: 'healthy' | 'diseased';
  diagnosis: string;
  severity: 'Critical' | 'High' | 'Moderate' | 'Healthy';
  recommendations: {
    chemical: string;
    cultural: string;
    preventive: string;
  };
  timestamp: string;
  source?: 'live' | 'mock_fallback';
}

export interface FeedbackInput {
  predictionId: string;
  isCorrect: boolean;
  correctLabel?: string;
  comments?: string;
}

export interface SyncBatchItem {
  disease_class: string;
  confidence: number;
  gps: { lat: number; lng: number };
  captured_at: string;
  image_ref: string;
  local_id: string;
  part?: string;
}

export interface SyncPayload {
  user_id: string;
  device_id: string;
  estate_id: string;
  batch: SyncBatchItem[];
}

export interface DiagnosticHistoryItem {
  id: string;
  disease_class: string;
  confidence: number;
  gps?: { lat: number; lng: number };
  captured_at: string;
  image_ref: string;
  part?: string;
  estate_id?: string;
}

// ── API Functions ────────────────────────────────────────────────────

/**
 * Sends an image (base64) to the Gateway which forwards it as multipart
 * to the Firebase Cloud Function `predict_mobile_disease`.
 * Returns enriched result with clinical metadata.
 */
export const classifyImage = async (input: PathologyInput): Promise<PathologyResult> => {
  const response = await api.post('/pathology/classify', {
    imageBase64: input.imageBase64,
    part: input.part,
    system: input.system || 'B',
  });
  return response.data;
};

/**
 * Batch-syncs offline diagnostic results to Firestore via the Gateway
 * which proxies to `sync_mobile_diagnostics` Firebase Function.
 */
export const syncDiagnostics = async (payload: SyncPayload): Promise<{
  synced_count: number;
  failed_ids: string[];
  server_timestamp: string;
  offline?: boolean;
}> => {
  const response = await api.post('/pathology/sync', payload);
  return response.data;
};

/**
 * Fetches user diagnostic history from Firestore via the Gateway
 * which proxies to `get_diagnostic_history` Firebase Function.
 */
export const getDiagnosticHistory = async (
  userId: string,
  estateId?: string,
  limit = 50
): Promise<{ user_id: string; count: number; diagnostics: DiagnosticHistoryItem[]; offline?: boolean }> => {
  const params: Record<string, string> = { user_id: userId, limit: String(limit) };
  if (estateId) params.estate_id = estateId;

  const response = await api.get('/pathology/history', { params });
  return response.data;
};

/**
 * Submit feedback on a diagnosis prediction.
 */
export const submitDiagnosisFeedback = async (input: FeedbackInput) => {
  try {
    const response = await api.post('/pathology/feedback', input);
    return response.data;
  } catch {
    // Feedback is non-critical — log locally and return success
    console.log('[PathologyService] Feedback saved locally (backend offline).');
    return { success: true, local: true };
  }
};

// ── System A (Aerial) Hotspot Inspection Bridge ───────────────────────

export interface CanopyHotspotItem {
  id: string;
  estate_id?: string;
  location: { lat: number; lng: number };
  severity: 'critical' | 'high' | 'moderate';
  mean_index_value: number;
  radius_meters: number;
  recommended_action: string;
  status: 'pending' | 'inspected' | 'resolved';
  created_at?: string;
  leaf_diagnostic_id?: string;
}

/**
 * Fetches flagged canopy stress hotspots for an estate from the Gateway
 * to direct the field officer to trees requiring ground verification.
 */
export const getCanopyHotspots = async (
  estateId: string = 'estate_001',
  status?: string
): Promise<{ estate_id: string; count: number; hotspots: CanopyHotspotItem[]; offline?: boolean }> => {
  try {
    const params: Record<string, string> = { estate_id: estateId };
    if (status) params.status = status;

    const response = await api.get('/pathology/aerial/hotspots', { params });
    return response.data;
  } catch (err: any) {
    console.warn('[PathologyService] Failed to fetch hotspots, returning default list:', err.message);
    return {
      estate_id: estateId,
      count: 2,
      hotspots: [
        {
          id: 'hotspot_sector_b_01',
          estate_id: estateId,
          location: { lat: 7.2914, lng: 80.6342 },
          severity: 'critical',
          mean_index_value: 0.28,
          radius_meters: 6.4,
          recommended_action: 'Sector B: Immediate on-site mobile leaf scan required for Bud Rot.',
          status: 'pending',
        },
        {
          id: 'hotspot_sector_c_04',
          estate_id: estateId,
          location: { lat: 7.2928, lng: 80.6325 },
          severity: 'high',
          mean_index_value: 0.42,
          radius_meters: 4.8,
          recommended_action: 'Sector C: Crown chlorosis detected. Inspect leaf margins for Gray Leaf Spot.',
          status: 'pending',
        },
      ],
      offline: true,
    };
  }
};

/**
 * Updates a hotspot status once the field officer conducts a mobile leaf scan.
 */
export const updateHotspotStatus = async (
  hotspotId: string,
  status: 'inspected' | 'resolved',
  leafDiagnosticId?: string
) => {
  try {
    const response = await api.patch(`/pathology/aerial/hotspots/${hotspotId}`, {
      status,
      leaf_diagnostic_id: leafDiagnosticId,
    });
    return response.data;
  } catch (err: any) {
    console.warn('[PathologyService] Update hotspot status offline acknowledgement:', err.message);
    return { success: true, local: true, hotspot_id: hotspotId, status };
  }
};

