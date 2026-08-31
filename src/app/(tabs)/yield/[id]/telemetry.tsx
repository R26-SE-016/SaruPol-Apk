import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Image } from "react-native";
import { ArrowLeft, MoreVertical, RefreshCw, Wifi, WifiOff, Battery, CheckCircle2, CloudRain, Thermometer, Droplets, Server, Activity } from "lucide-react-native";
import { useYieldApp } from "@/store/YieldAppContext";
import { useYieldHybridTelemetry, resolveEnvValues } from "@/hooks/useYieldHybridTelemetry";

export default function DeviceScreen() {
  const router = useRouter();
  const { id: farmIdRaw } = useLocalSearchParams();
  const farmId = Array.isArray(farmIdRaw) ? farmIdRaw[0] : (farmIdRaw || null);
  const { farms, currentFarmId, setCurrentFarmId } = useYieldApp();
  
  useEffect(() => {
    if (farmId && currentFarmId !== farmId) {
      setCurrentFarmId(farmId);
    }
  }, [farmId, currentFarmId, setCurrentFarmId]);

  const farm = farms.find((f) => f.id === farmId);
  const deviceId = String(farm?.deviceIds?.[0] || farm?.deviceId || "—");
  const { telemetry, weather, source, loading, refresh, deviceLive } = useYieldHybridTelemetry(farm ?? null);
  const [dataSource, setDataSource] = useState<"sensor" | "api">("sensor");

  // Always use API for rainfall as requested by user. 
  // Temperature & Humidity switch between API and Sensor based on toggle.
  const env = {
    temperature: dataSource === "api" && weather ? weather.temp : (telemetry?.temperature ?? null),
    humidity: dataSource === "api" && weather ? weather.humidity : (telemetry?.humidity ?? null),
    precipitation: weather?.precipitation ?? 0
  };

  if (loading && !weather && !telemetry) {
    return (
      <View key="loading" className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#1e7550" />
        <Text className="text-sm text-slate-500 mt-3">Loading device data…</Text>
      </View>
    );
  }

  return (
    <View key="content" className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="bg-[#0C3B2E] pt-12 pb-4 px-4 flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()} className="p-1 -ml-1">
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text className="text-white text-[19px] font-bold">Device</Text>
            <Text className="text-emerald-100 text-xs mt-0.5">Active Farm: {farm?.name || "Sigiriya state"}</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ gap: 16, paddingBottom: 100 }}>
        {/* Top Card */}
        <View className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm">
          <View className="flex-row items-center gap-4">
            <View className="w-24 h-24 bg-[#F2FAF6] rounded-full items-center justify-center relative border-[6px] border-white shadow-sm overflow-visible" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 2 }}>
              <Image source={{ uri: 'https://i.ibb.co/HDHPBzpp/device.png' }} style={{ width: 64, height: 64, resizeMode: 'contain' }} />
              {deviceLive ? (
                <View className="absolute bottom-0 right-0 w-7 h-7 bg-[#16a34a] border-4 border-white rounded-full items-center justify-center">
                  <CheckCircle2 size={14} color="#fff" strokeWidth={3} />
                </View>
              ) : (
                <View className="absolute bottom-0 right-0 w-7 h-7 bg-slate-400 border-4 border-white rounded-full items-center justify-center">
                  <WifiOff size={12} color="#fff" strokeWidth={3} />
                </View>
              )}
            </View>
            <View className="flex-1">
              <Text className="text-xs font-semibold text-slate-500 mb-1">Device ID</Text>
              <View className="flex-row items-center gap-3 mb-2">
                <Text className="text-3xl font-black text-slate-800">{deviceId}</Text>
                {deviceLive ? (
                  <View className="bg-green-50 px-2.5 py-1 rounded-full flex-row items-center gap-1.5 border border-green-100">
                    <View className="w-2 h-2 bg-green-500 rounded-full" />
                    <Text className="text-[10px] font-bold text-green-700 uppercase tracking-wider">Active</Text>
                  </View>
                ) : (
                  <View className="bg-slate-50 px-2.5 py-1 rounded-full flex-row items-center gap-1.5 border border-slate-200">
                    <View className="w-2 h-2 bg-slate-400 rounded-full" />
                    <Text className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Inactive</Text>
                  </View>
                )}
              </View>
              <View className="flex-row items-center gap-1.5">
                <Text className="text-[11px] text-slate-500">Last updated: {telemetry?.lastSync || "Just now"}</Text>
                <TouchableOpacity onPress={refresh} className="ml-1"><RefreshCw size={12} color="#16a34a" /></TouchableOpacity>
              </View>
            </View>
          </View>
          <View className={`mt-5 rounded-xl p-3 flex-row items-center gap-2 border ${deviceLive ? 'bg-[#F0FDF4] border-[#DCFCE7]' : 'bg-red-50 border-red-100'}`}>
            <View className="w-6 h-6 bg-white rounded-full items-center justify-center shadow-sm" style={{ elevation: 1 }}>
               {deviceLive ? <Wifi size={12} color="#16a34a" /> : <WifiOff size={12} color="#dc2626" />}
            </View>
            <Text className={`text-xs font-bold ${deviceLive ? 'text-[#166534]' : 'text-red-700'}`}>
              {deviceLive ? "Device is online and working properly" : "Device is offline or inactive"}
            </Text>
          </View>
        </View>

        {/* Environment Data */}
        <View className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
          <View className="flex-row items-center justify-between mb-5">
            <View className="flex-row items-center gap-2">
              <View className="w-8 h-8 bg-green-50 rounded-full items-center justify-center">
                <Image source={{ uri: 'https://i.ibb.co/21Yzy5fW/iot-sensor.png' }} style={{ width: 16, height: 16, resizeMode: 'contain', tintColor: '#16a34a' }} />
              </View>
              <Text className="text-sm font-bold text-slate-800">Environment Data</Text>
            </View>
            <TouchableOpacity onPress={refresh} className="flex-row items-center gap-1">
              <Text className="text-[10px] font-bold text-green-600">Refresh Data</Text>
              <RefreshCw size={12} color="#16a34a" />
            </TouchableOpacity>
          </View>
          
          {/* Data Source Toggle */}
          <View className="flex-row bg-slate-100 p-1 rounded-xl mb-5">
            <TouchableOpacity 
              onPress={() => setDataSource("sensor")}
              className={`flex-1 py-2 rounded-lg items-center justify-center ${dataSource === "sensor" ? "bg-white" : ""}`}
            >
              <Text className={`text-xs font-bold ${dataSource === "sensor" ? "text-green-800" : "text-slate-500"}`}>Live Sensor</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              onPress={() => setDataSource("api")}
              className={`flex-1 py-2 rounded-lg items-center justify-center ${dataSource === "api" ? "bg-white" : ""}`}
            >
              <Text className={`text-xs font-bold ${dataSource === "api" ? "text-green-800" : "text-slate-500"}`}>Weather API</Text>
            </TouchableOpacity>
          </View>

          <View className="flex-row justify-between items-center border-t border-slate-100 pt-5">
            <View className="items-center flex-1 border-r border-slate-100">
              <View className="flex-row items-center gap-2 mb-2">
                <Thermometer size={24} color="#ef4444" />
                <View className="flex-row items-baseline">
                  <Text className="text-2xl font-black text-slate-800">
                    {env.temperature != null && !isNaN(Number(env.temperature)) ? Math.round(Number(env.temperature)) : "—"}
                  </Text>
                  <Text className="text-xs font-bold text-slate-500 ml-0.5">°C</Text>
                </View>
              </View>
              <Text className="text-[10px] text-slate-500 font-semibold">Air Temperature</Text>
            </View>
            
            <View className="items-center flex-1 border-r border-slate-100">
              <View className="flex-row items-center gap-2 mb-2">
                <Droplets size={24} color="#0ea5e9" />
                <View className="flex-row items-baseline">
                  <Text className="text-2xl font-black text-slate-800">
                    {env.humidity != null && !isNaN(Number(env.humidity)) ? Math.round(Number(env.humidity)) : "—"}
                  </Text>
                  <Text className="text-xs font-bold text-slate-500 ml-0.5">%</Text>
                </View>
              </View>
              <Text className="text-[10px] text-slate-500 font-semibold">Humidity</Text>
            </View>
            
            <View className="items-center flex-1">
              <View className="flex-row items-center gap-2 mb-2">
                <CloudRain size={24} color="#3b82f6" />
                <View className="flex-row items-baseline">
                  <Text className="text-2xl font-black text-slate-800">
                    {env.precipitation != null && !isNaN(Number(env.precipitation)) ? Number(env.precipitation).toFixed(1) : "0"}
                  </Text>
                  <Text className="text-xs font-bold text-slate-500 ml-0.5">mm</Text>
                </View>
              </View>
              <Text className="text-[10px] text-slate-500 font-semibold">Rainfall</Text>
            </View>
          </View>
          
          {/* Second Row for Soil Moisture and Light Intensity */}
          <View className="flex-row justify-between items-center border-t border-slate-100 mt-5 pt-5">
            <View className="items-center flex-1 border-r border-slate-100">
              <View className="flex-row items-center gap-2 mb-2">
                <Image source={{ uri: 'https://i.ibb.co/21Yzy5fW/iot-sensor.png' }} style={{ width: 24, height: 24, resizeMode: 'contain', tintColor: '#84cc16' }} />
                <View className="flex-row items-baseline">
                  <Text className="text-2xl font-black text-slate-800">
                    {telemetry?.soilMoisture != null ? telemetry.soilMoisture : "—"}
                  </Text>
                  <Text className="text-xs font-bold text-slate-500 ml-0.5">%</Text>
                </View>
              </View>
              <Text className="text-[10px] text-slate-500 font-semibold">Soil Moisture</Text>
            </View>
            
            <View className="items-center flex-1">
              <View className="flex-row items-center gap-2 mb-2">
                <Image source={{ uri: 'https://i.ibb.co/HDHPBzpp/device.png' }} style={{ width: 24, height: 24, resizeMode: 'contain', tintColor: '#f59e0b' }} />
                <View className="flex-row items-baseline">
                  <Text className="text-2xl font-black text-slate-800">
                    {telemetry?.lightIntensity != null ? telemetry.lightIntensity : "—"}
                  </Text>
                  <Text className="text-xs font-bold text-slate-500 ml-0.5">Lux</Text>
                </View>
              </View>
              <Text className="text-[10px] text-slate-500 font-semibold">Light Intensity</Text>
            </View>
          </View>
        </View>

        {/* Device Status */}
        <View className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
          <View className="flex-row items-center gap-2 mb-5">
            <Activity size={18} color="#16a34a" />
            <Text className="text-sm font-bold text-slate-800">Device Status</Text>
          </View>
          
          <View className="gap-4">
            <View className="flex-row items-center justify-between border-b border-slate-50 pb-3">
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 bg-slate-50 rounded-full items-center justify-center"><Activity size={16} color="#64748b" /></View>
                <Text className="text-xs font-semibold text-slate-600">Uptime</Text>
              </View>
              <Text className="text-sm font-bold text-emerald-600">
                {telemetry?.uptimeMinutes != null ? `${telemetry.uptimeMinutes} mins` : "—"}
              </Text>
            </View>
            
            <View className="flex-row items-center justify-between border-b border-slate-50 pb-3">
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 bg-slate-50 rounded-full items-center justify-center"><Wifi size={16} color="#64748b" /></View>
                <Text className="text-xs font-semibold text-slate-600">Connection ({telemetry?.connectionMode || "Unknown"})</Text>
              </View>
              <Text className="text-sm font-bold text-emerald-600">
                {telemetry?.signalStrength != null ? `${telemetry.signalStrength} dBm` : "—"}
              </Text>
            </View>
            

            <View className="flex-row items-center justify-between border-b border-slate-50 pb-3">
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 bg-slate-50 rounded-full items-center justify-center"><Activity size={16} color="#64748b" /></View>
                <Text className="text-xs font-semibold text-slate-600">Started At</Text>
              </View>
              <Text className="text-xs font-bold text-slate-800">
                {telemetry?.lastBootTime || "—"}
              </Text>
            </View>

            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="w-8 h-8 bg-slate-50 rounded-full items-center justify-center"><CheckCircle2 size={16} color="#64748b" /></View>
                <Text className="text-xs font-semibold text-slate-600">Device Status</Text>
              </View>
              <Text className="text-xs font-bold text-emerald-600 uppercase">
                {telemetry?.status?.replace("_", " ") || "Unknown"}
              </Text>
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}
