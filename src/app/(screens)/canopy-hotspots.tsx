import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Linking,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { COLORS, ROUNDING } from '../../constants/theme';
import GlassCard from '../../components/common/GlassCard';
import GradientButton from '../../components/common/GradientButton';
import { getCanopyHotspots, CanopyHotspotItem } from '../../services/pathologyService';
import { useAppStore } from '../../store/appStore';

export default function CanopyHotspotsScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, language } = useAppStore();

  const [hotspots, setHotspots] = useState<CanopyHotspotItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        // Fetch user location to calculate distance
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          setUserLoc({ lat: loc.coords.latitude, lng: loc.coords.longitude });
        }

        const data = await getCanopyHotspots(user?.estate_id || 'estate_001');
        setHotspots(data.hotspots || []);
      } catch (err) {
        console.warn('Error loading canopy hotspots:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // Distance helper in meters
  const getDistanceMeters = (targetLat: number, targetLng: number) => {
    if (!userLoc) return null;
    const R = 6371e3; // Earth radius in meters
    const dLat = ((targetLat - userLoc.lat) * Math.PI) / 180;
    const dLon = ((targetLng - userLoc.lng) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((userLoc.lat * Math.PI) / 180) *
        Math.cos((targetLat * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return Math.round(R * c);
  };

  const openGoogleMaps = (lat: number, lng: number) => {
    const url = Platform.select({
      ios: `maps:0,0?q=${lat},${lng}`,
      android: `geo:0,0?q=${lat},${lng}(Stressed+Palm+Hotspot)`,
      default: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
    });
    Linking.openURL(url as string);
  };

  const handleStartLeafScan = (hotspot: CanopyHotspotItem) => {
    // Navigate to mobile disease scan screen
    router.push({
      pathname: '/(tabs)/scan',
      params: {
        hotspot_id: hotspot.id,
        target_lat: hotspot.location.lat.toString(),
        target_lng: hotspot.location.lng.toString(),
        hotspot_action: hotspot.recommended_action,
      },
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={COLORS.text} />
        </TouchableOpacity>
        <View style={styles.headerTitles}>
          <Text style={styles.title}>
            {language === 'ta'
              ? 'விமான எச்சரிக்கைகள்'
              : language === 'si'
              ? 'ගුවන් නිරීක්ෂණ ඇඟවීම්'
              : 'Aerial Stress Hotspots'}
          </Text>
          <Text style={styles.subtitle}>
            {language === 'ta'
              ? 'ட்ரோன் ஸ்கேன் மூலம் கண்டறியப்பட்ட மரங்கள்'
              : language === 'si'
              ? 'ඩ්‍රෝන් මඟින් හඳුනාගත් තර්ජනාත්මක ගස්'
              : 'Stressed palms detected by Drone Spectral Scan'}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Info Banner */}
        <GlassCard style={styles.infoBanner}>
          <Ionicons name="airplane-outline" size={28} color={COLORS.accent} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.infoTitle}>
              {language === 'ta'
                ? 'நிலத்தடி கள சரிபார்ப்பு'
                : language === 'si'
                ? 'ක්ෂේත්‍ර පරීක්ෂාව'
                : 'Targeted Ground Inspection'}
            </Text>
            <Text style={styles.infoText}>
              {language === 'ta'
                ? 'விமான NDVI/VARI மூலம் கொடி ஏற்றப்பட்ட மரங்களை ஆய்வு செய்து மொபைல் மூலம் இலை ஸ்கேன் செய்யவும்.'
                : language === 'si'
                ? 'ගුවන් NDVI/VARI විශ්ලේෂණයෙන් හඳුනාගත් තර්ජන වෙත ගොස් දුරකථනයෙන් පත්‍ර ස්කෑන් කරන්න.'
                : 'Walk to the flagged coordinates and snap a close-up leaf photo with MobileNetV2 to confirm the exact pathology.'}
            </Text>
          </View>
        </GlassCard>

        {loading ? (
          <ActivityIndicator size="large" color={COLORS.primaryLight} style={{ marginTop: 40 }} />
        ) : hotspots.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={56} color={COLORS.healthy} />
            <Text style={styles.emptyTitle}>All Palms Healthy</Text>
            <Text style={styles.emptyText}>No severe canopy stress hotspots detected in your estate.</Text>
          </View>
        ) : (
          hotspots.map((hs, index) => {
            const dist = getDistanceMeters(hs.location.lat, hs.location.lng);
            const isCritical = hs.severity === 'critical';

            return (
              <GlassCard key={hs.id || index} style={styles.hotspotCard}>
                {/* Top Row: Badge & Severity */}
                <View style={styles.cardTopRow}>
                  <View style={styles.hotspotBadge}>
                    <Text style={styles.hotspotBadgeText}>PIN #{index + 1}</Text>
                  </View>
                  <View
                    style={[
                      styles.severityBadge,
                      { backgroundColor: isCritical ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)' },
                    ]}
                  >
                    <Ionicons
                      name={isCritical ? 'alert-circle' : 'warning'}
                      size={14}
                      color={isCritical ? COLORS.diseased : COLORS.accent}
                    />
                    <Text
                      style={[
                        styles.severityText,
                        { color: isCritical ? COLORS.diseased : COLORS.accent },
                      ]}
                    >
                      {hs.severity.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Location & Distance */}
                <View style={styles.locationRow}>
                  <Ionicons name="location-sharp" size={20} color={COLORS.primaryLight} />
                  <Text style={styles.coordsText}>
                    {hs.location.lat.toFixed(5)}, {hs.location.lng.toFixed(5)}
                  </Text>
                  {dist !== null && (
                    <Text style={styles.distText}>
                      • {dist < 1000 ? `${dist}m away` : `${(dist / 1000).toFixed(1)}km away`}
                    </Text>
                  )}
                </View>

                {/* Recommendation */}
                <Text style={styles.recText}>{hs.recommended_action}</Text>

                {/* Action Buttons */}
                <View style={styles.btnRow}>
                  <TouchableOpacity
                    style={styles.mapBtn}
                    onPress={() => openGoogleMaps(hs.location.lat, hs.location.lng)}
                  >
                    <Ionicons name="navigate-outline" size={18} color={COLORS.text} />
                    <Text style={styles.mapBtnText}>Map</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.scanBtn}
                    onPress={() => handleStartLeafScan(hs)}
                  >
                    <Ionicons name="scan" size={18} color="#FFFFFF" />
                    <Text style={styles.scanBtnText}>
                      {language === 'ta'
                        ? 'இலை ஸ்கேன்'
                        : language === 'si'
                        ? 'පත්‍රය ස්කෑන් කරන්න'
                        : 'Inspect & Scan Leaf'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </GlassCard>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 54,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  backBtn: {
    padding: 8,
    marginRight: 12,
  },
  headerTitles: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.accent,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginTop: 12,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    textAlign: 'center',
  },
  hotspotCard: {
    padding: 16,
    marginBottom: 14,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  hotspotBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: ROUNDING.sm,
  },
  hotspotBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.textSecondary,
  },
  severityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: ROUNDING.sm,
    gap: 4,
  },
  severityText: {
    fontSize: 11,
    fontWeight: '700',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  coordsText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 6,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  distText: {
    fontSize: 12,
    color: COLORS.primaryLight,
    marginLeft: 6,
    fontWeight: '600',
  },
  recText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    lineHeight: 18,
    marginBottom: 14,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  mapBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    paddingVertical: 10,
    borderRadius: ROUNDING.md,
    gap: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  mapBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.text,
  },
  scanBtn: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    borderRadius: ROUNDING.md,
    gap: 6,
  },
  scanBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
