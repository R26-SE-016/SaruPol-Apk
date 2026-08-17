import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect, useCallback } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from "react-native";
import {
  Thermometer, Droplets, Waves, Sun, Cpu, Wifi, Battery, RefreshCw, AlertCircle,
  Wind, CloudSun, CloudRain,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "react-native";
import { useYieldApp } from "@/store-yield/YieldAppContext";
import { YieldScreenHeader } from "@/components/yield/YieldScreenHeader";
import { useYieldHybridTelemetry, resolveEnvValues } from "@/hooks/useYieldHybridTelemetry";
import { weatherInfo, shortDayName, isToday } from "@/services/weatherService";



/* Map weather service Tailwind color classes to hex values for RN icon color props */
const WEATHER_COLOR_MAP: Record<string, string> = {
  "text-amber-500": "#f59e0b",
  "text-sky-500": "#0ea5e9",
  "text-sky-600": "#0284c7",
  "text-slate-400": "#94a3b8",
  "text-slate-500": "#64748b",
  "text-blue-600": "#2563eb",
  "text-blue-700": "#1d4ed8",
  "text-violet-600": "#7c3aed",
  "text-violet-700": "#6d28d9",
};

function weatherColor(tailwindClass: string): string {
  return WEATHER_COLOR_MAP[tailwindClass] ?? "#94a3b8";
}

export default function telemetryScreen() {
  const router = useRouter();
  const { id: farmIdRaw } = useLocalSearchParams();
  const farmId = Array.isArray(farmIdRaw) ? farmIdRaw[0] : (farmIdRaw || null);
  const { user, farms, setCurrentFarmId, currentFarmId, currentZones } = useYieldApp();
  
  useEffect(() => {
    if (farmId && currentFarmId !== farmId) {
      setCurrentFarmId(farmId);
    }
  }, [farmId, currentFarmId, setCurrentFarmId]);

  const farm = farms.find((f) => f.id === farmId);
  const deviceId = farm?.deviceId ?? "—";
  const { telemetry, weather, source, deviceLive, usedFallbackCoords, loading, error, refresh } =
    useYieldHybridTelemetry(farm ?? null);

  const env = resolveEnvValues(telemetry, weather, source);

  if (loading && !weather && !telemetry) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <View className="items-center">
          <ActivityIndicator size="large" color="#1e7550" />
          <Text className="text-sm text-slate-500 mt-3">Fetching live data…</Text>
        </View>
      </View>
    );
  }

  const cards = [
    { label: "Air Temperature", value: env.temperature, unit: "°C", icon: <Image source={require('../../../../../assets/icons/temperature-gauge.png')} style={{ width: 40, height: 40, resizeMode: 'contain' }} />, color: "#f97316", bg: "bg-orange-50", text: "text-orange-600" },
    { label: "Air Humidity", value: env.humidity, unit: "%", icon: <Image source={require('../../../../../assets/icons/raindrop-percentage.png')} style={{ width: 40, height: 40, resizeMode: 'contain' }} />, color: "#0ea5e9", bg: "bg-sky-50", text: "text-sky-600" },
    { label: "Wind Speed", value: env.windSpeed, unit: "km/h", icon: <Wind size={40} color="#0d9488" />, color: "#14b8a6", bg: "bg-teal-50", text: "text-teal-600" },
    { label: "Precipitation", value: env.precipitation, unit: "mm", icon: <Image source={require('../../../../../assets/icons/cloud-rain.png')} style={{ width: 40, height: 40, resizeMode: 'contain' }} />, color: "#3b82f6", bg: "bg-blue-50", text: "text-blue-600" },
  ];

  // IoT-only cards (only shown when device is live)
  const iotCards = [
    { label: "Soil Moisture", value: env.soilMoisture, unit: "%", icon: <Image source={require('../../../../../assets/icons/soil-moisture.png')} style={{ width: 40, height: 40, resizeMode: 'contain' }} />, color: "#10b981", bg: "bg-emerald-50", text: "text-emerald-600" },
    { label: "Light Intensity", value: env.lightIntensity, unit: "Lux", icon: <Sun size={40} color="#d97706" />, color: "#f59e0b", bg: "bg-amber-50", text: "text-amber-600" },
  ];

  const WInfo = weatherInfo(env.weatherCode ?? -1);
  const WIcon = WInfo.icon;

  return (
    <View className="flex-1 bg-slate-50">
      <YieldScreenHeader
        title="Live Telemetry"
        subtitle={`${source === "iot" ? "ESP32 sensor + Open-Meteo" : "Open-Meteo Live API"} · ${deviceId}`}
        onBack={() => router.back()}
        right={
          <TouchableOpacity onPress={refresh} className="p-2 rounded-lg active:bg-slate-100">
            <RefreshCw size={18} color="#64748b" />
          </TouchableOpacity>
        }
      />

      <ScrollView className="flex-1">
        <View className="px-4 mt-4 pb-24 gap-4">
          
          {/* Multiple Devices Selector */}
          {farm?.deviceIds && farm.deviceIds.length > 1 && (
            <View className="mb-2">
              <Text className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Select Device</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View className="flex-row gap-2">
                  {farm.deviceIds.map((dId) => (
                    <TouchableOpacity 
                      key={dId} 
                      className={`px-4 py-2 rounded-full border ${dId === deviceId ? 'bg-forest-600 border-forest-700' : 'bg-white border-slate-200'}`}
                    >
                      <Text className={`font-semibold text-sm ${dId === deviceId ? 'text-white' : 'text-slate-600'}`}>{dId}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>
          )}

          {source === "iot" ? (
            <View className="flex-row items-start gap-2 bg-green-50 border border-green-200 rounded-xl p-3">
              <View className="mt-0.5 flex-shrink-0"><Wifi size={16} color="#16a34a" /></View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-green-800">Connected to {deviceId}</Text>
                <Text className="text-xs text-green-700 mt-0.5">Live sensor data is streaming correctly.</Text>
              </View>
            </View>
          ) : (
            <View className="flex-row items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-4">
              <View className="mt-0.5 flex-shrink-0"><AlertCircle size={20} color="#d97706" /></View>
              <View className="flex-1">
                <Text className="text-sm font-bold text-amber-800">No Data Received from {deviceId}</Text>
                <Text className="text-xs text-amber-700 mt-1">Please check the power supply or Wi-Fi connection for this device.</Text>
              </View>
            </View>
          )}

          {source === "iot" && telemetry ? (
            <View className="gap-3 mt-2">
              <MetricRow 
                icon={<Battery size={24} color="#10b981" />} 
                label="Battery Level & Power" 
                value={`${telemetry.batteryLevel}% — Solar Powered`} 
                subtext="Battery is healthy and charging normally"
              />
              <MetricRow 
                icon={<Wifi size={24} color="#0284c7" />} 
                label="Signal Strength" 
                value={`Wi-Fi: Strong`} 
                subtext="Stable connection to farm network"
              />
              <MetricRow 
                icon={<RefreshCw size={24} color="#6366f1" />} 
                label="Last Synced Timestamp" 
                value={`Last updated ${telemetry.lastSync}`} 
                subtext="Data is flowing smoothly"
              />

              {telemetry.batteryLevel < 20 && (
                <View className="flex-row items-start gap-2 bg-red-50 border border-red-200 rounded-xl p-4 mt-2">
                  <AlertCircle size={20} color="#dc2626" />
                  <View className="flex-1">
                    <Text className="text-sm font-bold text-red-800">Critical Battery Alert</Text>
                    <Text className="text-xs text-red-600 mt-1">Battery is below 20%. Please check solar panel for debris or shading.</Text>
                  </View>
                </View>
              )}
              
              {env.soilMoisture != null && (
                <View className="mt-2 bg-white rounded-2xl p-5 shadow-sm border border-slate-100 flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <Image source={require('../../../../../assets/icons/soil-moisture.png')} style={{ width: 40, height: 40, resizeMode: 'contain' }} />
                    <View>
                      <Text className="text-sm font-bold text-slate-800">Soil Moisture</Text>
                      <Text className="text-xs text-slate-500">Live reading from root zone</Text>
                    </View>
                  </View>
                  <Text className="text-2xl font-bold text-emerald-600">{Math.round(env.soilMoisture)}%</Text>
                </View>
              )}
            </View>
          ) : null}
        </View>
      </ScrollView>
    </View>
  );
}

function MetricRow({ icon, label, value, subtext }: { icon: React.ReactNode; label: string; value: string; subtext?: string }) {
  return (
    <View className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex-row items-center gap-4">
      <View className="w-12 h-12 rounded-xl bg-slate-50 items-center justify-center">
        {icon}
      </View>
      <View className="flex-1">
        <Text className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</Text>
        <Text className="text-base font-bold text-slate-800 mt-0.5">{value}</Text>
        {subtext && <Text className="text-[10px] text-slate-500 mt-1">{subtext}</Text>}
      </View>
    </View>
  );
}
