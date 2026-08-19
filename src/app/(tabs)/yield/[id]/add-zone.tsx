import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator } from "react-native";
import { ArrowLeft, Palette, TreePine, FileText, Save, AlertCircle, Check } from "lucide-react-native";
import { useYieldApp } from "@/store-yield/YieldAppContext";
import { createZone, updateZone, deleteZone, getClaimedTreeNumbers } from "@/services/yieldFarmDb";
import type { Zone } from "@/types/yield";



const PRESET_COLORS = [
  "#ef4444", "#f59e0b", "#22c55e", "#3b82f6", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#6366f1", "#84cc16",
];

const inputCls = "w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 bg-white";

export default function AddZoneScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const farmId = params.id as string;
  const zoneId = params.zoneId as string | undefined;
  const { user, currentZones, currentFarm } = useYieldApp();
  const editingZone = zoneId ? currentZones.find((z) => z.id === zoneId) : null;

  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [selectedTrees, setSelectedTrees] = useState<number[]>([]);
  const [notes, setNotes] = useState("");
  const [claimed, setClaimed] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!zoneId);

  useEffect(() => {
    if (!zoneId || !editingZone) {
      if (!zoneId) setLoaded(true);
      return;
    }
    setName(editingZone.name);
    setColor(editingZone.color);
    setSelectedTrees(editingZone.treeNumbers ?? []);
    setNotes(editingZone.notes);
    setLoaded(true);
  }, [zoneId, editingZone]);

  useEffect(() => {
    if (!user || !farmId) return;
    getClaimedTreeNumbers(user.uid, farmId, zoneId).then(setClaimed);
  }, [user, farmId, zoneId]);

  const totalTrees = currentFarm?.totalTrees ?? 0;
  const treeNumbers = Array.from({ length: totalTrees }, (_, i) => i + 1);

  const toggleTree = (n: number) => {
    setError(null);
    setSelectedTrees((prev) => {
      if (prev.includes(n)) return prev.filter((x) => x !== n);
      if (claimed.has(n)) {
        setError(`Tree #${String(n).padStart(2, "0")} is already assigned to another zone.`);
        return prev;
      }
      return [...prev, n];
    });
  };

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) return setError("Zone name is required.");
    if (selectedTrees.length === 0) return setError("Select at least one tree for this zone.");

    setError(null);
    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        color,
        treeNumbers: selectedTrees.sort((a, b) => a - b),
        notes: notes.trim(),
      };
      if (zoneId) {
        await updateZone(user.uid, farmId, zoneId, data);
      } else {
        await createZone(user.uid, farmId, data);
      }
      router.back();
    } catch (e: any) {
      setError(`Save failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!user || !zoneId) return;
    setSaving(true);
    try {
      await deleteZone(user.uid, farmId, zoneId);
      router.back();
    } catch (e: any) {
      setError(`Delete failed: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (!loaded) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#1e7550" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-slate-50">
      <View className="bg-white px-3 pt-4 pb-3.5 shadow-sm flex-row items-center gap-2">
        <TouchableOpacity onPress={() => router.back()} className="w-9 h-9 rounded-full items-center justify-center">
          <ArrowLeft size={20} color="#475569" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-slate-800">{zoneId ? "Edit Zone" : "Add Zone"}</Text>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ gap: 16, paddingBottom: 96 }}>
        <View className="bg-white rounded-2xl p-5 border border-slate-100">
          <View className="gap-4">
            <View>
              <View className="flex-row items-center gap-2 mb-1.5">
                <Palette size={14} color="#1e7550" />
                <Text className="text-xs font-medium text-slate-600">Zone Name</Text>
              </View>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Zone A - North Field"
                placeholderTextColor="#cbd5e1"
                className={inputCls}
              />
            </View>

            <View>
              <View className="flex-row items-center gap-2 mb-2">
                <View className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                <Text className="text-xs font-medium text-slate-600">Zone Color</Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setColor(c)}
                    className="w-9 h-9 rounded-full items-center justify-center"
                    style={{ backgroundColor: c }}
                  >
                    {color === c && <Check size={16} color="#fff" />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View>
              <View className="flex-row items-center gap-2 mb-2">
                <TreePine size={14} color="#1e7550" />
                <Text className="text-xs font-medium text-slate-600">Select Trees</Text>
                <Text className="ml-auto text-[10px] text-slate-400">{selectedTrees.length} selected</Text>
              </View>
              <Text className="text-[11px] text-slate-400 mb-2">Trees already in another zone are disabled.</Text>
              <View className="flex-row flex-wrap gap-1.5 max-h-48">
                {treeNumbers.map((n) => {
                  const isSelected = selectedTrees.includes(n);
                  const isClaimed = claimed.has(n);
                  return (
                    <TouchableOpacity
                      key={n}
                      onPress={() => toggleTree(n)}
                      disabled={isClaimed}
                      className={`w-9 h-9 rounded-lg items-center justify-center ${isSelected ? "" : isClaimed ? "bg-slate-100" : "bg-slate-100"}`}
                      style={isSelected ? { backgroundColor: color } : undefined}
                    >
                      <Text
                        style={{ color: isSelected ? "#fff" : isClaimed ? "#cbd5e1" : "#64748b" }}
                        className="text-xs font-bold"
                      >
                        {String(n).padStart(2, "0")}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View>
              <View className="flex-row items-center gap-2 mb-1.5">
                <FileText size={14} color="#1e7550" />
                <Text className="text-xs font-medium text-slate-600">Zone Notes (Optional)</Text>
              </View>
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="e.g. Different fertilizer schedule"
                placeholderTextColor="#cbd5e1"
                multiline
                className={`${inputCls} min-h-[60px]`}
              />
            </View>

            {error && (
              <View className="flex-row items-start gap-1.5 bg-red-50 rounded-lg px-3 py-2">
                <AlertCircle size={16} color="#dc2626" />
                <Text className="text-sm text-red-600 flex-1">{error}</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              className="flex-row items-center justify-center gap-2 bg-forest-600 py-3.5 rounded-xl"
              style={saving ? { opacity: 0.6 } : undefined}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Save size={18} color="#fff" />
                  <Text className="text-white font-semibold text-sm">{zoneId ? "Update Zone" : "Create Zone"}</Text>
                </>
              )}
            </TouchableOpacity>

            {zoneId && (
              <TouchableOpacity
                onPress={handleDelete}
                disabled={saving}
                className="flex-row items-center justify-center gap-2 bg-red-50 py-3 rounded-xl"
              >
                <Text className="text-sm font-semibold text-red-600">Delete Zone</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
