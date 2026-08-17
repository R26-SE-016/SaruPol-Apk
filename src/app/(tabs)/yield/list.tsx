import { useRouter, useLocalSearchParams } from "expo-router";
import { useState, useMemo } from "react";
import { View, Text, TouchableOpacity, ScrollView, TextInput, Image, Platform } from "react-native";
import { Search, X, MapPin, ChevronRight, Activity, ArrowLeft } from "lucide-react-native";
import { useYieldApp } from "@/store-yield/YieldAppContext";
import { buildFarmData } from "@/utils/yieldTreeFactory";
import { LinearGradient } from "expo-linear-gradient";

interface YieldFarmsListScreenProps {
  onBack: () => void;
  onSelectFarm: (id: string) => void;
}

export default function YieldFarmsListScreen() {
  const router = useRouter();
  const onBack = () => router.back();
  const onSelectFarm = (id: string) => router.push('/(tabs)/yield/' + id);
  const { farms } = useYieldApp();
  const [searchQuery, setSearchQuery] = useState("");

  const filteredFarms = useMemo(() => {
    return farms.filter(f => 
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (f.locationName && f.locationName.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [farms, searchQuery]);

  return (
    <View className="flex-1 bg-slate-50">
      {/* Header */}
      <View className="bg-[#114B3A] pt-14 pb-8 px-5 relative z-10" style={{ borderBottomLeftRadius: 30, borderBottomRightRadius: 30 }}>
        <View className="flex-row items-center justify-between mb-2">
          <TouchableOpacity onPress={onBack} className="w-10 h-10 items-center justify-center -ml-2">
            <ArrowLeft size={24} color="#fff" />
          </TouchableOpacity>
          <Text className="text-[19px] font-bold text-white flex-1 text-center mr-2">Your Farms</Text>
          <TouchableOpacity className="w-10 h-10 items-center justify-center">
            <Search size={22} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Search Bar overlaps bottom edge */}
        <View className="absolute -bottom-6 left-5 right-5 bg-white rounded-full flex-row items-center px-4 py-3 shadow-sm border border-slate-100 z-20" style={{ elevation: 4, shadowColor: '#12211C', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 }}>
          <Search size={18} color="#94a3b8" />
          <TextInput 
            style={Platform.OS === 'web' ? { outline: 'none' } as any : {}}
            className="flex-1 ml-3 text-[14px] font-medium text-slate-700 h-6"
            placeholder="Search farms by name or location..."
            placeholderTextColor="#94a3b8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <X size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView className="flex-1 px-4 pt-10" contentContainerStyle={{ paddingBottom: 40 }}>

        {/* List */}
        <View className="gap-4">
          {filteredFarms.map((farm) => {
            const fd = buildFarmData(farm.perches, farm.totalTrees, farm.treeLayout, {});
            const isOnline = farm.deviceIds && farm.deviceIds.length > 0;
            
            return (
              <View key={farm.id} className="bg-white rounded-[24px] p-4 border border-slate-100 mb-2" style={{ shadowColor: '#12211C', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.06, shadowRadius: 25, elevation: 5 }}>
                <View className="flex-row items-start justify-between mb-4">
                  <View className="flex-row flex-1 pr-2 items-center gap-3">
                    <Image source={require('../../../../assets/icons/farm-image.png')} style={{width: 50, height: 50, borderRadius: 25}} defaultSource={{width: 50, height: 50}} />
                    <View>
                      <Text className="text-[17px] font-bold text-slate-800">{farm.name}</Text>
                      <View className="flex-row items-center gap-1 mt-1">
                        <MapPin size={12} color="#94a3b8" />
                        <Text className="text-xs text-slate-500">{farm.locationName || "Location Not Set"}</Text>
                      </View>
                    </View>
                  </View>
                  <View className="bg-[#fef3c7] px-3 py-1.5 rounded-[20px]">
                    <Text className="text-[10px] font-bold text-amber-700">12 Days Left</Text>
                  </View>
                </View>

                <View className="flex-row items-center justify-between bg-slate-50 rounded-[16px] p-3 mb-4">
                  <View className="flex-row gap-6">
                    <View>
                      <Text className="text-sm font-bold text-slate-800">{farm.totalTrees}</Text>
                      <Text className="text-[10px] text-slate-500 font-medium">Total Trees</Text>
                    </View>
                    <View className="h-full w-[1px] bg-slate-200" />
                    <View>
                      <Text className="text-sm font-bold text-slate-800">{farm.lastHarvestYield ? farm.lastHarvestYield : (farm.totalTrees * 6)}</Text>
                      <Text className="text-[10px] text-slate-500 font-medium">Predicted Nuts</Text>
                    </View>
                  </View>
                </View>

                <View className="flex-row items-center gap-2 mb-4 px-2 py-2 border-t border-b border-slate-100">
                  <View className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500' : 'bg-red-500'}`} />
                  <Text className="text-[11px] font-medium text-slate-600">Device: {farm.deviceIds?.[0] || 'None linked'}</Text>
                  <Text className={`text-[10px] font-bold ml-auto ${isOnline ? 'text-green-600' : 'text-red-500'}`}>
                    {isOnline ? 'ONLINE' : 'OFFLINE'}
                  </Text>
                </View>

                <TouchableOpacity 
                  onPress={() => onSelectFarm(farm.id)}
                  className="bg-[#114B3A] rounded-[14px] flex-row items-center justify-center py-3.5"
                >
                  <Text className="text-white font-bold text-[13px]">Open Farm Dashboard</Text>
                  <ChevronRight size={16} color="#fff" className="ml-1" />
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
