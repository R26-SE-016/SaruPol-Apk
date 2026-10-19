// ══════════════════════════════════════════════════════════════════════
// SaruPol — Pathology Detection (System B: Leaf-Level Diagnostics)
// Project: R26-SE-016 · Precision Computer Vision for Coconut Pathology
// ══════════════════════════════════════════════════════════════════════

/** The 6 classes classified by the MobileNetV2-INT8 System B model */
export type DiseaseClass =
  | 'bud rot'
  | 'bud root dropping'
  | 'gray leaf spot'
  | 'leaf rot'
  | 'stembleeding'
  | 'healthy leaves';

/** Clinical severity classifications */
export type DiseaseSeverity = 'Critical' | 'High' | 'Moderate' | 'Healthy';

/** Coconut plant parts supported by ground diagnosis */
export type PlantPart = 'leaf' | 'trunk' | 'crown' | 'root' | 'nut' | 'inflorescence';

/** Detailed clinical knowledge and treatment recommendations */
export interface DiseaseInfo {
  /** Human-readable disease name */
  displayName: string;
  /** Sinhala translation */
  sinhalaName: string;
  /** Tamil translation */
  tamilName?: string;
  /** Severity level */
  severity: DiseaseSeverity;
  /** UI badge icon */
  icon: string;
  /** UI theme color */
  color: string;
  /** Clinical overview */
  description: string;
  /** Affected anatomical structure */
  affectedPart: string;
  /** CRI chemical treatment protocol */
  chemical: string;
  /** CRI cultural & agronomic practices */
  cultural: string;
  /** CRI preventive and prophylactic measures */
  preventive: string;
}

/** Input payload for System B leaf-level classification */
export interface PathologyInput {
  imageBase64: string;
  part?: string;
  system?: 'B';
  location?: { lat: number; lng: number };
}

/** Individual class prediction probability */
export interface DiseaseClassPrediction {
  class: DiseaseClass;
  confidence: number;
}

/** Enriched diagnosis response returned by Gateway / System B */
export interface PathologyResult {
  disease_class: DiseaseClass;
  confidence: number;
  all_predictions: DiseaseClassPrediction[];
  inference_time_ms: number;
  system: 'B';
  part: string;
  status: 'healthy' | 'diseased';
  diagnosis: string;
  severity: DiseaseSeverity;
  recommendations: {
    chemical: string;
    cultural: string;
    preventive: string;
  };
  timestamp: string;
  source?: 'live' | 'mock_fallback';
}

/** A single field diagnostic scan item for batch synchronization */
export interface SyncBatchItem {
  disease_class: string;
  confidence: number;
  gps: { lat: number; lng: number };
  captured_at: string;
  image_ref?: string;
  local_id: string;
  part?: string;
}

/** BulkWriter synchronization payload sent to Firebase Cloud Functions */
export interface SyncPayload {
  user_id: string;
  device_id: string;
  estate_id: string;
  batch: SyncBatchItem[];
}

/** Response from the batch synchronization service */
export interface SyncReceipt {
  synced_count: number;
  failed_ids: string[];
  server_timestamp: string;
  offline?: boolean;
}

/** Historical diagnostic record stored in Firestore `diagnostics/` */
export interface DiagnosticHistoryItem {
  id: string;
  disease_class: string;
  confidence: number;
  gps?: { lat: number; lng: number };
  captured_at: string;
  image_ref?: string;
  part?: string;
  estate_id?: string;
  recommendations?: {
    chemical: string;
    cultural: string;
    preventive: string;
  };
  status?: 'healthy' | 'diseased';
  diagnosis?: string;
  severity?: DiseaseSeverity;
}

/** End-user feedback payload for continuous learning */
export interface FeedbackInput {
  predictionId: string;
  isCorrect: boolean;
  correctLabel?: string;
  comments?: string;
}
