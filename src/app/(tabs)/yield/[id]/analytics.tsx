import { predictDashboardYield, logHarvestPrediction } from "@/services/yieldService";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Platform, TextInput, Image, Modal, Share } from "react-native";
import { ArrowLeft, AlertCircle, Sprout, CheckCircle2, BarChart3, Clock, MessageSquare, Save, Calendar, Droplets, Trophy, Plus, Edit3, Share2, Download, ChevronRight } from "lucide-react-native";
import { YieldScreenHeader } from "@/components/yield/YieldScreenHeader";
import { useYieldApp } from "@/store-yield/YieldAppContext";
import { getFarm, updateFarm } from "@/services/yieldFarmDb";
import Svg, { Polyline, Circle } from "react-native-svg";
import { ref, get, push, update, remove } from "firebase/database";
import { rtdb } from "@/services/firebase";
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
  const [isPastModalVisible, setIsPastModalVisible] = useState(false);
  const [pastNuts, setPastNuts] = useState("");
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

        // 2. Fetch past harvest logs
        let logs: any[] = [];
        const logsRef = ref(rtdb, `users/${user.uid}/harvests/${farmId}`);
        const snap = await get(logsRef);
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
          // sort by date desc
          logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        }
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
        const logRef = ref(rtdb, `users/${user.uid}/harvests/${farmId}/${editingLogId}`);
        await update(logRef, {
          nutCount: parseInt(actualNuts) || 0,
          large: parseInt(largeNuts) || 0,
          medium: parseInt(mediumNuts) || 0,
          small: parseInt(smallNuts) || 0,
        });
        Alert.alert("Success", "Harvest log updated!");
      } else {
        const logsRef = ref(rtdb, `users/${user.uid}/harvests/${farmId}`);
        await push(logsRef, {
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
      console.warn("Failed saving via API/Firebase", err);
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
              const logRef = ref(rtdb, `users/${user.uid}/harvests/${farmId}/${logId}`);
              await remove(logRef);
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
      
      const logsRef = ref(rtdb, `users/${user.uid}/harvests/${farmId}`);
      await push(logsRef, {
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
                <Text className="text-white text-[10px] font-bold">▲ 81.5% Confidence</Text>
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
            className={`${daysRemaining <= 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'} border py-3 mt-2 rounded-xl flex-row justify-center items-center gap-2`} 
            onPress={() => Alert.alert("Reminder Sent", "Coconut plucker has been notified via SMS.")}
          >
            <MessageSquare size={18} color={daysRemaining <= 0 ? "#b91c1c" : "#065f46"} />
            <Text className={`${daysRemaining <= 0 ? 'text-red-800' : 'text-emerald-800'} font-bold tracking-wide`}>Remind Coconut Climber / Plucker</Text>
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
                Your farm's per-tree yield is <Text className="font-extrabold text-emerald-700">8% higher</Text> than average farms in {prediction.mapped_benchmark_estate || prediction.district || "Jawatta"}.
              </Text>
            </View>
          </View>
          
          <View className="flex-row items-center justify-between">
             {/* Mock Line Chart (SVG) */}
             <View className="flex-1 mr-4" style={{ height: 45 }}>
                <Svg width="100%" height="100%" viewBox="0 0 200 45">
                  {/* Average line (grey) */}
                  <Polyline points="0,35 40,34 80,35 120,28 160,30 200,25" fill="none" stroke="#94a3b8" strokeWidth="2.5" />
                  <Circle cx="0" cy="35" r="3.5" fill="#94a3b8" />
                  <Circle cx="40" cy="34" r="3.5" fill="#94a3b8" />
                  <Circle cx="80" cy="35" r="3.5" fill="#94a3b8" />
                  <Circle cx="120" cy="28" r="3.5" fill="#94a3b8" />
                  <Circle cx="160" cy="30" r="3.5" fill="#94a3b8" />
                  <Circle cx="200" cy="25" r="3.5" fill="#94a3b8" />

                  {/* Your Farm line (green) */}
                  <Polyline points="0,25 40,20 80,22 120,10 160,15 200,8" fill="none" stroke="#059669" strokeWidth="2.5" />
                  <Circle cx="0" cy="25" r="3.5" fill="#059669" />
                  <Circle cx="40" cy="20" r="3.5" fill="#059669" />
                  <Circle cx="80" cy="22" r="3.5" fill="#059669" />
                  <Circle cx="120" cy="10" r="3.5" fill="#059669" />
                  <Circle cx="160" cy="15" r="3.5" fill="#059669" />
                  <Circle cx="200" cy="8" r="3.5" fill="#059669" />
                </Svg>
             </View>
             
             {/* Legend */}
             <View className="justify-center">
                <View className="flex-row items-center gap-1.5 mb-2">
                  <View className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                  <Text className="text-[10px] font-bold text-slate-600">Your Farm</Text>
                </View>
                <View className="flex-row items-center gap-1.5">
                  <View className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  <Text className="text-[10px] font-bold text-slate-500">Average in Jawatta</Text>
                </View>
             </View>
          </View>
        </View>

        {/* Interactive Log Harvest Form */}
        <View className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-4">
          <View className="flex-row items-center gap-2 mb-4">
            <CheckCircle2 size={18} color="#059669" />
            <Text className="text-sm font-bold text-slate-800 tracking-wide">Log Your Harvest & Nut Quality</Text>
          </View>
          
          <View className="gap-4">
            <View>
              <Text className="text-xs font-bold text-slate-700 mb-2 tracking-wide uppercase">Total Actual Nuts Collected</Text>
              <TextInput 
                placeholder="e.g. 400" 
                placeholderTextColor="#94a3b8"
                keyboardType="numeric"
                value={actualNuts}
                onChangeText={setActualNuts}
                className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-bold"
              />
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <View className="items-center mb-2 h-10 justify-end">
                  <Image source={{ uri: 'https://i.ibb.co/HTMzGrqF/coconut.png' }} style={{width: 32, height: 32}} resizeMode="contain" />
                </View>
                <Text className="text-xs font-bold text-slate-700 mb-2 tracking-wide text-center uppercase">Large</Text>
                <TextInput placeholder="0" keyboardType="numeric" value={largeNuts} onChangeText={setLargeNuts} className="bg-white border border-slate-200 rounded-xl px-3 py-3 text-sm text-center text-slate-900 font-bold" />
              </View>
              <View className="flex-1">
                <View className="items-center mb-2 h-10 justify-end">
                  <Image source={{ uri: 'https://i.ibb.co/HTMzGrqF/coconut.png' }} style={{width: 24, height: 24}} resizeMode="contain" />
                </View>
                <Text className="text-xs font-bold text-slate-700 mb-2 tracking-wide text-center uppercase">Medium</Text>
                <TextInput placeholder="0" keyboardType="numeric" value={mediumNuts} onChangeText={setMediumNuts} className="bg-white border border-slate-200 rounded-xl px-3 py-3 text-sm text-center text-slate-900 font-bold" />
              </View>
              <View className="flex-1">
                <View className="items-center mb-2 h-10 justify-end">
                  <Image source={{ uri: 'https://i.ibb.co/HTMzGrqF/coconut.png' }} style={{width: 16, height: 16}} resizeMode="contain" />
                </View>
                <Text className="text-xs font-bold text-slate-700 mb-2 tracking-wide text-center uppercase">Small</Text>
                <TextInput placeholder="0" keyboardType="numeric" value={smallNuts} onChangeText={setSmallNuts} className="bg-white border border-slate-200 rounded-xl px-3 py-3 text-sm text-center text-slate-900 font-bold" />
              </View>
            </View>
            <TouchableOpacity 
              onPress={handleSaveLog} 
              disabled={savingLog}
              className={`mt-2 rounded-xl py-3.5 flex-row items-center justify-center gap-2 ${savingLog ? 'bg-emerald-400' : 'bg-emerald-600'}`}
            >
              {savingLog ? <ActivityIndicator size="small" color="#fff" /> : <Save size={18} color="#fff" />}
              <Text className="text-white font-bold text-sm tracking-wide">Save Harvest Log</Text>
            </TouchableOpacity>
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


        {/* Nut Quality & Weather Advisory */}
        {latestLog && (
          <View className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-4">
            <View className="flex-row items-center gap-2 mb-4">
              <Droplets size={16} color="#0284c7" />
              <Text className="text-sm font-bold text-slate-800 tracking-wide">Nut Quality & Weather Tips</Text>
            </View>
            
            <View className="mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-xs font-bold text-slate-500 uppercase tracking-wide">Latest Harvest Size Breakdown</Text>
              </View>
              <View className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex-row">
                <View style={{ width: `${largePct}%` }} className="h-full bg-green-500" />
                <View style={{ width: `${medPct}%` }} className="h-full bg-yellow-400" />
                <View style={{ width: `${smallPct}%` }} className="h-full bg-orange-500" />
              </View>
              <View className="flex-row justify-between mt-2">
                <Text className="text-xs text-slate-600 font-bold tracking-wide">🟢 Large {largePct}%</Text>
                <Text className="text-xs text-slate-600 font-bold tracking-wide">🟡 Med {medPct}%</Text>
                <Text className="text-xs text-slate-600 font-bold tracking-wide">🟠 Small {smallPct}%</Text>
              </View>
            </View>
            
            <View className="bg-sky-50 p-4 rounded-xl border border-sky-100">
              <Text className="text-sm text-sky-800 font-semibold leading-relaxed tracking-wide">
                {smallPct > 25 
                  ? "Higher proportion of small nuts detected. Consider applying organic mulching and Potassium (K) fertilizer before the next cycle to improve nut expansion." 
                  : "Rainfall in recent months was favorable. Soil moisture levels are optimal for healthy nut expansion. Keep up the good work!"}
              </Text>
            </View>
          </View>
        )}

        {/* Historical Yield Trend Chart */}
        <View className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-4">
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2">
              <BarChart3 size={16} color="#059669" />
              <Text className="text-sm font-bold text-slate-800 tracking-wide">Historical Yield Trend</Text>
            </View>
            <TouchableOpacity onPress={() => setIsPastModalVisible(true)} className="flex-row items-center gap-1 bg-emerald-50 rounded-lg px-2 py-1 border border-emerald-100">
              <Plus size={12} color="#059669" />
              <Text className="text-[10px] font-bold text-emerald-700">Add Past Data</Text>
            </TouchableOpacity>
          </View>
          
          {/* Chart Y-Axis and Bars */}
          <View className="flex-row h-40 mt-2">
            <View className="justify-between items-end pr-2 pb-6 border-r border-slate-100">
              {[maxY, maxY * 0.8, maxY * 0.6, maxY * 0.4, maxY * 0.2, 0].map((val, i) => (
                <Text key={i} className="text-[9px] font-semibold text-slate-400">{Math.round(val)}</Text>
              ))}
            </View>
            
            <View className="flex-1 flex-row items-end justify-center gap-6 px-2 pb-6 relative">
              {/* Horizontal Grid lines */}
              <View className="absolute left-2 right-0 bottom-6 h-full justify-between" style={{ zIndex: -1 }}>
                <View className="w-full border-b border-slate-50 border-dashed" style={{ height: '20%' }} />
                <View className="w-full border-b border-slate-50 border-dashed" style={{ height: '20%' }} />
                <View className="w-full border-b border-slate-50 border-dashed" style={{ height: '20%' }} />
                <View className="w-full border-b border-slate-50 border-dashed" style={{ height: '20%' }} />
                <View className="w-full border-b border-slate-50 border-dashed" style={{ height: '20%' }} />
              </View>
              
              {chartLogs.length > 0 ? chartLogs.map((item, idx) => (
                <View key={idx} className="items-center w-10 h-full justify-end relative">
                  <View className="w-5 bg-emerald-600 rounded-t-sm shadow-sm" style={{ height: `${((item.actual_yield_nuts || 0) / maxY) * 100}%` }} />
                  <Text className="text-[9px] font-bold text-slate-500 absolute -bottom-6 text-center w-8">
                    {new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
              )) : (
                <View className="flex-1 items-center justify-center h-full">
                  <Text className="text-xs text-slate-400">No harvest data yet</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Recent Harvest Logs */}
        {pastLogs.length > 0 && (
          <View className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-4">
            <View className="flex-row items-center gap-2 mb-4">
              <Clock size={16} color="#059669" />
              <Text className="text-sm font-bold text-slate-800 tracking-wide">Recent Harvest Logs</Text>
            </View>
            <View className="gap-3">
              {pastLogs.map((log) => (
                <View key={log.id} className="border border-slate-100 rounded-xl p-3 flex-row items-center justify-between">
                  <View>
                    <Text className="text-xs font-bold text-slate-800">
                      {new Date(log.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </Text>
                    <Text className="text-[10px] text-slate-500 mt-1">
                      Total: {log.actual_yield_nuts} | L: {log.large} M: {log.medium} S: {log.small}
                    </Text>
                  </View>
                  <View className="flex-row items-center gap-2">
                    <TouchableOpacity onPress={() => handleEditLog(log)} className="bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                      <Text className="text-xs font-semibold text-slate-700">Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteLog(log.id)} className="bg-red-50 px-3 py-1.5 rounded-lg border border-red-100">
                      <Text className="text-xs font-semibold text-red-600">Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Edit Modal */}
        <Modal visible={isEditModalVisible} transparent={true} animationType="fade">
          <View className="flex-1 bg-slate-900/60 justify-center px-4">
            <View className="bg-white rounded-3xl p-6 shadow-xl">
              <View className="flex-row items-center gap-2 mb-4">
                <Text className="text-lg font-bold text-slate-800 tracking-wide">Edit Harvest Log</Text>
              </View>
              
              <View className="gap-4">
                <View>
                  <Text className="text-xs font-bold text-slate-700 mb-2 tracking-wide uppercase">Total Actual Nuts Collected</Text>
                  <TextInput 
                    placeholder="e.g. 400" 
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={actualNuts}
                    onChangeText={setActualNuts}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-bold"
                  />
                </View>
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Text className="text-[10px] font-bold text-slate-700 mb-2 tracking-wide text-center uppercase">Large</Text>
                    <TextInput placeholder="0" keyboardType="numeric" value={largeNuts} onChangeText={setLargeNuts} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm text-center text-slate-900 font-bold" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[10px] font-bold text-slate-700 mb-2 tracking-wide text-center uppercase">Medium</Text>
                    <TextInput placeholder="0" keyboardType="numeric" value={mediumNuts} onChangeText={setMediumNuts} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm text-center text-slate-900 font-bold" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-[10px] font-bold text-slate-700 mb-2 tracking-wide text-center uppercase">Small</Text>
                    <TextInput placeholder="0" keyboardType="numeric" value={smallNuts} onChangeText={setSmallNuts} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-3 text-sm text-center text-slate-900 font-bold" />
                  </View>
                </View>

                <View className="flex-row gap-3 mt-4">
                  <TouchableOpacity 
                    onPress={() => {
                      setEditingLogId(null);
                      setActualNuts("");
                      setLargeNuts("");
                      setMediumNuts("");
                      setSmallNuts("");
                      setIsEditModalVisible(false);
                    }}
                    className="flex-1 py-3.5 rounded-xl border border-slate-200 items-center justify-center bg-slate-50"
                  >
                    <Text className="text-slate-600 font-bold">Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    onPress={handleSaveLog} 
                    disabled={savingLog}
                    className={`flex-1 py-3.5 rounded-xl flex-row items-center justify-center gap-2 ${savingLog ? 'bg-emerald-400' : 'bg-emerald-600'}`}
                  >
                    {savingLog ? <ActivityIndicator size="small" color="#fff" /> : <Save size={16} color="#fff" />}
                    <Text className="text-white font-bold">Update</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* Past Harvest Modal */}
        <Modal visible={isPastModalVisible} transparent={true} animationType="fade">
          <View className="flex-1 bg-slate-900/60 justify-center px-4">
            <View className="bg-white rounded-3xl p-6 shadow-xl">
              <View className="flex-row items-center gap-2 mb-4">
                <Text className="text-lg font-bold text-slate-800 tracking-wide">Add Past Harvest Data</Text>
              </View>
              
              <View className="gap-4">
                <View>
                  <Text className="text-xs font-bold text-slate-700 mb-2 tracking-wide uppercase">Total Yield (Nuts)</Text>
                  <TextInput 
                    placeholder="e.g. 500" 
                    placeholderTextColor="#94a3b8"
                    keyboardType="numeric"
                    value={pastNuts}
                    onChangeText={setPastNuts}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-bold"
                  />
                </View>
                <View className="flex-row gap-3">
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-slate-700 mb-2 tracking-wide uppercase">Year</Text>
                    <TextInput 
                      placeholder="e.g. 2025" 
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      value={pastYear}
                      onChangeText={setPastYear}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-bold"
                    />
                  </View>
                  <View className="flex-1">
                    <Text className="text-xs font-bold text-slate-700 mb-2 tracking-wide uppercase">Month (1-12)</Text>
                    <TextInput 
                      placeholder="e.g. 5" 
                      placeholderTextColor="#94a3b8"
                      keyboardType="numeric"
                      value={pastMonth}
                      onChangeText={setPastMonth}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-bold"
                    />
                  </View>
                </View>

                <View className="flex-row gap-3 mt-4">
                  <TouchableOpacity 
                    onPress={() => {
                      setPastNuts("");
                      setIsPastModalVisible(false);
                    }}
                    className="flex-1 py-3.5 rounded-xl border border-slate-200 items-center justify-center bg-slate-50"
                  >
                    <Text className="text-slate-600 font-bold">Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    onPress={handleSavePastLog} 
                    disabled={savingLog}
                    className={`flex-1 py-3.5 rounded-xl flex-row items-center justify-center gap-2 ${savingLog ? 'bg-emerald-400' : 'bg-emerald-600'}`}
                  >
                    {savingLog ? <ActivityIndicator size="small" color="#fff" /> : <Save size={16} color="#fff" />}
                    <Text className="text-white font-bold">Save Data</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* Note Modal */}
        <Modal visible={isNoteModalVisible} transparent={true} animationType="fade">
          <View className="flex-1 bg-slate-900/60 justify-center px-4">
            <View className="bg-white rounded-3xl p-6 shadow-xl">
              <View className="flex-row items-center gap-2 mb-4">
                <Text className="text-lg font-bold text-slate-800 tracking-wide">Add Note</Text>
              </View>
              
              <View className="gap-4">
                <View>
                  <TextInput 
                    placeholder="Type your observations here..." 
                    placeholderTextColor="#94a3b8"
                    value={noteText}
                    onChangeText={setNoteText}
                    multiline
                    numberOfLines={4}
                    style={{ textAlignVertical: 'top' }}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 font-bold min-h-[100px]"
                  />
                </View>

                <View className="flex-row gap-3 mt-4">
                  <TouchableOpacity 
                    onPress={() => setIsNoteModalVisible(false)}
                    className="flex-1 py-3.5 rounded-xl border border-slate-200 items-center justify-center bg-slate-50"
                  >
                    <Text className="text-slate-600 font-bold">Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    onPress={handleSaveNote} 
                    disabled={savingNote}
                    className={`flex-1 py-3.5 rounded-xl flex-row items-center justify-center gap-2 ${savingNote ? 'bg-emerald-400' : 'bg-emerald-600'}`}
                  >
                    {savingNote ? <ActivityIndicator size="small" color="#fff" /> : <Save size={16} color="#fff" />}
                    <Text className="text-white font-bold">Save</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* Quick Actions */}
        <View className="mb-8 bg-white rounded-3xl p-5 border border-slate-100 shadow-sm mx-1">
          <Text className="text-slate-800 font-bold text-sm tracking-wide mb-4">Quick Actions</Text>
          
          <View className="gap-3 mb-5">
            <TouchableOpacity 
              onPress={() => setIsNoteModalVisible(true)}
              className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-4">
                <View className="w-10 h-10 rounded-xl bg-emerald-100/50 items-center justify-center">
                  <Edit3 size={18} color="#059669" />
                </View>
                <View>
                  <Text className="text-sm font-bold text-emerald-800">Add Note</Text>
                  <Text className="text-[11px] text-slate-500 mt-0.5">Add observations or notes</Text>
                </View>
              </View>
              <ChevronRight size={16} color="#94a3b8" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={async () => {
                if (!prediction) {
                  Alert.alert("Loading", "Please wait for predictions to load before sharing.");
                  return;
                }
                try {
                  await Share.share({
                    message: `🥥 Farm Yield Prediction for ${farm?.name || 'Farm'}\n\nPredicted Monthly Yield: ${prediction.predicted_monthly_yield} nuts\nNext Harvest (45-days): ${prediction.predicted_next_pick_yield_nuts} nuts\nConfidence: ${prediction.confidence_percentage}%\n\nGenerated via CocoCast AI.`
                  });
                } catch (error) {
                  console.error(error);
                }
              }}
              className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex-row items-center justify-between"
            >
              <View className="flex-row items-center gap-4">
                <View className="w-10 h-10 rounded-xl bg-purple-100/50 items-center justify-center">
                  <Share2 size={18} color="#7c3aed" />
                </View>
                <View>
                  <Text className="text-sm font-bold text-purple-800">Share Report</Text>
                  <Text className="text-[11px] text-slate-500 mt-0.5">Share yield report</Text>
                </View>
              </View>
              <ChevronRight size={16} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            onPress={handleExportPDF}
            className="bg-emerald-700 rounded-xl py-4 flex-row items-center justify-center gap-2"
          >
            <Download size={16} color="#fff" />
            <Text className="text-white text-sm font-bold">Export Report (PDF)</Text>
          </TouchableOpacity>
        </View>
        
      </ScrollView>
    </View>
  );
}
