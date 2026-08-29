import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect, useMemo } from "react";
import { View, Text, TouchableOpacity, ScrollView, Alert } from "react-native";
import { ArrowLeft, Layers, Plus, Pencil, Trash2 } from "lucide-react-native";
import { useYieldApp } from "@/store/YieldAppContext";
import { deleteZone, subscribeTrees } from "@/services/yieldFarmDb";
import { useTranslation } from "react-i18next";
import { buildFarmData, aggregateHealth } from "@/utils/yieldTreeFactory";
import type { Tree } from "@/types/yield";

export default function ZonesListScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const farmId = params.id as string;
  const { user, currentZones, currentFarm, refreshZones } = useYieldApp();
  const { t } = useTranslation();
  const [storedTrees, setStoredTrees] = useState<Record<string, Tree>>({});

  useEffect(() => {
    if (!user || !currentFarm) return;
    const unsub = subscribeTrees(user.uid, currentFarm.id, setStoredTrees);
    return unsub;
  }, [user, currentFarm]);

  const farmData = useMemo(() => {
    if (!currentFarm) return null;
    return buildFarmData(currentFarm.perches, currentFarm.totalTrees, currentFarm.treeLayout, storedTrees);
  }, [currentFarm, storedTrees]);

  if (!currentFarm) return null;

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="bg-forest-800 px-4 pt-14 pb-4 flex-row items-center justify-between rounded-b-2xl shadow-sm z-10">
        <View className="flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()} className="p-1 -ml-1">
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <View>
            <Text className="text-white text-[19px] font-bold">Farm Zones</Text>
            <Text className="text-emerald-100 text-xs mt-0.5">Active Farm: {currentFarm.name}</Text>
          </View>
        </View>
        <TouchableOpacity onPress={() => router.push(`/yield/${farmId}/add-zone`)} className="flex-row items-center gap-1.5 bg-white/15 px-3 py-1.5 rounded-lg">
          <Plus size={14} color="#fff" />
          <Text className="text-white text-xs font-bold">Add Zone</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1 px-4 mt-6" contentContainerStyle={{ paddingBottom: 96 }}>
        <View className="gap-3">
          {currentZones.length > 0 ? currentZones.map(zone => {
            const zoneTrees = farmData?.trees.filter(t => zone.treeNumbers?.includes(t.number)) || [];
            const zHealth = aggregateHealth(zoneTrees);
            const isGood = zHealth.pct >= 60;
            
            return (
              <View key={zone.id} className="bg-white rounded-xl shadow-sm overflow-hidden border border-slate-100 relative pl-2">
                <View className="absolute left-0 top-0 bottom-0 w-[5px]" style={{ backgroundColor: zone.color }} />
                <View className="p-4">
                  <View className="flex-row justify-between items-center mb-1">
                    <Text className="text-base font-bold text-slate-800">{zone.name}</Text>
                    {zoneTrees.length > 0 && (
                      <View className={`px-2 py-0.5 rounded-full ${isGood ? 'bg-green-100' : 'bg-orange-100'}`}>
                        <Text className={`text-[10px] font-bold ${isGood ? 'text-green-700' : 'text-orange-700'}`}>
                          {zHealth.health} - {Math.round(zHealth.pct)}%
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text className="text-xs text-slate-400 font-medium mb-3">
                    {zone.treeNumbers?.length || 0} trees
                  </Text>
                  {zone.notes ? (
                    <Text className="text-xs text-slate-500 mb-3 italic">{zone.notes}</Text>
                  ) : null}
                  <View className="flex-row gap-5 mt-1">
                    <TouchableOpacity onPress={() => router.push(`/yield/${farmId}/add-zone?zoneId=${zone.id}`)} className="flex-row items-center gap-1.5">
                      <Pencil size={12} color="#64748b" />
                      <Text className="text-[11px] font-bold text-slate-500">Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity 
                      onPress={() => {
                        if (!user) return;
                        Alert.alert("Delete Zone", "Are you sure you want to delete this zone?", [
                          { text: "Cancel", style: "cancel" },
                          { text: "Delete", style: "destructive", onPress: async () => {
                            await deleteZone(user.uid, farmId, zone.id);
                            refreshZones();
                          } }
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
            <View className="py-10 items-center justify-center bg-white rounded-xl border border-slate-100 border-dashed shadow-sm mt-4">
              <Layers size={48} color="#cbd5e1" className="mb-4" />
              <Text className="text-sm text-slate-500 font-semibold text-center mb-4">No Zones Added Yet</Text>
              <TouchableOpacity onPress={() => router.push(`/yield/${farmId}/add-zone`)} className="bg-forest-600 px-5 py-2.5 rounded-lg shadow-sm">
                <Text className="text-sm font-bold text-white">Create First Zone</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}
