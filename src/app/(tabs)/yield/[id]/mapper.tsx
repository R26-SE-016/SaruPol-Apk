import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useEffect, useMemo } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, ImageBackground } from "react-native";
import { Palmtree, ArrowLeft, Info, Activity, Zap, TrendingUp, AlertTriangle } from "lucide-react-native";
import { YieldFarmMap } from "@/components/yield/YieldFarmMap";
import { Studio3D } from "@/components/yield/Studio3D";
import { TreeModal } from "@/components/yield/TreeModal";
import { useYieldApp } from "@/store-yield/YieldAppContext";
import { subscribeTrees, updateTreeData } from "@/services/yieldFarmDb";
import { buildFarmData } from "@/utils/yieldTreeFactory";
import type { Tree } from "@/types/yield";



export default function MapperScreen() {
  const router = useRouter();
  const { id: farmIdRaw } = useLocalSearchParams();
  const farmId = Array.isArray(farmIdRaw) ? farmIdRaw[0] : (farmIdRaw || null);
  const { user, farms, currentZones, setCurrentFarmId, currentFarmId } = useYieldApp();
  useEffect(() => {
    if (farmId && currentFarmId !== farmId) {
      setCurrentFarmId(farmId);
    }
  }, [farmId, currentFarmId, setCurrentFarmId]);

  const farm = farms.find((f) => f.id === farmId);
  const [storedTrees, setStoredTrees] = useState<Record<string, Tree>>({});
  const [selectedTree, setSelectedTree] = useState<Tree | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'map' | 'studio'>('studio');
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [showOverview, setShowOverview] = useState(false);
  const [draftPositions, setDraftPositions] = useState<Record<string, { nx: number, nz: number }>>({});

  useEffect(() => {
    if (!user || !farmId) return;
    const unsub = subscribeTrees(user.uid, farmId, (trees) => {
      setStoredTrees(trees);
      setLoading(false);
    });
    return unsub;
  }, [user, farmId]);

  const treeColorMap = useMemo(() => {
    const m: Record<number, string> = {};
    currentZones.forEach((z) => z.treeNumbers?.forEach((n) => { m[n] = z.color; }));
    return m;
  }, [currentZones]);

  const farmData = useMemo(() => {
    if (!farm) return null;
    return buildFarmData(farm.perches, farm.totalTrees, farm.treeLayout, storedTrees);
  }, [farm, storedTrees]);

  const treesWithZones = useMemo(() => {
    if (!farmData) return [];
    return farmData.trees.map((t) => ({
      ...t,
      zoneColor: treeColorMap[t.number] ?? null,
    }));
  }, [farmData, treeColorMap]);

  if (!farm || loading) {
    return (
      <View className="flex-1 bg-slate-900 items-center justify-center">
        <ActivityIndicator size="large" color="#fff" />
        <Text className="text-sm text-white/60 mt-3">Loading map…</Text>
      </View>
    );
  }

  // Calculated Stats
  const totalTrees = farm.totalTrees;
  const predictedYield = (farm as any)?.predictedYield || 2400;
  const avgYield = totalTrees > 0 ? (predictedYield / totalTrees).toFixed(2) : "0.00";
  
  // Healthy trees = Trees NOT in the "Needs Attention" zone (Zone D, usually red #ef4444)
  const healthyTreesCount = treesWithZones.filter(t => t.zoneColor !== '#ef4444').length;
  const healthyPercentage = totalTrees > 0 ? Math.round((healthyTreesCount / totalTrees) * 100) : 0;

  return (
    <View className="flex-1 bg-slate-900">
      {/* Header */}
      <View className="bg-[#0b6441] pt-14 pb-4 px-4 flex-row items-center gap-3 z-50">
        <TouchableOpacity onPress={() => router.push(`/yield/${farm?.id}` as any)} className="w-10 h-10 rounded-full items-center justify-center bg-white/10">
          <ArrowLeft size={20} color="#fff" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-white flex-1" numberOfLines={1}>{farm.name}</Text>
        <TouchableOpacity 
          onPress={() => setShowOverview(!showOverview)}
          className="flex-row items-center gap-2 bg-[#042f1c] rounded-xl px-3 py-2 border border-white/10"
        >
          <Palmtree size={16} color="#fbbf24" />
          <View className="bg-amber-400 px-2 py-0.5 rounded-md">
            <Text className="text-amber-900 font-black text-xs">Stats</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Full-Screen 3D Map Canvas */}
      <View className="flex-1 relative bg-slate-900">
        
        {/* Background Image for Studio View */}
        {viewMode === 'studio' && (
          <ImageBackground 
            source={{ uri: 'https://i.ibb.co/1f3VCY48/3d-map-background.png' }} 
            className="absolute inset-0 z-0"
            resizeMode="cover"
          >
            <View className="absolute inset-0 bg-[#0b6441]/40" />
          </ImageBackground>
        )}

        {/* Floating View Switcher */}
        <View className="absolute top-4 w-full flex-row justify-center z-10 pointer-events-box-none">
          <View className="flex-row items-center bg-slate-900/80 rounded-full p-1 border border-slate-700/50 shadow-lg">
            <TouchableOpacity
              onPress={() => setViewMode('studio')}
              className={`px-4 py-2 rounded-full flex-row items-center ${viewMode === 'studio' ? 'bg-[#0b6441]' : 'bg-transparent'}`}
            >
              <Text className={`text-sm font-bold ${viewMode === 'studio' ? 'text-white' : 'text-slate-400'}`}>🧊 3D Studio</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setViewMode('map')}
              className={`px-4 py-2 rounded-full flex-row items-center ${viewMode === 'map' ? 'bg-indigo-600' : 'bg-transparent'}`}
            >
              <Text className={`text-sm font-bold ${viewMode === 'map' ? 'text-white' : 'text-slate-400'}`}>🛰️ Satellite</Text>
            </TouchableOpacity>
          </View>
        </View>

        {viewMode === 'map' ? (
          <YieldFarmMap
            farmInfo={farm}
            farmData={{ ...farmData!, trees: treesWithZones as Tree[] }}
            selectedId={selectedTree?.id ?? null}
            onSelectTree={(t) => setSelectedTree((prev) => (prev?.id === t.id ? null : t))}
            onClearSelection={() => setSelectedTree(null)}
          />
        ) : (
          <Studio3D
            farmData={{ ...farmData!, trees: treesWithZones as Tree[] }}
            selectedId={selectedTree?.id ?? null}
            onSelectTree={(t) => setSelectedTree((prev) => (prev?.id === t.id ? null : t))}
            onClearSelection={() => setSelectedTree(null)}
            isEditingMode={isEditingMode}
            draftPositions={draftPositions}
            onMoveTree={(id, nx, nz) => setDraftPositions((prev) => ({ ...prev, [id]: { nx, nz } }))}
            treeColorMap={treeColorMap}
          />
        )}
        
        {/* Bottom Floating Action Bar for Map */}
        {viewMode === 'studio' && (
          <View className="absolute bottom-4 right-4 z-50 flex-col gap-3">
            <TouchableOpacity 
              onPress={() => setIsEditingMode(!isEditingMode)}
              className={`${isEditingMode ? 'bg-amber-500' : 'bg-slate-800/90'} px-5 py-3 rounded-full flex-row items-center shadow-lg border border-white/10`}
            >
              <Text className="text-white font-bold">{isEditingMode ? '✅ Done' : '✏️ Edit Trees'}</Text>
            </TouchableOpacity>
            
            {Object.keys(draftPositions).length > 0 && (
              <TouchableOpacity 
                onPress={async () => {
                  if (!user || !farm) return;
                  for (const [id, pos] of Object.entries(draftPositions)) {
                    const tree = treesWithZones.find(t => t.id === id);
                    if (tree) {
                      await updateTreeData(user.uid, farm.id, id, { ...tree, nx: pos.nx, nz: pos.nz });
                    }
                  }
                  setIsEditingMode(false);
                  setDraftPositions({});
                }}
                className="bg-emerald-600/90 px-5 py-3 rounded-full flex-row items-center shadow-lg border border-emerald-400/50"
              >
                <Text className="text-white font-bold">💾 Save</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        
        {/* Floating Zone Legend */}
        {!showOverview && viewMode === 'studio' && (
          <View className="absolute top-20 left-4 bg-white/95 rounded-2xl p-3 shadow-xl border border-slate-200 z-10">
            <Text className="text-[10px] font-black text-slate-500 mb-2 tracking-wider">ZONE LEGEND</Text>
            {currentZones.map((z) => (
              <View key={z.name} className="flex-row items-center gap-2 mb-1.5">
                <View className="px-1.5 py-0.5 rounded-md w-14 items-center" style={{ backgroundColor: z.color }}>
                  <Text className="text-[9px] font-bold text-white">{z.name}</Text>
                </View>
                <Text className="text-[10px] font-medium text-slate-700">
                  {z.name === 'Zone A' ? 'High Yield' : z.name === 'Zone B' ? 'Medium Yield' : z.name === 'Zone C' ? 'Low Yield' : 'Needs Attention'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Collapsible Data Panel (Bottom Sheet style) */}
      {showOverview && (
        <View className="absolute bottom-0 left-0 right-0 h-[70%] bg-[#094d32] rounded-t-3xl border-t border-white/20 shadow-2xl z-50">
          <View className="items-center mt-3 mb-1">
            <View className="w-12 h-1.5 bg-white/20 rounded-full" />
          </View>
          <ScrollView className="flex-1" contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
            
            <View className="flex-row items-center justify-between mb-4">
              <View className="flex-row items-center">
                <Palmtree size={18} color="#6ee7b7" />
                <Text className="text-white font-bold text-lg ml-2">Farm Overview</Text>
              </View>
              <TouchableOpacity onPress={() => setShowOverview(false)} className="bg-white/10 rounded-full p-2">
                <Text className="text-white text-xs font-bold px-2">Close</Text>
              </TouchableOpacity>
            </View>

        {/* 2x2 Stats Grid */}
        <View className="flex-row flex-wrap justify-between gap-y-3 mb-6">
          <View className="w-[48%] bg-[#052e1c] p-4 rounded-2xl border border-white/5 shadow-sm">
            <Text className="text-[10px] font-bold text-emerald-200 tracking-wider mb-2">TOTAL TREES</Text>
            <Text className="text-3xl font-black text-white">{totalTrees}</Text>
            <Text className="text-[10px] text-emerald-400/70 mt-1">Trees</Text>
          </View>

          <View className="w-[48%] bg-[#052e1c] p-4 rounded-2xl border border-white/5 shadow-sm">
            <Text className="text-[10px] font-bold text-emerald-200 tracking-wider mb-2">HEALTHY TREES</Text>
            <Text className="text-3xl font-black text-white">{healthyTreesCount}</Text>
            <Text className="text-[10px] text-emerald-400/70 mt-1">{healthyPercentage}%</Text>
          </View>

          <View className="w-[48%] bg-[#052e1c] p-4 rounded-2xl border border-white/5 shadow-sm">
            <Text className="text-[10px] font-bold text-emerald-200 tracking-wider mb-2">AVG. YIELD / TREE</Text>
            <Text className="text-3xl font-black text-white">{avgYield}</Text>
            <Text className="text-[10px] text-emerald-400/70 mt-1">Nuts</Text>
          </View>

          <View className="w-[48%] bg-[#052e1c] p-4 rounded-2xl border border-white/5 shadow-sm">
            <Text className="text-[10px] font-bold text-emerald-200 tracking-wider mb-2">PREDICTED YIELD</Text>
            <Text className="text-3xl font-black text-white">{predictedYield}</Text>
            <Text className="text-[10px] text-emerald-400/70 mt-1">Nuts</Text>
          </View>
        </View>

        <View className="flex-row items-center mb-4">
          <Activity size={18} color="#6ee7b7" />
          <Text className="text-white font-bold text-lg ml-2">Zone Summary & Legend</Text>
        </View>

        {/* Zone List */}
        <View className="bg-[#052e1c] rounded-2xl p-4 border border-white/5 shadow-sm mb-6">
          {currentZones.map((zone, index) => {
             const count = treesWithZones.filter(t => t.zoneColor === zone.color).length;
             const percentage = totalTrees > 0 ? Math.round((count / totalTrees) * 100) : 0;
             return (
               <View key={zone.name} className={`flex-row items-center justify-between py-3 ${index !== currentZones.length - 1 ? 'border-b border-white/10' : ''}`}>
                 <View className="flex-row items-center gap-3">
                   <View className="px-2 py-1 rounded-md" style={{ backgroundColor: zone.color }}>
                     <Text className="text-[10px] font-black text-white">{zone.name}</Text>
                   </View>
                   <Text className="text-xs font-semibold" style={{ color: zone.color }}>
                     {zone.name === 'Zone A' ? '(High Yield)' : zone.name === 'Zone B' ? '(Medium Yield)' : zone.name === 'Zone C' ? '(Low Yield)' : '(Needs Attention)'}
                   </Text>
                 </View>
                 <View className="flex-row items-center gap-4">
                   <Text className="text-xs font-bold text-white w-14 text-right">{count} Trees</Text>
                   <Text className="text-xs font-bold text-emerald-200 w-10 text-right">{percentage}%</Text>
                 </View>
               </View>
             );
          })}
        </View>

        {/* Tip Card */}
        <View className="bg-[#10b981]/20 border border-[#10b981]/40 rounded-2xl p-4 flex-row items-start gap-3">
          <View className="bg-[#10b981] p-2 rounded-full">
            <Zap size={16} color="#fff" />
          </View>
          <View className="flex-1 pt-0.5">
            <Text className="text-sm font-bold text-white mb-1">Tip</Text>
            <Text className="text-xs text-emerald-100 leading-5">Focus on Zone D trees for better overall farm productivity. Inspect soil moisture and consider applying fertilizer.</Text>
          </View>
        </View>

      </ScrollView>
      </View>
      )}

      {/* tree modal */}
      {selectedTree && (
        <TreeModal
          tree={treesWithZones.find((t) => t.id === selectedTree.id) as Tree}
          farmId={farm.id}
          onClose={() => setSelectedTree(null)}
          onSaveTree={async (updated) => {
            if (!user) return;
            await updateTreeData(user.uid, farm.id, updated.id, updated);
            setSelectedTree(updated);
          }}
        />
      )}
    </View>
  );
}
