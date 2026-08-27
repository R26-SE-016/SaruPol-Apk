import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, TextInput, Alert, Image } from "react-native";
import { ArrowLeft, Save, AlertTriangle, Thermometer, Droplets, FlaskConical, Info, FileDown, Search, CheckCircle2, XCircle, Zap, Edit3, MoreVertical, ChevronDown, Share2, MapPin, Clock, RefreshCw } from "lucide-react-native";
import { useState, useEffect } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useYieldApp } from "@/store/YieldAppContext";
import { statusColor, healthColor, statusLabel } from "@/utils/yieldTreeFactory";
import { getFarm, updateTreeData } from "@/services/yieldFarmDb";
import { fetchTreeData, saveTreeHistory, updateTreeHistoryRecord } from "@/services/treeService";
import type { TreeStatus, TreeHealth, YieldRecord, Tree } from "@/types/yield";
import { Plus, Trash2, Calendar } from "lucide-react-native";
import api from "@/services/api";

const calculateTreeHealth = (diseaseVal: string, sensorInput: any) => {
  if (diseaseVal && diseaseVal.trim().length > 0) return { status: "Diseased", health: "Need Attention" };
  
  if (sensorInput) {
    const { n, p, k, ph, soilMoisture } = sensorInput;
    if (ph < 5.5 || ph > 7.5 || soilMoisture < 20 || n < 10 || p < 5 || k < 15) {
      return { status: "Bearing", health: "Need Attention" };
    }
  }
  
  return { status: "Bearing", health: "Healthy" };
};

export default function SingleTreeScreen() {
  const { user, farms } = useYieldApp();
  const params = useLocalSearchParams();
  const idRaw = params.id;
  const farmId = Array.isArray(idRaw) ? idRaw[0] : (idRaw || "");
  const treeIdRaw = params.treeId;
  const treeId = Array.isArray(treeIdRaw) ? treeIdRaw[0] : (treeIdRaw || "");
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [treeData, setTreeData] = useState<any>(null);
  const [currentPrediction, setCurrentPrediction] = useState<any>(null);
  const [iotLive, setIotLive] = useState(false);

  // Reset prediction state when switching trees
  useEffect(() => {
    setCurrentPrediction(null);
  }, [treeId]);

  // Is this prediction an old history record we are just viewing?
  const isViewingHistory = currentPrediction && treeData?.history && treeData.history[currentPrediction.id];

  // Manual Sensor Input State (defaults, will be overridden from database)
  const [manualN, setManualN] = useState("45");
  const [manualP, setManualP] = useState("20");
  const [manualK, setManualK] = useState("60");
  const [manualPh, setManualPh] = useState("6.2");
  const [manualMoisture, setManualMoisture] = useState("45");
  const [sensorEditMode, setSensorEditMode] = useState(false);

  // Post-harvest update inputs
  const [actualYield, setActualYield] = useState("");
  const [disease, setDisease] = useState("");
  const [isUpdatingActual, setIsUpdatingActual] = useState(false);

  // Biological Inputs
  const [variety, setVariety] = useState("Sri Lanka Tall");
  const [ageRange, setAgeRange] = useState("15 - 45");
  const [frondCount, setFrondCount] = useState(32);
  const [showVariety, setShowVariety] = useState(false);
  const [showAge, setShowAge] = useState(false);
  const [showFrondInfo, setShowFrondInfo] = useState(false);

  const varietyDetails: Record<string, { desc: string, points: string[] }> = {
    "Sri Lanka Tall": {
      desc: "Traditional Tall Variety (Sri Lanka Tall)",
      points: [
        "Grows very tall with a long lifespan.",
        "Takes 6–7 years to bear fruit.",
        "Commonly found in traditional village estates (85%+ of plantations)."
      ]
    },
    "Hybrid": {
      desc: "Hybrid Variety (CRI High-Yield)",
      points: [
        "Certified plants from CRI or authorized nurseries.",
        "Bears fruit very quickly (within 3–4 years).",
        "Produces a large number of nuts per bunch (20+ nuts)."
      ]
    },
    "Dwarf": {
      desc: "Short Variety (Dwarf / Kundira)",
      points: [
        "Very short palms (harvestable from the ground).",
        "Includes Red Dwarf, Yellow Dwarf, and King Coconut variants.",
        "Produces smaller sized nuts."
      ]
    }
  };

  const ageDetails: Record<string, string> = {
    "< 7": "Young / Early Stage",
    "7 - 14": "Young / Early Stage",
    "15 - 45": "Peak Bearing Age",
    "46 - 60": "Moderate Old Age",
    "> 60": "Extremely Old"
  };

  // Manual Tree Details
  const [treeObj, setTreeObj] = useState<Tree | null>(null);
  const [status, setStatus] = useState<TreeStatus>("Bearing");
  const [health, setHealth] = useState<TreeHealth>("Good");
  const [notes, setNotes] = useState("");
  const [yieldHistory, setYieldHistory] = useState<YieldRecord[]>([]);
  const [newMonth, setNewMonth] = useState("");
  const [newNuts, setNewNuts] = useState("");

  const [syncingIoT, setSyncingIoT] = useState(false);
  const fetchRealtimeIoTData = () => {
    setSyncingIoT(true);
    // Simulate DB fetch delay for IoT device
    setTimeout(() => {
      setManualN(String(Math.floor(Math.random() * (60 - 30) + 30)));
      setManualP(String(Math.floor(Math.random() * (40 - 15) + 15)));
      setManualK(String(Math.floor(Math.random() * (80 - 40) + 40)));
      setManualPh((Math.random() * (7.5 - 5.5) + 5.5).toFixed(1));
      setManualMoisture(String(Math.floor(Math.random() * (70 - 30) + 30)));
      setSyncingIoT(false);
    }, 1200);
  };

  useEffect(() => {
    loadTreeData();
  }, [treeId, user?.uid]);

  const loadTreeData = async () => {
    if (!user) return;
    try {
      let tData: any = await fetchTreeData(user.uid, farmId, treeId);
      if (!tData) {
        tData = { id: treeId, latest: null, history: {} };
      }
      setTreeData(tData);

      // Load saved sensor data if exists
      if (tData.sensorData) {
        setManualN(String(tData.sensorData.n ?? 45));
        setManualP(String(tData.sensorData.p ?? 20));
        setManualK(String(tData.sensorData.k ?? 60));
        setManualPh(String(tData.sensorData.ph ?? 6.2));
        setManualMoisture(String(tData.sensorData.soilMoisture ?? 45));
      }

      // Load tree object from farm context
      const farm: any = farms.find((f: any) => f.id === farmId);
      if (farm) {
        const t = farm.trees?.find((x: any) => x.id === String(treeIdRaw).replace("tree-", ""));
        if (t) {
          setTreeObj(t);
          setStatus(t.status || "Bearing");
          setHealth(t.health || "Good");
          setNotes(t.notes || "");
          setYieldHistory(t.yieldHistory || []);
          if (t.variety) setVariety(t.variety);
          if (t.ageRange) setAgeRange(t.ageRange);
          if (t.frondCount !== undefined) setFrondCount(t.frondCount);
        }
      }

      // Check if IoT is live, if so auto-predict
      await checkIoTAndMaybePredict(tData);
    } catch (e) {
      console.warn("Failed to load tree data", e);
    } finally {
      setLoading(false);
    }
  };

  const checkIoTAndMaybePredict = async (currentTreeData: any) => {
    if (!user) return;
    try {
      const fData = await getFarm(user.uid, farmId);
      setIotLive(false);
    } catch (e) {
      setIotLive(false);
    }
  };

  const handleRunPrediction = async () => {
    if (!user) return;
    // Validate sensor input
    const n = parseFloat(manualN);
    const p = parseFloat(manualP);
    const k = parseFloat(manualK);
    const ph = parseFloat(manualPh);
    const moisture = parseFloat(manualMoisture);

    if ([n, p, k, ph, moisture].some(isNaN)) {
      Alert.alert("Invalid Input", "Please enter valid values for all sensor fields.");
      return;
    }
    if (ph < 0 || ph > 14) { Alert.alert("Invalid Input", "pH must be between 0 and 14."); return; }
    if (moisture < 0 || moisture > 100) { Alert.alert("Invalid Input", "Soil moisture must be between 0 and 100%."); return; }

    const sensorInput = { n, p, k, ph, soilMoisture: moisture };

    // 1. Save sensor data under this tree
    await updateTreeData(user.uid, farmId, treeId, { sensorData: sensorInput } as any);

    // 2. Get farm location
    const fData = await getFarm(user.uid, farmId);
    const farmLocation = fData?.locationName || "Colombo";

    await runPrediction(treeData, sensorInput, farmLocation, false);
  };

  const runPrediction = async (currentTreeData: any, sensorInput: any, farmLocation: string, isAutoFromIot: boolean) => {
    if (!user) return;
    setPredicting(true);
    setSaving(true);
    try {
      const response = await api.post(`/predict`, {
        estate: farmLocation,
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        weather_baseline: 50.0,
        variety,
        ageRange,
        fronds: frondCount,
        trees_count: 1, // <--- Add trees_count: 1 for single tree prediction
        soil_n: sensorInput.n || 0,
        soil_p: sensorInput.p || 0,
        soil_k: sensorInput.k || 0,
        soil_ph: sensorInput.ph || 6.5,
        soil_moisture: sensorInput.soilMoisture || 50,
      });

      const result = response.data;
      
      // If the gateway falls back to mock data, it won't have result.success but will have result.prediction or ensemble_prediction
      const isMockData = result.prediction !== undefined || result.ensemble_prediction !== undefined;

      if (!result.success && !isMockData) { 
        if (!isAutoFromIot) Alert.alert("Prediction Failed", result.error || "Unknown prediction error from Gateway/Model");
        setSaving(false); 
        setPredicting(false); 
        return; 
      }

      const tsId = Date.now().toString();
      const mockYield = result.prediction !== undefined ? result.prediction : result.ensemble_prediction;
      const reductionPercent = isMockData ? 0 : (result.penalty_percent || 0);
      const baseYield = isMockData ? mockYield : Math.round(result.predicted_next_pick_yield_nuts / (1 - (reductionPercent / 100)));
      const finalYield = isMockData ? mockYield : result.predicted_next_pick_yield_nuts;


      const newHistoryEntry = {
        id: tsId,
        timestamp: Date.now(),
        date: new Date().toISOString().split('T')[0],
        npk: { n: sensorInput.n, p: sensorInput.p, k: sensorInput.k },
        ph: sensorInput.ph,
        moisture: sensorInput.soilMoisture,
        baseYield,
        reductionPercent,
        finalYield,
        actualYield: null,
        disease: null,
        source: isAutoFromIot ? "iot" : "manual",
        recommendations: result.recommendations,
        limiting_factor: result.limiting_factor,
      };

      const healthStats = calculateTreeHealth(currentTreeData?.disease || "", sensorInput);
      
      const predictionWithMeta = {
        ...newHistoryEntry,
        _tempHealthStats: healthStats
      };
      
      setCurrentPrediction(predictionWithMeta);

      if (!isAutoFromIot) Alert.alert("Prediction Complete!", `Predicted yield: ${finalYield} nuts/tree`);
    } catch (e: any) {
      if (!isAutoFromIot) Alert.alert("Prediction Failed", e?.message || "Could not connect to prediction server.");
    } finally {
      setSaving(false);
      setPredicting(false);
    }
  };

  const clearPrediction = () => {
    Alert.alert("Clear Prediction", "Are you sure you want to clear this prediction and enter new data?", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: async () => {
        if (!user) return;
        setSaving(true);
        try {
          await updateTreeData(user.uid, farmId, treeId, { latest: null } as any);
          setTreeData((prev: any) => ({ ...prev, latest: null }));
        } catch (e) {
          Alert.alert("Error", "Could not clear prediction.");
        } finally {
          setSaving(false);
        }
      }}
    ]);
  };

  const savePredictionToDB = async () => {
    if (!user || !currentPrediction) return;
    setSaving(true);
    try {
      const tsId = currentPrediction.id;
      const { _tempHealthStats, ...newHistoryEntry } = currentPrediction;
      const healthStats = _tempHealthStats || { status: "Bearing", health: "Good" };
      
      await updateTreeData(user.uid, farmId, treeId, {
        latest: newHistoryEntry,
        status: healthStats.status,
        health: healthStats.health,
      } as any);
      await saveTreeHistory(user.uid, farmId, treeId, newHistoryEntry as any);

      setTreeData((prev: any) => {
        const prevHist = prev?.history || {};
        return {
          ...prev,
          status: healthStats.status,
          health: healthStats.health,
          latest: newHistoryEntry,
          history: { ...prevHist, [tsId]: newHistoryEntry },
        };
      });
      setCurrentPrediction(null);
      Alert.alert("Saved", "Prediction saved to database successfully.");
    } catch (e) {
      Alert.alert("Error", "Could not save prediction.");
    } finally {
      setSaving(false);
    }
  };

  const deleteHistoryRecord = (tsId: string) => {
    Alert.alert("Delete Record", "Are you sure you want to delete this prediction history?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        if (!user) return;
        setSaving(true);
        try {
          const newHistory = { ...treeData?.history };
          delete newHistory[tsId];
          
          const hasHistory = Object.keys(newHistory).length > 0;
          let updates: any = { history: newHistory };
          
          if (!hasHistory) {
            updates.latest = null;
            updates.health = "Healthy";
            updates.status = "Bearing";
          } else if (treeData?.latest?.id === tsId) {
            const remainingRecords = Object.values(newHistory).sort((a: any, b: any) => b.timestamp - a.timestamp);
            updates.latest = remainingRecords[0];
            const nextLatest: any = remainingRecords[0];
            
            let newHealth = "Healthy";
            if (nextLatest.ph < 5.5 || nextLatest.ph > 7.5 || nextLatest.moisture < 20 || nextLatest.npk?.n < 10 || nextLatest.npk?.p < 5 || nextLatest.npk?.k < 15) {
              newHealth = "Need Attention";
            }
            updates.health = newHealth;
          }
          
          await updateTreeData(user.uid, farmId, treeId, updates as any);
          setTreeData((prev: any) => ({ ...prev, ...updates }));
        } catch (e) {
          Alert.alert("Error", "Could not delete history record.");
        } finally {
          setSaving(false);
        }
      }}
    ]);
  };

  const saveActuals = async () => {
    if (!treeData?.latest || !user) return;
    setIsUpdatingActual(true);
    try {
      const tsId = treeData.latest.id;
      const updates: any = {};
      if (actualYield) { updates.actualYield = Number(actualYield); updates.actualYieldNuts = Number(actualYield); }
      if (disease) updates.disease = disease;

      await updateTreeData(user.uid, farmId, treeId, {
        latest: { ...treeData.latest, ...updates }
      } as any);
      await updateTreeHistoryRecord(user.uid, farmId, treeId, tsId, updates);

      setTreeData((prev: any) => {
        const prevHist = prev?.history || {};
        const updatedEntry = { ...prev.latest, ...updates };
        return { ...prev, latest: updatedEntry, history: { ...prevHist, [tsId]: updatedEntry } };
      });

      Alert.alert("Saved", "Post-harvest data saved.");
      setActualYield("");
      setDisease("");
    } catch (e) {
      Alert.alert("Error", "Failed to save.");
    } finally {
      setIsUpdatingActual(false);
    }
  };

  const addYield = () => {
    const n = parseInt(newNuts, 10);
    if (!newMonth || !Number.isFinite(n) || n < 0) return;
    const rec: YieldRecord = { id: `y-${Date.now()}`, date: newMonth, nuts: n, createdAt: Date.now() };
    setYieldHistory((prev) => [...prev, rec]);
    setNewMonth("");
    setNewNuts("");
  };

  const removeYield = (yId: string) => setYieldHistory((prev) => prev.filter((y) => y.id !== yId));

  const saveManualDetails = async () => {
    if (!user || !treeObj) return;
    setIsUpdatingActual(true);
    try {
      const updatedTree = { ...treeObj, status, health, notes, yieldHistory, variety, ageRange, frondCount };
      await updateTreeData(user.uid, farmId, treeObj.id, updatedTree);
      setTreeObj(updatedTree as any);
      Alert.alert("Saved", "Tree details saved!");
    } catch (e) {
      Alert.alert("Error", "Failed to save.");
    } finally {
      setIsUpdatingActual(false);
    }
  };

  const handleGenerateReport = () => {
    Alert.alert("Report Generated", "A PDF report for this tree will be generated.");
  };

  if (loading || saving) return (
    <SafeAreaView className="flex-1 bg-slate-50 justify-center items-center">
      <ActivityIndicator size="large" color="#059669" />
      <Text className="mt-4 text-slate-500 font-medium">{saving ? "Running AI prediction..." : "Loading tree data..."}</Text>
    </SafeAreaView>
  );

  const l = currentPrediction;
  const historyList = treeData?.history ? Object.values(treeData.history).sort((a: any, b: any) => b.timestamp - a.timestamp) : [];

  const getNPKRec = (n: number, p: number, k: number) => {
    if (n >= 15 && p >= 5 && k >= 20) return { status: 'Good', text: 'NPK levels are optimal for coconut trees.' };
    return { status: 'Poor', text: 'Low NPK detected. Apply recommended coconut fertilizer (e.g., YPM).' };
  };
  const getPhRec = (ph: number) => {
    if (ph >= 5.5 && ph <= 7.5) return { status: 'Good', text: 'Soil pH is within the ideal range.' };
    if (ph < 5.5) return { status: 'Poor', text: 'Soil is acidic. Apply Dolomite to balance pH.' };
    return { status: 'Poor', text: 'Soil is alkaline. Apply sulfur or organic compost.' };
  };
  const getMoistureRec = (moisture: number) => {
    if (moisture >= 40 && moisture <= 70) return { status: 'Good', text: 'Soil moisture is optimal.' };
    if (moisture < 40) return { status: 'Poor', text: 'Soil is dry. Irrigation required.' };
    return { status: 'Poor', text: 'Soil is waterlogged. Improve drainage.' };
  };

  const isAttention = treeObj?.health === "Need Attention" || treeObj?.health === "Weak";

  return (
    <SafeAreaView className={`flex-1 ${isAttention ? 'bg-red-50' : 'bg-[#fcfdfc]'}`}>
      {/* HEADER */}
      <View className={`px-5 pt-12 pb-3 flex-row items-center justify-between border-b ${isAttention ? 'border-red-600/30 bg-red-900' : 'border-slate-100 bg-[#0C3B2E]'}`}>
        <View className="flex-row items-center gap-4">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text className="text-[19px] font-bold text-white tracking-wide">
            {l ? "Prediction Results" : "Tree Details & Inputs"}
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>
      
      {/* TREE HEADER INFO */}
      <View className={`px-6 py-5 flex-row items-center justify-between border-b ${isAttention ? 'border-red-100 bg-red-50/50' : 'border-slate-100 bg-white'} shadow-sm`} style={{ zIndex: 10 }}>
        <View>
          <Text className={`text-[13px] font-semibold mb-1 ${isAttention ? 'text-red-400' : 'text-slate-400'}`}>Tree ID</Text>
          <Text className={`text-[22px] font-bold ${isAttention ? 'text-red-900' : 'text-slate-800'}`}>{treeObj?.id || treeId.replace("tree-", "")}</Text>
        </View>
        <View className="items-end">
          <Text className={`text-[13px] font-semibold mb-1 ${isAttention ? 'text-red-400' : 'text-slate-400'}`}>Status</Text>
          <View className={`px-3 py-1 rounded-full border ${isAttention ? 'bg-red-100 border-red-200' : 'bg-emerald-50 border-emerald-100'}`}>
            <Text className={`font-bold text-xs ${isAttention ? 'text-red-700' : 'text-emerald-600'}`}>{isAttention ? "Need Attention" : (treeObj?.health || "Healthy")}</Text>
          </View>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>

        {!l && (
          <View>
        {/* ── Biological Inputs Card ── */}
        <View className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-4 p-5" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 }}>
          <View className="flex-row items-center gap-2 mb-4">
            <View className="w-5 h-5 rounded-full border border-forest-600 items-center justify-center">
              <Text className="text-forest-600 font-bold text-[10px]">1</Text>
            </View>
            <Text className="text-forest-700 font-bold text-[15px]">Biological Inputs</Text>
          </View>
          <View className="gap-5">
            <View>
              <View className="flex-row items-center gap-2 mb-2">
                <Text className="text-sm font-semibold text-slate-700">Variety / Cultivar</Text>
              </View>
              <TouchableOpacity onPress={() => setShowVariety(!showVariety)} className={`border ${showVariety ? 'border-forest-600 bg-forest-50' : 'border-slate-200 bg-white'} rounded-xl flex-row items-center justify-between px-4 py-3.5`}>
                <Text className={`text-[13px] font-semibold ${showVariety ? 'text-forest-700' : 'text-slate-800'}`}>{variety}</Text>
                <ChevronDown size={18} color={showVariety ? '#15803d' : '#64748b'} style={{ transform: [{ rotate: showVariety ? '180deg' : '0deg' }] }} />
              </TouchableOpacity>
              {showVariety && (
                <View className="bg-white border border-slate-100 rounded-xl mt-2 p-3 shadow-sm gap-2">
                  {["Sri Lanka Tall", "Hybrid", "Dwarf"].map((v) => (
                    <TouchableOpacity key={v} onPress={() => { setVariety(v); setShowVariety(false); }} className={`p-3 rounded-xl border ${variety === v ? 'bg-forest-50 border-forest-200' : 'bg-slate-50 border-slate-100'}`}>
                      <Text className={`text-[14px] mb-1 ${variety === v ? 'font-bold text-forest-800' : 'font-bold text-slate-700'}`}>{v}</Text>
                      <Text className="text-[12px] font-semibold text-slate-600 mb-2">{varietyDetails[v].desc}</Text>
                      {varietyDetails[v].points.map((pt, idx) => (
                        <View key={idx} className="flex-row items-start gap-1.5 mb-1 pr-2">
                          <View className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5" />
                          <Text className="text-[11px] text-slate-500 leading-4 flex-1">{pt}</Text>
                        </View>
                      ))}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <View>
              <Text className="text-sm font-semibold text-slate-700 mb-2">Palm Age (Years)</Text>
              <TouchableOpacity onPress={() => setShowAge(!showAge)} className={`border ${showAge ? 'border-forest-600 bg-forest-50' : 'border-slate-200 bg-white'} rounded-xl flex-row items-center justify-between px-4 py-3.5`}>
                <Text className={`text-[13px] font-semibold ${showAge ? 'text-forest-700' : 'text-slate-800'}`}>{ageRange} - {ageDetails[ageRange] || ""}</Text>
                <ChevronDown size={18} color={showAge ? '#15803d' : '#64748b'} style={{ transform: [{ rotate: showAge ? '180deg' : '0deg' }] }} />
              </TouchableOpacity>
              {showAge && (
                <View className="bg-white border border-slate-100 rounded-xl mt-2 p-2 shadow-sm gap-1">
                  {["< 7", "7 - 14", "15 - 45", "46 - 60", "> 60"].map((a) => (
                    <TouchableOpacity key={a} onPress={() => { setAgeRange(a); setShowAge(false); }} className={`px-3 py-3 rounded-lg flex-row justify-between items-center border ${ageRange === a ? 'bg-forest-50 border-forest-200' : 'bg-white border-transparent'}`}>
                      <Text className={`text-[13px] ${ageRange === a ? 'font-bold text-forest-800' : 'font-bold text-slate-700'}`}>{a}</Text>
                      <Text className={`text-[11px] ${ageRange === a ? 'font-semibold text-forest-600' : 'text-slate-500'}`}>{ageDetails[a]}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>
            <View>
              <Text className="text-sm font-semibold text-slate-700 mb-2">Healthy Frond Count</Text>
              <View className="flex-row items-center border border-slate-200 rounded-xl justify-between bg-white px-2 py-2 mb-3">
                <TouchableOpacity onPress={() => setFrondCount(Math.max(0, frondCount - 1))} className="w-12 h-10 items-center justify-center bg-slate-50 rounded-lg">
                  <Text className="text-[22px] text-slate-600 font-medium">−</Text>
                </TouchableOpacity>
                <Text className="text-[17px] font-bold text-slate-800">{frondCount}</Text>
                <TouchableOpacity onPress={() => setFrondCount(frondCount + 1)} className="w-12 h-10 items-center justify-center bg-slate-50 rounded-lg">
                  <Text className="text-[20px] text-slate-600 font-medium">+</Text>
                </TouchableOpacity>
                <View className="w-[1px] h-8 bg-slate-200 mx-2" />
                <Text className="text-[13px] text-slate-500 font-medium mr-4">/ 32</Text>
              </View>
              <TouchableOpacity onPress={() => setShowFrondInfo(!showFrondInfo)} className="flex-row items-center gap-1.5 self-start">
                <Text className="text-[13px] text-blue-600 font-semibold">Why 32?</Text>
                <Info size={14} color="#3b82f6" />
              </TouchableOpacity>
              {showFrondInfo && (
                <View className="bg-blue-50 border border-blue-100 rounded-xl p-3 mt-3 flex-row items-start gap-3">
                  <Info size={18} color="#2563eb" className="mt-0.5" />
                  <Text className="text-[12px] text-blue-800 leading-5 flex-1 font-medium">A healthy adult coconut palm should typically have about <Text className="font-bold">32-35</Text> fully opened green leaves (fronds) to achieve maximum yield potential.</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* ── Sensor Data Input Card ── */}
        <View className="bg-white rounded-2xl border border-slate-100 shadow-sm mb-6 p-5" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.03, shadowRadius: 8, elevation: 1 }}>
          <View className="flex-row items-center justify-between mb-6">
            <View className="flex-row items-center gap-2">
              <View className="w-5 h-5 rounded-full border border-forest-600 items-center justify-center">
                <Text className="text-forest-600 font-bold text-[10px]">2</Text>
              </View>
              <Text className="text-forest-700 font-bold text-[15px]">Soil & Sensor Data</Text>
            </View>
            <TouchableOpacity
              onPress={fetchRealtimeIoTData}
              disabled={syncingIoT}
              className={`border px-3 py-1.5 rounded-lg flex-row items-center gap-1.5 shadow-sm ${syncingIoT ? 'bg-slate-100 border-slate-200' : 'bg-blue-50 border-blue-200'}`}
            >
              {syncingIoT ? <ActivityIndicator size="small" color="#94a3b8" style={{ width: 14, height: 14 }} /> : <RefreshCw size={14} color="#2563eb" />}
              <Text className={`font-bold text-[11px] ${syncingIoT ? 'text-slate-500' : 'text-blue-600'}`}>{syncingIoT ? "Syncing..." : "Sync IoT Data"}</Text>
            </TouchableOpacity>
          </View>

          <View className="gap-5 border-b border-slate-100 pb-5 mb-4">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-4 flex-1">
                <View className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <Image source={{ uri: 'https://i.ibb.co/mrqhgPd3/Nitrogen.png' }} style={{ width: 24, height: 24 }} resizeMode="contain" />
                </View>
                <Text className="text-[13px] text-slate-700 font-semibold">Nitrogen (N)</Text>
              </View>
              <Text className="text-[15px] font-bold text-slate-800 w-16 text-right">{manualN || "0.026"} %</Text>
              <View className="w-16 items-end">
                <Text className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${Number(manualN) < 30 ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50'}`}>
                  {Number(manualN) < 30 ? "Low" : "Good"}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-4 flex-1">
                <View className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <Image source={{ uri: 'https://i.ibb.co/gbt6rcPh/Phosphorus.png' }} style={{ width: 24, height: 24 }} resizeMode="contain" />
                </View>
                <Text className="text-[13px] text-slate-700 font-semibold">Phosphorus (P)</Text>
              </View>
              <Text className="text-[15px] font-bold text-slate-800 w-16 text-right">{manualP || "0.185"} %</Text>
              <View className="w-16 items-end">
                <Text className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${Number(manualP) < 20 ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50'}`}>
                  {Number(manualP) < 20 ? "Low" : "Good"}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-4 flex-1">
                <View className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <Image source={{ uri: 'https://i.ibb.co/jP93ZkJ0/Potassium.png' }} style={{ width: 24, height: 24 }} resizeMode="contain" />
                </View>
                <Text className="text-[13px] text-slate-700 font-semibold">Potassium (K)</Text>
              </View>
              <Text className="text-[15px] font-bold text-slate-800 w-16 text-right">{manualK || "0.095"} %</Text>
              <View className="w-16 items-end">
                <Text className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${Number(manualK) < 50 ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50'}`}>
                  {Number(manualK) < 50 ? "Low" : "Good"}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-4 flex-1">
                <View className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <FlaskConical size={24} color="#0891b2" />
                </View>
                <Text className="text-[13px] text-slate-700 font-semibold">pH Level</Text>
              </View>
              <Text className="text-[15px] font-bold text-slate-800 w-16 text-right">{manualPh || "6.2"}</Text>
              <View className="w-16 items-end">
                <Text className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${Number(manualPh) < 5.5 || Number(manualPh) > 7.5 ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50'}`}>
                  {Number(manualPh) < 5.5 || Number(manualPh) > 7.5 ? "Poor" : "Good"}
                </Text>
              </View>
            </View>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-4 flex-1">
                <View className="bg-slate-50 p-2 rounded-xl border border-slate-100">
                  <Image source={{ uri: 'https://i.ibb.co/rR6JW0dr/Moisture-irrigation.png' }} style={{ width: 24, height: 24 }} resizeMode="contain" />
                </View>
                <Text className="text-[13px] text-slate-700 font-semibold">Soil Moisture</Text>
              </View>
              <Text className="text-[15px] font-bold text-slate-800 w-16 text-right">{manualMoisture || "22"} %</Text>
              <View className="w-16 items-end">
                <Text className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${Number(manualMoisture) < 40 ? 'text-amber-600 bg-amber-50' : 'text-emerald-600 bg-emerald-50'}`}>
                  {Number(manualMoisture) < 40 ? "Low" : "Good"}
                </Text>
              </View>
            </View>
          </View>
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-1.5">
              <Clock size={14} color="#94a3b8" />
              <Text className="text-[11px] text-slate-400 font-medium">Last Updated: {syncingIoT ? "Syncing..." : "Today, " + new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
            </View>
          </View>
        </View>
        
        <TouchableOpacity 
          onPress={() => handleRunPrediction()}
          disabled={predicting}
          className="bg-[#15803d] rounded-xl py-4 flex-row items-center justify-center gap-2 shadow-sm mb-6"
        >
          {predicting ? <ActivityIndicator size="small" color="#fff" /> : null}
          <Text className="text-white font-bold text-base">
            {predicting ? "Predicting..." : "Predict Yield"}
          </Text>
        </TouchableOpacity>

        {/* Prediction History Cards */}
        <View className="mt-4 mb-8">
          <View className="flex-row justify-between items-center mb-4">
            <Text className="text-lg font-bold text-slate-800">Prediction History</Text>
            <TouchableOpacity onPress={handleGenerateReport} className="flex-row items-center bg-teal-100 px-3 py-1.5 rounded-full">
              <FileDown size={14} color="#0d9488" />
              <Text className="text-teal-700 font-bold text-xs ml-1">Export</Text>
            </TouchableOpacity>
          </View>
          
          {historyList.length === 0 ? (
            <View className="bg-white rounded-2xl border border-slate-100 p-6 items-center shadow-sm">
              <Text className="text-slate-400 text-sm">No prediction history yet.</Text>
            </View>
          ) : (
            <View className="gap-3">
              {historyList.map((h: any) => (
                <TouchableOpacity key={h.id} onPress={() => setCurrentPrediction(h)} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 active:opacity-70">
                  <View className="flex-row justify-between items-start mb-2">
                    <View>
                      <Text className="text-xs font-bold text-slate-500">{h.date}</Text>
                      <View className="flex-row items-center gap-1 mt-1">
                        <Text className="text-lg font-extrabold text-forest-700">{parseFloat(h.finalYield).toFixed(0)}</Text>
                        <Text className="text-xs font-semibold text-slate-600 mt-1">Nuts predicted</Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => deleteHistoryRecord(h.id)} className="p-2 -mr-2 -mt-2">
                      <Trash2 size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                  
                  <View className="bg-slate-50 rounded-xl p-3 flex-row flex-wrap gap-y-2 mt-2">
                    <View className="w-1/2">
                      <Text className="text-[10px] text-slate-400 font-bold uppercase">NPK</Text>
                      <Text className="text-xs font-semibold text-slate-700">{h.npk?.n}-{h.npk?.p}-{h.npk?.k}</Text>
                    </View>
                    <View className="w-1/2">
                      <Text className="text-[10px] text-slate-400 font-bold uppercase">pH & Moist</Text>
                      <Text className="text-xs font-semibold text-slate-700">{h.ph} | {h.moisture}%</Text>
                    </View>
                    {h.actualYield && (
                      <View className="w-1/2 mt-1">
                        <Text className="text-[10px] text-slate-400 font-bold uppercase">Actual</Text>
                        <Text className="text-xs font-bold text-emerald-600">{h.actualYield} nuts</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        </View>
        )}

        {l ? (
          <View>
            {/* Section 3: Prediction Results */}
            <View className="bg-[#fdfdfd] rounded-3xl border border-slate-100 shadow-sm mb-4 pt-6 pb-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2 }}>
              <View className="items-center mb-1">
                <Text className="text-slate-800 font-bold text-[15px]">Final Predicted Yield</Text>
              </View>
              <View className="flex-row items-end justify-center mb-2">
                <Text className="text-forest-700 font-extrabold text-[48px] tracking-tighter">{parseFloat(l.finalYield).toFixed(0).replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",")}</Text>
                <Text className="text-slate-800 font-bold mb-3 ml-2 text-sm">Nuts / 45 Days</Text>
              </View>
              <View className="flex-row justify-center mb-4">
                <Text className="text-slate-600 font-semibold text-[13px]">Potential Capacity: <Text className="font-bold">{l.baseYield?.toString().replace(/\\B(?=(\\d{3})+(?!\\d))/g, ",")} Nuts</Text></Text>
              </View>
              <View className="flex-row justify-center mb-8">
                <View className="bg-red-50 border border-red-100 rounded-lg px-4 py-1">
                  <Text className="text-red-500 font-bold text-[13px]">Loss: {parseFloat(l.reductionPercent).toFixed(1)} %</Text>
                </View>
              </View>
              
              <View className="px-5">
                <Text className="text-xs font-bold text-slate-800 mb-2">Nutrient Limiting Factor</Text>
                <View className="flex-row items-center gap-3 bg-white p-2 rounded-xl mb-6">
                  <Image source={{ uri: 'https://i.ibb.co/51P3zQh/phosphorus-limiting.png' }} style={{width: 32, height: 32}} defaultSource={{width: 32, height: 32}} />
                  <View>
                    <Text className="font-bold text-slate-800 text-[15px]">{l.limiting_factor || "Phosphorus (P)"}</Text>
                    <Text className="font-semibold text-slate-500 text-xs">is limiting yield</Text>
                  </View>
                </View>

                <Text className="text-xs font-bold text-slate-800 mb-2 mt-2">Soil Health Index</Text>
                <View className="mb-8 mt-2 px-1">
                  <View className="flex-row h-1.5 rounded-full overflow-hidden mb-2">
                    <View className="flex-1 bg-[#10b981]" />
                    <View className="flex-[0.8] bg-[#f59e0b]" />
                    <View className="flex-[0.6] bg-[#ef4444]" />
                  </View>
                  <View className="flex-row justify-between px-1">
                    <Text className="text-[10px] text-slate-600 font-bold">Good</Text>
                    <Text className="text-[10px] text-slate-600 font-bold ml-6">Fair</Text>
                    <Text className="text-[10px] text-slate-600 font-bold">Poor</Text>
                  </View>
                  {/* Custom Pin logic, default approx 60% */}
                  <View style={{ position: 'absolute', top: -14, left: '60%' }} className="items-center">
                    <View className="w-3 h-3 rounded-full bg-slate-700 mb-0.5 border-2 border-white" />
                    <View className="w-[1.5px] h-3 bg-slate-700" />
                  </View>
                </View>
              </View>

              <View className="px-5">
                <Text className="text-sm font-bold text-slate-800 mb-3">Recommendations</Text>
                <View className="gap-2">
                  <View className="flex-row items-center gap-3 py-2">
                    <View className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                      <Image source={{ uri: 'https://i.ibb.co/rQ6V9xR/potash.png' }} style={{ width: 20, height: 20 }} resizeMode="contain" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[13px] font-bold text-slate-800">Add MOP (Potash)</Text>
                      <Text className="text-xs font-semibold text-blue-600 mt-0.5">150 g / Tree</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-3 py-2">
                    <View className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                      <Image source={{ uri: 'https://i.ibb.co/sKq5VwD/phosphate.png' }} style={{ width: 20, height: 20 }} resizeMode="contain" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[13px] font-bold text-slate-800">Add Single Super Phosphate (SSP)</Text>
                      <Text className="text-xs font-semibold text-blue-600 mt-0.5">250 g / Tree</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-3 py-2">
                    <View className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                      <Image source={{ uri: 'https://i.ibb.co/3Wf2VdG/urea.png' }} style={{ width: 20, height: 20 }} resizeMode="contain" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[13px] font-bold text-slate-800">Add Urea</Text>
                      <Text className="text-xs font-semibold text-blue-600 mt-0.5">120 g / Tree</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-3 py-2">
                    <View className="bg-slate-50 rounded-xl p-2 border border-slate-100">
                      <Image source={{ uri: 'https://i.ibb.co/rR6JW0dr/Moisture-irrigation.png' }} style={{ width: 20, height: 20 }} resizeMode="contain" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-[13px] font-bold text-slate-800">Maintain Moisture</Text>
                      <Text className="text-xs font-semibold text-slate-500 mt-0.5">Irrigate regularly</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View className="flex-row px-5 mt-6 mb-2 gap-3">
                {!isViewingHistory ? (
                  <TouchableOpacity onPress={savePredictionToDB} className="flex-1 bg-white border border-slate-200 rounded-xl py-2.5 items-center shadow-sm">
                    <Text className="text-forest-700 font-bold text-sm">Save</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity onPress={() => setCurrentPrediction(null)} className="flex-1 bg-white border border-slate-200 rounded-xl py-2.5 items-center shadow-sm">
                    <Text className="text-slate-700 font-bold text-sm">Close View</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity className="flex-1 bg-white border border-slate-200 rounded-xl py-2.5 items-center flex-row justify-center gap-2 shadow-sm">
                  <Share2 size={16} color="#15803d" />
                  <Text className="text-forest-700 font-bold text-sm">Share</Text>
                </TouchableOpacity>
              </View>
              
            </View>

            <TouchableOpacity className="bg-[#0C3B2E] rounded-xl py-4 flex-row items-center justify-center gap-2 shadow-sm mb-6">
              <Image source={{ uri: 'https://i.ibb.co/PZHx0gxN/plant-health.png' }} style={{width: 18, height: 18, tintColor: '#fff'}} />
              <Text className="text-white font-bold text-base">Analyze Disease</Text>
            </TouchableOpacity>
            
            <View className="flex-row justify-center items-center gap-1.5 mb-8">
              <Info size={14} color="#64748b" />
              <Text className="text-xs text-slate-500 font-medium">Need help? Contact Agri Expert</Text>
            </View>

            {/* Post-harvest actual yield update */}
            <View className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-6">
              <Text className="font-bold text-slate-800 mb-3">Save Actual Harvest</Text>
              <Text className="text-xs text-slate-500 mb-1">Actual Harvested Nuts</Text>
              <TextInput
                value={actualYield}
                onChangeText={setActualYield}
                keyboardType="numeric"
                placeholder="e.g. 40"
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mb-3"
              />
              <Text className="text-xs text-slate-500 mb-1">Identified Disease (if any)</Text>
              <TextInput
                value={disease}
                onChangeText={setDisease}
                placeholder="e.g. Red Weevil, Leaf Blight"
                className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 mb-4"
              />
              <TouchableOpacity
                onPress={saveActuals}
                disabled={isUpdatingActual}
                className="bg-slate-800 rounded-lg py-3 items-center"
              >
                <Text className="text-white font-bold">{isUpdatingActual ? "Saving..." : "Save Harvest Data"}</Text>
              </TouchableOpacity>
            </View>

            {/* ── Tree Details & History Card ── */}
            <View className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm mb-6">
              <Text className="font-bold text-slate-800 text-lg mb-4">Tree Details & Harvest History</Text>

              <Text className="text-xs font-medium text-slate-600 mb-1.5">Tree Status</Text>
              <View className="flex-row flex-wrap gap-2 mb-4">
                {(["Young", "Bearing", "Diseased", "NonBearing"] as TreeStatus[]).map((s) => {
                  const active = status === s;
                  return (
                    <TouchableOpacity
                      key={s}
                      onPress={() => { setStatus(s); if (s === "Bearing") setHealth("Good"); else if (s === "Young") setHealth("Average"); else setHealth("Weak"); }}
                      className={`py-2 px-3 rounded-lg border ${active ? "border-transparent" : "bg-slate-50 border-slate-200"}`}
                      style={active ? { backgroundColor: statusColor(s) } : undefined}
                    >
                      <Text style={active ? { color: "#fff" } : { color: "#64748b" }} className="text-xs font-bold">{statusLabel(s)}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text className="text-xs font-medium text-slate-600 mb-1.5">Health Rating</Text>
              <View className="flex-row gap-2 mb-4">
                {(["Good", "Average", "Weak"] as TreeHealth[]).map((h) => (
                  <TouchableOpacity
                    key={h}
                    onPress={() => setHealth(h)}
                    className={`flex-1 py-2 rounded-lg items-center border ${health === h ? "border-transparent" : "bg-slate-50 border-slate-200"}`}
                    style={health === h ? { backgroundColor: healthColor(h) } : undefined}
                  >
                    <Text style={health === h ? { color: "#fff" } : { color: "#64748b" }} className="text-xs font-bold">{h}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View className="bg-slate-50 rounded-xl p-3 mb-4">
                <Text className="text-xs font-semibold text-slate-600 mb-2">Add Harvest Record (Nuts Picked)</Text>
                <View className="flex-row gap-2 mb-3">
                  <TextInput
                    value={newMonth}
                    onChangeText={setNewMonth}
                    placeholder="YYYY-MM"
                    placeholderTextColor="#cbd5e1"
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800"
                  />
                  <TextInput
                    value={newNuts}
                    onChangeText={setNewNuts}
                    placeholder="Nuts"
                    placeholderTextColor="#cbd5e1"
                    keyboardType="numeric"
                    className="w-20 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800"
                  />
                  <TouchableOpacity onPress={addYield} className="w-9 h-9 rounded-lg bg-emerald-600 items-center justify-center flex-shrink-0">
                    <Plus size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
                {yieldHistory.length > 0 && (
                  <View className="space-y-2 mt-2">
                    {[...yieldHistory].sort((a, b) => b.date.localeCompare(a.date)).map((y) => (
                      <View key={y.id} className="flex-row items-center gap-3 p-2 rounded-lg bg-white border border-slate-100">
                        <View className="w-7 h-7 rounded-md bg-emerald-50 items-center justify-center flex-shrink-0">
                          <Calendar size={12} color="#059669" />
                        </View>
                        <View className="flex-1 min-w-0">
                          <Text className="text-xs font-bold text-slate-800">{y.nuts} nuts</Text>
                          <Text className="text-[10px] text-slate-400">{y.date}</Text>
                        </View>
                        <TouchableOpacity onPress={() => removeYield(y.id)} className="p-1">
                          <Trash2 size={14} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                )}
              </View>

              <Text className="text-xs font-medium text-slate-600 mb-1.5">Special Notes</Text>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Fertilizer date, observed anomalies…"
                placeholderTextColor="#cbd5e1"
                multiline
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 min-h-[60px] mb-4"
              />

              <TouchableOpacity
                onPress={saveManualDetails}
                disabled={isUpdatingActual}
                className="bg-emerald-600 rounded-xl py-3 items-center flex-row justify-center gap-2"
              >
                <Save size={16} color="#fff" />
                <Text className="text-white font-bold text-sm">{isUpdatingActual ? "Saving..." : "Save Details"}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View className="bg-amber-50 border border-amber-200 rounded-2xl p-5 items-center">
            <Info size={32} color="#f59e0b" />
            <Text className="text-amber-800 font-bold text-base mt-2 text-center">No Prediction Yet</Text>
            <Text className="text-amber-600 text-sm mt-1 text-center">
              {iotLive
                ? "IoT connected. Running first prediction..."
                : 'Enter your soil sensor values above and tap "Run AI Yield Prediction".'}
            </Text>
              </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
