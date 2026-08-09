// utils/contextHelper.ts

export const determineSeason = (date: Date): string => {
  const month = date.getMonth() + 1; // getMonth() returns 0-11
  // Yala: May (5) to September (9)
  if (month >= 5 && month <= 9) {
    return 'Yala';
  }
  // Maha: October (10) to April (4)
  return 'Maha';
};

export const getMonthName = (date: Date): string => {
  return date.toLocaleString('default', { month: 'long' });
};

export const determineZone = (lat: number, lon: number): string => {
  // Rough bounding box for Sri Lanka Wet Zone
  // Lat: ~5.9 to ~7.5, Lon: ~79.8 to ~80.6
  if (lat >= 5.9 && lat <= 7.5 && lon >= 79.8 && lon <= 80.6) {
    return 'Wet Zone';
  }
  
  // Rough bounding box for Intermediate Zone
  // Surrounding the wet zone, extending a bit north and east
  // Lat: ~5.9 to ~8.0, Lon: ~79.8 to ~81.2 (excluding wet zone)
  if (lat >= 5.9 && lat <= 8.0 && lon >= 79.8 && lon <= 81.2) {
    return 'Intermediate Zone';
  }
  
  // If not Wet or Intermediate, but generally in/around Sri Lanka, we call it Dry Zone
  // Sri Lanka roughly: Lat 5.9 to 9.9, Lon 79.5 to 81.9
  if (lat >= 5.5 && lat <= 10.0 && lon >= 79.5 && lon <= 82.0) {
    return 'Dry Zone';
  }
  
  return 'Unknown Zone';
};
