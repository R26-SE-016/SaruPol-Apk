import React, { useEffect, useRef, useMemo } from 'react';
import { View } from 'react-native';
import type { FarmData, Tree, Farm } from "@/types/yield";

interface YieldFarmMapProps {
  farmInfo?: Farm;
  farmData?: FarmData;
  farm?: FarmData; // For backwards compatibility
  selectedId: string | null;
  onSelectTree: (tree: Tree) => void;
  onClearSelection: () => void;
  highlightZoneId?: string | null;
}

export function YieldFarmMap({
  farmInfo,
  farmData,
  farm,
  onClearSelection,
}: YieldFarmMapProps) {
  const actualFarmData = farmData || farm;
  const mapRef = useRef<HTMLDivElement>(null);
  const googleMapRef = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});

  const centerLat = farmInfo?.lat ?? 7.2906;
  const centerLng = farmInfo?.lng ?? 80.6337;

  useEffect(() => {
    // @ts-ignore
    if (typeof window !== 'undefined' && window.google && window.google.maps && mapRef.current && !googleMapRef.current) {
      // @ts-ignore
      googleMapRef.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: centerLat, lng: centerLng },
        zoom: 19,
        mapTypeId: 'hybrid',
        tilt: 0,
        disableDefaultUI: true,
      });

      googleMapRef.current.addListener('click', () => {
        onClearSelection();
      });
    }
  }, [centerLat, centerLng]);

  // Update center marker
  useEffect(() => {
    // @ts-ignore
    if (!googleMapRef.current || !window.google || !actualFarmData) return;

    // Clear old markers
    Object.values(markersRef.current).forEach(marker => marker.setMap(null));
    markersRef.current = {};

    // @ts-ignore
    const marker = new window.google.maps.Marker({
      position: { lat: centerLat, lng: centerLng },
      map: googleMapRef.current,
      label: {
        text: `📍 ${farmInfo?.name || 'Farm'} (${actualFarmData.totalTrees} Trees)`,
        color: '#ffffff',
        fontSize: '14px',
        fontWeight: 'bold',
        className: 'marker-label'
      },
      icon: {
        url: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
      },
      zIndex: 100
    });

    markersRef.current['center'] = marker;

    return () => {
      Object.values(markersRef.current).forEach(marker => marker.setMap(null));
    };
  }, [actualFarmData, centerLat, centerLng, farmInfo]);

  if (!actualFarmData) return null;

  return (
    <View className="flex-1 w-full bg-slate-900 relative">
      {/* We need to inject a tiny bit of CSS for the marker-label to make it look like a pill */}
      <style>{`
        .marker-label {
          background-color: #dc2626;
          padding: 4px 12px;
          border-radius: 9999px;
          border: 2px solid white;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5);
          margin-top: -45px;
          white-space: nowrap;
        }
      `}</style>
      <div ref={mapRef} style={{ width: '100%', height: '100%', outline: 'none' }} />
    </View>
  );
}
