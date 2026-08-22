import { useLocalSearchParams, useRouter } from "expo-router";
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Image, ActivityIndicator } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import { useState, useMemo } from "react";
import { useYieldApp } from "@/store/YieldAppContext";

export default function TreeWisePredictionScreen() {
  const { id } = useLocalSearchParams();
  const farmId = Array.isArray(id) ? id[0] : id;
  const router = useRouter();
  
  const { currentFarm, currentZones, user } = useYieldApp();

  const TREES_PER_PAGE = 20;
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalTrees = currentFarm?.trees || currentFarm?.totalTrees || 0;
  
  // Mapping of tree numbers to zone colors
  const treeColorMap = useMemo(() => {
    const m: Record<number, string> = {};
    currentZones.forEach((z) => {
      if (z.treeNumbers) {
        z.treeNumbers.forEach((n) => { m[n] = z.color; });
      }
    });
    return m;
  }, [currentZones]);

  const totalPages = Math.max(1, Math.ceil(totalTrees / TREES_PER_PAGE));
  const startIndex = (currentPage - 1) * TREES_PER_PAGE;
  const endIndex = Math.min(startIndex + TREES_PER_PAGE, totalTrees);
  
  const currentTrees = Array.from({ length: Math.max(0, endIndex - startIndex) }).map((_, i) => startIndex + i + 1);

  if (!user || !currentFarm) {
    return (
      <View className="flex-1 bg-slate-50 items-center justify-center">
        <ActivityIndicator size="large" color="#0d9488" />
        <Text className="mt-4 text-slate-500 font-semibold tracking-wide">Loading farm data...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-50">
      <View className="flex-row items-center px-4 pt-14 pb-4 bg-white shadow-sm z-10">
        <TouchableOpacity onPress={() => router.back()} className="mr-4 p-2 bg-slate-100 rounded-full">
          <ArrowLeft size={20} color="#334155" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-slate-800 tracking-wide">Tree-wise Prediction</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
        <Text className="text-slate-500 text-center mb-6 tracking-wide leading-relaxed">
          Select a tree to view its yield prediction and apply real-time telemetry.
        </Text>
        
        <View className="flex-row flex-wrap justify-between">
          {currentTrees.map((treeId) => {
            const zColor = treeColorMap[treeId] || '#cbd5e1'; // default slate-300 if no zone
            return (
              <TouchableOpacity 
                key={treeId}
                onPress={() => router.push(`/(tabs)/yield/${farmId}/trees/tree-${treeId}`)}
                className="w-[30%] bg-white p-4 rounded-2xl items-center mb-4 border shadow-sm"
                style={{
                  borderColor: zColor,
                  borderWidth: 1.5,
                  backgroundColor: `${zColor}15`, // 15 opacity hex
                  shadowColor: zColor,
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.1,
                  shadowRadius: 10,
                  elevation: 2
                }}
              >
                <View className="px-2 py-0.5 rounded-full mb-2" style={{ backgroundColor: zColor }}>
                  <Text className="text-[10px] font-black text-white">Tree {treeId}</Text>
                </View>
                <Image 
                  source={{ uri: 'https://i.ibb.co/hR8NHX1c/coconut-tree.png' }} 
                  style={{ width: 40, height: 40 }}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            )
          })}
        </View>

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <View className="flex-row justify-center mt-8 gap-2 flex-wrap">
            {Array.from({ length: totalPages }).map((_, i) => (
              <TouchableOpacity 
                key={i}
                onPress={() => setCurrentPage(i + 1)}
                className={`w-10 h-10 rounded-full items-center justify-center mb-2 ${currentPage === i + 1 ? 'bg-teal-600 shadow-sm' : 'bg-slate-200'}`}
              >
                <Text className={`font-bold ${currentPage === i + 1 ? 'text-white' : 'text-slate-600'}`}>{i + 1}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Zone Legend */}
        {currentZones.length > 0 && (
          <View className="mt-10 bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
            <Text className="text-xs font-black text-slate-500 mb-3 tracking-wider">ZONE LEGEND</Text>
            <View className="flex-row flex-wrap gap-x-4 gap-y-2">
              {currentZones.map((z) => (
                <View key={z.name} className="flex-row items-center gap-2">
                  <View className="w-3 h-3 rounded-full" style={{ backgroundColor: z.color }} />
                  <Text className="text-xs font-semibold text-slate-700">{z.name}</Text>
                </View>
              ))}
              <View className="flex-row items-center gap-2">
                  <View className="w-3 h-3 rounded-full bg-slate-300" />
                  <Text className="text-xs font-semibold text-slate-500">Unassigned</Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}