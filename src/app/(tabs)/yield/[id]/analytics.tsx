import { predictDashboardYield, logHarvestPrediction } from "@/services/yieldService";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform, TextInput, Image, Modal, Share } from "react-native";
import { ArrowLeft, ClipboardList, AlertCircle, Sprout, CheckCircle2, BarChart3, Clock, MessageSquare, Save, Calendar, Droplets, Trophy, Plus, Edit3, Share2, Download, ChevronRight } from "lucide-react-native";
import { YieldScreenHeader } from "@/components/yield/YieldScreenHeader";
import { useYieldApp } from "@/store/YieldAppContext";
import { getFarm, updateFarm, fetchHarvestLogs, saveHarvestLog, deleteHarvestLog } from "@/services/yieldFarmDb";
import Svg, { Polyline, Circle } from "react-native-svg";
import { LinearGradient } from "expo-linear-gradient";
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export default function analyticsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id: farmIdRaw } = useLocalSearchParams();
  const farmId = Array.isArray(farmIdRaw) ? farmIdRaw[0] : (farmIdRaw || null);
  const { user, setCurrentFarmId, currentFarmId } = useYieldApp();
  useEffect(() => {
    if (farmId && currentFarmId !== farmId) {
      setCurrentFarmId(farmId);
    }
  }, [farmId, currentFarmId, setCurrentFarmId]);

  const [loading, setLoading] = useState(true);
  const [farm, setFarm] = useState<any>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [pastLogs, setPastLogs] = useState<any[]>([]);
  const [refreshCount, setRefreshCount] = useState(0);

  // Form State for new Harvest Log
  const [actualNuts, setActualNuts] = useState("");
  const [largeNuts, setLargeNuts] = useState("");
  const [mediumNuts, setMediumNuts] = useState("");
  const [smallNuts, setSmallNuts] = useState("");
  const [savingLog, setSavingLog] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  
  const [pastNuts, setPastNuts] = useState("");
  const [isPastModalVisible, setIsPastModalVisible] = useState(false);
  const [pastMonth, setPastMonth] = useState(String(new Date().getMonth() + 1));
  const [pastYear, setPastYear] = useState(String(new Date().getFullYear()));

  const [isNoteModalVisible, setIsNoteModalVisible] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!farmId || farmId === "none") {
      setLoading(false);
      return;
    }
    const loadData = async () => {
      try {
        setLoading(true);
        // 1. Fetch Farm
        const f = await getFarm(user.uid, farmId);
        setFarm(f);

        if (f && (f as any).notes) {
          setNoteText((f as any).notes);
        }

        if (!f) {
          console.warn("Farm could not be loaded, skipping prediction.");
          setLoading(false);
          return;
        }

        // 2. Fetch past harvest logs via REST API
        const rawLogs = await fetchHarvestLogs(user.uid, farmId);
        const logs = rawLogs.map((l: any) => ({
          id: l.id,
          date: l.date || l.timestamp,
          actual_yield_nuts: l.nutCount || l.actual_yield_nuts || (l.gradeA || 0) + (l.gradeB || 0) + (l.gradeC || 0) || 0,
          large: l.large || l.gradeA || 0,
          medium: l.medium || l.gradeB || 0,
          small: l.small || l.gradeC || 0,
          predicted_yield_nuts: l.predicted_yield_nuts || 0 
        }));
        logs.sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setPastLogs(logs);

        // 3. Hit Proxy for ML Prediction
        const reqBody = {
          uid: user.uid,
          farm_id: (f as any)._id || f.id || farmId,
          estate: (f as any).estate || (f as any).district || f.locationName || (f as any).location || "Makandura",
          trees_count: f.totalTrees || (f as any).trees_count || (f as any).total_trees || 40,
          last_harvest_yield: f.lastHarvestYield || (f as any).last_harvest_yield || null,
          actual_harvest_logs: logs
        };

        const data = await predictDashboardYield(reqBody);

        if (data) {
          setPrediction(data);
        } else {
          Alert.alert("Error", "Failed to fetch prediction.");
        }
      } catch (err: any) {
        console.error("Prediction Error", err);
        Alert.alert("Error", "Failed to fetch prediction.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user, farmId, refreshCount]);

  const handleSaveLog = async () => {
    if (!actualNuts || !user || !farmId || !farm) return;
    setSavingLog(true);
    
    try {
      if (!editingLogId) {
        const payload = {
          farm_id: (farm as any)._id || farm.id || farmId,
          actual_yield_nuts: Number(actualNuts) || 0,
          large_nuts: Number(largeNuts) || 0,
          medium_nuts: Number(mediumNuts) || 0,
          small_nuts: Number(smallNuts) || 0,
          harvest_date: new Date().toISOString()
        };
        
        await logHarvestPrediction(payload).catch(err => console.warn("Predict API log save failed", err));
      }
      
      if (editingLogId) {
        await saveHarvestLog(user.uid, farmId, {
          nutCount: parseInt(actualNuts) || 0,
          large: parseInt(largeNuts) || 0,
          medium: parseInt(mediumNuts) || 0,
          small: parseInt(smallNuts) || 0,
        }, editingLogId);
        Alert.alert("Success", "Harvest log updated!");
      } else {
        await saveHarvestLog(user.uid, farmId, {
          date: new Date().toISOString(),
          nutCount: parseInt(actualNuts) || 0,
          large: parseInt(largeNuts) || 0,
          medium: parseInt(mediumNuts) || 0,
          small: parseInt(smallNuts) || 0,
          predicted_yield_nuts: prediction?.predicted_next_pick_yield_nuts || 0
        });
        Alert.alert("Success", "Harvest log saved and AI calibrated!");
      }

      setActualNuts("");
      setLargeNuts("");
      setMediumNuts("");
      setSmallNuts("");
      setEditingLogId(null);
      setIsEditModalVisible(false);
      setRefreshCount(prev => prev + 1);
    } catch (err: any) {
      console.warn("Failed saving harvest log", err);
      Alert.alert("Error", "Failed to save harvest log.");
    } finally {
      setSavingLog(false);
    }
  };

  const handleEditLog = (log: any) => {
    setEditingLogId(log.id);
    setActualNuts(String(log.actual_yield_nuts || log.nutCount || 0));
    setLargeNuts(String(log.large || 0));
    setMediumNuts(String(log.medium || 0));
    setSmallNuts(String(log.small || 0));
    setIsEditModalVisible(true);
  };

  const handleDeleteLog = (logId: string) => {
    Alert.alert(
      "Delete Log",
      "Are you sure you want to delete this harvest log?",
      [
        { text: "Cancel", style: "cancel" },
        { 
          text: "Delete", 
          style: "destructive",
          onPress: async () => {
            if (!user || !farmId) return;
            try {
              await deleteHarvestLog(user.uid, farmId, logId);
              Alert.alert("Success", "Harvest log deleted!");
              if (editingLogId === logId) {
                setEditingLogId(null);
                setActualNuts("");
                setLargeNuts("");
                setMediumNuts("");
                setSmallNuts("");
              }
              setRefreshCount(prev => prev + 1);
            } catch (err) {
              console.error(err);
              Alert.alert("Error", "Failed to delete log.");
            }
          }
        }
      ]
    );
  };

  const handleSavePastLog = async () => {
    if (!pastNuts || !user || !farmId || !pastMonth || !pastYear) return;
    setSavingLog(true);
    
    try {
      const formattedMonth = pastMonth.padStart(2, '0');
      const isoDate = `${pastYear}-${formattedMonth}-15T12:00:00.000Z`;
      
      await saveHarvestLog(user.uid, farmId, {
        date: isoDate,
        nutCount: parseInt(pastNuts) || 0,
        large: 0,
        medium: 0,
        small: 0,
        predicted_yield_nuts: 0
      });
      
      Alert.alert("Success", "Historical harvest log saved!");
      setPastNuts("");
      setIsPastModalVisible(false);
      setRefreshCount(prev => prev + 1);
    } catch (err: any) {
      console.warn("Failed saving past log", err);
      Alert.alert("Error", "Failed to save historical log.");
    } finally {
      setSavingLog(false);
    }
  };

  const handleSaveNote = async () => {
    if (!user || !farmId) return;
    setSavingNote(true);
    try {
      await updateFarm(user.uid, farmId, { notes: noteText } as any);
      Alert.alert("Success", "Note saved!");
      setIsNoteModalVisible(false);
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to save note.");
    } finally {
      setSavingNote(false);
    }
  };

  const handleExportPDF = async () => {
    if (!prediction || !farm) {
      Alert.alert("Error", "Missing data to generate report");
      return;
    }
    try {
      const html = `
        <html>
          <body style="font-family: Helvetica, sans-serif; padding: 40px; color: #333;">
            <h1 style="color: #065f46; border-bottom: 2px solid #065f46; padding-bottom: 10px;">Yield Analytics Report</h1>
            <h2>Farm: ${farm.name || "N/A"}</h2>
            <p><strong>Predicted Next Harvest:</strong> ${prediction.predicted_next_pick_yield_nuts || 0} Nuts</p>
            <p><strong>Predicted Annual Yield:</strong> ${prediction.predicted_annual_yield_nuts || 0} Nuts</p>
            <p><strong>Total Trees:</strong> ${farm.totalTrees || 0}</p>
            <p><strong>Notes:</strong> ${noteText || 'None'}</p>
            <br/>
            <p style="color: #666; font-size: 12px; margin-top: 40px;">Generated via CocoCast AI</p>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri);
      } else {
        Alert.alert("Error", "Sharing is not available on this device");
      }
    } catch (err) {
      console.error(err);
      Alert.alert("Error", "Failed to export PDF");
    }
  };


  if (loading) {
    return (
      <View className="flex-1 bg-slate-50">
        <YieldScreenHeader title="Yield Analytics" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#10b981" />
          <Text className="mt-4 text-slate-500 font-semibold text-sm tracking-wide">Analyzing farm data and weather patterns...</Text>
        </View>
      </View>
    );
  }

  if (!farmId || farmId === "none") {
    return (
      <View className="flex-1 bg-slate-50">
        <YieldScreenHeader title="Yield Analytics" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center px-6">
          <View className="w-16 h-16 rounded-2xl bg-slate-100 items-center justify-center mb-3">
            <AlertCircle size={28} color="#94a3b8" />
          </View>
          <Text className="text-sm font-semibold text-slate-600 text-center tracking-wide">No Farm Selected</Text>
          <Text className="text-xs text-slate-400 mt-1 mb-4 text-center tracking-wide">Please select a farm from the dashboard to view yield analytics.</Text>
          <TouchableOpacity onPress={() => router.back()} className="bg-emerald-600 py-3 px-6 rounded-xl">
            <Text className="text-white font-bold tracking-wide">Go to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (!prediction) {
    return (
      <View className="flex-1 bg-slate-50">
        <YieldScreenHeader title="Yield Analytics" onBack={() => router.back()} />
        <View className="flex-1 items-center justify-center px-6">
          <AlertCircle size={48} color="#94a3b8" />
          <Text className="mt-4 text-slate-500 font-semibold text-center text-sm tracking-wide">Failed to load prediction data. Please ensure the backend is running.</Text>
        </View>
      </View>
    );
  }

  // Calculate Next Harvest Date
  let nextDateFormatted = "Unknown";
  let daysRemaining = 45;
  let mostRecentHarvestDate = new Date();
  let hasHarvestData = false;

  if (farm?.lastHarvestDate) {
    const last = new Date(farm.lastHarvestDate);
    if (!isNaN(last.getTime())) {
      mostRecentHarvestDate = last;
      hasHarvestData = true;
    }
  }

  if (pastLogs.length > 0) {
    const latestLogDate = new Date(pastLogs[0].date);
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
    const diffTime = next.getTime() - now.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    nextDateFormatted = next.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } else {
    // Default current date + 45 days if no history
    const next = new Date();
    next.setDate(next.getDate() + 45);
    
    const now = new Date();
    const diffTime = next.getTime() - now.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    nextDateFormatted = next.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  const nextPickNuts = prediction.predicted_next_pick_yield_nuts || 0;
  const annualTotal = prediction.predicted_annual_yield_nuts || 0;
  
  // Nut Quality Calculation (from most recent log)
  let latestLog = pastLogs[0];
  let smallPct = 0;
  let medPct = 0;
  let largePct = 0;
  if (latestLog && latestLog.actual_yield_nuts > 0) {
    const total = latestLog.actual_yield_nuts;
    smallPct = Math.round((latestLog.small / total) * 100) || 0;
    medPct = Math.round((latestLog.medium / total) * 100) || 0;
    largePct = Math.round((latestLog.large / total) * 100) || 0;
  }

  // Progress Bar Width
  const progressPct = Math.max(0, Math.min(100, Math.round(((45 - daysRemaining) / 45) * 100)));

  // Dynamic Chart Logic
  const chartLogs = [...pastLogs].reverse().slice(-7); // Last 7 chronological
  const maxY = Math.max(500, ...(chartLogs.map(l => l.actual_yield_nuts || 0)));

  return (
    <View className="flex-1 bg-slate-50">
      <YieldScreenHeader title="Yield Analytics" subtitle={farm?.name} onBack={() => router.back()} />
      
      <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 60 }}>
        
        {/* Main Highlight Banner (Next Harvest Forecast) */}
        <View className="rounded-2xl shadow-lg border border-emerald-800 mb-4 overflow-hidden relative min-h-[170px] bg-emerald-900">
          <Image 
             source={{ uri: 'https://i.ibb.co/p65Q4LsL/yield-banner.png' }}
             style={{ position: 'absolute', width: '100%', height: '100%' }}
             resizeMode="cover"
          />
          {/* Dark gradient overlay */}
          <LinearGradient
            colors={['rgba(6, 78, 59, 0.35)', 'rgba(6, 78, 59, 0.8)']}
            style={{ position: 'absolute', width: '100%', height: '100%' }}
          />
          
          <View className="p-5">
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center gap-2">
                <Sprout size={18} color="#a7f3d0" />
                <Text className="text-emerald-200 font-bold text-sm tracking-widest uppercase">New Yield (Predicted)</Text>
              </View>
              <View className="bg-emerald-800/80 px-2 py-1 rounded border border-emerald-700/50">
                <Text className="text-white text-[10px] font-bold">▲ {prediction?.confidence_percentage ? prediction.confidence_percentage.toFixed(1) : '85.0'}% Confidence</Text>
              </View>
            </View>
            
            <View className="flex-row items-end gap-2 mb-6">
              <Text className="text-5xl font-extrabold text-white tracking-tight">{nextPickNuts.toLocaleString()}</Text>
              <Text className="text-emerald-200 font-semibold text-lg mb-1.5">Nuts</Text>
            </View>
            
            <View className="flex-row items-center justify-between border-t border-emerald-600/30 pt-4 mt-1">
              <View className="flex-1">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <Calendar size={12} color="#6ee7b7" />
                  <Text className="text-emerald-200 font-semibold text-[10px] uppercase tracking-wider">Expected Date</Text>
                </View>
                <Text className="text-white font-bold text-sm tracking-wide">{nextDateFormatted}</Text>
              </View>
              <View className="flex-1 items-end">
                <View className="flex-row items-center gap-1.5 mb-1">
                  <BarChart3 size={12} color="#6ee7b7" />
                  <Text className="text-emerald-200 font-semibold text-[10px] uppercase tracking-wider">Annual Yield</Text>
                </View>
                <Text className="text-white font-bold text-sm tracking-wide">{annualTotal.toLocaleString()} Nuts</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Harvest Countdown & Plucker Reminder */}
        <View className={`bg-white rounded-2xl p-5 border shadow-sm mb-4 ${daysRemaining <= 0 ? 'border-red-200 bg-red-50/30' : 'border-slate-200'}`}>
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-slate-800 font-bold text-sm tracking-wide">Harvest Countdown</Text>
            <Text className={`font-bold text-sm ${daysRemaining <= 0 ? 'text-red-600' : 'text-emerald-600'}`}>
              {daysRemaining > 0 ? `${daysRemaining} Days Left` : daysRemaining === 0 ? 'Due Today' : `Overdue by ${Math.abs(daysRemaining)} Days`}
            </Text>
          </View>
          
          <View className="w-full bg-slate-200 h-3 rounded-full my-3 overflow-hidden">
            <View className={`h-full rounded-full ${daysRemaining <= 0 ? 'bg-red-500' : 'bg-emerald-600'}`} style={{ width: `${progressPct}%` }} />
          </View>
          
            <TouchableOpacity 
              onPress={() => router.push(`/yield/${farmId}/trees`)} 
              className="bg-white rounded-xl border border-slate-200 p-4 mt-2 items-center justify-center flex-row gap-3 shadow-sm"
            >
              <Image source={{ uri: 'https://i.ibb.co/xKSGghy9/coconut-tree-3d.png' }} style={{ width: 28, height: 28, resizeMode: 'contain' }} />
              <Text className="text-sm font-bold text-slate-800 tracking-wide">Tree-wise Yield Prediction</Text>
            </TouchableOpacity>
        </View>

        {/* Region Benchmark Badge & Chart */}
        <View className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-5 mb-4 shadow-sm">
          <View className="flex-row items-start gap-4 mb-4">
            <View className="w-10 h-10 rounded-full bg-emerald-600 items-center justify-center shadow-sm">
              <Text className="text-xl">🏆</Text>
            </View>
            <View className="flex-1 pt-0.5">
              <Text className="text-sm font-semibold text-slate-700 leading-relaxed tracking-wide">
                Your farm's per-tree yield is{' '}
                {(() => {
                  const perTree = (prediction?.predicted_next_pick_yield_nuts || 0) / (farm?.totalTrees || 1);
                  const calibration = prediction?.calibration_factor || 1.0;
                  const diffPct = Math.round((calibration - 1) * 100);
                  const isAbove = diffPct >= 0;
                  return (
                    <Text className={`font-extrabold ${isAbove ? 'text-emerald-700' : 'text-red-600'}`}>
                      {isAbove ? '+' : ''}{diffPct}%
                    </Text>
                  );
                })()}{' '}
                {prediction?.calibration_factor && prediction.calibration_factor !== 1.0 ? 'vs initial estimate' : 'on track'} for {prediction?.mapped_benchmark_estate || prediction?.district || farm?.locationName || 'your region'}.
              </Text>
            </View>
          </View>
          
          <View className="flex-row items-center justify-between">
             {/* Real Harvest Chart (SVG) */}
             <View className="flex-1 mr-4" style={{ height: 45 }}>
               {(() => {
                 const svgLogs = [...pastLogs].filter(l => l.id !== 'virtual_initial').reverse().slice(-6);
                 const predictedNext = prediction?.predicted_next_pick_yield_nuts || 0;
                 const allPoints = [...svgLogs.map(l => l.actual_yield_nuts || 0), predictedNext];
                 const maxVal = Math.max(...allPoints, 1);
                 const W = 200, H = 45, pad = 5;
                 const toY = (v: number) => H - pad - ((v / maxVal) * (H - 2 * pad));
                 const n = allPoints.length;
                 const xs = allPoints.map((_, i) => Math.round((i / Math.max(n - 1, 1)) * W));
                 const farmPts = allPoints.map((v, i) => xs[i] + ',' + toY(v).toFixed(1)).join(' ');
                 // Average line: flat at predicted_monthly_yield converted to 45-day scale
                 const avgVal = prediction?.predicted_monthly_yield ? prediction.predicted_monthly_yield * 1.5 : maxVal * 0.7;
                 const avgY = toY(avgVal).toFixed(1);
                 const avgPts = [0, W].map(x => x + ',' + avgY).join(' ');
                 return (
                   <Svg width="100%" height="100%" viewBox={"0 0 " + W + " " + H}>
                     {/* Average line (grey) */}
                     <Polyline points={avgPts} fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeDasharray="4 3" />
                     {/* Your Farm actual line (green) */}
                     {allPoints.length > 1 && <Polyline points={farmPts} fill="none" stroke="#059669" strokeWidth="2.5" />}
                     {allPoints.map((v, i) => (
                       <Circle key={i} cx={xs[i]} cy={toY(v)} r="3.5"
                         fill={i === allPoints.length - 1 ? "#f59e0b" : "#059669"} />
                     ))}
                   </Svg>
                 );
               })()}
             </View>
             
             {/* Legend */}
             <View className="justify-center">
                <View className="flex-row items-center gap-1.5 mb-2">
                  <View className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <Text className="text-[10px] font-bold text-slate-600">Your Farm</Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <View className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  <Text className="text-[10px] font-bold text-slate-500">Average in {prediction?.mapped_benchmark_estate || farm?.locationName || "Region"}</Text>
                </View>
             </View>
          </View>
        </View>

        
        {/* Yield Summary */}
        <View className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-4">
          <View className="flex-row items-center gap-2 mb-4">
            <BarChart3 size={16} color="#0f172a" />
            <Text className="text-sm font-bold text-slate-800 tracking-wide">Yield Summary</Text>
          </View>
          <View className="gap-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-emerald-50 items-center justify-center">
                  <Image source={{ uri: 'https://i.ibb.co/gbSQjznt/coconut-fruit.png' }} style={{width: 24, height: 24}} resizeMode="contain" />
                </View>
                <Text className="text-xs text-slate-500 font-semibold tracking-wide">Predicted Yield</Text>
              </View>
              <Text className="text-sm font-bold text-slate-800">{nextPickNuts} Nuts</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-emerald-50 items-center justify-center">
                  <Image source={{ uri: 'https://i.ibb.co/hR8NHX1c/coconut-tree.png' }} style={{width: 24, height: 24}} resizeMode="contain" />
                </View>
                <Text className="text-xs text-slate-500 font-semibold tracking-wide">Total Trees</Text>
              </View>
              <Text className="text-sm font-bold text-slate-800">{farm?.totalTrees || 0} Trees</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-emerald-50 items-center justify-center">
                  <Image source={{ uri: 'https://i.ibb.co/HTMzGrqF/coconut.png' }} style={{width: 24, height: 24}} resizeMode="contain" />
                </View>
                <Text className="text-xs text-slate-500 font-semibold tracking-wide">Average per Tree</Text>
              </View>
              <Text className="text-sm font-bold text-slate-800">{(nextPickNuts / (farm?.totalTrees || 1)).toFixed(2)} Nuts</Text>
            </View>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-3">
                <View className="w-10 h-10 rounded-full bg-emerald-50 items-center justify-center">
                  <Image source={{ uri: 'https://i.ibb.co/nqg19nYx/rupee.png' }} style={{width: 24, height: 24}} resizeMode="contain" />
                </View>
                <Text className="text-xs text-slate-500 font-semibold tracking-wide">Annual Yield (Est.)</Text>
              </View>
              <Text className="text-sm font-bold text-slate-800">{annualTotal.toLocaleString()} Nuts</Text>
            </View>
            <View className="flex-row items-center justify-between mt-2 pt-3 border-t border-slate-100">
              <View className="flex-row items-center gap-2">
                <Clock size={14} color="#94a3b8" />
                <Text className="text-[10px] text-slate-400 font-semibold tracking-wide">Last Updated</Text>
              </View>
              <Text className="text-[10px] font-bold text-slate-400">{new Date().toLocaleString('en-US', {month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric'})}</Text>
            </View>
          </View>
        </View>


        {/* Manage Logs CTA */}
        <TouchableOpacity onPress={() => router.push(`/yield/${farmId}/logs`)} className="bg-forest-800 rounded-2xl p-5 flex-row items-center justify-between mb-4 shadow-sm">
          <View className="flex-row items-center gap-4">
            <View className="w-12 h-12 rounded-full bg-white/10 items-center justify-center">
              <ClipboardList size={24} color="#fff" />
            </View>
            <View>
              <Text className="text-white font-bold text-base tracking-wide">Manage Harvest Logs</Text>
              <Text className="text-emerald-100 text-xs mt-0.5">Add or edit past harvest data</Text>
            </View>
          </View>
          <ChevronRight size={24} color="#fff" />
        </TouchableOpacity>
        
        {/* Add Past Data Modal (Removed) */}
  
      </ScrollView>
    </View>
  );
}
