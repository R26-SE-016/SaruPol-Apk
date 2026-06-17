import api from './api';

export interface YieldPredictionInput {
  Rainfall_mm: number;
  Temperature_C: number;
  Humidity_pct: number;
  SoilMoisture_pct: number;
  SoilpH: number;
  PalmAge_years: number;
  PalmHealth_1to5: number;
  Fertilizer_kg: number;
  PestDisease_binary: number;
  PrevYield_nuts_per_palm: number;
  WaterTable_m: number;
  Variety: string;
  SunshineHours: number;
  WindSpeed_kmh: number;
  Altitude_m: number;
  PlantDensity_per_ha: number;
  irrigation?: number;
  mulching?: number;
  intercropping?: number;
}

export const predictYieldAnnual = async (input: YieldPredictionInput) => {
  const response = await api.post('/predict', input);
  return response.data;
};

export const predictYield45Day = async (input: Partial<YieldPredictionInput>) => {
  // Map fields slightly as the 45day API takes lowercase properties
  const mappedInput = {
    temperature: input.Temperature_C,
    humidity: input.Humidity_pct,
    rainfall: input.Rainfall_mm,
    soil_moisture: input.SoilMoisture_pct,
    soil_ph: input.SoilpH,
    palm_age: input.PalmAge_years,
    palm_health: input.PalmHealth_1to5,
    fertilizer: input.Fertilizer_kg,
    pest_disease: input.PestDisease_binary,
    prev_yield: input.PrevYield_nuts_per_palm,
    water_table: input.WaterTable_m,
    variety: input.Variety,
    sunshine_hours: input.SunshineHours,
    wind_speed: input.WindSpeed_kmh,
    altitude: input.Altitude_m,
    plant_density: input.PlantDensity_per_ha,
    irrigation: input.irrigation ?? 0,
    mulching: input.mulching ?? 0,
    intercropping: input.intercropping ?? 0,
  };
  
  const response = await api.post('/predict/45day', mappedInput);
  return response.data;
};
