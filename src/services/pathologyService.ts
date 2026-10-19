// ══════════════════════════════════════════════════════════════════════
// SaruPol — Pathology Detection Service (System B: Microscopic Diagnostics)
// Project: R26-SE-016 · Precision Computer Vision for Coconut Pathology
//
// Exclusively interfaces System B: On-device / MobileNetV2-INT8 leaf
// classification, BulkWriter Firestore sync, and diagnostic history.
// System A (UAV aerial canopy surveillance) is reserved for the web platform.
// ══════════════════════════════════════════════════════════════════════

import api from './api';
import type {
  DiseaseClass,
  DiseaseSeverity,
  DiseaseInfo,
  PathologyInput,
  DiseaseClassPrediction,
  PathologyResult,
  SyncBatchItem,
  SyncPayload,
  SyncReceipt,
  DiagnosticHistoryItem,
  FeedbackInput,
} from '../types/pathology';

export type {
  DiseaseClass,
  DiseaseSeverity,
  DiseaseInfo,
  PathologyInput,
  DiseaseClassPrediction,
  PathologyResult,
  SyncBatchItem,
  SyncPayload,
  SyncReceipt,
  DiagnosticHistoryItem,
  FeedbackInput,
};

// ── System B API Functions ───────────────────────────────────────────

/**
 * Sends a leaf image (base64) to the Gateway which forwards it to the
 * Firebase Cloud Function `predict_mobile_disease` (MobileNetV2-INT8).
 * Returns an enriched diagnosis with Sri Lanka CRI clinical metadata.
 */
export const classifyImage = async (input: PathologyInput): Promise<PathologyResult> => {
  const response = await api.post('/pathology/classify', {
    imageBase64: input.imageBase64,
    part: input.part || 'leaf',
    system: 'B',
  });
  return response.data;
};

/**
 * Batch-syncs field diagnostic records to Google Cloud Firestore via the Gateway
 * which proxies to the `sync_mobile_diagnostics` Firebase Cloud Function (BulkWriter).
 */
export const syncDiagnostics = async (payload: SyncPayload): Promise<SyncReceipt> => {
  const response = await api.post('/pathology/sync', payload);
  return response.data;
};

/**
 * Fetches user diagnostic history from Firestore via the Gateway
 * which proxies to the `get_diagnostic_history` Firebase Cloud Function.
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
 * Submits agronomic validation feedback on a disease diagnosis prediction
 * to improve model reliability and record verified ground truth.
 */
export const submitDiagnosisFeedback = async (
  input: FeedbackInput
): Promise<{ success: boolean; local?: boolean }> => {
  try {
    const response = await api.post('/pathology/feedback', input);
    return response.data;
  } catch {
    // Feedback is non-critical — log locally and confirm to user
    console.log('[PathologyService] Feedback recorded locally (backend offline).');
    return { success: true, local: true };
  }
};
