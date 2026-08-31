import { useState, useEffect, useCallback } from "react";
import api from "@/services/api";
import { fetchWeather, type WeatherData } from "@/services/weatherService";
import type { Farm, TelemetryData } from "@/types/yield";

export type DataSource = "iot" | "api" | "none";

export interface HybridTelemetry {
  telemetry: TelemetryData | null;
  weather: WeatherData | null;
  source: DataSource;
  deviceLive: boolean;
  usedFallbackCoords: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Hybrid telemetry hook — prioritizes ESP32 IoT sensor readings when available,
 * falls back to Open-Meteo API weather data when the device is offline.
 * Re-fetches automatically whenever the active farm changes.
 */
export function useYieldHybridTelemetry(farm: Farm | null): HybridTelemetry {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [source, setSource] = useState<DataSource>("none");
  const [deviceLive, setDeviceLive] = useState(false);
  const [usedFallbackCoords, setUsedFallbackCoords] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const refresh = useCallback(() => setRefreshTick((n) => n + 1), []);

  // --- ESP32 IoT fetch via Gateway ---
  useEffect(() => {
    if (!farm || !farm.deviceId) {
      setTelemetry(null);
      setDeviceLive(false);
      setSource("none");
      return;
    }

    let cancelled = false;

    const checkDevice = async () => {
      try {
        const res = await api.get(`/yield/devices/${farm.deviceId}/latest`);
        if (cancelled) return;
        const v = res.data?.latest;
        if (v) {
          const currentLastSeen = v.last_seen ? new Date(v.last_seen).getTime() : (v.timestamp ? new Date(v.timestamp).getTime() : Date.now());
          let bootStr = "Unknown";
          if (v.unixTime && v.uptimeMinutes != null) {
            const bootDate = new Date((v.unixTime - v.uptimeMinutes * 60) * 1000);
            bootStr = bootDate.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
          }

          setTelemetry({
            temperature: v.temperatureC ?? v.temperature ?? v.temp ?? null,
            humidity: v.humidityPercent ?? v.humidity ?? null,
            soilMoisture: v.soilMoisturePercent ?? v.soilMoisture ?? v.soil_moisture ?? null,
            lightIntensity: v.lightLux ?? v.lightIntensity ?? v.light ?? null,
            lastSync: new Date(currentLastSeen).toLocaleTimeString(),
            connectionMode: v.networkType ?? v.connectionMode ?? "WIFI",
            batteryLevel: v.batteryLevel ?? 0,
            signalStrength: v.signalStrength ?? 0,
            status: v.status ?? (v.temperatureC ? "board_alive" : "unknown"),
            uptimeMinutes: v.uptimeMinutes ?? 0,
            lastBootTime: bootStr,
          });

          if (Date.now() - currentLastSeen < 180000) {
            setDeviceLive(true);
            setSource("iot");
          } else {
            setDeviceLive(false);
            setSource((prev) => (prev === "iot" ? "api" : prev));
          }
          setError(null);
        } else {
          setTelemetry(null);
          setDeviceLive(false);
          setSource((prev) => (prev === "iot" ? "api" : prev));
        }
      } catch (err: any) {
        if (!cancelled) {
          setTelemetry(null);
          setDeviceLive(false);
        }
      }
    };

    checkDevice();
    const interval = setInterval(checkDevice, 15000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [farm, refreshTick]);

  // --- Open-Meteo API fetch (always fetch as secondary/fallback) ---
  useEffect(() => {
    if (!farm) {
      setWeather(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const lat = farm.lat || 6.9271; // Colombo fallback
    const lon = farm.lng || 79.8612;
    const fallback = (!farm.lat || !farm.lng);
    setUsedFallbackCoords(fallback);

    setLoading(true);
    fetchWeather(lat, lon)
      .then((data) => {
        if (cancelled) return;
        setWeather(data);
        setError(null);
        setSource((prev) => (prev === "iot" ? "iot" : "api"));
      })
      .catch((e) => {
        if (cancelled) return;
        setError(`Weather fetch: ${e.message}`);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [farm, refreshTick]);

  return { telemetry, weather, source, deviceLive, usedFallbackCoords, loading, error, refresh };
}

/* ---------- Display value helpers ---------- */

export interface EnvValues {
  temperature: number | null;
  humidity: number | null;
  precipitation: number | null;
  windSpeed: number | null;
  soilMoisture: number | null;
  lightIntensity: number | null;
  weatherCode: number | null;
  source: DataSource;
}

/**
 * Merge IoT + API data into a single display layer.
 * IoT readings are prioritized; API fills gaps for fields the IoT device doesn't report
 * (or when the device is offline entirely).
 */
export function resolveEnvValues(
  telemetry: TelemetryData | null,
  weather: WeatherData | null,
  source: DataSource
): EnvValues {
  const useIot = source === "iot" && telemetry;
  return {
    temperature: (useIot && telemetry!.temperature != null) ? telemetry!.temperature : weather?.temp ?? null,
    humidity: (useIot && telemetry!.humidity != null) ? telemetry!.humidity : weather?.humidity ?? null,
    precipitation: weather?.precipitation ?? null, 
    windSpeed: weather?.windSpeed ?? null,
    soilMoisture: (useIot && telemetry!.soilMoisture != null) ? telemetry!.soilMoisture : null,
    lightIntensity: (useIot && telemetry!.lightIntensity != null) ? telemetry!.lightIntensity : null,
    weatherCode: weather?.weatherCode ?? null,
    source,
  };
}
