import React, { useMemo } from "react";
import { View, Text } from "react-native";
import MapView, { Marker } from "react-native-maps";
import type { FarmData, Tree, Farm } from "@/types/yield";

interface YieldFarmMapProps {
  farmInfo?: Farm;
  farmData?: FarmData;
  farm?: FarmData; // For backwards compatibility if any
  selectedId: string | null;
  onSelectTree: (tree: Tree) => void;
  onClearSelection: () => void;
  highlightZoneId?: string | null;
}

export function YieldFarmMap({
  farmInfo,
  farmData,
  farm,
  selectedId,
  onSelectTree,
  onClearSelection,
  highlightZoneId = null,
}: YieldFarmMapProps) {
  const actualFarmData = farmData || farm;
  
  // Calculate map center
  const centerLat = farmInfo?.lat ?? 7.2906; // Default to Kandy if not set
  const centerLng = farmInfo?.lng ?? 80.6337;

  // Approximate scale for the farm based on perches (1 perch = 25 sqm)
  const scale = useMemo(() => {
    const areaSqm = (actualFarmData?.perches ?? 40) * 25;
    const sideLen = Math.sqrt(areaSqm);
    // 1 degree lat is ~111km, so 1 meter is ~0.000009 degrees
    return sideLen * 0.000009;
  }, [actualFarmData?.perches]);

  const region = useMemo(() => {
    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: scale * 1.5,
      longitudeDelta: scale * 1.5,
    };
  }, [centerLat, centerLng, scale]);

  if (!actualFarmData) return null;

  return (
    <View className="flex-1 w-full bg-slate-900 relative">
      <MapView
        style={{ flex: 1, width: "100%", height: "100%" }}
        mapType="hybrid"
        initialRegion={region}
        pitchEnabled={true}
        camera={{
          center: { latitude: centerLat, longitude: centerLng },
          pitch: 45,
          heading: 0,
          altitude: 1000,
          zoom: 19,
        }}
        onPress={onClearSelection}
      >
        <Marker
          coordinate={{ latitude: centerLat, longitude: centerLng }}
          onPress={onClearSelection}
          zIndex={100}
        >
          <View className="bg-red-600 px-3 py-1.5 rounded-full border-2 border-white shadow-lg">
            <Text className="text-white font-bold text-xs">
              📍 {farmInfo?.name || 'Farm'} ({actualFarmData.totalTrees} Trees)
            </Text>
          </View>
        </Marker>
      </MapView>
    </View>
  );
}
