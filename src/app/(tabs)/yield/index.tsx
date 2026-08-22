import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useMemo, useEffect, useCallback } from "react";
import {
  View, Text, TouchableOpacity, ScrollView, Modal, TouchableWithoutFeedback, ActivityIndicator, Image, ImageBackground, Platform, TextInput,
} from "react-native";
import {
  ChevronDown, Plus, Wifi, WifiOff, MapPin, TreePine, Ruler, TrendingUp,
  HeartPulse, Layers, BarChart3, ClipboardList, Sprout, Trash2, Pencil,
  ArrowRight, AlertTriangle, Lightbulb, Droplets, CloudSun, CloudRain,
  Thermometer, Map as MapIcon, X, Globe, Check, CheckCircle2, Wind, Waves, CalendarDays, Bell, Smartphone, Search, FileText, CheckCircle, Circle as CircleIcon, Activity, FileDigit, Menu
} from "lucide-react-native";
import Svg, { Polyline, Circle as SvgCircle, G, Line, Text as SvgText } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import { useYieldApp } from "@/store/YieldAppContext";
import { deleteFarm, subscribeTrees } from "@/services/yieldFarmDb";
import { predictDashboardYield } from "@/services/yieldService";
import { useUnifiedFarmYield } from "@/hooks/useUnifiedFarmYield";
import { buildFarmData, aggregateHealth, healthColor } from "@/utils/yieldTreeFactory";
import { generateAdvisories, generateWeatherSeries, latestWeather, ensureYieldHistory, hasHealthRecords, allTreesHealthy } from "@/utils/yieldAnalytics";
import { useYieldHybridTelemetry, resolveEnvValues } from "@/hooks/useYieldHybridTelemetry";
import { weatherInfo, shortDayName, isToday } from "@/services/weatherService";
import { exportReportPDF, exportAllFarmsReportPDF } from "@/utils/yieldReportGenerator";
import { MarketRevenueCard } from "@/components/yield/YieldDashboard/MarketRevenueCard";
import type { Farm, AdvisoryAlert, Tree } from "@/types/yield";
import { ref, get, onValue, update, set, remove, push } from "firebase/database";
import { rtdb } from "@/services/firebase";

interface DashboardProps {
  onOpenFarm: (farmId: string) => void;
  onAddFarm: () => void;
  onEditFarm: (farmId: string) => void;
  onView3DMap: (farmId: string) => void;
  onOpenAnalytics: (farmId: string) => void;
  onOpenLogs: (farmId: string) => void;
  onOpenTelemetry: (farmId: string) => void;
  onOpenDebug?: () => void;
  onViewAllFarms?: () => void;
}

const WEATHER_HEX: Record<string, string> = {
  "text-amber-500": "#f59e0b", "text-sky-500": "#0ea5e9", "text-sky-600": "#0284c7",
  "text-blue-600": "#2563eb", "text-blue-700": "#1d4ed8", "text-slate-400": "#94a3b8",
  "text-slate-500": "#64748b", "text-violet-600": "#7c3aed", "text-violet-700": "#6d28d9",
};

export default function YieldDashboardScreen() {

  const [farmPredictions, setFarmPredictions] = useState<Record<string, number>>({});
  const [loadingPredictions, setLoadingPredictions] = useState<Record<string, boolean>>({});

  const getDaysLeft = useCallback((farm: any) => {
    const lastStr = farm.lastHarvestDate || farm.createdAt;
    if (!lastStr) return 45;
    const last = new Date(lastStr).getTime();
    if (isNaN(last)) return 45;
    const nextPick = last + (45 * 24 * 60 * 60 * 1000);
    const daysLeft = Math.ceil((nextPick - Date.now()) / (24 * 60 * 60 * 1000));
    return daysLeft > 45 ? 45 : daysLeft;
  }, []);

  const router = useRouter();
  const onAddFarm = () => router.push('/yield/add-farm');
  const { user, farms, currentFarm, currentZones, setCurrentFarmId } = useYieldApp();
  const [farmMenuOpen, setFarmMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [dashboardPrediction, setDashboardPrediction] = useState<any>(null);
  const [isPredicting, setIsPredicting] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Market & Task State
  const [marketChartTab, setMarketChartTab] = useState("Month");
  const [addTaskModalOpen, setAddTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskFarmId, setNewTaskFarmId] = useState("");
  const [linkDeviceOpen, setLinkDeviceOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [deviceStatusMap, setDeviceStatusMap] = useState<Record<string, boolean>>({});
  const [notifications, setNotifications] = useState<any[]>([]);
  const [dbTasks, setDbTasks] = useState<any[]>([]);
  const [recentHarvestLogs, setRecentHarvestLogs] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    // Subscribe to notifications
    const notifRef = ref(rtdb, `users/${user.uid}/notifications`);
    const unsubNotif = onValue(notifRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const arr = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }));
        arr.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        setNotifications(arr);
      } else {
        setNotifications([]);
      }
    });

    // Subscribe to tasks
    const tasksRef = ref(rtdb, `users/${user.uid}/tasks`);
    const unsubTasks = onValue(tasksRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const arr = Object.entries(data).map(([id, val]: [string, any]) => ({ id, ...val }));
        arr.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setDbTasks(arr);
      } else {
        setDbTasks([]);
      }
    });

    return () => { unsubNotif(); unsubTasks(); };
  }, [user]);

  // Subscribe to all farm devices to get real-time heartbeat
  useEffect(() => {
    const unsubs: (() => void)[] = [];
    const lastSeenMap: Record<string, number> = {};

    farms.forEach(farm => {
      farm.deviceIds?.forEach(deviceId => {
        const path = `/devices/${deviceId}/latest`;
        const unsub = onValue(ref(rtdb, path), snap => {
          const v = snap.val();
          if (v) {
            const lastSeen = v.last_seen ? new Date(v.last_seen).getTime() : (v.timestamp ? new Date(v.timestamp).getTime() : Date.now());
            lastSeenMap[deviceId] = lastSeen;
            setDeviceStatusMap(prev => ({ ...prev, [deviceId]: (Date.now() - lastSeen < 180000) }));
          } else {
            setDeviceStatusMap(prev => ({ ...prev, [deviceId]: false }));
          }
        });
        unsubs.push(unsub);
      });
    });
    
    const interval = setInterval(() => {
      setDeviceStatusMap(prev => {
        let changed = false;
        const next = { ...prev };
        Object.keys(lastSeenMap).forEach(deviceId => {
          const isLive = Date.now() - lastSeenMap[deviceId] < 180000;
          if (next[deviceId] !== isLive) {
            next[deviceId] = isLive;
            changed = true;
          }
        });
        return changed ? next : prev;
      });
    }, 10000);

    return () => {
      unsubs.forEach(u => u());
      clearInterval(interval);
    };
  }, [farms]);
  
  const toggleTask = (id: string, currentCompleted: boolean) => {
    if (!user) return;
    update(ref(rtdb, `users/${user.uid}/tasks/${id}`), { completed: !currentCompleted });
  };
  
  const handleDeleteTask = () => {
    if (taskToDelete && user) {
      remove(ref(rtdb, `users/${user.uid}/tasks/${taskToDelete}`));
      setTaskToDelete(null);
    }
  };

  const handleSaveTask = () => {
    if (!newTaskTitle || !newTaskFarmId || !user) return;
    const farm = farms.find(f => f.id === newTaskFarmId);
    push(ref(rtdb, `users/${user.uid}/tasks`), {
      farmName: farm?.name || "Unknown Farm",
      title: newTaskTitle,
      priority: "medium",
      completed: false,
      createdAt: Date.now()
    });
    setNewTaskTitle("");
    setNewTaskFarmId("");
    setAddTaskModalOpen(false);
  };

  useEffect(() => {
    if (!user || !currentFarm) {
      setDashboardPrediction(null);
      return;
    }
    const fetchPrediction = async () => {
      setIsPredicting(true);
      try {
        const logsRef = ref(rtdb, `users/${user.uid}/harvests/${currentFarm.id}`);
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
        setRecentHarvestLogs(logs);

        const reqBody = {
          uid: user.uid,
          farm_id: currentFarm.id,
          estate: (currentFarm as any).district || currentFarm.locationName || (currentFarm as any).location || "Makandura",
          trees_count: currentFarm.totalTrees || 40,
          last_harvest_yield: currentFarm.lastHarvestYield || (currentFarm as any).last_harvest_yield || null,
          actual_harvest_logs: logs
        };

        const data = await predictDashboardYield(reqBody);

        if (data) {
          setDashboardPrediction(data);
        } else {
          setDashboardPrediction(null);
        }
      } catch (err) {
        console.error("Dashboard prediction fetch error:", err);
        setDashboardPrediction(null);
      } finally {
        setIsPredicting(false);
      }
    };
    
    fetchPrediction();
  }, [user, currentFarm]);

  useEffect(() => {
    if (!currentFarm && farms.length > 0) setCurrentFarmId(farms[0].id);
  }, [currentFarm, farms, setCurrentFarmId]);

  // Fetch ML predictions for dashboard farm cards
  useEffect(() => {
    if (!user || farms.length === 0) return;
    farms.slice(0, 3).forEach(async (farm) => {
      if (farmPredictions[farm.id] !== undefined) return;
      setLoadingPredictions(prev => ({ ...prev, [farm.id]: true }));
      try {
        const logsRef = ref(rtdb, `users/${user.uid}/harvests/${farm.id}`);
        const snap = await get(logsRef);
        let logs = [];
        if (snap.exists()) {
          const vals = snap.val();
          logs = Object.entries(vals).map(([id, l]) => ({
            id, date: l.date || l.timestamp,
            actual_yield_nuts: l.nutCount || l.actual_yield_nuts || 0,
            predicted_yield_nuts: l.predicted_yield_nuts || 0
          }));
          logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
        const result = await predictDashboardYield({
          uid: user.uid, farm_id: farm.id,
          estate: farm.locationName || 'Makandura',
          trees_count: farm.totalTrees || 40,
          last_harvest_yield: farm.lastHarvestYield || null,
          actual_harvest_logs: logs
        });
        if (result && result.predicted_next_pick_yield_nuts !== undefined) {
          setFarmPredictions(prev => ({ ...prev, [farm.id]: result.predicted_next_pick_yield_nuts }));
        }
      } catch (e) {
        console.error('Farm card prediction failed:', e);
      } finally {
        setLoadingPredictions(prev => ({ ...prev, [farm.id]: false }));
      }
    });
  }, [farms, user]);

  const { telemetry, weather, source, deviceLive, usedFallbackCoords } = useYieldHybridTelemetry(currentFarm);
  const env = useMemo(() => resolveEnvValues(telemetry, weather, source), [telemetry, weather, source]);
  const [storedTrees, setStoredTrees] = useState<Record<string, Tree>>({});

  useEffect(() => {
    if (!user || !currentFarm) { setStoredTrees({}); return; }
    const unsub = subscribeTrees(user.uid, currentFarm.id, setStoredTrees);
    return unsub;
  }, [user, currentFarm]);

  const farmData = useMemo(() => {
    if (!currentFarm) return null;
    return buildFarmData(currentFarm.perches, currentFarm.totalTrees, currentFarm.treeLayout, storedTrees);
  }, [currentFarm, storedTrees]);

  const metrics = useMemo(() => {
    if (!farmData) return null;
    const { health, pct } = aggregateHealth(farmData.trees);
    const enriched = ensureYieldHistory(farmData.trees);
    const predictedYield = enriched.reduce((sum, tree) => {
      const latest = tree.yieldHistory?.slice(-1)[0];
      return sum + (latest?.nuts ?? tree.yield ?? 0);
    }, 0);
    return { health, pct, predictedYield, totalTrees: currentFarm!.totalTrees, perches: currentFarm!.perches };
  }, [farmData, currentFarm]);

  const advisories = useMemo<AdvisoryAlert[]>(() => {
    if (!farmData) return [];
    const w = latestWeather(generateWeatherSeries(2024));
    return generateAdvisories(farmData.trees, currentZones, w);
  }, [farmData, currentZones]);

  const hasRecords = useMemo(() => farmData ? hasHealthRecords(farmData.trees) : false, [farmData]);
  const isAllHealthy = useMemo(() => farmData ? allTreesHealthy(farmData.trees) : false, [farmData]);

  const stress = useMemo(() => {
    const alerts: { type: "drought" | "heat" | "optimal" | "none"; message: string }[] = [];
    if (env.soilMoisture != null && env.soilMoisture < 35) alerts.push({ type: "drought", message: "Drought Stress" });
    if (env.temperature != null && env.temperature > 33) alerts.push({ type: "heat", message: "Heat Stress" });
    if (alerts.length === 0 && env.temperature != null && env.soilMoisture != null) alerts.push({ type: "optimal", message: "Optimal" });
    if (alerts.length === 0) alerts.push({ type: "none", message: "No Data" });
    return alerts;
  }, [env]);

  const handleExportReport = () => {
    if (!currentFarm || !farmData || !metrics) return;
    exportReportPDF({ farm: currentFarm, zones: currentZones, trees: farmData.trees, telemetry, weather, source, env, predictedYield: metrics.predictedYield });
  };

  const userName = user?.displayName ?? user?.email?.split("@")[0] ?? "Farmer";

  // Calculate Global Sums
  const totalFarms = farms.length;
  const totalExpectedYield = farms.reduce((acc, f) => acc + (f.lastHarvestYield ? f.lastHarvestYield : (f.totalTrees * 6)), 0);
  let globalActiveCount = 0;
  let globalTotalDevices = 0;
  farms.forEach(f => {
    if (f.deviceIds) {
      globalTotalDevices += f.deviceIds.length;
      globalActiveCount += f.deviceIds.filter(id => deviceStatusMap[id]).length;
    }
  });
  const unreadNotifs = notifications.filter(n => !n.isRead).length;

  const filteredFarms = farms.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (f.locationName && f.locationName.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  let daysRemaining = 45;
  let hasHarvestData = false;
  let mostRecentHarvestDate = new Date();

  if (currentFarm?.lastHarvestDate) {
    const last = new Date(currentFarm.lastHarvestDate);
    if (!isNaN(last.getTime())) {
      mostRecentHarvestDate = last;
      hasHarvestData = true;
    }
  }

  if (recentHarvestLogs.length > 0) {
    const latestLogDate = new Date(recentHarvestLogs[0].date);
    if (!isNaN(latestLogDate.getTime())) {
      if (!hasHarvestData || latestLogDate > mostRecentHarvestDate) {
        mostRecentHarvestDate = latestLogDate;
        hasHarvestData = true;
      }
    }
  }

  if (hasHarvestData) {
    const next = new Date(mostRecentHarvestDate.getTime());
    next.setDate(next.getDate() + 45);
    const now = new Date();
    daysRemaining = Math.ceil((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  } else {
    daysRemaining = 45;
  }

  return (
    <View className="flex-1 bg-slate-50">
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 96 }}>
        {/* 1. Clean Header Bar */}
        {/* 1. Header Bar with Background Gradient */}
        <View className="rounded-b-[40px] overflow-hidden bg-[#0C3B2E]">
          {/* Absolute Background Image */}
          <Image 
            source={{ uri: 'https://i.ibb.co/fVxBr2gZ/farm-hero.png' }} 
            style={{ position: 'absolute', right: '-10%', bottom: 0, width: '110%', height: '100%', opacity: 0.8 }} 
            resizeMode="cover"
          />
          {/* Horizontal Gradient for seamless blend */}
          <LinearGradient 
            colors={['#0C3B2E', '#0C3B2E', 'rgba(12, 59, 46, 0.6)', 'transparent']} 
            locations={[0, 0.35, 0.6, 1]}
            start={{x: 0, y: 0}} 
            end={{x: 1, y: 0}} 
            style={{ position: 'absolute', width: '100%', height: '100%' }} 
          />
          {/* Vertical Gradient to fade into the bottom */}
          <LinearGradient 
            colors={['transparent', 'rgba(12, 59, 46, 0.4)', '#0C3B2E']} 
            start={{x: 0, y: 0.3}} 
            end={{x: 0, y: 1}} 
            style={{ position: 'absolute', width: '100%', height: '100%' }} 
          />
          
          <View className="px-5 pt-12 pb-24">
            {/* Top Nav */}
            <View className="flex-row items-center justify-between mb-8">
              <View className="flex-row items-center gap-3">
                <View className="flex-row items-center gap-2">
                  <TreePine size={24} color="#86efac" />
                  <Text className="text-[22px] font-extrabold text-white tracking-tight">Yield Predictor</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setNotificationsOpen(true)} className="relative">
                <Bell size={24} color="#fff" />
                {unreadNotifs > 0 && (
                  <View className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full items-center justify-center border-[1.5px] border-[#0C3B2E]">
                    <Text className="text-[8px] font-bold text-white">{unreadNotifs}</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <Text className="text-2xl font-bold text-white mb-2">Welcome back, {userName}! 👋</Text>
            <Text className="text-white/80 text-[13px] w-4/5 leading-5 mb-4">Predict and manage your coconut harvest accurately.</Text>
          </View>
        </View>

        <View className="px-4 gap-6" style={{ marginTop: -60 }}>
          
          {/* Harvest Reminder Banner */}
          {currentFarm && daysRemaining <= 7 && (
            <View className={`rounded-[24px] p-4 flex-row items-center justify-between border ${daysRemaining <= 0 ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`} style={{ shadowColor: '#12211C', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.06, shadowRadius: 25, elevation: 5 }}>
              <View className="flex-row items-center gap-3">
                <View className={`w-10 h-10 rounded-full ${daysRemaining <= 0 ? 'bg-red-500' : 'bg-orange-500'} items-center justify-center shadow-sm`}>
                  <AlertTriangle size={20} color="#fff" />
                </View>
                <View>
                  <Text className={`font-bold text-sm mb-0.5 ${daysRemaining <= 0 ? 'text-red-900' : 'text-orange-900'}`}>
                    {daysRemaining <= 0 ? 'Harvest Overdue!' : 'Upcoming Harvest'}
                  </Text>
                  <Text className={`text-[10px] leading-tight ${daysRemaining <= 0 ? 'text-red-700' : 'text-orange-700'}`}>
                    {daysRemaining < 0 ? `Overdue by ${Math.abs(daysRemaining)} days` : daysRemaining === 0 ? 'Harvest is due today!' : `Harvest is due in ${daysRemaining} days`}
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => router.push(`/yield/${currentFarm.id}/analytics`)} className={`px-3 py-1.5 rounded-full ${daysRemaining <= 0 ? 'bg-red-100' : 'bg-orange-100'}`}>
                <Text className={`text-xs font-bold ${daysRemaining <= 0 ? 'text-red-700' : 'text-orange-700'}`}>View</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* 2. Global Overview Summary Section */}
          <View className="flex-row gap-3">
            {/* Card 1 */}
            <View className="flex-1 bg-white rounded-3xl p-3 shadow-sm items-start" style={{ shadowColor: '#12211C', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.06, shadowRadius: 25, elevation: 5 }}>
              <View className="w-9 h-9 rounded-xl bg-green-50 items-center justify-center mb-4">
                <Image source={{ uri: 'https://i.ibb.co/b050Cjy/farmland.png' }} style={{ width: 24, height: 24, resizeMode: 'contain' }} />
              </View>
              <Text className="text-slate-500 text-[10px] font-medium mb-1">Total Farms</Text>
              <Text className="text-slate-800 font-extrabold text-xl mb-3">{totalFarms}</Text>
              <View className="flex-row items-center gap-1.5 mt-auto">
                <View className="w-1.5 h-1.5 rounded-full bg-green-500" />
                <Text className="text-slate-500 text-[10px] font-medium">Active</Text>
              </View>
            </View>
            
            {/* Card 2 */}
            <View className="flex-1 bg-white rounded-3xl p-3 shadow-sm items-start" style={{ shadowColor: '#12211C', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.06, shadowRadius: 25, elevation: 5 }}>
              <View className="w-9 h-9 rounded-xl bg-blue-50 items-center justify-center mb-4">
                <Image source={{ uri: 'https://i.ibb.co/gbSQjznt/coconut-fruit.png' }} style={{ width: 22, height: 22, resizeMode: 'contain' }} />
              </View>
              <Text className="text-slate-500 text-[10px] font-medium mb-1">Expected Yield</Text>
              <Text className="text-slate-800 font-extrabold text-xl mb-0.5">{totalExpectedYield.toLocaleString()}</Text>
              <Text className="text-slate-800 font-extrabold text-xs mb-3">Nuts</Text>
              <View className="flex-row items-center gap-1.5 mt-auto">
                <View className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                <Text className="text-slate-500 text-[10px] font-medium">This season</Text>
              </View>
            </View>
            
            {/* Card 3 */}
            <View className="flex-[1.1] bg-white rounded-3xl p-3 shadow-sm items-start" style={{ shadowColor: '#12211C', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.06, shadowRadius: 25, elevation: 5 }}>
              <View className="w-9 h-9 rounded-xl bg-purple-50 items-center justify-center mb-4">
                <Image source={{ uri: 'https://i.ibb.co/KcPMjjBz/wifi.png' }} style={{ width: 20, height: 20, resizeMode: 'contain' }} />
              </View>
              <Text className="text-slate-500 text-[10px] font-medium mb-1">Active Devices</Text>
              <Text className="text-slate-800 font-extrabold text-[15px] leading-tight mb-2">{globalActiveCount} Online{"\n"}/ {globalTotalDevices - globalActiveCount} Offline</Text>
              <View className="flex-row items-center gap-1.5 mt-auto">
                <View className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                <Text className="text-slate-500 text-[10px] font-medium">Device status</Text>
              </View>
            </View>
          </View>
          
          {/* 3. Quick Action Cards */}
          <View>
            <Text className="text-slate-800 text-[15px] font-bold tracking-tight mb-3">Quick Actions</Text>
            <View className="flex-row gap-3">
              <TouchableOpacity onPress={onAddFarm} className="flex-1 bg-[#F2F9F5] rounded-[24px] p-4 flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-full bg-[#16a34a] items-center justify-center shadow-sm">
                    <Plus size={22} color="#fff" />
                  </View>
                  <View>
                    <Text className="font-bold text-slate-800 text-sm mb-0.5">Add New Farm</Text>
                    <Text className="text-slate-500 text-[10px] leading-tight">Register new farm</Text>
                  </View>
                </View>
                <ChevronDown size={16} color="#64748b" style={{transform: [{rotate: '-90deg'}]}} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => router.push('/yield/list')} className="flex-1 bg-[#EEF2FF] rounded-[24px] p-4 flex-row items-center justify-between">
                <View className="flex-row items-center gap-3">
                  <View className="w-10 h-10 rounded-full bg-[#6366f1] items-center justify-center shadow-sm">
                    <BarChart3 size={20} color="#fff" />
                  </View>
                  <View>
                    <Text className="font-bold text-slate-800 text-sm mb-0.5">All Farms</Text>
                    <Text className="text-slate-500 text-[10px] leading-tight">View & compare</Text>
                  </View>
                </View>
                <ChevronDown size={16} color="#64748b" style={{transform: [{rotate: '-90deg'}]}} />
              </TouchableOpacity>
            </View>
          </View>

          

          {/* TODAY'S TASKS */}
          <View>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-slate-800 text-xs font-bold tracking-wider">TODAY'S TASKS</Text>
              <TouchableOpacity onPress={() => setAddTaskModalOpen(true)}>
                <Text className="text-forest-600 text-[11px] font-bold">+ Add Task</Text>
              </TouchableOpacity>
            </View>
            <View className="bg-white rounded-[20px] border border-slate-100 p-2 gap-1 max-h-64" style={{ shadowColor: '#12211C', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.06, shadowRadius: 25, elevation: 5 }}>
              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                {dbTasks.length === 0 ? (
                  <View className="p-4 items-center justify-center">
                    <Text className="text-slate-400 text-xs">No tasks yet.</Text>
                  </View>
                ) : (
                  dbTasks.map(task => (
                    <View key={task.id} className="flex-row items-center gap-3 p-3 rounded-xl bg-slate-50 mb-1">
                      <TouchableOpacity onPress={() => toggleTask(task.id, task.completed)}>
                        {task.completed ? <CheckCircle2 size={20} color="#16a34a" /> : <CircleIcon size={20} color="#cbd5e1" />}
                      </TouchableOpacity>
                      <View className="flex-1">
                        <View className="flex-row items-center gap-1.5 mb-1">
                          <View className={`w-2 h-2 rounded-full ${task.priority === 'high' ? 'bg-red-500' : task.priority === 'medium' ? 'bg-amber-500' : 'bg-blue-500'}`} />
                          <Text className="text-[10px] font-bold text-slate-500">{task.farmName}</Text>
                        </View>
                        <Text className={`text-sm font-semibold ${task.completed ? 'text-slate-400 line-through' : 'text-slate-700'}`}>{task.title}</Text>
                      </View>
                      <TouchableOpacity onPress={() => setTaskToDelete(task.id)} className="p-2">
                        <Trash2 size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                  ))
                )}
              </ScrollView>
            </View>
          </View>



          <View>
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-slate-800 text-[15px] font-bold tracking-tight">Your Farms</Text>
              <TouchableOpacity onPress={() => router.push('/yield/list')}>
                <Text className="text-forest-600 text-[12px] font-bold">View All {'>'}</Text>
              </TouchableOpacity>
            </View>
            
            {/* Farm Search & Filter Bar */}
            <View className="bg-white rounded-full flex-row items-center px-4 py-2.5 border border-slate-200 shadow-sm mb-4">
              <Search size={18} color="#94a3b8" />
              <TextInput 
                style={Platform.OS === 'web' ? { outline: 'none' } as any : {}}
                className="flex-1 ml-3 text-sm font-semibold text-slate-700 py-0 min-h-[32px]"
                placeholder="Search farms by name or location..."
                placeholderTextColor="#94a3b8"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <X size={16} color="#94a3b8" />
                </TouchableOpacity>
              )}
            </View>

            <View className="gap-4">
              {filteredFarms.slice(0, 3).map((farm) => {
                const fd = buildFarmData(farm.perches, farm.totalTrees, farm.treeLayout, {});
                const isOnline = farm.deviceIds && farm.deviceIds.length > 0;
                
                return (
                  <View key={farm.id} className="bg-white rounded-[24px] p-4 border border-slate-100 mb-2" style={{ shadowColor: '#12211C', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.06, shadowRadius: 25, elevation: 5 }}>
                    {/* Top Row: Name, Location, Badge */}
                    <View className="flex-row items-start justify-between mb-4">
                      <View className="flex-row flex-1 pr-2 items-center gap-3">
                        <Image source={{ uri: 'https://i.ibb.co/hxXPYgww/farm-image.png' }} style={{width: 50, height: 50, borderRadius: 25}} defaultSource={{width: 50, height: 50}} />
                        <View>
                          <Text className="text-[17px] font-bold text-slate-800">{farm.name}</Text>
                          <View className="flex-row items-center gap-1 mt-1">
                            <MapPin size={12} color="#94a3b8" />
                            <Text className="text-xs text-slate-500">{farm.locationName || "Location Not Set"}</Text>
                          </View>
                        </View>
                      </View>
                      {(() => {
                        const daysLeft = getDaysLeft(farm);
                        const isUrgent = daysLeft <= 7;
                        const isOverdue = daysLeft < 0;
                        return (
                          <View className={`px-3 py-1.5 rounded-[20px] ${isOverdue ? 'bg-red-100' : isUrgent ? 'bg-amber-100' : 'bg-emerald-100'}`}>
                            <Text className={`text-[10px] font-bold ${isOverdue ? 'text-red-700' : isUrgent ? 'text-amber-700' : 'text-emerald-700'}`}>
                              {isOverdue ? `${Math.abs(daysLeft)}d Overdue` : `${daysLeft} Days Left`}
                            </Text>
                          </View>
                        );
                      })()}
                    </View>

                    {/* Stats Row */}
                    <View className="flex-row gap-6 px-2 mb-4">
                      <View className="flex-row items-center gap-2">
                        <Image source={{ uri: 'https://i.ibb.co/xKSGghy9/coconut-tree-3d.png' }} style={{ width: 20, height: 20, resizeMode: 'contain' }} />
                        <View>
                          <Text className="text-sm font-bold text-slate-800">{farm.totalTrees}</Text>
                          <Text className="text-[10px] text-slate-500 font-medium">Trees Count</Text>
                        </View>
                      </View>
                      <View className="flex-row items-center gap-2">
                        <Image source={{ uri: 'https://i.ibb.co/gbSQjznt/coconut-fruit.png' }} style={{ width: 20, height: 20, resizeMode: 'contain' }} />
                        <View>
                          {loadingPredictions[farm.id] ? (
                            <ActivityIndicator size="small" color="#16a34a" />
                          ) : (
                            <Text className="text-sm font-bold text-slate-800">
                              {farmPredictions[farm.id] !== undefined ? farmPredictions[farm.id] : (farm.lastHarvestYield || '—')}
                            </Text>
                          )}
                          <Text className="text-[10px] text-slate-500 font-medium">Predicted Nuts</Text>
                        </View>
                      </View>
                    </View>

                    {/* Device Row */}
                    <View className="flex-row items-center gap-2 mb-4 px-2 py-2 border-t border-b border-slate-100">
                      <View className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                      <Text className="text-[11px] font-medium text-slate-600">Device: {farm.deviceIds?.[0] || 'None linked'}</Text>
                      <Text className={`text-[10px] font-bold ml-auto ${isOnline ? 'text-green-600' : 'text-red-500'}`}>
                        {isOnline ? 'ONLINE' : 'OFFLINE'}
                      </Text>
                    </View>

                    {/* Primary Button */}
                    <TouchableOpacity onPress={() => { setCurrentFarmId(farm.id); router.push(`/yield/${farm.id}`); }}>
                      <View className="bg-[#114B3A] py-3 rounded-[12px] items-center flex-row justify-center gap-2">
                        <Text className="text-white font-bold text-sm tracking-wide">Open Dashboard</Text>
                        <ArrowRight size={16} color="#fff" />
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              })}

              {/* 5. Dashed Add Farm Card */}
              <TouchableOpacity onPress={onAddFarm} className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-[20px] p-6 items-center justify-center flex-row gap-2">
                <Plus size={20} color="#64748b" />
                <Text className="text-slate-500 font-bold text-sm">Add New Farm</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Daily Farming Tip Banner */}
          <View className="bg-amber-50 rounded-2xl p-4 border border-amber-100 flex-row gap-3 shadow-sm">
            <View className="w-10 h-10 rounded-full bg-amber-100 items-center justify-center">
              <Lightbulb size={20} color="#d97706" />
            </View>
            <View className="flex-1">
              <Text className="text-sm font-bold text-amber-900 mb-1">💡 Today's Agronomic Tip</Text>
              <Text className="text-xs text-amber-800 leading-tight">
                Applying coconut coir dust or mulch around the tree root-zone during dry spells helps retain up to 40% more soil moisture.
              </Text>
            </View>
          </View>

          {/* Global Summary PDF Export Button */}
          <TouchableOpacity onPress={() => exportAllFarmsReportPDF(farms)} className="bg-forest-700 py-4 rounded-2xl flex-row items-center justify-center gap-2 shadow-sm mb-6">
            <FileText size={18} color="#fff" />
            <Text className="text-white font-bold text-sm">Export All Farms Summary Report (PDF)</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>

      {/* Notifications Drawer/Modal */}
      <Modal visible={notificationsOpen} animationType="slide" transparent onRequestClose={() => setNotificationsOpen(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <TouchableOpacity className="flex-1" onPress={() => setNotificationsOpen(false)} />
          <View className="bg-slate-50 rounded-t-3xl h-[70%]">
            <View className="px-5 py-4 border-b border-slate-200 flex-row items-center justify-between bg-white rounded-t-3xl">
              <View className="flex-row items-center gap-2">
                <Bell size={20} color="#114B3A" />
                <Text className="text-lg font-bold text-slate-800">Notifications {unreadNotifs > 0 && <Text className="text-forest-600">({unreadNotifs} Unread)</Text>}</Text>
              </View>
              <View className="flex-row items-center gap-4">
                {unreadNotifs > 0 && (
                  <TouchableOpacity onPress={() => {
                    if (!user) return;
                    notifications.forEach(n => {
                      if (!n.isRead) update(ref(rtdb, `users/${user.uid}/notifications/${n.id}`), { isRead: true });
                    });
                  }}>
                    <Text className="text-xs font-bold text-forest-600">Mark all as read</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={() => setNotificationsOpen(false)} className="w-8 h-8 bg-slate-100 rounded-full items-center justify-center">
                  <X size={18} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>
            <ScrollView className="p-5 flex-1" contentContainerStyle={{ gap: 12 }}>
              {notifications.length === 0 ? (
                <View className="items-center justify-center py-12">
                  <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-4">
                    <CheckCircle size={32} color="#94a3b8" />
                  </View>
                  <Text className="text-lg font-bold text-slate-700 mb-1">All caught up!</Text>
                  <Text className="text-sm text-slate-500">No new notifications.</Text>
                </View>
              ) : (
                notifications.map(notif => {
                  const icon = notif.type === 'harvest' ? '⏳' : notif.type === 'drought' ? '⚠️' : notif.type === 'market' ? '💰' : '🔴';
                  const bgIcon = notif.type === 'harvest' ? 'bg-blue-50' : notif.type === 'drought' ? 'bg-amber-50' : notif.type === 'market' ? 'bg-emerald-50' : 'bg-red-50';
                  
                  return (
                    <TouchableOpacity 
                      key={notif.id}
                      onPress={() => {
                        if (user) update(ref(rtdb, `users/${user.uid}/notifications/${notif.id}`), { isRead: true });
                        if (notif.farmId) {
                          setNotificationsOpen(false);
                          setCurrentFarmId(notif.farmId);
                          router.push(`/yield/${notif.farmId}`);
                        }
                      }} 
                      className={`rounded-2xl p-4 border shadow-sm flex-row gap-3 ${notif.isRead ? 'bg-white border-slate-200' : 'bg-[#F2F9F5] border-l-4 border-l-forest-700 border-t-slate-200 border-r-slate-200 border-b-slate-200'}`}
                    >
                      <View className={`w-10 h-10 rounded-full ${bgIcon} items-center justify-center`}>
                        <Text className="text-lg">{icon}</Text>
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center justify-between mb-1">
                          <Text className="text-sm font-bold text-slate-800">{notif.title}</Text>
                          {notif.timestamp && (
                            <Text className="text-[10px] font-bold text-slate-400">
                              {Math.floor((Date.now() - notif.timestamp) / 60000)} mins ago
                            </Text>
                          )}
                        </View>
                        <Text className="text-xs text-slate-600">{notif.message}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Task Modal */}
      <Modal visible={addTaskModalOpen} animationType="slide" transparent onRequestClose={() => setAddTaskModalOpen(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <TouchableOpacity className="flex-1" onPress={() => setAddTaskModalOpen(false)} />
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-slate-800">Add New Task</Text>
              <TouchableOpacity onPress={() => setAddTaskModalOpen(false)}><X size={20} color="#94a3b8" /></TouchableOpacity>
            </View>
            <View className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4">
              <TextInput 
                placeholder="Task Title" 
                placeholderTextColor="#94a3b8" 
                className="text-slate-700 font-semibold text-base"
                value={newTaskTitle}
                onChangeText={setNewTaskTitle}
              />
            </View>
            <View className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-6">
              <Text className="text-xs font-bold text-slate-400 mb-2">Select Farm</Text>
              <ScrollView className="max-h-32" nestedScrollEnabled>
                {farms.map(f => (
                  <TouchableOpacity 
                    key={f.id} 
                    onPress={() => setNewTaskFarmId(f.id)} 
                    className={`p-3 rounded-xl mb-1 ${newTaskFarmId === f.id ? 'bg-forest-100 border border-forest-200' : 'bg-white border border-slate-100'}`}
                  >
                    <Text className={`font-semibold ${newTaskFarmId === f.id ? 'text-forest-800' : 'text-slate-700'}`}>{f.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
            <TouchableOpacity onPress={handleSaveTask} className="bg-forest-600 rounded-xl py-4 items-center">
              <Text className="text-white font-bold text-base">Save Task</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Link Device Modal */}
      <Modal visible={linkDeviceOpen} animationType="slide" transparent onRequestClose={() => setLinkDeviceOpen(false)}>
        <View className="flex-1 bg-black/50 justify-end">
          <TouchableOpacity className="flex-1" onPress={() => setLinkDeviceOpen(false)} />
          <View className="bg-white rounded-t-3xl p-6">
            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-xl font-bold text-slate-800">Link Device</Text>
              <TouchableOpacity onPress={() => setLinkDeviceOpen(false)}><X size={20} color="#94a3b8" /></TouchableOpacity>
            </View>
            <Text className="text-sm text-slate-500 mb-4">Pair a new IoT device by entering its Device ID.</Text>
            <View className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-4">
              <TextInput 
                placeholder="e.g. D0012" 
                placeholderTextColor="#94a3b8" 
                className="text-slate-700 font-semibold text-base"
              />
            </View>
            <TouchableOpacity onPress={() => setLinkDeviceOpen(false)} className="bg-forest-600 rounded-xl py-4 items-center">
              <Text className="text-white font-bold text-base">Pair Device</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Task Confirmation Modal */}
      <Modal visible={taskToDelete !== null} animationType="fade" transparent onRequestClose={() => setTaskToDelete(null)}>
        <View className="flex-1 bg-black/50 justify-center items-center px-6">
          <View className="bg-white rounded-3xl p-6 w-full">
            <View className="items-center mb-4">
              <View className="w-12 h-12 rounded-full bg-red-50 items-center justify-center mb-3">
                <Trash2 size={24} color="#dc2626" />
              </View>
              <Text className="text-lg font-bold text-slate-800 text-center">Delete Task?</Text>
            </View>
            <Text className="text-sm text-slate-500 text-center mb-6">Are you sure you want to delete this task? This action cannot be undone.</Text>
            <View className="flex-row gap-3">
              <TouchableOpacity onPress={() => setTaskToDelete(null)} className="flex-1 py-3.5 rounded-xl bg-slate-100 items-center">
                <Text className="text-slate-600 font-bold">No, Keep It</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleDeleteTask} className="flex-1 py-3.5 rounded-xl bg-red-600 items-center">
                <Text className="text-white font-bold">Yes, Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={manageOpen} animationType="slide" transparent onRequestClose={() => setManageOpen(false)}>
        <ManageFarmsModal farms={farms} onClose={() => setManageOpen(false)} onOpenFarm={(id) => { setCurrentFarmId(id); router.push(`/yield/${id}`); setManageOpen(false); }} onEditFarm={(id) => { router.push(`/yield/${id}`); setManageOpen(false); }} onAddFarm={() => { router.push("/yield/add-farm"); setManageOpen(false); }} />
      </Modal>
    </View>
  );
}

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

function ActionBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void; }) {
  return (
    <TouchableOpacity onPress={onClick} style={{ flex: 1, elevation: 2, shadowColor: '#000', shadowOffset: {width: 0, height: 1}, shadowOpacity: 0.05, shadowRadius: 3 }}>
      <LinearGradient colors={['#F0FDF4', '#FFFFFF']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} className="rounded-2xl p-4 border border-green-50 items-center h-full">
        <View className="items-center justify-center mb-3">{icon}</View>
        <Text className="text-xs font-bold text-slate-700 text-center">{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function AdvisoryCard({ advisories, hasRecords, isAllHealthy, farmName, onView3DMap }: {
  advisories: AdvisoryAlert[]; hasRecords: boolean; isAllHealthy: boolean; farmName: string; onView3DMap: () => void;
}) {
  if (!hasRecords && advisories.length === 0) {
    return (
      <View className="bg-white rounded-2xl p-4 border border-slate-100">
        <View className="flex-row items-center gap-2 mb-2">
          <View className="w-8 h-8 rounded-lg bg-slate-100 items-center justify-center"><Lightbulb size={16} color="#64748b" /></View>
          <Text className="text-sm font-bold text-slate-800">Advisory</Text>
        </View>
        <Text className="text-xs text-slate-500 mb-3">No health records found.</Text>
        <TouchableOpacity onPress={onView3DMap} className="flex-row items-center gap-1.5 self-start bg-forest-50 rounded-lg px-3 py-2">
          <MapIcon size={14} color="#1e7550" />
          <Text className="text-xs font-semibold text-forest-700">View 3D Map</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (isAllHealthy && advisories.length === 0) {
    return (
      <View className="bg-white rounded-2xl p-4 border border-slate-100">
        <View className="flex-row items-center gap-2 mb-2">
          <View className="w-8 h-8 rounded-lg bg-green-50 items-center justify-center"><CheckCircle2 size={16} color="#16a34a" /></View>
          <Text className="text-sm font-bold text-slate-800">Advisory</Text>
        </View>
        <View className="flex-row items-start gap-2">
          <View className="w-2.5 h-2.5 rounded-full bg-green-500 mt-1" />
          <Text className="text-xs text-slate-600 flex-1">{farmName} is healthy.</Text>
        </View>
      </View>
    );
  }
  const byZone = new Map<string, AdvisoryAlert[]>();
  for (const a of advisories) { if (!byZone.has(a.zoneName)) byZone.set(a.zoneName, []); byZone.get(a.zoneName)!.push(a); }
  const totalTrees = new Set(advisories.map((a) => a.treeNumber)).size;
  const countLabel = totalTrees === 1 ? `${totalTrees} Tree Needs Action` : `${totalTrees} Trees Need Action`;
  const iconFor = (type: string) => type === "soil" ? <Droplets size={13} color="#0284c7" /> : type === "temperature" ? <CloudSun size={13} color="#f97316" /> : <AlertTriangle size={13} color="#d97706" />;
  return (
    <View className="bg-white rounded-2xl p-4 border border-slate-100">
      <View className="flex-row items-center gap-2 mb-3">
        <View className="w-8 h-8 rounded-lg bg-amber-50 items-center justify-center"><Lightbulb size={16} color="#d97706" /></View>
        <Text className="text-sm font-bold text-slate-800 flex-1">Advisory</Text>
        <View className="flex-row items-center gap-1 bg-red-50 px-2 py-1 rounded-full">
          <AlertTriangle size={10} color="#dc2626" />
          <Text className="text-red-600 text-[10px] font-bold">{countLabel}</Text>
        </View>
      </View>
      <View className="gap-2.5">
        {[...byZone.entries()].map(([zoneName, zoneAlerts]) => (
          <View key={zoneName} className="rounded-xl bg-slate-50 border border-slate-100 p-3">
            <View className="flex-row items-center gap-1.5 mb-1.5">
              <View className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: zoneAlerts[0].zoneColor }} />
              <Text className="text-xs font-bold text-slate-700">{zoneName}:</Text>
              <Text className="text-[11px] text-slate-500">Tree {zoneAlerts.map((a) => `#${String(a.treeNumber).padStart(2, "0")}`).join(" & ")}</Text>
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

function ManageFarmsModal({ farms, onClose, onOpenFarm, onEditFarm, onAddFarm }: { farms: Farm[]; onClose: () => void; onOpenFarm: (id: string) => void; onEditFarm: (id: string) => void; onAddFarm: () => void; }) {
  const router = useRouter();
  const { user } = useYieldApp();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (farmId: string) => {
    if (!user) return;
    setDeleting(true);
    try { await deleteFarm(user.uid, farmId); } catch { } finally { setDeleting(false); setConfirmDelete(null); }
  };

  return (
    <View className="flex-1 bg-black/40 justify-end">
      <TouchableWithoutFeedback onPress={onClose}><View className="flex-1" /></TouchableWithoutFeedback>
      <View className="bg-slate-50 rounded-t-3xl max-h-[85%]">
        <View className="bg-white px-5 py-4 flex-row items-center justify-between border-b border-slate-100">
          <Text className="text-base font-bold text-slate-800">My Plantations</Text>
          <TouchableOpacity onPress={onClose} className="w-8 h-8 rounded-full items-center justify-center"><X size={18} color="#94a3b8" /></TouchableOpacity>
        </View>
        <ScrollView className="px-4 mt-4" contentContainerStyle={{ gap: 12, paddingBottom: 32 }}>
          <TouchableOpacity onPress={onAddFarm} className="flex-row items-center justify-center gap-2 bg-forest-600 py-3 rounded-xl">
            <Plus size={18} color="#fff" />
            <Text className="text-white font-semibold">Add New Farm</Text>
          </TouchableOpacity>
          {farms.length === 0 ? (
            <View className="items-center py-12"><Sprout size={28} color="#cbd5e1" /><Text className="text-sm text-slate-400 mt-2">No Farms Added</Text></View>
          ) : (
            farms.map((farm) => {
              const fd = buildFarmData(farm.perches, farm.totalTrees, farm.treeLayout, {});
              const { health, pct } = aggregateHealth(fd.trees);
              return (
                <View key={farm.id} className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
                  <TouchableOpacity onPress={() => router.push(`/yield/${farm.id}`)} className="p-4">
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 min-w-0">
                        <Text className="text-sm font-bold text-slate-800" numberOfLines={1}>{farm.name}</Text>
                        <View className="flex-row items-center gap-1 mt-0.5"><MapPin size={11} color="#94a3b8" /><Text className="text-xs text-slate-400" numberOfLines={1}>{farm.locationName || "Location Not Set"}</Text></View>
                      </View>
                      <View className="px-2 py-1 rounded-full" style={{ backgroundColor: `${healthColor(health)}20` }}>
                        <Text style={{ color: healthColor(health) }} className="text-[10px] font-bold">{health} - {Math.round(pct)}%</Text>
                      </View>
                    </View>
                    <View className="flex-row items-center gap-4 mt-2">
                      <View className="flex-row items-center gap-1"><TreePine size={12} color="#1e7550" /><Text className="text-xs text-slate-500">{farm.totalTrees} Trees</Text></View>
                      <View className="flex-row items-center gap-1"><Ruler size={12} color="#1e7550" /><Text className="text-xs text-slate-500">{farm.perches} Perches</Text></View>
                    </View>
                  </TouchableOpacity>
                  <View className="flex-row border-t border-slate-100">
                    <TouchableOpacity onPress={() => router.push(`/yield/${farm.id}`)} className="flex-1 py-2.5 flex-row items-center justify-center gap-1.5"><Pencil size={12} color="#64748b" /><Text className="text-xs font-semibold text-slate-500">Edit</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => setConfirmDelete(farm.id)} className="flex-1 py-2.5 flex-row items-center justify-center gap-1.5"><Trash2 size={12} color="#ef4444" /><Text className="text-xs font-semibold text-red-500">Delete</Text></TouchableOpacity>
                    <TouchableOpacity onPress={() => router.push(`/yield/${farm.id}`)} className="flex-1 py-2.5 flex-row items-center justify-center gap-1.5"><Text className="text-xs font-semibold text-forest-700">Open</Text><ArrowRight size={12} color="#1e7550" /></TouchableOpacity>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
        {confirmDelete && (
          <Modal visible transparent animationType="slide" onRequestClose={() => !deleting && setConfirmDelete(null)}>
            <View className="flex-1 justify-end bg-black/40">
              <TouchableWithoutFeedback onPress={() => !deleting && setConfirmDelete(null)}><View className="flex-1" /></TouchableWithoutFeedback>
              <View className="bg-white rounded-t-3xl p-6">
                <View className="flex-row items-center gap-3 mb-3">
                  <View className="w-10 h-10 rounded-full bg-red-50 items-center justify-center"><AlertTriangle size={20} color="#dc2626" /></View>
                  <Text className="text-base font-bold text-slate-800">Delete Farm</Text>
                </View>
                <Text className="text-sm text-slate-500 mb-5">Are you sure you want to delete this farm?</Text>
                <View className="flex-row gap-3">
                  <TouchableOpacity onPress={() => setConfirmDelete(null)} disabled={deleting} className="flex-1 py-3 rounded-xl items-center bg-slate-100"><Text className="text-sm font-semibold text-slate-600">Cancel</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => handleDelete(confirmDelete)} disabled={deleting} className="flex-1 py-3 rounded-xl items-center bg-red-600 flex-row justify-center gap-2">
                    {deleting ? <ActivityIndicator size="small" color="#fff" /> : <><Trash2 size={16} color="#fff" /><Text className="text-sm font-semibold text-white">Delete</Text></>}
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>
        )}
      </View>
    </View>
  );
}
