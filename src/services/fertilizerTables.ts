export interface FertilizerRecommendation {
  urea: number;
  erp_or_tsp: number; // ERP for Wet/Intermediate, TSP for Dry
  mop: number;
  dolomite: number;
  phosphate_type: 'ERP' | 'TSP';
}

export function getStandardRecommendation(ageText: string, stageText: string, zoneStr: string): FertilizerRecommendation | null {
  // Parse age, fallback to checking stage if age is empty
  let age = parseFloat(ageText);
  
  if (isNaN(age)) {
    // If no age, check if stage is "bearing" or "adult", default to adult
    const stage = stageText.toLowerCase();
    if (stage.includes('bearing') || stage.includes('adult')) {
      age = 5; // Adult palm
    } else if (stage.includes('seedling')) {
      age = 1; // 1 year seedling
    } else {
      return null; // Can't determine recommendation
    }
  }

  const isDryZone = zoneStr.toLowerCase().includes('dry');
  
  // 1.3 Adult Palms (Age >= 4 or Bearing)
  if (age >= 4) {
    if (isDryZone) {
      return {
        urea: 800,
        erp_or_tsp: 400,
        mop: 1600,
        dolomite: 1000,
        phosphate_type: 'TSP'
      };
    } else {
      return {
        urea: 800,
        erp_or_tsp: 900,
        mop: 1600,
        dolomite: 1000,
        phosphate_type: 'ERP'
      };
    }
  }

  // 1.2 Up to Bearing (Age < 4)
  // Define thresholds: 0.5, 1.0, 1.5, 2.0, 2.5, 3.0, 3.5, 4.0
  let index = 0;
  if (age <= 0.5) index = 0;
  else if (age <= 1.0) index = 1;
  else if (age <= 1.5) index = 2;
  else if (age <= 2.0) index = 3;
  else if (age <= 2.5) index = 4;
  else if (age <= 3.0) index = 5;
  else if (age <= 3.5) index = 6;
  else index = 7;

  const ureaValues = [190, 235, 235, 305, 305, 375, 375, 470];
  const mopValues = [190, 235, 235, 305, 305, 375, 375, 470];
  const dolomiteValues = [500, 500, 500, 500, 500, 500, 500, 500];

  if (isDryZone) {
    const tspValues = [160, 200, 200, 300, 300, 360, 360, 400];
    return {
      urea: ureaValues[index],
      erp_or_tsp: tspValues[index],
      mop: mopValues[index],
      dolomite: dolomiteValues[index],
      phosphate_type: 'TSP'
    };
  } else {
    // Wet and Intermediate
    const erpValues = [420, 530, 530, 690, 690, 850, 850, 1060];
    return {
      urea: ureaValues[index],
      erp_or_tsp: erpValues[index],
      mop: mopValues[index],
      dolomite: dolomiteValues[index],
      phosphate_type: 'ERP'
    };
  }
}
