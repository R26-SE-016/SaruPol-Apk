// ══════════════════════════════════════════════════════════════════════
// SaruPol — Disease Knowledge Constants
// Source: Coconut Research Institute (CRI) Sri Lanka + System B classes
//
// Maps all 6 MobileNetV2-INT8 disease_class labels to clinical metadata
// used across scan.tsx, scan-result.tsx, and history.tsx.
// ══════════════════════════════════════════════════════════════════════

export type DiseaseClass =
  | 'bud rot'
  | 'bud root dropping'
  | 'gray leaf spot'
  | 'leaf rot'
  | 'stembleeding'
  | 'healthy leaves';

export type DiseaseSeverity = 'Critical' | 'High' | 'Moderate' | 'Healthy';

export interface DiseaseInfo {
  /** Human-readable disease name with pathogen */
  displayName: string;
  /** Sinhala name */
  sinhalaName: string;
  /** Severity classification */
  severity: DiseaseSeverity;
  /** Emoji icon for UI display */
  icon: string;
  /** Brand color for charts and badges */
  color: string;
  /** Brief one-line description */
  description: string;
  /** Affected part of the palm */
  affectedPart: string;
  /** Chemical treatment recommendation */
  chemical: string;
  /** Cultural / physical treatment recommendation */
  cultural: string;
  /** Preventive treatment recommendation */
  preventive: string;
}

export const DISEASE_KNOWLEDGE: Record<DiseaseClass, DiseaseInfo> = {
  'bud rot': {
    displayName: 'Bud Rot',
    sinhalaName: 'අග කුණු වීම',
    severity: 'Critical',
    icon: '🔴',
    color: '#EF4444',
    description: 'Phytophthora palmivora fungal infection — causes crown collapse and palm death if untreated.',
    affectedPart: 'Crown / Spear Leaf',
    chemical: 'Remove all dead crown tissues. Apply Bordeaux paste or Copper Oxychloride paste on all cut surfaces immediately.',
    cultural: 'Destroy and burn all removed infected plant material. Avoid damaging the crown during field operations.',
    preventive: 'Prophylactically spray neighboring palms with Mancozeb (4g/L). Ensure good drainage around the palm base.',
  },
  'bud root dropping': {
    displayName: 'Bud Root Dropping',
    sinhalaName: 'කරය හැලීම',
    severity: 'High',
    icon: '🟠',
    color: '#F97316',
    description: 'Root-crown interface decay leading to structural instability and frond shedding.',
    affectedPart: 'Root / Crown Interface',
    chemical: 'Apply Hexaconazole (3ml/L) soil drench around the root zone. Treat crown with Carbendazim paste.',
    cultural: 'Remove and incinerate dropped plant material immediately. Isolate affected palms with a soil trench.',
    preventive: 'Maintain soil aeration and avoid waterlogging. Apply Neem Cake (5kg/palm/year) as organic preventive.',
  },
  'gray leaf spot': {
    displayName: 'Gray Leaf Spot',
    sinhalaName: 'කළු ලප රෝගය',
    severity: 'Moderate',
    icon: '🟡',
    color: '#EAB308',
    description: 'Pestalotiopsis palmarum fungal spots on leaves — reduces photosynthesis and palm vigor.',
    affectedPart: 'Leaves / Fronds',
    chemical: 'Spray 1% Bordeaux mixture or Copper Oxychloride (3g/L) on affected leaves during the early stage.',
    cultural: 'Prune and burn severely affected leaves. Improve canopy airflow by removing lower fronds.',
    preventive: 'Apply balanced potassium fertilizer to boost palm resistance. Avoid overhead irrigation.',
  },
  'leaf rot': {
    displayName: 'Leaf Rot',
    sinhalaName: 'කොළ කුණු වීම',
    severity: 'High',
    icon: '🟠',
    color: '#EA580C',
    description: 'Colletotrichum infection causing progressive leaf tissue decay and defoliation.',
    affectedPart: 'Leaves / Fronds',
    chemical: 'Apply Mancozeb (2.5g/L) or Carbendazim (1g/L) spray at early symptom appearance.',
    cultural: 'Remove and destroy fully infected fronds. Ensure micro-nutrients boron and zinc are applied to soil.',
    preventive: 'Reduce canopy humidity with proper palm spacing. Monitor for early yellowing signs after rainfall.',
  },
  'stembleeding': {
    displayName: 'Stem Bleeding',
    sinhalaName: 'කඳෙන් ලේ වැගිරීම',
    severity: 'Critical',
    icon: '🔴',
    color: '#DC2626',
    description: 'Ceratocystis paradoxa — dark exudate from trunk; rapidly kills vascular tissues.',
    affectedPart: 'Trunk / Stem',
    chemical: 'Chisel out infected trunk tissues. Apply Coal Tar or Bordeaux paste to all cut surfaces immediately.',
    cultural: 'Avoid wounding the trunk during agricultural activities. Remove excess soil piled against the trunk.',
    preventive: 'Apply Carbendazim root feeding (2g in 100ml water) once every 3 months as prophylaxis.',
  },
  'healthy leaves': {
    displayName: 'Healthy Palm',
    sinhalaName: 'සෞඛ්‍ය සම්පන්න',
    severity: 'Healthy',
    icon: '🟢',
    color: '#22C55E',
    description: 'No disease detected. Palm appears healthy and vigorous.',
    affectedPart: 'None',
    chemical: 'No chemical treatment required.',
    cultural: 'Maintain current cultural practices. Continue regular monitoring every 2–4 weeks.',
    preventive: 'Maintain optimal NPK fertilization schedule as per CRI recommendations. Ensure good drainage.',
  },
};

/** Ordered list of disease classes for display purposes (healthy last) */
export const DISEASE_CLASS_ORDER: DiseaseClass[] = [
  'bud rot',
  'stembleeding',
  'bud root dropping',
  'leaf rot',
  'gray leaf spot',
  'healthy leaves',
];

/** Map disease_class string → severity color for charts */
export const SEVERITY_COLORS: Record<DiseaseSeverity, string> = {
  Critical: '#EF4444',
  High: '#F97316',
  Moderate: '#EAB308',
  Healthy: '#22C55E',
};

/** Get disease info with safe fallback */
export function getDiseaseInfo(diseaseClass: string): DiseaseInfo {
  const normalized = diseaseClass.toLowerCase().trim() as DiseaseClass;
  return DISEASE_KNOWLEDGE[normalized] ?? DISEASE_KNOWLEDGE['healthy leaves'];
}
