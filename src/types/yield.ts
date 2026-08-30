export type TreeStatus = "Young" | "Bearing" | "Diseased" | "NonBearing";
export type TreeHealth = "Good" | "Average" | "Weak" | "Need Attention";

export interface YieldRecord {
  id: string;
  date: string; // YYYY-MM
  nuts: number;
  createdAt: number;
}

export interface TreeSensorData {
  n: number;        // Nitrogen
  p: number;        // Phosphorus
  k: number;        // Potassium
  ph: number;       // Soil pH
  soilMoisture: number; // Soil moisture %
}

export interface Tree {
  id: string;
  number: number;
  status: TreeStatus;
  health: TreeHealth;
  yield: number;
  nx: number;
  nz: number;
  zoneId: string | null;
  yieldHistory: YieldRecord[];
  notes: string;
  sensorData?: TreeSensorData;
  variety?: string;
  ageRange?: string;
  frondCount?: number;
}

export interface FarmData {
  perches: number;
  totalTrees: number;
  trees: Tree[];
}

export interface Farm {
  id: string;
  name: string;
  totalTrees: number;
  perches: number;
  locationName: string;
  lat: number;
  lng: number;
  deviceId: string;
  deviceIds?: string[];
  createdAt: number;
  lastHarvestDate?: string;
  lastHarvestYield?: number;
  /** generated tree layout, persisted so map is stable across sessions */
  treeLayout: { id: string; number: number; nx: number; nz: number }[];
}

export interface Zone {
  id: string;
  name: string;
  color: string;
  treeNumbers: number[];
  notes: string;
  createdAt: number;
}

export interface TelemetryData {
  temperature: number | null;
  humidity: number | null;
  soilMoisture: number | null;
  lightIntensity: number | null;
  lastSync: string;
  connectionMode: "WIFI" | "GSM";
  batteryLevel: number;
}

export interface HarvestLog {
  id: string;
  date: string;
  nutCount: number;
  gradeA: number;
  gradeB: number;
  gradeC: number;
  pricePerNut?: number;
  priceA?: number;
  priceB?: number;
  priceC?: number;
  revenue: number;
  notes: string;
  createdAt: number;
}

export interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
}

export interface WeatherPoint {
  month: string; // YYYY-MM
  rainfall: number; // mm
  temperature: number; // °C
  soilMoisture: number; // %
}

export type TimeMode = "auto" | "morning" | "day" | "night";

export interface AdvisoryAlert {
  id: string;
  treeNumber: number;
  zoneName: string;
  zoneColor: string;
  reason: string;
  action: string;
  severity: "high" | "medium";
  alertType: "soil" | "temperature" | "yield";
}

export type Tab = "home" | "telemetry" | "forecast" | "logs" | "analytics";

export type Screen =
  | { name: "home" }
  | { name: "farmForm"; farmId?: string }
  | { name: "farmDetail"; farmId: string }
  | { name: "zoneForm"; farmId: string; zoneId?: string }
  | { name: "mapper"; farmId: string }
  | { name: "telemetry"; farmId: string }
  | { name: "forecast"; farmId: string }
  | { name: "logs"; farmId: string }
  | { name: "analytics"; farmId: string }
  | { name: "farmsList" }
  | { name: "developerDebug" };
