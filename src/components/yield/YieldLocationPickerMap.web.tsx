import React, { forwardRef, useEffect, useRef } from 'react';
import { View, ActivityIndicator, TouchableOpacity, Text } from 'react-native';

export interface YieldLocationPickerMapProps {
  region: any;
  mapType: any;
  parsedLat: number;
  parsedLng: number;
  hasValidCoordinates: boolean;
  isGeocoding: boolean;
  onMapPress: (e: any) => void;
  onMapTypeToggle: () => void;
}

export const YieldLocationPickerMap = forwardRef<any, YieldLocationPickerMapProps>(
  ({ region, mapType, parsedLat, parsedLng, hasValidCoordinates, isGeocoding, onMapPress, onMapTypeToggle }, ref) => {
    
    const mapRef = useRef<HTMLDivElement>(null);
    const googleMapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);

    useEffect(() => {
      const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || "";
      if (typeof document !== 'undefined' && apiKey && !(window as any).google && !document.getElementById('google-maps-script')) {
        const s = document.createElement('script');
        s.id = 'google-maps-script';
        s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
        s.async = true;
        document.head.appendChild(s);
      }

      const initMap = () => {
        // @ts-ignore
        if (typeof window !== 'undefined' && window.google && window.google.maps && mapRef.current && !googleMapRef.current) {
          // @ts-ignore
          googleMapRef.current = new window.google.maps.Map(mapRef.current, {
            center: { lat: region?.latitude || 7.8731, lng: region?.longitude || 80.7718 },
            zoom: 8,
            mapTypeId: mapType === 'hybrid' ? 'hybrid' : 'roadmap',
            disableDefaultUI: true,
          });

          googleMapRef.current.addListener('click', (e: any) => {
            onMapPress({ nativeEvent: { coordinate: { latitude: e.latLng.lat(), longitude: e.latLng.lng() } } });
          });
        }
      };

      if (typeof window !== 'undefined' && (window as any).google) {
        initMap();
      } else {
        const interval = setInterval(() => {
          if (typeof window !== 'undefined' && (window as any).google) {
            clearInterval(interval);
            initMap();
          }
        }, 100);
        return () => clearInterval(interval);
      }
    }, []);

    // Update mapType
    useEffect(() => {
      if (googleMapRef.current) {
        googleMapRef.current.setMapTypeId(mapType === 'hybrid' ? 'hybrid' : 'roadmap');
      }
    }, [mapType]);

    // Update region/center
    useEffect(() => {
      if (googleMapRef.current && region?.latitude && region?.longitude) {
        googleMapRef.current.panTo({ lat: region.latitude, lng: region.longitude });
      }
    }, [region]);

    // Update marker
    useEffect(() => {
      // @ts-ignore
      if (typeof window !== 'undefined' && window.google && window.google.maps && googleMapRef.current) {
        if (hasValidCoordinates) {
          if (!markerRef.current) {
            // @ts-ignore
            markerRef.current = new window.google.maps.Marker({
              position: { lat: parsedLat, lng: parsedLng },
              map: googleMapRef.current,
              draggable: true,
            });
            markerRef.current.addListener('dragend', (e: any) => {
              onMapPress({ nativeEvent: { coordinate: { latitude: e.latLng.lat(), longitude: e.latLng.lng() } } });
            });
          } else {
            markerRef.current.setPosition({ lat: parsedLat, lng: parsedLng });
          }
        } else if (markerRef.current) {
          markerRef.current.setMap(null);
          markerRef.current = null;
        }
      }
    }, [parsedLat, parsedLng, hasValidCoordinates]);

    return (
      <View style={{ height: 350, width: '100%', minHeight: 350, borderRadius: 16 }} className="overflow-hidden mb-3 border border-slate-200">
        
        {/* The Google Map DOM Element */}
        <div ref={mapRef} style={{ width: '100%', height: '100%', zIndex: 0 }} />
        
        <TouchableOpacity 
          className="absolute top-2 right-2 bg-white/90 px-3 py-2 rounded-lg shadow-sm border border-slate-200 flex-row items-center gap-1"
          style={{ zIndex: 1000 }}
          onPress={onMapTypeToggle}
        >
          <Text className="text-xs font-semibold text-slate-700">
            {mapType === "hybrid" ? "🗺️ Map" : "🛰️ Satellite"}
          </Text>
        </TouchableOpacity>

        {isGeocoding && (
          <View className="absolute inset-0 bg-white/50 items-center justify-center" style={{ zIndex: 2000 }}>
            <ActivityIndicator color="#1e7550" />
          </View>
        )}
      </View>
    );
  }
);
