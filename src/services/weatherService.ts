import axios from 'axios';

export interface WeatherData {
  temp: number;
  humidity: number;
  windSpeed: number;
  precipitation: number;
  condition: string;
}

export const getLiveWeather = async (latitude: number, longitude: number): Promise<WeatherData> => {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation&timezone=auto`;
    const response = await axios.get(url);
    
    if (response.data && response.data.current) {
      const cur = response.data.current;
      const temp = cur.temperature_2m;
      const humidity = cur.relative_humidity_2m;
      const windSpeed = cur.wind_speed_10m;
      const precipitation = cur.precipitation;
      
      // Determine simple text condition
      let condition = 'Sunny';
      if (precipitation > 0.5) condition = 'Rainy';
      else if (humidity > 80) condition = 'Humid / Cloudy';
      else if (temp > 30) condition = 'Hot & Clear';
      else if (windSpeed > 15) condition = 'Windy';

      return {
        temp,
        humidity,
        windSpeed,
        precipitation,
        condition
      };
    }
    
    // Default fallback values (ideal coconut climate)
    return {
      temp: 28.5,
      humidity: 78,
      windSpeed: 8.2,
      precipitation: 0.0,
      condition: 'Tropical Sunny'
    };
  } catch (err) {
    console.warn('Failed to fetch live weather, using typical coconut climate defaults:', err);
    return {
      temp: 28.5,
      humidity: 78,
      windSpeed: 8.2,
      precipitation: 0.0,
      condition: 'Tropical Sunny'
    };
  }
};
