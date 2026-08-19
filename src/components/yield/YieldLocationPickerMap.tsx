import React, { forwardRef } from 'react';
import MapView, { Marker, MapType, Region } from 'react-native-maps';
import { View, ActivityIndicator, TouchableOpacity, Text } from 'react-native';

export interface YieldLocationPickerMapProps {
  region: Region;
  mapType: MapType;
  parsedLat: number;
  parsedLng: number;
  hasValidCoordinates: boolean;
  isGeocoding: boolean;
  onMapPress: (e: any) => void;
  onMapTypeToggle: () => void;
}

export const YieldLocationPickerMap = forwardRef<MapView, YieldLocationPickerMapProps>(
  ({ region, mapType, parsedLat, parsedLng, hasValidCoordinates, isGeocoding, onMapPress, onMapTypeToggle }, ref) => {
    return (
      <View style={{ height: 350, width: '100%', minHeight: 350, borderRadius: 16 }} className="overflow-hidden mb-3 border border-slate-200">
        <MapView
          ref={ref}
          style={{ flex: 1, height: '100%', width: '100%' }}
          mapType={mapType}
          initialRegion={region}
          onPress={onMapPress}
        >
          {hasValidCoordinates && (
            <Marker
              coordinate={{ latitude: parsedLat, longitude: parsedLng }}
              draggable
              onDragEnd={onMapPress}
            />
          )}
        </MapView>
        
        <TouchableOpacity 
          className="absolute top-2 right-2 bg-white/90 px-3 py-2 rounded-lg shadow-sm border border-slate-200 flex-row items-center gap-1"
          onPress={onMapTypeToggle}
        >
          <Text className="text-xs font-semibold text-slate-700">
            {mapType === "hybrid" ? "🗺️ Map" : "🛰️ Satellite"}
          </Text>
        </TouchableOpacity>

        {isGeocoding && (
          <View className="absolute inset-0 bg-white/50 items-center justify-center">
            <ActivityIndicator color="#1e7550" />
          </View>
        )}
      </View>
    );
  }
);
