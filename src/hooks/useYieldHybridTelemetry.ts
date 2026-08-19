import { useState, useEffect, useCallback } from "react";
import { ref, onValue } from "firebase/database";
import { rtdb } from "@/services/firebase";
import { fetchWeather, resolveCoords, type WeatherData, type OpenMeteoCurrent } from "@/services/weatherService";
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

  // --- ESP32 IoT subscription ---
  useEffect(() => {
    if (!farm) {
      setTelemetry(null);
      setDeviceLive(false);
      setSource("none");
      return;
    }
    
    let currentLastSeen = 0;
    
    const interval = setInterval(() => {
      if (currentLastSeen > 0 && (Date.now() - currentLastSeen < 180000)) {
        setDeviceLive(true);
      } else {
        setDeviceLive(false);
        setSource(prev => prev === "iot" ? "api" : prev);
      }
    }, 10000);

    const path = `/devices/${farm.deviceId}/latest`;
    const unsub = onValue(
      ref(rtdb, path),
      (snap) => {
        const v = snap.val();
        if (v) {
          // Fallback to Date.now() if no timestamp is provided, though usually it should be
          currentLastSeen = v.last_seen ? new Date(v.last_seen).getTime() : (v.timestamp ? new Date(v.timestamp).getTime() : Date.now());
          
          setTelemetry({
            temperature: v.temperature ?? v.temp ?? null,
            humidity: v.humidity ?? null,
            soilMoisture: v.soilMoisture ?? v.soil_moisture ?? null,
            lightIntensity: v.lightIntensity ?? v.light ?? null,
            lastSync: new Date(currentLastSeen).toLocaleTimeString(),
            connectionMode: v.connectionMode ?? "WIFI",
            batteryLevel: v.batteryLevel ?? 0,
          });
          
          if (Date.now() - currentLastSeen < 180000) {
            setDeviceLive(true);
            setSource("iot");
          } else {
            setDeviceLive(false);
            setSource(prev => prev === "iot" ? "api" : prev);
          }
          setError(null);
        } else {
          currentLastSeen = 0;
          setTelemetry(null);
          setDeviceLive(false);
          setSource((prev) => (prev === "iot" ? "api" : prev));
        }
      },
      (err) => {
        currentLastSeen = 0;
        setTelemetry(null);
        setDeviceLive(false);
        setError(`IoT connection: ${err.message}`);
      }
    );
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [farm]);

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
        // promote source to "api" only if IoT isn't live
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
