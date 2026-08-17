export interface CdaRateResponse {
  lastUpdated: string;
  rates: Record<string, number>;
}

export const fetchLiveCdaRates = async (): Promise<CdaRateResponse> => {
  try {
    const res = await fetch("http://localhost:5000/api/cda-rates");
    if (res.ok) {
      const data = await res.json();
      return {
        lastUpdated: data.date || new Date().toISOString(),
        rates: {
          "Kurunegala": data.a_grade_price || 155,
          "Default": data.b_grade_price || 120,
        }
      };
    }
  } catch (e) {
    // Ignore and return defaults
  }
  return {
    lastUpdated: new Date().toISOString(),
    rates: {
      "Kurunegala": 155,
      "Gampaha": 160,
      "Puttalam": 150,
      "Colombo": 165,
      "Default": 85
    }
  };
};

export const resolveDistrict = (locationName: string): string | null => {
  const lc = locationName.toLowerCase();
  if (lc.includes("kurunegala")) return "Kurunegala";
  if (lc.includes("gampaha")) return "Gampaha";
  if (lc.includes("puttalam")) return "Puttalam";
  if (lc.includes("colombo")) return "Colombo";
  return null;
};
