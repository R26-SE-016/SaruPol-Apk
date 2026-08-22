import axios from 'axios';

export interface WeatherData {
  temp: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  condition: string;
  weatherCode?: number;
  daily?: any[];
}

export const getLiveWeather = async (latitude: number, longitude: number): Promise<WeatherData> => {
  try {
    // Added: weather_code for proper condition, daily=precipitation_sum for today's total rainfall
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,weather_code&daily=precipitation_sum&timezone=auto&forecast_days=1`;
    const response = await axios.get(url);

    if (response.data && response.data.current) {
      const cur = response.data.current;
      const daily = response.data.daily;
      const weatherCode = cur.weather_code ?? -1;
      // Daily total is far more meaningful than 15-min instant value (which is always 0 when not raining)
      const precipitation = daily?.precipitation_sum?.[0] ?? cur.precipitation ?? 0;

      let condition = 'Clear Sky';
      if (weatherCode >= 95) condition = 'Thunderstorm';
      else if (weatherCode >= 80) condition = 'Showers';
      else if (weatherCode >= 61) condition = 'Rainy';
      else if (weatherCode >= 51) condition = 'Drizzle';
      else if (weatherCode >= 45) condition = 'Foggy';
      else if (weatherCode >= 2) condition = 'Partly Cloudy';
      else if (weatherCode === 1) condition = 'Mainly Clear';

      return {
        temp: cur.temperature_2m,
        humidity: cur.relative_humidity_2m,
        windSpeed: cur.wind_speed_10m,
        precipitation,
        condition,
        weatherCode,
        daily: daily ? [{ date: daily.time?.[0], precipitationSum: precipitation }] : [],
      };
    }

    return { temp: 28.5, humidity: 78, windSpeed: 8.2, precipitation: 0.0, condition: 'Tropical Sunny', weatherCode: 0 };
  } catch (err) {
    console.warn('Failed to fetch live weather:', err);
    return { temp: 28.5, humidity: 78, windSpeed: 8.2, precipitation: 0.0, condition: 'Tropical Sunny', weatherCode: 0 };
  }
};

export const fetchWeather = getLiveWeather;

export const resolveCoords = async (lat: number, lng: number): Promise<string> => {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
};

export interface OpenMeteoCurrent {
  temperature_2m: number;
  relative_humidity_2m: number;
  wind_speed_10m: number;
  precipitation: number;
}

export const weatherInfo = (condition: string | number): { icon: string, color: string, label: string } => {
  const code = typeof condition === 'number' ? condition : -1;
  if (code >= 95) return { icon: 'thunderstorm', color: '#4a148c', label: 'Thunderstorm' };
  if (code >= 80) return { icon: 'rainy', color: '#1565c0', label: 'Showers' };
  if (code >= 61) return { icon: 'rainy', color: '#1E88E5', label: 'Rainy' };
  if (code >= 51) return { icon: 'rainy', color: '#42a5f5', label: 'Drizzle' };
  if (code >= 45) return { icon: 'cloudy', color: '#78909C', label: 'Foggy' };
  if (code >= 2)  return { icon: 'partly-sunny', color: '#78909C', label: 'Partly Cloudy' };
  if (code >= 0)  return { icon: 'sunny', color: '#FFB300', label: 'Clear Sky' };
  const condStr = String(condition);
  if (condStr.includes('Sunny') || condStr.includes('Clear')) return { icon: 'sunny', color: '#FFB300', label: 'Sunny' };
  if (condStr.includes('Thunder')) return { icon: 'thunderstorm', color: '#4a148c', label: 'Thunderstorm' };
  if (condStr.includes('Rain') || condStr.includes('Shower')) return { icon: 'rainy', color: '#1E88E5', label: 'Rainy' };
  if (condStr.includes('Cloud') || condStr.includes('Drizzle')) return { icon: 'partly-sunny', color: '#78909C', label: 'Cloudy' };
  return { icon: 'cloud', color: '#B0BEC5', label: 'Overcast' };
};

export const shortDayName = (dateStr: string): string => {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { weekday: 'short' });
};

export const isToday = (dateStr: string): boolean => {
  const d = new Date(dateStr);
  const today = new Date();
  return d.toDateString() === today.toDateString();
};
