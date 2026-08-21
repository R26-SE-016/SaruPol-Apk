import { useRouter, useLocalSearchParams } from "expo-router";
import { Ionicons } from '@expo/vector-icons';
import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { View, Text, TouchableOpacity, ScrollView, Platform, ActivityIndicator, Image, Alert } from "react-native";
import {
  ArrowLeft, Palmtree, Plus, Layers, Pencil, Trash2, Cpu, Brain,
  ClipboardList, BarChart3, Wifi, MapPin, Ruler, TreePine,
  AlertTriangle, Lightbulb, Droplets, CloudSun, CheckCircle2, Wind,
  CloudRain, CalendarDays, Map as MapIcon
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useYieldApp } from "@/store/YieldAppContext";
import { subscribeTrees, deleteZone } from "@/services/yieldFarmDb";
import { predictDashboardYield } from "@/services/yieldService";
import { buildFarmData, aggregateHealth, healthColor } from "@/utils/yieldTreeFactory";
import { generateAdvisories, generateWeatherSeries, latestWeather, hasHealthRecords, allTreesHealthy } from "@/utils/yieldAnalytics";
import { useYieldHybridTelemetry, resolveEnvValues } from "@/hooks/useYieldHybridTelemetry";
import { weatherInfo, shortDayName, isToday } from "@/services/weatherService";
import { exportReportPDF } from "@/utils/yieldReportGenerator";
import { MarketRevenueCard } from "@/components/yield/YieldDashboard/MarketRevenueCard";
import type { Tree, Zone, Farm, AdvisoryAlert } from "@/types/yield";
import { ref, get } from "firebase/database";
import { rtdb } from "@/services/firebase";

const WEATHER_HEX: Record<string, string> = {
  "text-amber-500": "#f59e0b", "text-sky-500": "#0ea5e9", "text-sky-600": "#0284c7",
  "text-blue-600": "#2563eb", "text-blue-700": "#1d4ed8", "text-slate-400": "#94a3b8",
  "text-slate-500": "#64748b", "text-violet-600": "#7c3aed", "text-violet-700": "#6d28d9",
};



export default function FarmDetailScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  
  const { id: farmIdRaw } = useLocalSearchParams();
  const farmId = Array.isArray(farmIdRaw) ? farmIdRaw[0] : farmIdRaw;
  const { user, currentFarm, currentFarmId, setCurrentFarmId, currentZones, farms } = useYieldApp();
  
  useEffect(() => {
    if (farmId && currentFarmId !== farmId) {
      setCurrentFarmId(farmId);
    }
  }, [farmId, currentFarmId, setCurrentFarmId]);

  const [storedTrees, setStoredTrees] = useState<Record<string, Tree>>({});
  
  const farm = currentFarmId === farmId ? currentFarm : (farms.find((f) => f.id === farmId) ?? null);

  // Hybrid Telemetry & Weather
  const { telemetry, weather, source, deviceLive, usedFallbackCoords, loading, refresh } = useYieldHybridTelemetry(farm);
  const env = useMemo(() => resolveEnvValues(telemetry, weather, source), [telemetry, weather, source]);

  // AI Prediction state
  const [dashboardPrediction, setDashboardPrediction] = useState<any>(null);
  const [isPredicting, setIsPredicting] = useState(false);

  useEffect(() => {
    if (!user || !farm) return;
    const unsub = subscribeTrees(user.uid, farm.id, setStoredTrees);
    return unsub;
  }, [user, farm]);

  useEffect(() => {
    if (!user || !farm) {
      setDashboardPrediction(null);
      return;
    }
    const fetchPrediction = async () => {
      setIsPredicting(true);
      try {
        const logsRef = ref(rtdb, `users/${user.uid}/harvests/${farm.id}`);
        const snap = await get(logsRef);
        let logs: any[] = [];
        if (snap.exists()) {
          const vals = snap.val();
          logs = Object.entries(vals).map(([id, l]: [string, any]) => ({
            id,
            date: l.date || l.timestamp,
            actual_yield_nuts: l.nutCount || l.actual_yield_nuts || (l.gradeA || 0) + (l.gradeB || 0) + (l.gradeC || 0) || 0,
            large: l.large || l.gradeA || 0,
            medium: l.medium || l.gradeB || 0,
            small: l.small || l.gradeC || 0,
            predicted_yield_nuts: l.predicted_yield_nuts || 0 
          }));
          logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }

        const reqBody = {
          uid: user.uid,
          farm_id: farm.id,
          estate: farm.locationName || "Makandura",
          trees_count: farm.totalTrees || 40,
          last_harvest_yield: farm.lastHarvestYield || null,
          actual_harvest_logs: logs
        };

        const data = await predictDashboardYield(reqBody);

        if (data) { //
          
          setDashboardPrediction(data);
        }
      } catch (e) {
        console.error("Failed to fetch prediction", e);
      } finally {
        setIsPredicting(false);
      }
    };
    fetchPrediction();
  }, [farm, user]);

  const treeZoneMap = useMemo(() => {
    const m = new Map<number, Zone>();
    currentZones.forEach((z) => z.treeNumbers.forEach((n) => m.set(n, z)));
    return m;
  }, [currentZones]);

  const farmData = useMemo(() => {
    if (!farm) return null;
    return buildFarmData(farm.perches, farm.totalTrees, farm.treeLayout, storedTrees);
  }, [farm, storedTrees]);

  if (!farm || !farmData) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#1e7550" />
      </View>
    );
  }

  const { health, pct } = aggregateHealth(farmData.trees);

  const handleExportReport = async () => {
    await exportReportPDF({
      farm,
      zones: currentZones,
      trees: farmData?.trees || [],
      telemetry,
      weather,
      source: env.source as any,
      env: {
        temperature: env.temperature ?? null,
        humidity: env.humidity ?? null,
        precipitation: env.precipitation ?? null,
        windSpeed: env.windSpeed ?? null,
        soilMoisture: env.soilMoisture ?? null,
        weatherCode: env.weatherCode ?? null
      },
      predictedYield: dashboardPrediction?.predicted_next_pick_yield_nuts ?? 0
    });
  };

  // Stress analysis
  const stress = [];
  if (env.soilMoisture != null && env.soilMoisture < 30) stress.push({ type: "drought", message: "Prolonged Drought Stress Detected - Yield Reduction Expected in Next Cycle" });
  if (env.temperature != null && env.temperature > 35) stress.push({ type: "heat", message: "Extreme Heat Warning - High evaporation rates affecting soil moisture" });
  if (stress.length === 0) stress.push({ type: "optimal", message: "Environmental conditions are optimal. No stress detected." });

  const deviceIdStr = farm.deviceIds?.[0] || farm.deviceId || 'None';

  return (
    <View className="flex-1 bg-slate-50">
      {/* 1. New Header Banner */}
      <View className="bg-forest-800 px-4 py-4 flex-row items-center justify-between rounded-b-2xl shadow-sm z-10">
        <TouchableOpacity onPress={() => router.push('/yield')} className="mr-3">
          <ArrowLeft size={24} color="#fff" />
        </TouchableOpacity>
        
        <View className="flex-1">
          <Text className="text-white text-base font-bold">Active Farm: {farm.name}</Text>
          <View className="flex-row items-center mt-0.5 gap-1.5">
            <View className={`w-2 h-2 rounded-full ${deviceLive ? "bg-green-400" : "bg-red-400"}`} />
            <Text className="text-forest-100 text-xs font-semibold">Device Status: {deviceIdStr}</Text>
          </View>
        </View>

        <TouchableOpacity onPress={() => router.push(('(/tabs)/yield/add-farm?id=' + farm.id) as any)} className="flex-row items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-lg">
          <Pencil size={12} color="#fff" />
          <Text className="text-white text-xs font-bold">Edit Farm Details</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4 mt-4" contentContainerStyle={{ paddingBottom: 96, gap: 16 }}>
        
        {/* Section A: 4 Core Metric Cards */}
        <View className="flex-row flex-wrap justify-between gap-y-3">
          <View className="w-[48%]">
            <MetricCard 
              icon={<Image source={{ uri: 'https://i.ibb.co/gbSQjznt/coconut-fruit.png' }} style={{ width: 32, height: 32, resizeMode: 'contain' }} />} 
              label="PREDICTED YIELD" 
              value={dashboardPrediction ? dashboardPrediction.predicted_next_pick_yield_nuts?.toLocaleString() : (isPredicting ? "..." : "—")} 
              unit="Nuts" 
              badge={
                dashboardPrediction?.confidence_percentage ? (
                  <View className="px-2 py-0.5 rounded-full bg-green-50/50 flex-row items-center">
                    <Text className="text-[9px] text-green-700 font-bold">{dashboardPrediction.confidence_percentage}% Confidence</Text>
                  </View>
                ) : null
              }
            />
          </View>
          <View className="w-[48%]">
            <MetricCard 
              icon={<Image source={{ uri: 'https://i.ibb.co/PZHx0gxN/plant-health.png' }} style={{ width: 32, height: 32, resizeMode: 'contain' }} />} 
              label="FARM HEALTH" 
              value={`${Math.round(pct)}%`} 
              unit={health} 
              badge={
                <View className="px-2 py-0.5 rounded-full bg-cyan-50/50 flex-row items-center gap-1">
                  <View className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  <Text className="text-[9px] text-cyan-700 font-bold">Needs Attention</Text>
                </View>
              }
            />
          </View>
          <View className="w-[48%]">
            <MetricCard 
              icon={<Image source={{ uri: 'https://i.ibb.co/xKSGghy9/coconut-tree-3d.png' }} style={{ width: 32, height: 32, resizeMode: 'contain' }} />} 
              label="TOTAL TREES" 
              value={String(farm.totalTrees)} 
              unit="trees" 
            />
          </View>
          <View className="w-[48%]">
            <MetricCard 
              icon={<Image source={{ uri: 'https://i.ibb.co/b050Cjy/farmland.png' }} style={{ width: 32, height: 32, resizeMode: 'contain' }} />} 
              label="AREA SIZE" 
              value={String(farm.perches)} 
              unit="perches" 
            />
          </View>
        </View>

        <TouchableOpacity onPress={() => router.push(`/yield/${farm.id}/mapper`)} className="bg-white rounded-2xl border border-slate-100 p-4 items-center justify-center flex-row gap-3 shadow-sm">
          <Image source={{ uri: 'https://i.ibb.co/gL251tyR/3d-map.png' }} style={{ width: 32, height: 32, resizeMode: 'contain' }} />
          <Text className="text-sm font-bold text-slate-800">Interactive 3D Map View</Text>
        </TouchableOpacity>

        {/* Feature Shortcuts */}
        <View className="flex-row gap-2">
          <Shortcut icon={<Image source={{ uri: 'https://i.ibb.co/21Yzy5fW/iot-sensor.png' }} style={{ width: 42, height: 42, resizeMode: 'contain' }} />} label={t("yield.telemetry")} onPress={() => router.push(`/yield/${farm.id}/telemetry`)} />
          <Shortcut icon={<Image source={{ uri: 'https://i.ibb.co/gbSQjznt/coconut-fruit.png' }} style={{ width: 42, height: 42, resizeMode: 'contain' }} />} label="Yield" onPress={() => router.push(`/yield/${farm.id}/analytics`)} />
          <Shortcut icon={<Image source={{ uri: 'https://i.ibb.co/wFK2YRww/log-harvest.png' }} style={{ width: 42, height: 42, resizeMode: 'contain' }} />} label={t("yield.logs")} onPress={() => router.push(`/yield/${farm.id}/logs`)} />
          <Shortcut icon={<Image source={{ uri: 'https://i.ibb.co/GffY8kpj/ai-analysis.png' }} style={{ width: 42, height: 42, resizeMode: 'contain' }} />} label={t("yield.analytics")} onPress={() => router.push(`/yield/${farm.id}/analytics`)} />
        </View>

        {/* Section B: Live Environment Grid */}
        <View className="bg-white rounded-2xl p-4 border border-slate-100">
          <View className="flex-row items-center justify-between mb-3">
            <View className="flex-row items-center gap-2">
              <CloudRain size={16} color="#1e7550" />
              <Text className="text-sm font-bold text-slate-800">
                Live Environment <Text className={`text-xs font-normal ${env.source === 'iot' ? 'text-green-600' : 'text-amber-600'}`}>({env.source === 'iot' ? 'Realtime IoT' : 'Weather API'})</Text>
              </Text>
            </View>
          </View>
          <View className="flex-row flex-wrap gap-3">
            <EnvWidget icon={<Image source={{ uri: 'https://i.ibb.co/zTH989xR/temperature-gauge.png' }} style={{ width: 40, height: 40, resizeMode: 'contain' }} />} label={t("yield.airTemp")} value={env.temperature != null ? `${Math.round(env.temperature)}°` : "—"} />
            <EnvWidget icon={<Image source={{ uri: 'https://i.ibb.co/whDGSFxM/raindrop-percentage.png' }} style={{ width: 40, height: 40, resizeMode: 'contain' }} />} label={t("yield.humidity")} value={env.humidity != null ? `${Math.round(env.humidity)}%` : "—"} />
            <EnvWidget icon={<Image source={{ uri: 'https://i.ibb.co/B2NrzxH3/cloud-rain.png' }} style={{ width: 40, height: 40, resizeMode: 'contain' }} />} label={t("yield.rainfall")} value={env.precipitation != null ? `${env.precipitation}mm` : "—"} />
            <EnvWidget icon={<Wind size={40} color="#0d9488" />} label={t("yield.wind")} value={env.windSpeed != null ? `${env.windSpeed}` : "—"} />
            <EnvWidget icon={<Image source={{ uri: 'https://i.ibb.co/zHfw1qrH/soil-moisture.png' }} style={{ width: 40, height: 40, resizeMode: 'contain' }} />} label={t("yield.soilMoisture")} value={env.soilMoisture != null ? `${Math.round(env.soilMoisture)}%` : "—"} />
            {(() => { const W = weatherInfo(env.weatherCode ?? -1); const WIcon = W.icon; return <EnvWidget icon={<Ionicons name={WIcon as any} size={40} color={WEATHER_HEX[W.color] ?? "#64748b"} />} label={t("yield.weather")} value={env.weatherCode != null ? W.label : "—"} />; })()}
          </View>
          {usedFallbackCoords && <Text className="text-[11px] text-amber-600 mt-3 text-center">Using fallback location (Colombo) for weather. Edit farm to save coordinates.</Text>}
        </View>

        {/* Section C: Live CDA Market Intelligence Card */}
        <MarketRevenueCard locationName={farm.locationName || "Colombo"} predictedNuts={dashboardPrediction?.predicted_next_pick_yield_nuts || 0} />

        {/* Section D: Environmental Stress Monitor Warning */}
        <View className="bg-white rounded-2xl p-4 border border-slate-100">
          <View className="flex-row items-center gap-2 mb-3">
            <View className="w-8 h-8 rounded-lg bg-amber-50 items-center justify-center">
              <AlertTriangle size={16} color="#d97706" />
            </View>
            <Text className="text-sm font-bold text-slate-800">Environmental Stress Monitor</Text>
          </View>
          <View className="gap-2">
            {stress.map((s, i) => {
              const isOk = s.type === "optimal";
              const isWarn = s.type === "drought" || s.type === "heat";
              return (
                <View key={i} className={`flex-row items-start gap-2 rounded-xl p-3 ${isOk ? "bg-green-50 border border-green-200" : isWarn ? "bg-amber-50 border border-amber-200" : "bg-slate-50 border border-slate-200"}`}>
                  <Text className="text-base">{isOk ? "🟢" : isWarn ? "⚠️" : "—"}</Text>
                  <Text className={`text-xs font-medium flex-1 ${isOk ? "text-green-700" : isWarn ? "text-amber-800" : "text-slate-500"}`}>{s.message}</Text>
                </View>
              );
            })}
          </View>
        </View>

        {/* Section E: Export Report Bar & 7-Day Forecast */}
        <TouchableOpacity onPress={handleExportReport} className="flex-row items-center justify-center gap-2 bg-forest-700 rounded-2xl py-4 shadow-sm">
          <Image source={{ uri: 'https://i.ibb.co/LXpmH7qk/pdf.png' }} style={{ width: 24, height: 24, resizeMode: 'contain' }} />
          <Text className="text-white text-sm font-bold">Export Telemetry & Yield Report (PDF)</Text>
        </TouchableOpacity>

        {(weather as any) && (weather as any).daily && (weather as any).daily.length > 0 && (
          <View className="bg-white rounded-2xl p-4 border border-slate-100">
            <View className="flex-row items-center gap-2 mb-3">
              <CalendarDays size={16} color="#1e7550" />
              <Text className="text-sm font-bold text-slate-800">7-Day Forecast</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {(weather as any).daily.map((d: any) => {
                  const info = weatherInfo(d.weatherCode);
                  const WIcon = info.icon;
                  return (
                    <View key={d.date} className={`w-16 rounded-xl border p-2 items-center ${isToday(d.date) ? "border-forest-300 bg-forest-50" : "border-slate-100 bg-slate-50"}`}>
                      <Text className="text-[10px] font-bold text-slate-500">{shortDayName(d.date)}</Text>
                      <View className="my-1"><Ionicons name={WIcon as any} size={22} color={WEATHER_HEX[info.color] ?? "#94a3b8"} /></View>
                      <Text className="text-[11px] font-bold text-slate-800">{Math.round(d.tempMax)}°</Text>
                      <Text className="text-[10px] text-slate-400">{Math.round(d.tempMin)}°</Text>
                      {d.rainSum > 0 && <Text className="text-[9px] text-sky-500 font-semibold mt-0.5">{d.rainSum}mm</Text>}
                    </View>
                  );
                })}
              </View>
            </ScrollView>
          </View>
        )}

        {/* Section E.5: Farm Zones */}
        <View className="mb-4 mt-2">
          <View className="flex-row items-center justify-between mb-3 px-1">
            <View className="flex-row items-center gap-2">
              <Layers size={16} color="#64748b" />
              <Text className="text-sm font-bold text-slate-600 tracking-wider uppercase">ZONES</Text>
            </View>
            <TouchableOpacity onPress={() => router.push(`/yield/${farm.id}/add-zone`)} className="flex-row items-center gap-1">
              <Plus size={14} color="#059669" />
              <Text className="text-sm font-bold text-emerald-700">Add Zone</Text>
            </TouchableOpacity>
          </View>

          <View className="gap-3">
            {currentZones.length > 0 ? currentZones.map(zone => {
              const zoneTrees = farmData.trees.filter(t => zone.treeNumbers.includes(t.number));
              const zHealth = aggregateHealth(zoneTrees);
              const isGood = zHealth.pct >= 60;
              
              return (
                <View key={zone.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100 relative pl-2">
                  <View className="absolute left-0 top-0 bottom-0 w-[5px]" style={{ backgroundColor: zone.color }} />
                  <View className="p-4">
                    <View className="flex-row justify-between items-center mb-1">
                      <Text className="text-base font-bold text-slate-800">{zone.name}</Text>
                      <View className={`px-2 py-0.5 rounded-full ${isGood ? 'bg-green-100' : 'bg-orange-100'}`}>
                        <Text className={`text-[10px] font-bold ${isGood ? 'text-green-700' : 'text-orange-700'}`}>
                          {zHealth.health} - {Math.round(zHealth.pct)}%
                        </Text>
                      </View>
                    </View>
                    <Text className="text-xs text-slate-400 font-medium mb-3">
                      {zone.treeNumbers.length} trees - {zone.treeNumbers.map(n => `#${String(n).padStart(2, '0')}`).join(', ')}
                    </Text>
                    <View className="flex-row gap-5 mt-1">
                      <TouchableOpacity onPress={() => router.push(`/yield/${farm.id}/add-zone?zoneId=${zone.id}`)} className="flex-row items-center gap-1.5">
                        <Pencil size={12} color="#64748b" />
                        <Text className="text-[11px] font-bold text-slate-500">Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        onPress={() => {
                          if (!user) return;
                          Alert.alert("Delete Zone", "Are you sure you want to delete this zone?", [
                            { text: "Cancel", style: "cancel" },
                            { text: "Delete", style: "destructive", onPress: () => deleteZone(user.uid, farm.id, zone.id) }
                          ])
                        }} 
                        className="flex-row items-center gap-1.5"
                      >
                        <Trash2 size={12} color="#ef4444" />
                        <Text className="text-[11px] font-bold text-red-500">Delete</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            }) : (
              <View className="py-6 items-center justify-center bg-white rounded-xl border border-slate-100 border-dashed shadow-sm">
                <Text className="text-sm text-slate-400 font-semibold text-center mb-2">{t("yield.noZones")}</Text>
                <TouchableOpacity onPress={() => router.push(`/yield/${farm.id}/add-zone`)} className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-lg shadow-sm">
                  <Text className="text-xs font-bold text-emerald-700">Create First Zone</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Section F: Field Care Recommendations & Actions */}
        <SmartAdvisory trees={farmData.trees} zones={currentZones} farmName={farm.name} />

      </ScrollView>
    </View>
  );
}

// UI Components
function MetricCard({ icon, label, value, unit, badge }: { icon: React.ReactNode; label: string; value: string; unit: string; badge?: React.ReactNode }) {
  return (
    <LinearGradient colors={['#FFFFFF', '#F0FDF4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="rounded-2xl p-4 border border-green-50 shadow-sm flex-1">
      <View className="flex-row items-center justify-between mb-3">
        <View className="items-center justify-center">
          {icon}
        </View>
        {badge && <View>{badge}</View>}
      </View>
      <Text className="text-[11px] text-slate-500 font-medium uppercase tracking-wider">{label}</Text>
      <Text className="text-xl font-bold text-slate-800 mt-1">{value} <Text className="text-sm font-semibold text-slate-500">{unit}</Text></Text>
    </LinearGradient>
  );
}

function EnvWidget({ icon, label, value }: { icon: React.ReactNode; label: string; value: string; }) {
  return (
    <LinearGradient colors={['#FFFFFF', '#F0FDF4']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="flex-1 min-w-[30%] rounded-2xl p-4 items-center border border-green-50 shadow-sm">
      <View className="mb-2">{icon}</View>
      <Text className="text-base font-bold text-slate-800">{value}</Text>
      <Text className="text-[9px] text-slate-500 uppercase tracking-wide mt-1 text-center">{label}</Text>
    </LinearGradient>
  );
}

function SmartAdvisory({ trees, zones, farmName }: { trees: Tree[]; zones: Zone[]; farmName: string }) {
  const alerts = useMemo(() => {
    const weather = latestWeather(generateWeatherSeries(2024));
    return generateAdvisories(trees, zones, weather);
  }, [trees, zones]);

  const hasRecords = useMemo(() => hasHealthRecords(trees), [trees]);
  const isAllHealthy = useMemo(() => allTreesHealthy(trees), [trees]);

  if (!hasRecords && alerts.length === 0) {
    return (
      <View className="bg-white rounded-2xl p-4 border border-slate-100">
        <View className="flex-row items-center gap-2 mb-2">
          <View className="w-8 h-8 rounded-lg bg-slate-100 items-center justify-center">
            <Lightbulb size={16} color="#64748b" />
          </View>
          <Text className="text-sm font-bold text-slate-800">Field Care Recommendations</Text>
        </View>
        <Text className="text-xs text-slate-500">No health records updated for this farm yet. Tap 3D Map to inspect trees.</Text>
      </View>
    );
  }

  if (isAllHealthy && alerts.length === 0) {
    return (
      <View className="bg-white rounded-2xl p-4 border border-slate-100">
        <View className="flex-row items-center gap-2 mb-2">
          <View className="w-8 h-8 rounded-lg bg-green-50 items-center justify-center">
            <CheckCircle2 size={16} color="#16a34a" />
          </View>
          <Text className="text-sm font-bold text-slate-800">Field Care Recommendations</Text>
        </View>
        <View className="flex-row items-start gap-2">
          <View className="w-2.5 h-2.5 rounded-full bg-green-500 mt-1" />
          <Text className="text-xs text-slate-600 flex-1">All trees in {farmName} are thriving in optimal condition.</Text>
        </View>
      </View>
    );
  }

  const byZone = new Map<string, typeof alerts>();
  for (const a of alerts) {
    if (!byZone.has(a.zoneName)) byZone.set(a.zoneName, []);
    byZone.get(a.zoneName)!.push(a);
  }

  const totalTrees = new Set(alerts.map((a) => a.treeNumber)).size;

  const iconFor = (type: string) =>
    type === "soil" ? <Droplets size={13} color="#0284c7" />
    : type === "temperature" ? <CloudSun size={13} color="#f97316" />
    : <AlertTriangle size={13} color="#d97706" />;

  return (
    <View className="bg-white rounded-2xl p-4 border border-slate-100">
      <View className="flex-row items-center gap-2 mb-3">
        <View className="w-8 h-8 rounded-lg bg-amber-50 items-center justify-center">
          <Lightbulb size={16} color="#d97706" />
        </View>
        <View className="flex-1">
          <Text className="text-sm font-bold text-slate-800">Field Care Recommendations</Text>
        </View>
        <View className="flex-row items-center gap-1 bg-red-50 px-2 py-1 rounded-full">
          <AlertTriangle size={10} color="#dc2626" />
          <Text className="text-red-600 text-[10px] font-bold">{totalTrees} Trees Need Action</Text>
        </View>
      </View>
      <View className="gap-2.5">
        {[...byZone.entries()].map(([zoneName, zoneAlerts]) => (
          <View key={zoneName} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
            <View className="flex-row items-center gap-1.5 mb-1.5">
              <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: zoneAlerts[0].zoneColor }} />
              <Text className="text-xs font-bold text-slate-700">{zoneName}:</Text>
              <Text className="text-[11px] text-slate-500">
                Tree {zoneAlerts.map((a) => `#${String(a.treeNumber).padStart(2, "0")}`).join(" & ")}
              </Text>
            </View>
            <View className="gap-1 pl-4">
              {zoneAlerts.map((a) => (
                <View key={a.id} className="flex-row items-start gap-1.5">
                  {iconFor(a.alertType)}
                  <Text className="text-[11px] text-slate-600 flex-1">
                    <Text className="text-slate-400 italic">{a.reason}. </Text>
                    <Text className="font-semibold text-slate-800">{a.action}</Text>
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function Shortcut({ icon, label, onPress }: { icon: React.ReactNode; label: string; onPress: () => void; }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{ flex: 1, elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.05, shadowRadius: 3 }}
    >
      <LinearGradient colors={['#F0FDF4', '#FFFFFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="rounded-2xl p-3 border border-green-50 items-center">
        <View className="items-center justify-center mb-3">
          {icon}
        </View>
        <Text className="text-[11px] font-bold text-slate-700 text-center leading-tight">{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}
