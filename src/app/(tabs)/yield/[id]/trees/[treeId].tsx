import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, TextInput, Alert, Image } from "react-native";
import { ArrowLeft, Save, AlertTriangle, Thermometer, Droplets, FlaskConical, Info, FileDown, Search, CheckCircle2, XCircle, Zap, Edit3 } from "lucide-react-native";
import { useState, useEffect } from "react";
import { LinearGradient } from "expo-linear-gradient";
import { useYieldApp } from "@/store/YieldAppContext";
import { statusColor, healthColor, statusLabel } from "@/utils/yieldTreeFactory";
import { getFarm, updateTreeData } from "@/services/yieldFarmDb";
import { fetchTreeData, saveTreeHistory, updateTreeHistoryRecord } from "@/services/treeService";
import type { TreeStatus, TreeHealth, YieldRecord, Tree } from "@/types/yield";
import { Plus, Trash2, Calendar } from "lucide-react-native";
import api from "@/services/api";

const calculateTreeHealth = (diseaseVal: string, yieldVal: number) => {
  if (diseaseVal && diseaseVal.trim().length > 0) return { status: "Diseased", health: "Weak" };
  if (yieldVal < 5) return { status: "Bearing", health: "Weak" };
  if (yieldVal < 10) return { status: "Bearing", health: "Average" };
  return { status: "Bearing", health: "Good" };
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
  const [iotLive, setIotLive] = useState(false);

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

  // Manual Tree Details
  const [treeObj, setTreeObj] = useState<Tree | null>(null);
  const [status, setStatus] = useState<TreeStatus>("Bearing");
  const [health, setHealth] = useState<TreeHealth>("Good");
  const [notes, setNotes] = useState("");
  const [yieldHistory, setYieldHistory] = useState<YieldRecord[]>([]);
  const [newMonth, setNewMonth] = useState("");
  const [newNuts, setNewNuts] = useState("");

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
      const response = await api.post(`/yield/predict`, {
        district: farmLocation,
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        trees_count: 1,
        soil_n: sensorInput.n || 0,
        soil_p: sensorInput.p || 0,
        soil_k: sensorInput.k || 0,
        ph: sensorInput.ph || 6.5,
        moisture: sensorInput.soilMoisture || 50,
      });

      const result = response.data;
      if (!result.success) { setSaving(false); setPredicting(false); return; }

      const tsId = Date.now().toString();
      const treesCount = result.trees_count || 1;
      const perTreeMonthly = result.predicted_monthly_yield / treesCount;
      const baseYield = result.predicted_monthly_yield ? Math.round(perTreeMonthly * 1.5) : 15;
      const reductionPercent = result.penalty_percent || 0;
      const finalYield = result.predicted_next_pick_yield_nuts
        ? Math.round(result.predicted_next_pick_yield_nuts / treesCount)
        : baseYield;

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
      };

      const healthStats = calculateTreeHealth(currentTreeData?.disease || "", finalYield);
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

      if (!isAutoFromIot) Alert.alert("Prediction Complete!", `Predicted yield: ${finalYield} nuts/tree`);
    } catch (e: any) {
      if (!isAutoFromIot) Alert.alert("Prediction Failed", e?.message || "Could not connect to prediction server.");
    } finally {
      setSaving(false);
      setPredicting(false);
    }
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
      const updatedTree = { ...treeObj, status, health, notes, yieldHistory };
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

  const l = treeData?.latest;
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

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-row items-center p-4 bg-white shadow-sm z-10 pt-12">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-slate-100 rounded-full">
          <ArrowLeft size={20} color="#334155" />
        </TouchableOpacity>
        <Image
          source={{ uri: 'https://i.ibb.co/hR8NHX1c/coconut-tree.png' }}
          style={{ width: 24, height: 24, marginRight: 8 }}
          resizeMode="contain"
        />
        <Text className="text-xl font-bold text-slate-800">Tree {treeId.replace("tree-", "")} Details</Text>
        {iotLive && (
          <View className="ml-auto flex-row items-center bg-emerald-100 px-2 py-1 rounded-full">
            <Zap size={11} color="#059669" />
            <Text className="text-emerald-700 font-bold text-[10px] ml-1">IoT LIVE</Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>

        {/* ── Sensor Data Input Card ── */}
        <View className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-4 overflow-hidden">
          <View className="flex-row items-center justify-between px-4 pt-4 pb-2">
            <View>
              <Text className="font-bold text-slate-800 text-base">Soil Sensor Data</Text>
              <Text className="text-xs text-slate-400 mt-0.5">
                {iotLive ? "Auto-filled from IoT device" : "Enter values manually for prediction"}
              </Text>
            </View>
            {!iotLive && (
              <TouchableOpacity
                onPress={() => setSensorEditMode(!sensorEditMode)}
                className="flex-row items-center bg-slate-100 px-3 py-1.5 rounded-full"
              >
                <Edit3 size={12} color="#64748b" />
                <Text className="text-slate-600 font-semibold text-xs ml-1">{sensorEditMode ? "Done" : "Edit"}</Text>
              </TouchableOpacity>
            )}
          </View>

          <View className="flex-row flex-wrap px-4 pb-4 gap-y-3">
            {/* Nitrogen */}
            <View className="w-1/3 pr-2">
              <Text className="text-[10px] font-bold text-violet-500 mb-1">NITROGEN (N)</Text>
              {sensorEditMode || iotLive ? (
                <TextInput
                  value={manualN}
                  onChangeText={setManualN}
                  keyboardType="numeric"
                  editable={!iotLive}
                  placeholder="e.g. 45"
                  placeholderTextColor="#cbd5e1"
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-bold text-slate-800"
                />
              ) : (
                <View className="bg-violet-50 rounded-lg px-2 py-1.5">
                  <Text className="text-sm font-black text-violet-700">{manualN || "—"}</Text>
                </View>
              )}
            </View>
            {/* Phosphorus */}
            <View className="w-1/3 pr-2">
              <Text className="text-[10px] font-bold text-blue-500 mb-1">PHOSPHORUS (P)</Text>
              {sensorEditMode || iotLive ? (
                <TextInput
                  value={manualP}
                  onChangeText={setManualP}
                  keyboardType="numeric"
                  editable={!iotLive}
                  placeholder="e.g. 20"
                  placeholderTextColor="#cbd5e1"
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-bold text-slate-800"
                />
              ) : (
                <View className="bg-blue-50 rounded-lg px-2 py-1.5">
                  <Text className="text-sm font-black text-blue-700">{manualP || "—"}</Text>
                </View>
              )}
            </View>
            {/* Potassium */}
            <View className="w-1/3">
              <Text className="text-[10px] font-bold text-amber-500 mb-1">POTASSIUM (K)</Text>
              {sensorEditMode || iotLive ? (
                <TextInput
                  value={manualK}
                  onChangeText={setManualK}
                  keyboardType="numeric"
                  editable={!iotLive}
                  placeholder="e.g. 60"
                  placeholderTextColor="#cbd5e1"
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-bold text-slate-800"
                />
              ) : (
                <View className="bg-amber-50 rounded-lg px-2 py-1.5">
                  <Text className="text-sm font-black text-amber-700">{manualK || "—"}</Text>
                </View>
              )}
            </View>
            {/* pH */}
            <View className="w-1/2 pr-2">
              <Text className="text-[10px] font-bold text-orange-500 mb-1">SOIL pH</Text>
              {sensorEditMode || iotLive ? (
                <TextInput
                  value={manualPh}
                  onChangeText={setManualPh}
                  keyboardType="numeric"
                  editable={!iotLive}
                  placeholder="e.g. 6.2"
                  placeholderTextColor="#cbd5e1"
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-bold text-slate-800"
                />
              ) : (
                <View className="bg-orange-50 rounded-lg px-2 py-1.5">
                  <Text className="text-sm font-black text-orange-700">{manualPh || "—"}</Text>
                </View>
              )}
            </View>
            {/* Soil Moisture */}
            <View className="w-1/2">
              <Text className="text-[10px] font-bold text-sky-500 mb-1">SOIL MOISTURE (%)</Text>
              {sensorEditMode || iotLive ? (
                <TextInput
                  value={manualMoisture}
                  onChangeText={setManualMoisture}
                  keyboardType="numeric"
                  editable={!iotLive}
                  placeholder="e.g. 45"
                  placeholderTextColor="#cbd5e1"
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-sm font-bold text-slate-800"
                />
              ) : (
                <View className="bg-sky-50 rounded-lg px-2 py-1.5">
                  <Text className="text-sm font-black text-sky-700">{manualMoisture || "—"}%</Text>
                </View>
              )}
            </View>
          </View>

          {/* Run Prediction Button */}
          <View className="px-4 pb-4">
            <TouchableOpacity
              onPress={handleRunPrediction}
              disabled={predicting}
              className="bg-emerald-600 rounded-xl py-3 flex-row items-center justify-center gap-2"
            >
              {predicting
                ? <ActivityIndicator size="small" color="#fff" />
                : <Zap size={16} color="#fff" />}
              <Text className="text-white font-bold text-sm">
                {predicting ? "Predicting..." : "Run AI Yield Prediction"}
              </Text>
            </TouchableOpacity>
            {!iotLive && (
              <Text className="text-center text-slate-400 text-[10px] mt-2">
                ⓘ Tap Edit to update your soil readings, then run prediction
              </Text>
            )}
          </View>
        </View>

        {l ? (
          <View>
            {/* Prediction Result */}
            <LinearGradient colors={['#ecfdf5', '#d1fae5']} className="p-5 rounded-2xl mb-4 border border-emerald-200">
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-slate-600 font-semibold">Base Expected Yield</Text>
                <Text className="text-slate-800 font-bold">{l.baseYield} nuts</Text>
              </View>
              <View className="flex-row justify-between items-center mb-2">
                <Text className="text-red-500 font-semibold">Nutrition Loss</Text>
                <Text className="text-red-500 font-bold">-{parseFloat(l.reductionPercent).toFixed(1)}%</Text>
              </View>
              <View className="h-px bg-emerald-200 my-2" />
              <View className="flex-row justify-between items-center">
                <View>
                  <Text className="text-emerald-800 font-bold text-lg">Final Prediction</Text>
                  {l.source && (
                    <Text className="text-[10px] text-emerald-600 mt-0.5">
                      {l.source === "iot" ? "⚡ IoT Auto-predict" : "✏️ Manual data"}
                    </Text>
                  )}
                </View>
                <Text className="text-emerald-800 font-extrabold text-2xl">{parseFloat(l.finalYield).toFixed(1)} nuts</Text>
              </View>
            </LinearGradient>

            {/* Auto Health & Status */}
            <View className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-4 shadow-sm">
              <Text className="text-xs font-bold text-slate-500 mb-3 tracking-wider uppercase">Auto-Assessed Health</Text>
              <View className="flex-row items-center justify-between mb-4">
                <View className="flex-row items-center">
                  <AlertTriangle size={18} color="#64748b" />
                  <Text className="text-slate-700 font-medium ml-2">Tree Status</Text>
                </View>
                <View className={`px-3 py-1 rounded-md ${treeData?.status === 'Diseased' ? 'bg-red-100' : 'bg-teal-100'}`}>
                  <Text className={`font-bold ${treeData?.status === 'Diseased' ? 'text-red-700' : 'text-teal-700'}`}>
                    {treeData?.status || "Bearing"}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center justify-between">
                <View className="flex-row items-center">
                  <CheckCircle2 size={18} color="#64748b" />
                  <Text className="text-slate-700 font-medium ml-2">Health Rating</Text>
                </View>
                <View className={`px-3 py-1 rounded-md ${
                  treeData?.health === 'Weak' ? 'bg-red-500' :
                  treeData?.health === 'Average' ? 'bg-amber-500' : 'bg-emerald-500'
                }`}>
                  <Text className="font-bold text-white">{treeData?.health || "Good"}</Text>
                </View>
              </View>
            </View>

            {/* Recommendations */}
            <Text className="text-lg font-bold text-slate-800 mb-4 mt-2">Real-time Analysis & Recommendations</Text>
            <View className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-3">
              <View className="flex-row items-center mb-2">
                <FlaskConical size={20} color="#8b5cf6" />
                <Text className="font-bold text-slate-800 ml-2">N-P-K Levels: {l.npk?.n}-{l.npk?.p}-{l.npk?.k}</Text>
                <View className="flex-1 items-end">
                  {getNPKRec(l.npk?.n, l.npk?.p, l.npk?.k).status === 'Good' ? <CheckCircle2 size={20} color="#10b981" /> : <XCircle size={20} color="#ef4444" />}
                </View>
              </View>
              <Text className="text-slate-600 text-sm">{getNPKRec(l.npk?.n, l.npk?.p, l.npk?.k).text}</Text>
            </View>

            <View className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-3">
              <View className="flex-row items-center mb-2">
                <Thermometer size={20} color="#f59e0b" />
                <Text className="font-bold text-slate-800 ml-2">Soil pH: {l.ph}</Text>
                <View className="flex-1 items-end">
                  {getPhRec(l.ph).status === 'Good' ? <CheckCircle2 size={20} color="#10b981" /> : <XCircle size={20} color="#ef4444" />}
                </View>
              </View>
              <Text className="text-slate-600 text-sm">{getPhRec(l.ph).text}</Text>
            </View>

            <View className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm mb-4">
              <View className="flex-row items-center mb-2">
                <Droplets size={20} color="#3b82f6" />
                <Text className="font-bold text-slate-800 ml-2">Moisture: {l.moisture}%</Text>
                <View className="flex-1 items-end">
                  {getMoistureRec(l.moisture).status === 'Good' ? <CheckCircle2 size={20} color="#10b981" /> : <XCircle size={20} color="#ef4444" />}
                </View>
              </View>
              <Text className="text-slate-600 text-sm">{getMoistureRec(l.moisture).text}</Text>
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

            {/* Prediction History Table */}
            <View className="flex-row justify-between items-center mb-2">
              <Text className="text-lg font-bold text-slate-800">Prediction History</Text>
              <TouchableOpacity onPress={handleGenerateReport} className="flex-row items-center bg-teal-100 px-3 py-1.5 rounded-full">
                <FileDown size={14} color="#0d9488" />
                <Text className="text-teal-700 font-bold text-xs ml-1">Export</Text>
              </TouchableOpacity>
            </View>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-8">
              <View className="bg-white rounded-xl border border-slate-200 overflow-hidden min-w-[640px]">
                <View className="flex-row bg-slate-100 p-3 border-b border-slate-200">
                  <Text className="w-24 font-bold text-xs text-slate-600">Date</Text>
                  <Text className="w-24 font-bold text-xs text-slate-600">NPK</Text>
                  <Text className="w-16 font-bold text-xs text-slate-600">pH</Text>
                  <Text className="w-16 font-bold text-xs text-slate-600">Moist.</Text>
                  <Text className="w-20 font-bold text-xs text-slate-600">Predicted</Text>
                  <Text className="w-20 font-bold text-xs text-slate-600">Actual</Text>
                  <Text className="w-16 font-bold text-xs text-slate-600">Source</Text>
                  <Text className="flex-1 font-bold text-xs text-slate-600">Disease</Text>
                </View>
                {historyList.map((h: any, i: number) => (
                  <View key={i} className="flex-row p-3 border-b border-slate-100 items-center">
                    <Text className="w-24 text-xs text-slate-800">{h.date}</Text>
                    <Text className="w-24 text-xs text-slate-800">{h.npk?.n}-{h.npk?.p}-{h.npk?.k}</Text>
                    <Text className="w-16 text-xs text-slate-800">{h.ph}</Text>
                    <Text className="w-16 text-xs text-slate-800">{h.moisture}%</Text>
                    <Text className="w-20 text-xs text-slate-800 font-bold">{parseFloat(h.finalYield).toFixed(0)}</Text>
                    <Text className="w-20 text-xs text-emerald-600 font-bold">{h.actualYield || '-'}</Text>
                    <Text className="w-16 text-xs text-slate-400">{h.source === 'iot' ? '⚡IoT' : '✏️Manual'}</Text>
                    <Text className="flex-1 text-xs text-red-500 font-medium">{h.disease || 'None'}</Text>
                  </View>
                ))}
                {historyList.length === 0 && (
                  <Text className="text-center text-slate-400 py-4 text-xs">No prediction history yet. Run a prediction above!</Text>
                )}
              </View>
            </ScrollView>
          </View>
        ) : (
          <View className="bg-amber-50 border border-amber-200 rounded-2xl p-5 items-center">
            <Info size={32} color="#f59e0b" />
            <Text className="text-amber-800 font-bold text-base mt-2 text-center">No Prediction Yet</Text>
            <Text className="text-amber-600 text-sm mt-1 text-center">
              {iotLive
                ? "IoT connected. Running first prediction..."
                : "Enter your soil sensor values above and tap \"Run AI Yield Prediction\"."}
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
