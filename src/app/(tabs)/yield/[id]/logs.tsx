import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import { View, Text, TouchableOpacity, TextInput, ScrollView, Modal, ActivityIndicator, TouchableWithoutFeedback, Image, Platform } from "react-native";
import { ref, push, set, update, remove, onValue, serverTimestamp } from "firebase/database";
import {
  ClipboardList, Calendar, Hash, FileText, Plus, AlertCircle,
  Pencil, Trash2, Coins, TrendingUp, X, AlertTriangle, Minus,
  ArrowLeft, ChevronRight
} from "lucide-react-native";
import { rtdb } from "@/services/firebase";
import { useYieldApp } from "@/store/YieldAppContext";
import { ImageBackground } from "react-native";
import { DatePickerField } from "@/components/yield/DatePicker";
import type { HarvestLog } from "@/types/yield";



const inputCls = "w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 bg-white";

export default function logsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { id: farmIdRaw } = useLocalSearchParams();
  const farmId = Array.isArray(farmIdRaw) ? farmIdRaw[0] : (farmIdRaw || null);
  const { user, farms, setCurrentFarmId, currentFarmId } = useYieldApp();  
  useEffect(() => {
    if (farmId && currentFarmId !== farmId) {
      setCurrentFarmId(farmId);
    }
  }, [farmId, currentFarmId, setCurrentFarmId]);

  const farm = farms.find((f) => f.id === farmId);
  const harvestPath = user && farm ? `/harvests/${user.uid}/${farmId}` : "";

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [gradeA, setGradeA] = useState("");
  const [gradeB, setGradeB] = useState("");
  const [gradeC, setGradeC] = useState("");
  const [priceA, setPriceA] = useState("");
  const [priceB, setPriceB] = useState("");
  const [priceC, setPriceC] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [remoteLogs, setRemoteLogs] = useState<HarvestLog[]>([]);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const totalNuts = useMemo(() => {
    const a = parseInt(gradeA, 10) || 0;
    const b = parseInt(gradeB, 10) || 0;
    const c = parseInt(gradeC, 10) || 0;
    return a + b + c;
  }, [gradeA, gradeB, gradeC]);

  const totalRevenue = useMemo(() => {
    const pA = parseFloat(priceA) || 0;
    const pB = parseFloat(priceB) || 0;
    const pC = parseFloat(priceC) || 0;
    const a = parseInt(gradeA, 10) || 0;
    const b = parseInt(gradeB, 10) || 0;
    const c = parseInt(gradeC, 10) || 0;
    return (a * pA) + (b * pB) + (c * pC);
  }, [gradeA, gradeB, gradeC, priceA, priceB, priceC]);

  const monthlyStats = useMemo(() => {
    const currentMonth = new Date().toISOString().slice(0, 7);
    let nuts = 0;
    let rev = 0;
    remoteLogs.forEach(log => {
      if (log.date.startsWith(currentMonth)) {
        nuts += log.nutCount;
        rev += log.revenue;
      }
    });
    return { nuts, rev, avgPrice: nuts > 0 ? (rev / nuts) : 0 };
  }, [remoteLogs]);

  useEffect(() => {
    let mounted = true;
    const fetchMarketPrices = async () => {
      try {
        const apiUrl = 'http://' + (Constants.expoConfig?.hostUri?.split(':')[0] || '192.168.1.7') + ':5000/api/cda-rates';
        const response = await fetch(apiUrl);
        if (response.ok) {
          const data = await response.json();
          if (mounted) {
            setPriceA((prev) => prev || String(data.a_grade_price ?? 155));
            setPriceB((prev) => prev || String(data.b_grade_price ?? 120));
            setPriceC((prev) => prev || String(data.c_grade_price ?? 95));
          }
        } else {
          throw new Error('Failed to fetch');
        }
      } catch (error) {
        if (mounted) {
          // Fallback if backend is not reachable
          setPriceA((prev) => prev || "155");
          setPriceB((prev) => prev || "120");
          setPriceC((prev) => prev || "95");
        }
      }
    };
    fetchMarketPrices();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    if (!harvestPath) return;
    try {
      const harvestRef = ref(rtdb, harvestPath);
      unsub = onValue(
        harvestRef,
        (snap) => {
          const v = snap.val();
          if (v) {
            const arr: HarvestLog[] = Object.entries(v).map(([id, val]: [string, any]) => ({
              id,
              date: val.date ?? "",
              nutCount: val.nutCount ?? (val.gradeA ?? 0) + (val.gradeB ?? 0) + (val.gradeC ?? 0),
              gradeA: val.gradeA ?? 0,
              gradeB: val.gradeB ?? 0,
              gradeC: val.gradeC ?? 0,
              priceA: val.priceA ?? 155,
              priceB: val.priceB ?? 120,
              priceC: val.priceC ?? 95,
              revenue: val.revenue ?? 0,
              notes: val.notes ?? "",
              createdAt: val.createdAt ?? 0,
            }));
            arr.sort((a, b) => b.createdAt - a.createdAt);
            setRemoteLogs(arr);
            setSyncError(null);
          } else {
            setRemoteLogs([]);
          }
        },
        (err) => setSyncError(`Sync error: ${err.message}`)
      );
    } catch (e: any) {
      setSyncError(`Sync error: ${e.message}`);
    }
    return () => unsub?.();
  }, [harvestPath]);

  const resetForm = useCallback(() => {
    setDate(new Date().toISOString().slice(0, 10));
    setGradeA("");
    setGradeB("");
    setGradeC("");
    setPriceA("155");
    setPriceB("120");
    setPriceC("95");
    setNotes("");
    setError(null);
    setEditingId(null);
    setShowForm(false);
  }, []);

  const handleEdit = useCallback((log: HarvestLog) => {
    setEditingId(log.id);
    setDate(log.date);
    setGradeA(log.gradeA ? String(log.gradeA) : "");
    setGradeB(log.gradeB ? String(log.gradeB) : "");
    setGradeC(log.gradeC ? String(log.gradeC) : "");
    setPriceA(log.priceA ? String(log.priceA) : "155");
    setPriceB(log.priceB ? String(log.priceB) : "120");
    setPriceC(log.priceC ? String(log.priceC) : "95");
    setNotes(log.notes);
    setError(null);
    setShowForm(true);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
  }, []);

  const handleSave = useCallback(async () => {
    if (!date) return setError("Select a harvest date.");
    if (totalNuts <= 0) return setError("Enter at least one nut count.");
    if (!harvestPath) return setError("Farm not loaded yet.");

    setError(null);
    setSaving(true);

    const entry = {
      date,
      nutCount: totalNuts,
      gradeA: parseInt(gradeA, 10) || 0,
      gradeB: parseInt(gradeB, 10) || 0,
      gradeC: parseInt(gradeC, 10) || 0,
      priceA: parseFloat(priceA) || 0,
      priceB: parseFloat(priceB) || 0,
      priceC: parseFloat(priceC) || 0,
      revenue: totalRevenue,
      notes: notes.trim(),
    };

    try {
      if (editingId) {
        await update(ref(rtdb, `${harvestPath}/${editingId}`), entry);
      } else {
        const node = push(ref(rtdb, harvestPath));
        await set(node, { ...entry, createdAt: serverTimestamp() });
      }
      resetForm();
    } catch (e: any) {
      setError(`Save failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }, [date, totalNuts, harvestPath, gradeA, gradeB, gradeC, priceA, priceB, priceC, totalRevenue, notes, editingId, resetForm]);

  const handleDelete = useCallback(async (recordId: string) => {
    if (!harvestPath) return;
    setDeleting(true);
    try {
      await remove(ref(rtdb, `${harvestPath}/${recordId}`));
      if (editingId === recordId) resetForm();
    } catch (e: any) {
      setSyncError(`Delete failed: ${e.message}`);
    } finally {
      setDeleting(false);
      setConfirmDelete(null);
    }
  }, [harvestPath, editingId, resetForm]);

  return (
    <View className="flex-1 bg-[#0b6441]">
      {/* Main Header with Blurred Background */}
      <ImageBackground 
        source={{ uri: 'https://i.ibb.co/35TvdXdK/farm-logs.png' }} 
        className="pt-14 pb-12 px-6 flex-row items-start justify-between relative overflow-hidden"
      >
        <View className="absolute inset-0 bg-[#0b6441]/20" />
        <View className="flex-row items-start gap-4 z-10">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 rounded-full bg-white/20 items-center justify-center">
            <ArrowLeft size={20} color="#fff" />
          </TouchableOpacity>
          
          <View className="mt-1">
            <Text className="text-xl font-bold text-white">Farm Logs &</Text>
            <Text className="text-xl font-bold text-white">Harvest Records</Text>
            <Text className="text-[11px] text-emerald-100 mt-1 tracking-wide">Track and manage your harvest records</Text>
          </View>
        </View>
      </ImageBackground>

      {/* Main Overlapping Content */}
      <View className="flex-1 bg-[#F8F9FA] rounded-t-[32px] overflow-hidden shadow-sm">
        <ScrollView ref={scrollRef} className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          
          {/* Top Cards (3 columns) */}
          <View className="flex-row justify-between gap-3 mb-5 mt-2">
            <View className="bg-white rounded-2xl p-4 flex-1 border border-slate-100 shadow-sm items-center">
              <Image source={{ uri: 'https://i.ibb.co/gbSQjznt/coconut-fruit.png' }} style={{ width: 44, height: 44, resizeMode: 'contain' }} />
              <Text className="text-[9px] text-emerald-600 font-bold mt-3 text-center">Monthly Nuts</Text>
              <Text className="text-[22px] font-black text-slate-800 mt-0.5">{monthlyStats.nuts.toLocaleString()}</Text>
              <Text className="text-[9px] text-slate-400 mt-1">This Month</Text>
            </View>
            
            <View className="bg-white rounded-2xl p-4 flex-1 border border-orange-50 shadow-sm items-center" style={{ backgroundColor: "#FDFBF7" }}>
              <Image source={{ uri: 'https://i.ibb.co/nqg19nYx/rupee.png' }} style={{ width: 44, height: 44, resizeMode: 'contain' }} />
              <Text className="text-[9px] text-orange-500 font-bold mt-3 text-center">Monthly Revenue</Text>
              <Text className="text-lg font-black text-slate-800 mt-1 whitespace-nowrap">LKR {monthlyStats.rev.toLocaleString()}</Text>
              <Text className="text-[9px] text-slate-400 mt-1">This Month</Text>
            </View>
            
            <View className="bg-white rounded-2xl p-4 flex-1 border border-blue-50 shadow-sm items-center" style={{ backgroundColor: "#F7F9FD" }}>
              <Image source={{ uri: 'https://i.ibb.co/GffY8kpj/ai-analysis.png' }} style={{ width: 44, height: 44, resizeMode: 'contain' }} />
              <Text className="text-[9px] text-blue-600 font-bold mt-3 text-center">Avg Price / Nut</Text>
              <Text className="text-lg font-black text-slate-800 mt-1">LKR {monthlyStats.avgPrice.toFixed(1)}</Text>
              <Text className="text-[9px] text-slate-400 mt-1">Average Rate</Text>
            </View>
          </View>

          {/* Log New Harvest Button */}
          <TouchableOpacity onPress={() => setShowForm(true)} className="bg-[#0b6441] rounded-2xl p-4 flex-row items-center justify-between mb-8 shadow-sm">
            <View className="flex-row items-center gap-4">
              <View className="w-12 h-12 rounded-full bg-white/10 items-center justify-center border border-white/20">
                <Plus size={24} color="#fff" strokeWidth={2.5} />
              </View>
              <View>
                <Text className="text-white font-bold text-base tracking-wide">Log New Harvest</Text>
                <Text className="text-emerald-100 text-[11px] mt-0.5">Add a new harvest record</Text>
              </View>
            </View>
            <ChevronRight size={24} color="#fff" />
          </TouchableOpacity>

          {/* Harvest History List */}
          <View className="flex-row items-center justify-between mb-4">
            <View className="flex-row items-center gap-2">
              <Calendar size={18} color="#0b6441" />
              <Text className="text-base font-bold text-slate-800 tracking-wide">Harvest History</Text>
            </View>
            <View className="bg-slate-200 px-3 py-1 rounded-full">
              <Text className="text-[10px] font-bold text-slate-600">{remoteLogs.length} Records</Text>
            </View>
          </View>

          {remoteLogs.length === 0 ? (
            <View className="items-center py-10 bg-white rounded-3xl border border-slate-100 shadow-sm">
              <ClipboardList size={40} color="#cbd5e1" />
              <Text className="text-sm text-slate-400 mt-3 font-bold">No harvest records yet.</Text>
            </View>
          ) : (
            <View className="gap-4">
              {remoteLogs.map((log) => (
                <View key={log.id} className="bg-white rounded-[24px] p-5 border border-slate-100 shadow-sm">
                  <View className="flex-row items-start gap-4">
                    {/* Date Badge */}
                    <View className="w-12 rounded-xl overflow-hidden border border-emerald-100 shadow-sm bg-emerald-50">
                      <View className="py-1 items-center justify-center border-b border-emerald-100">
                         <Text className="text-[9px] font-black text-emerald-800 uppercase tracking-widest">{new Date(log.date).toLocaleString('default', { month: 'short' })}</Text>
                      </View>
                      <View className="py-2 items-center justify-center bg-emerald-50/50">
                         <Text className="text-[18px] font-black text-emerald-900 leading-none">{log.date.slice(8,10)}</Text>
                      </View>
                    </View>
                    
                    {/* Log Details */}
                    <View className="flex-1 pt-0.5">
                      <View className="flex-row items-start justify-between">
                        <View>
                          <Text className="text-base font-black text-slate-800">{log.nutCount.toLocaleString()} Nuts</Text>
                          <Text className="text-[11px] text-slate-400 mt-1 font-medium">{log.date}</Text>
                        </View>
                        <View className="items-end">
                          <TrendingUp size={16} color="#10b981" />
                          <Text className="text-base font-black text-emerald-700 mt-1">LKR {log.revenue.toLocaleString()}</Text>
                        </View>
                      </View>
                      
                      <View className="flex-row items-center gap-2 mt-3">
                        <GradeChip label="A" value={log.gradeA} bg="#dcfce7" textColor="#166534" />
                        <GradeChip label="B" value={log.gradeB} bg="#ffedd5" textColor="#9a3412" />
                        <GradeChip label="C" value={log.gradeC} bg="#f1f5f9" textColor="#475569" />
                      </View>
                    </View>
                  </View>

                  {/* Actions */}
                  <View className="flex-row items-center justify-between border-t border-slate-100 mt-4 pt-4 px-2">
                    <TouchableOpacity
                      onPress={() => handleEdit(log)}
                      className="flex-row items-center gap-1.5 px-4"
                    >
                      <Pencil size={14} color="#059669" />
                      <Text className="text-xs font-bold text-emerald-700">Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setConfirmDelete(log.id)}
                      className="flex-row items-center gap-1.5 px-4"
                    >
                      <Trash2 size={14} color="#dc2626" />
                      <Text className="text-xs font-bold text-red-600">Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>

      {/* NEW HARVEST ENTRY MODAL / FULL SCREEN */}
      <Modal visible={showForm || !!editingId} animationType="slide" transparent={false}>
        <View className="flex-1 bg-[#0b6441]">
          {/* Modal Header */}
          <View className="pt-14 pb-8 px-6 flex-row items-start justify-between relative">
            <View className="flex-row items-start gap-4 z-10">
              <TouchableOpacity onPress={resetForm} className="w-10 h-10 rounded-full bg-white/10 items-center justify-center mt-1">
                <ArrowLeft size={20} color="#fff" />
              </TouchableOpacity>
              
              <View className="mt-1">
                <Text className="text-xl font-bold text-white">
                  {editingId ? "Edit Harvest Record" : "New Harvest Entry"}
                </Text>
                <Text className="text-[11px] text-emerald-100 mt-1 tracking-wide">Enter your harvest details</Text>
              </View>
            </View>

            <TouchableOpacity onPress={resetForm} className="w-10 h-10 rounded-full bg-white/10 items-center justify-center mt-1">
              <X size={20} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Modal Content */}
          <View className="flex-1 bg-[#F8F9FA] rounded-t-[32px] overflow-hidden shadow-sm">
            <ScrollView className="flex-1" contentContainerStyle={{ padding: 24, paddingBottom: 100 }}>
              
              <View className="mb-6">
                <Text className="text-xs font-bold text-slate-700 mb-2 flex-row items-center gap-2">
                  <Calendar size={14} color="#64748b" /> Harvest Date
                </Text>
                <DatePickerField date={date} setDate={setDate} />
              </View>

              <View className="mb-6">
                <Text className="text-xs font-bold text-slate-700 mb-4 flex-row items-center gap-2">
                  <Image source={{ uri: 'https://i.ibb.co/gbSQjznt/coconut-fruit.png' }} style={{ width: 14, height: 14, tintColor: "#1e7550" }} /> Nut Quality / Grade Breakdown
                </Text>
                
                <View className="gap-5">
                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                      <Image source={{ uri: 'https://i.ibb.co/HTMzGrqF/coconut.png' }} style={{ width: 44, height: 44, resizeMode: 'contain', tintColor: '#22c55e' }} />
                      <View>
                        <Text className="text-sm font-black text-slate-800">A-Grade</Text>
                        <Text className="text-[10px] text-slate-400 font-medium">Large Nuts</Text>
                      </View>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <TouchableOpacity onPress={() => setGradeA(String(Math.max(0, (parseInt(gradeA)||0)-1)))} className="w-9 h-9 rounded-lg bg-slate-100 items-center justify-center border border-slate-200">
                        <Minus size={16} color="#64748b" />
                      </TouchableOpacity>
                      <View className="items-center">
                        <TextInput value={gradeA} onChangeText={setGradeA} keyboardType="numeric" className="w-14 h-9 border border-slate-200 rounded-lg text-center font-bold text-slate-800 bg-white shadow-sm" />
                        <Text className="text-[8px] text-slate-400 mt-1 absolute -bottom-4">e.g. 80</Text>
                      </View>
                      <TouchableOpacity onPress={() => setGradeA(String((parseInt(gradeA)||0)+1))} className="w-9 h-9 rounded-lg bg-emerald-50 items-center justify-center border border-emerald-100">
                        <Plus size={16} color="#059669" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                      <Image source={{ uri: 'https://i.ibb.co/HTMzGrqF/coconut.png' }} style={{ width: 34, height: 34, resizeMode: 'contain', tintColor: '#f59e0b' }} />
                      <View>
                        <Text className="text-sm font-black text-slate-800">B-Grade</Text>
                        <Text className="text-[10px] text-slate-400 font-medium">Medium Nuts</Text>
                      </View>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <TouchableOpacity onPress={() => setGradeB(String(Math.max(0, (parseInt(gradeB)||0)-1)))} className="w-9 h-9 rounded-lg bg-slate-100 items-center justify-center border border-slate-200">
                        <Minus size={16} color="#64748b" />
                      </TouchableOpacity>
                      <View className="items-center">
                        <TextInput value={gradeB} onChangeText={setGradeB} keyboardType="numeric" className="w-14 h-9 border border-slate-200 rounded-lg text-center font-bold text-slate-800 bg-white shadow-sm" />
                        <Text className="text-[8px] text-slate-400 mt-1 absolute -bottom-4">e.g. 45</Text>
                      </View>
                      <TouchableOpacity onPress={() => setGradeB(String((parseInt(gradeB)||0)+1))} className="w-9 h-9 rounded-lg bg-emerald-50 items-center justify-center border border-emerald-100">
                        <Plus size={16} color="#059669" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                      <Image source={{ uri: 'https://i.ibb.co/HTMzGrqF/coconut.png' }} style={{ width: 26, height: 26, resizeMode: 'contain', tintColor: '#94a3b8' }} />
                      <View>
                        <Text className="text-sm font-black text-slate-800">C-Grade</Text>
                        <Text className="text-[10px] text-slate-400 font-medium">Small & Rejected</Text>
                      </View>
                    </View>
                    <View className="flex-row items-center gap-2">
                      <TouchableOpacity onPress={() => setGradeC(String(Math.max(0, (parseInt(gradeC)||0)-1)))} className="w-9 h-9 rounded-lg bg-slate-100 items-center justify-center border border-slate-200">
                        <Minus size={16} color="#64748b" />
                      </TouchableOpacity>
                      <View className="items-center">
                        <TextInput value={gradeC} onChangeText={setGradeC} keyboardType="numeric" className="w-14 h-9 border border-slate-200 rounded-lg text-center font-bold text-slate-800 bg-white shadow-sm" />
                        <Text className="text-[8px] text-slate-400 mt-1 absolute -bottom-4">e.g. 130</Text>
                      </View>
                      <TouchableOpacity onPress={() => setGradeC(String((parseInt(gradeC)||0)+1))} className="w-9 h-9 rounded-lg bg-emerald-50 items-center justify-center border border-emerald-100">
                        <Plus size={16} color="#059669" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              </View>

              {/* Total Nuts Card */}
              <View className="bg-[#EBF7EF] rounded-2xl p-5 mb-8 flex-row items-center justify-between border border-emerald-100 shadow-sm relative overflow-hidden">
                <View className="z-10">
                  <Text className="text-[11px] font-bold text-emerald-700 mb-1">Total Nuts Harvested</Text>
                  <View className="flex-row items-baseline gap-1">
                    <Text className="text-3xl font-black text-slate-900">{totalNuts.toLocaleString()}</Text>
                    <Text className="text-xs font-bold text-slate-700">Nuts</Text>
                  </View>
                </View>
                {/* Decorative image/icon placeholder for basket */}
                <Image source={{ uri: 'https://i.ibb.co/gbSQjznt/coconut-fruit.png' }} style={{ width: 80, height: 80, resizeMode: 'contain', position: 'absolute', right: -10, bottom: -10, opacity: 0.1, tintColor: '#10b981' }} />
              </View>

              <View className="mb-6">
                <Text className="text-xs font-bold text-slate-700 mb-3 flex-row items-center gap-2">
                  <Hash size={14} color="#64748b" /> Unit Price per Grade (LKR)
                </Text>
                <View className="gap-3">
                  <View>
                    <Text className="text-[10px] font-black text-slate-700 mb-1">A-Grade Price</Text>
                    <TextInput value={priceA} onChangeText={setPriceA} keyboardType="numeric" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 shadow-sm" />
                  </View>
                  <View>
                    <Text className="text-[10px] font-black text-slate-700 mb-1">B-Grade Price</Text>
                    <TextInput value={priceB} onChangeText={setPriceB} keyboardType="numeric" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 shadow-sm" />
                  </View>
                  <View>
                    <Text className="text-[10px] font-black text-slate-700 mb-1">C-Grade Price</Text>
                    <TextInput value={priceC} onChangeText={setPriceC} keyboardType="numeric" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-800 shadow-sm" />
                  </View>
                </View>
                <Text className="text-[10px] text-slate-400 mt-3 text-right font-medium">Prices updated: {new Date().toLocaleDateString('en-GB')}</Text>
              </View>

              {/* Total Revenue Card */}
              <View className="bg-[#042f1c] rounded-2xl p-5 mb-8 shadow-md relative overflow-hidden">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-[11px] font-bold text-white tracking-wide">Total Revenue</Text>
                  <TrendingUp size={16} color="#fff" />
                </View>
                <Text className="text-[22px] font-black text-white">LKR {totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</Text>
                <Text className="text-[9px] text-emerald-200 mt-1">Calculated based on entered values</Text>
                {/* Decorative image/icon placeholder for coins */}
                <Image source={{ uri: 'https://i.ibb.co/nqg19nYx/rupee.png' }} style={{ width: 100, height: 100, resizeMode: 'contain', position: 'absolute', right: -20, bottom: -20, opacity: 0.1, tintColor: '#fff' }} />
              </View>

              <View className="mb-6">
                <Text className="text-xs font-bold text-slate-700 mb-2 flex-row items-center gap-2">
                  <FileText size={14} color="#64748b" /> Maintenance Notes <Text className="text-slate-400 font-normal">(Optional)</Text>
                </Text>
                <View className="relative">
                  <TextInput
                    value={notes}
                    onChangeText={setNotes}
                    placeholder="Fertilizer applied, pruning, irrigation..."
                    placeholderTextColor="#cbd5e1"
                    multiline
                    maxLength={200}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-4 text-sm text-slate-800 min-h-[100px] shadow-sm"
                    textAlignVertical="top"
                  />
                  <Text className="text-[9px] font-bold text-slate-400 absolute bottom-3 right-3">{notes.length}/200</Text>
                </View>
              </View>

              {error && (
                <View className="flex-row items-start gap-2 bg-red-50 rounded-xl p-3 mb-4">
                  <AlertCircle size={16} color="#dc2626" />
                  <Text className="text-xs text-red-600 flex-1 font-bold">{error}</Text>
                </View>
              )}

            </ScrollView>
            
            {/* Sticky Save Button at Bottom */}
            <View className="p-4 bg-white border-t border-slate-100 shadow-md">
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                className="bg-[#0b6441] flex-row items-center justify-center gap-2 py-4 rounded-xl shadow-sm"
                style={saving ? { opacity: 0.7 } : {}}
              >
                {saving ? (
                  <>
                    <ActivityIndicator size="small" color="#fff" />
                    <Text className="text-white font-bold text-sm">Saving…</Text>
                  </>
                ) : (
                  <>
                    <FileText size={16} color="#fff" />
                    <Text className="text-white font-bold text-sm tracking-wide">Save Harvest Record</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* delete confirmation modal */}
      <Modal visible={!!confirmDelete} transparent animationType="slide" onRequestClose={() => !deleting && setConfirmDelete(null)}>
        <TouchableWithoutFeedback onPress={() => !deleting && setConfirmDelete(null)}>
          <View className="flex-1 justify-end bg-black/40">
            <TouchableWithoutFeedback>
              <View className="bg-white rounded-t-3xl p-6">
                <View className="flex-row items-center gap-3 mb-3">
                  <View className="w-10 h-10 rounded-full bg-red-50 items-center justify-center">
                    <AlertTriangle size={20} color="#dc2626" />
                  </View>
                  <Text className="text-base font-bold text-slate-800">Delete this record?</Text>
                </View>
                <Text className="text-sm text-slate-500 mb-5">
                  This harvest entry will be permanently removed. This cannot be undone.
                </Text>
                <View className="flex-row gap-3">
                  <TouchableOpacity
                    onPress={() => setConfirmDelete(null)}
                    disabled={deleting}
                    className="flex-1 py-3 rounded-xl items-center bg-slate-100"
                  >
                    <Text className="text-sm font-semibold text-slate-600">Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => confirmDelete && handleDelete(confirmDelete)}
                    disabled={deleting}
                    className="flex-1 py-3 rounded-xl items-center bg-red-600 flex-row justify-center gap-2"
                  >
                    {deleting ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <Trash2 size={16} color="#fff" />
                        <Text className="text-sm font-semibold text-white">Delete</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
}

function GradeInput({ label, value, onChange, color, placeholder }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  color: string;
  placeholder: string;
}) {
  const num = parseInt(value, 10) || 0;
  const updateCount = (diff: number) => {
    const next = Math.max(0, num + diff);
    onChange(next === 0 ? "" : String(next));
  };

  return (
    <View className="flex-row items-center gap-1.5 border-b border-slate-100 pb-1.5">
      <View className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: color }} />
      <Text className="text-[9px] font-bold text-slate-700 flex-1">{label}</Text>
      
      <View className="flex-row items-center gap-1.5">
        <TouchableOpacity onPress={() => updateCount(-1)} className="w-6 h-6 rounded-full border border-slate-200 items-center justify-center bg-slate-50">
          <Minus size={12} color="#94a3b8" />
        </TouchableOpacity>
        
        <TextInput
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor="#cbd5e1"
          keyboardType="numeric"
          className="w-12 rounded-md border border-slate-200 py-1 text-xs font-bold text-slate-800 text-center bg-white"
        />
        
        <TouchableOpacity onPress={() => updateCount(1)} className="w-6 h-6 rounded-full border border-emerald-200 items-center justify-center bg-emerald-50">
          <Plus size={12} color="#059669" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function GradeChip({ label, value, bg, textColor }: {
  label: string;
  value: number;
  bg: string;
  textColor: string;
}) {
  return (
    <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded-full" style={{ backgroundColor: bg }}>
      <Text className="text-[10px] font-bold" style={{ color: textColor }}>{label}: {value.toLocaleString()}</Text>
    </View>
  );
}
