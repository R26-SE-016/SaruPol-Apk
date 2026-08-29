import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Image, ActivityIndicator } from "react-native";
import { ArrowLeft, SlidersHorizontal, MapPin } from "lucide-react-native";
import { useState, useMemo, useEffect } from "react";
import { useYieldApp } from "@/store/YieldAppContext";
import { subscribeTrees } from "@/services/yieldFarmDb";
import type { Tree } from "@/types/yield";

export default function TreeWisePredictionScreen() {
  const { id } = useLocalSearchParams();
  const farmId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  
  const { currentFarm, currentZones, user } = useYieldApp();
  const [storedTrees, setStoredTrees] = useState<Record<string, Tree>>({});
  
  const [activeTab, setActiveTab] = useState<'all' | 'healthy' | 'attention'>('all');
  const [activeZone, setActiveZone] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !currentFarm) return;
    const unsub = subscribeTrees(user.uid, currentFarm.id, setStoredTrees);
    return unsub;
  }, [user, currentFarm]);

  const totalTreesCount = (currentFarm as any)?.trees || currentFarm?.totalTrees || 24;

  const getTreeData = (index: number) => {
    const treeNumber = index + 1;
    const treeId = `tree-${treeNumber}`;
    const tree = storedTrees[treeId] || Object.values(storedTrees).find(t => t.number === treeNumber);
    const zone = currentZones?.find(z => z.treeNumbers?.includes(treeNumber));
    
    // Use real data, default to Good if no tree record exists yet
    const yieldNum = tree?.latest?.finalYield || 0;
    const health = tree?.health || "Healthy";
    
    return {
      treeId,
      treeNumber,
      yieldNum: yieldNum,
      isHealthy: health !== "Weak" && health !== "Need Attention",
      health,
      zone,
    };
  };

  const allTrees = Array.from({ length: totalTreesCount }).map((_, i) => getTreeData(i));
  const zoneFilteredTrees = activeZone ? allTrees.filter(t => t.zone?.id === activeZone) : allTrees;
  const healthyTrees = zoneFilteredTrees.filter(t => t.isHealthy);
  const attentionTrees = zoneFilteredTrees.filter(t => !t.isHealthy);

  const displayedTrees = activeTab === 'all' ? zoneFilteredTrees 
                       : activeTab === 'healthy' ? healthyTrees 
                       : attentionTrees;

  if (!user || !currentFarm) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#0d9488" />
        <Text className="mt-4 text-slate-500 font-semibold tracking-wide">Loading farm data...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-white">
      {/* Header */}
      <View className="flex-row items-center justify-between px-5 pt-12 pb-4 bg-[#0C3B2E]">
        <View className="flex-row items-center gap-4">
          <TouchableOpacity onPress={() => router.back()}>
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text className="text-[20px] font-bold text-white tracking-wide">Tree-wise Yield</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }} showsVerticalScrollIndicator={false}>
        {/* Farm Info */}
        <View className="px-5 py-4 flex-row items-center gap-4 border-b border-slate-100">
          <Image 
            source={{ uri: 'https://i.ibb.co/hR8NHX1c/coconut-tree.png' }} 
            style={{ width: 40, height: 40, borderRadius: 20 }}
          />
          <View>
            <Text className="text-[17px] font-bold text-slate-800">{currentFarm.name || "Sigiriya state"}</Text>
            <View className="flex-row items-center gap-1 mt-1">
              <MapPin size={12} color="#3b82f6" />
              <Text className="text-xs font-semibold text-blue-500">All {totalTreesCount} Trees</Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View className="px-5 py-4 flex-row justify-between items-center">
          <TouchableOpacity 
            onPress={() => setActiveTab('all')}
            className={`flex-1 py-2 mx-1 rounded-lg items-center ${activeTab === 'all' ? 'bg-forest-700' : 'bg-white border border-slate-200'}`}
          >
            <Text className={`text-[11px] font-bold ${activeTab === 'all' ? 'text-white' : 'text-slate-600'}`}>
              All ({zoneFilteredTrees.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setActiveTab('healthy')}
            className={`flex-1 py-2 mx-1 rounded-lg items-center ${activeTab === 'healthy' ? 'bg-white border border-forest-600' : 'bg-white border border-slate-200'}`}
          >
            <Text className={`text-[11px] font-bold ${activeTab === 'healthy' ? 'text-forest-700' : 'text-slate-600'}`}>
              Healthy ({healthyTrees.length})
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setActiveTab('attention')}
            className={`flex-1 py-2 mx-1 rounded-lg items-center ${activeTab === 'attention' ? 'bg-white border border-red-500' : 'bg-white border border-slate-200'}`}
          >
            <Text className={`text-[11px] font-bold ${activeTab === 'attention' ? 'text-red-600' : 'text-slate-600'}`}>
              Need Attention ({attentionTrees.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* Zone Filters */}
        {currentZones && currentZones.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="px-5 pb-4" contentContainerStyle={{ gap: 8 }}>
            <TouchableOpacity 
              onPress={() => setActiveZone(null)}
              className={`px-3 py-1.5 rounded-full border ${!activeZone ? 'bg-slate-800 border-slate-800' : 'bg-white border-slate-200'}`}
            >
              <Text className={`text-[11px] font-bold ${!activeZone ? 'text-white' : 'text-slate-600'}`}>All Zones</Text>
            </TouchableOpacity>
            {currentZones.map(z => (
              <TouchableOpacity 
                key={z.id}
                onPress={() => setActiveZone(z.id)}
                className={`flex-row items-center gap-1.5 px-3 py-1.5 rounded-full border ${activeZone === z.id ? 'border-transparent' : 'bg-white border-slate-200'}`}
                style={activeZone === z.id ? { backgroundColor: z.color } : undefined}
              >
                {activeZone !== z.id && <View className="w-2 h-2 rounded-full" style={{ backgroundColor: z.color }} />}
                <Text className={`text-[11px] font-bold ${activeZone === z.id ? 'text-white' : 'text-slate-600'}`}>{z.name}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Tree Grid */}
        <View className="px-4 flex-row flex-wrap">
          {displayedTrees.map((tree) => {
            const isRed = !tree.isHealthy;
            return (
              <View key={tree.treeId} className="w-[25%] p-1">
                <TouchableOpacity 
                  onPress={() => router.push(`/(tabs)/yield/${farmId}/trees/${tree.treeId}`)}
                  className={`relative p-3 rounded-2xl items-center border ${isRed ? 'border-red-300 bg-red-50' : 'bg-[#fdfdfd] border-emerald-100'} shadow-sm overflow-hidden`}
                  style={{
                    shadowColor: isRed ? '#ef4444' : '#10b981',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 5,
                    elevation: 1
                  }}
                >
                  {isRed && <View className="absolute inset-0 bg-red-500/10" />}
                  <Image 
                    source={{ uri: 'https://i.ibb.co/hR8NHX1c/coconut-tree.png' }} 
                    style={{ width: 32, height: 32, marginBottom: 6 }}
                    resizeMode="contain"
                  />
                  <Text className={`text-[11px] font-bold ${isRed ? 'text-red-500' : 'text-slate-700'}`}>
                    T{String(tree.treeNumber).padStart(2, '0')}
                  </Text>
                  {tree.zone && (
                    <View className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tree.zone.color }} />
                  )}
                  <Text className={`text-[10px] font-bold ${isRed ? 'text-red-500' : 'text-emerald-700'}`}>
                    {tree.yieldNum.toLocaleString()}
                  </Text>
                </TouchableOpacity>
              </View>
            )
          })}
        </View>

        <View className="mt-8 items-center px-8">
          <Text className="text-center font-bold text-slate-800 text-sm">
            Tap on a tree to enter details{"\n"}and get prediction
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}