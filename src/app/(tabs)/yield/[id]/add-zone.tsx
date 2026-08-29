import { useRouter, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { View, Text, TouchableOpacity, TextInput, ScrollView, ActivityIndicator, Image } from "react-native";
import { ArrowLeft, Leaf, HelpCircle, Check, Plus, Info } from "lucide-react-native";
import { useYieldApp } from "@/store/YieldAppContext";
import { createZone, updateZone } from "@/services/yieldFarmDb";
import { useEffect } from "react";

const PRESET_COLORS = ["#16a34a", "#facc15", "#3b82f6", "#a855f7", "#f97316", "#14b8a6"];

const inputCls = "w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 bg-white";

export default function AddZoneScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const farmId = params.id as string;
  const zoneId = params.zoneId as string | undefined;
  const { user, currentFarm, currentZones, refreshZones } = useYieldApp();

  const editingZone = zoneId ? currentZones.find((z) => z.id === zoneId) : null;

  const [name, setName] = useState("");
  const [color, setColor] = useState(PRESET_COLORS[0]);
  const [area, setArea] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (editingZone) {
      setName(editingZone.name);
      setColor(editingZone.color);
      setNotes(editingZone.notes);
      // area was not in Zone by default, but we can try to extract if it exists
      setArea((editingZone as any).estimatedArea || "");
    }
  }, [editingZone]);

  const handleSave = async () => {
    if (!user) return;
    if (!name.trim()) return;

    setSaving(true);
    try {
      const data = {
        name: name.trim(),
        color,
        treeNumbers: editingZone?.treeNumbers || [],
        notes: notes.trim(),
        estimatedArea: area.trim(),
      } as any;
      
      if (zoneId) {
        await updateZone(user.uid, farmId, zoneId, data);
      } else {
        await createZone(user.uid, farmId, data);
      }
      
      await refreshZones();
      router.back();
    } catch (e: any) {
      console.warn(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="bg-[#0C3B2E] pt-12 pb-4 px-4 flex-row items-center justify-between">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()} className="p-1 -ml-1">
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text className="text-white text-[19px] font-bold">{zoneId ? "Edit Zone" : "Add Zone"}</Text>
            <Text className="text-emerald-100 text-xs mt-0.5">Active Farm: {currentFarm?.name || "Sigiriya state"}</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-4" contentContainerStyle={{ paddingBottom: 40, gap: 16 }}>
        
        <Text className="text-base font-bold text-slate-800 mt-2">Create a New Zone</Text>

        {/* Form */}
        <View className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm gap-4">
          
          <View>
            <Text className="text-xs font-semibold text-slate-600 mb-2">Zone Name</Text>
            <View className="relative justify-center">
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="e.g. Zone A, North Block, Low Land"
                placeholderTextColor="#94a3b8"
                className={`${inputCls}`}
              />
            </View>
          </View>

          <View className="flex-row gap-4">
            <View className="flex-1">
              <Text className="text-xs font-semibold text-slate-600 mb-2">Select Zone Color</Text>
              <View className="flex-row flex-wrap gap-2">
                {PRESET_COLORS.map((c) => (
                  <TouchableOpacity
                    key={c}
                    onPress={() => setColor(c)}
                    className="w-8 h-8 rounded-full items-center justify-center"
                    style={{ backgroundColor: c }}
                  >
                    {color === c && <Check size={14} color="#fff" />}
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            
            <View className="flex-1">
              <Text className="text-xs font-semibold text-slate-600 mb-2">Estimated Area (Perches)</Text>
              <View className="relative justify-center">
                <TextInput
                  value={area}
                  onChangeText={setArea}
                  placeholder="e.g. 10"
                  placeholderTextColor="#94a3b8"
                  keyboardType="numeric"
                  className={`${inputCls} pr-16`}
                />
                <Text className="absolute right-3 text-[11px] text-slate-500 font-semibold">Perches</Text>
              </View>
            </View>
          </View>

          <View>
            <Text className="text-xs font-semibold text-slate-600 mb-2">Describe this Zone (Optional)</Text>
            <View className="relative">
              <TextInput
                value={notes}
                onChangeText={setNotes}
                placeholder="Add a short description about this zone..."
                placeholderTextColor="#94a3b8"
                multiline
                className={`${inputCls} min-h-[80px] text-left align-top`}
              />
            </View>
          </View>

          <View className="flex-row items-center gap-3 bg-green-50 rounded-xl p-3 border border-green-100">
            <View className="w-6 h-6 bg-green-700 rounded-full items-center justify-center shadow-sm">
              <Info size={12} color="#fff" />
            </View>
            <Text className="text-[10px] text-slate-600 flex-1 pr-6">
              <Text className="font-bold text-green-800">Tip:</Text> You can group trees based on soil type, water availability, age, or any other factors.
            </Text>
          </View>

        </View>

        <TouchableOpacity
          onPress={handleSave}
          disabled={saving || !name.trim()}
          className="flex-row items-center justify-center gap-2 bg-[#0C3B2E] py-4 rounded-xl mt-2"
          style={(saving || !name.trim()) ? { opacity: 0.6 } : undefined}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Plus size={18} color="#fff" />
              <Text className="text-white font-bold text-sm">{zoneId ? "Update Zone" : "Add Zone"}</Text>
            </>
          )}
        </TouchableOpacity>

        <View className="flex-row items-center justify-center gap-3 my-1">
          <View className="h-px bg-slate-200 flex-1" />
          <Text className="text-[10px] font-bold text-slate-400">OR</Text>
          <View className="h-px bg-slate-200 flex-1" />
        </View>

        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-white border border-slate-200 rounded-xl py-3.5 items-center justify-center mb-6 shadow-sm flex-row gap-2"
        >
          <Leaf size={16} color="#475569" />
          <Text className="text-slate-600 font-bold text-sm">Continue Without Zones</Text>
        </TouchableOpacity>

        {/* Hero Card */}
        <View className="bg-[#F2FAF6] rounded-2xl p-5 border border-emerald-50 relative overflow-hidden">
          <View className="w-[65%]">
            <Text className="text-lg font-bold text-slate-800 mb-2">What is a Zone?</Text>
            <Text className="text-xs text-slate-600 mb-4 leading-tight">
              Divide your farm into smaller areas based on location, soil type, or tree condition to get more accurate insights and recommendations.
            </Text>
            <View className="gap-2">
              <View className="flex-row items-center gap-2">
                <View className="w-4 h-4 bg-green-500 rounded-full items-center justify-center">
                  <Check size={10} color="#fff" />
                </View>
                <Text className="text-[11px] text-slate-700 font-medium">Better analysis for each area</Text>
              </View>
              <View className="flex-row items-center gap-2">
                <View className="w-4 h-4 bg-green-500 rounded-full items-center justify-center">
                  <Check size={10} color="#fff" />
                </View>
                <Text className="text-[11px] text-slate-700 font-medium">More accurate yield predictions</Text>
              </View>
            </View>
          </View>
          <View className="absolute right-0 top-6 bottom-0 w-[40%] items-end justify-center">
             <Image source={{ uri: 'https://i.ibb.co/Dg6V1tk1/zone.png' }} style={{ width: 100, height: 100, resizeMode: 'contain', opacity: 0.8 }} />
          </View>
        </View>

        {/* Optional Card */}
        <View className="bg-white rounded-2xl p-4 border border-slate-100 flex-row items-center gap-4">
          <View className="flex-1">
            <View className="flex-row items-center gap-2">
              <Text className="text-sm font-bold text-slate-800">This is Optional</Text>
              <View className="bg-green-100 px-2 py-0.5 rounded-full">
                <Text className="text-[9px] font-bold text-green-700">Not Required</Text>
              </View>
            </View>
          </View>
        </View>

      </ScrollView>
    </View>
  );
}
