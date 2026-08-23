import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';

import { COLORS, ROUNDING } from '../../constants/theme';
import GlassCard from '../../components/common/GlassCard';
import GradientButton from '../../components/common/GradientButton';
import { analyzeLeafImage } from '../../services/nutrientService';
import api from '../../services/api';
import { useTranslation } from 'react-i18next';

export default function NutrientAnalysisScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  React.useEffect(() => {
    if (params.reset === 'true') {
      setImageUri(null);
      router.setParams({ reset: '' });
    }
  }, [params.reset]);
  
  // Location states
  const [locationPermission, setLocationPermission] = useState<boolean | null>(null);
  const [fetchingLocation, setFetchingLocation] = useState(false);
  const [gpsZone, setGpsZone] = useState<string | null>(null);
  const [detailedZone, setDetailedZone] = useState<string | null>(null);
  const [manualZone, setManualZone] = useState<string | null>(null);
  const [showManualOverride, setShowManualOverride] = useState(false);
  
  // Palm details
  const [palmAge, setPalmAge] = useState<string>('');
  const [palmStage, setPalmStage] = useState<string>('');
  
  const detectLocation = async () => {
    setFetchingLocation(true);
    setGpsZone(null);
    setDetailedZone(null);
    setShowManualOverride(false);
    
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationPermission(false);
        setShowManualOverride(true);
        setFetchingLocation(false);
        return;
      }
      setLocationPermission(true);
      
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      const { latitude, longitude } = location.coords;
      
      // Call backend
      const response = await api.post('/v1/location/agro-zone', { latitude, longitude });
      
      const data = response.data;
      
      if (data.success && data.zone) {
        setGpsZone(data.zone);
        setDetailedZone(data.agro_ecological_zone);
      } else {
        // Fallback for failure or ocean
        setShowManualOverride(true);
        Alert.alert('Zone Detection Failed', data.message || 'Could not determine zone automatically.');
      }
    } catch (error) {
      setShowManualOverride(true);
      Alert.alert('Error', 'Failed to fetch location or connect to backend.');
    } finally {
      setFetchingLocation(false);
    }
  };
  
  // Trigger detection on mount
  React.useEffect(() => {
    detectLocation();
  }, []);

  // ── Permissions ───────────────────────────────────────────────────
  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const cameraStatus = await Camera.requestCameraPermissionsAsync();
      const galleryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return cameraStatus.granted && galleryStatus.granted;
    }
    return true;
  };

  // ── Image picker ──────────────────────────────────────────────────
  const handlePickImage = async (useCamera: boolean) => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) {
      Alert.alert(t('common.error') || 'Error', 'Camera or Gallery permissions are required.');
      return;
    }

    const pickerOptions: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    };

    const result = useCamera
      ? await ImagePicker.launchCameraAsync(pickerOptions)
      : await ImagePicker.launchImageLibraryAsync(pickerOptions);

    if (!result.canceled && result.assets?.[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  // ── API Call ──────────────────────────────────────────────────────
  const handleAnalyze = async () => {
    if (!imageUri) return;
    
    setLoading(true);
    try {
      const result = await analyzeLeafImage(imageUri);
      
      // Navigate to the result screen, passing the JSON result as string
      router.push({
        pathname: '/(screens)/nutrient-result' as any,
        params: {
          data: JSON.stringify(result),
          imageUri: imageUri,
          palmAge: palmAge,
          palmStage: palmStage,
          zone: gpsZone || manualZone || ''
        },
      });
    } catch (error: any) {
      Alert.alert('Analysis Failed', error.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const clearSelection = () => {
    setImageUri(null);
  };

  return (
    <View style={styles.container}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1B2C1A" />
        </TouchableOpacity>
        <Text style={styles.title}>Nutrient Analysis</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <GlassCard style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <Ionicons name="leaf-outline" size={24} color={COLORS.primaryLight} />
            <Text style={styles.infoCardTitle}>Leaf Image Analysis</Text>
          </View>
          <Text style={styles.infoCardText}>
            Analyze a coconut leaf visually to predict potential nutrient deficiencies (Nitrogen, Boron).
          </Text>
        </GlassCard>

        {/* ── Context Area ──────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>PALM DETAILS</Text>
        <View style={styles.contextBox}>
          <Text style={styles.inputLabel}>Palm Age (Years)</Text>
          <TextInput 
            style={styles.textInput} 
            placeholder="Enter Palm Age"
            placeholderTextColor="#717B6E"
            value={palmAge}
            onChangeText={setPalmAge}
            keyboardType="numeric"
          />
          
          <Text style={styles.inputLabel}>Palm Stage</Text>
          <TextInput 
            style={styles.textInput} 
            placeholder="Enter Stage (e.g. Seedling, Bearing)"
            placeholderTextColor="#717B6E"
            value={palmStage}
            onChangeText={setPalmStage}
          />
        </View>

        <Text style={styles.sectionLabel}>AGRO-CLIMATIC ZONE</Text>
        <View style={styles.contextBox}>
          {fetchingLocation ? (
            <View style={styles.rowCenter}>
              <ActivityIndicator size="small" color={COLORS.primaryLight} style={{marginRight: 8}}/>
              <Text style={styles.contextText}>[ Detecting location... ]</Text>
            </View>
          ) : gpsZone && !showManualOverride ? (
            <View>
              <Text style={styles.zoneSuccessText}>✓ {gpsZone} Zone</Text>
              {detailedZone && <Text style={styles.zoneDetailText}>({detailedZone})</Text>}
              <TouchableOpacity onPress={() => setShowManualOverride(true)} style={{marginTop: 8}}>
                <Text style={styles.overrideBtn}>[ Change Zone ]</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {locationPermission === false && (
                <Text style={styles.warningText}>
                  Location permission is required to automatically determine the agro-climatic zone.
                </Text>
              )}
              <Text style={styles.inputLabel}>Select zone manually (User Provided)</Text>
              <View style={styles.rowSpace}>
                 <TouchableOpacity onPress={() => setManualZone('Wet')} style={[styles.pill, manualZone === 'Wet' && styles.pillActive]}><Text style={styles.pillText}>Wet</Text></TouchableOpacity>
                 <TouchableOpacity onPress={() => setManualZone('Intermediate')} style={[styles.pill, manualZone === 'Intermediate' && styles.pillActive]}><Text style={styles.pillText}>Intermediate</Text></TouchableOpacity>
                 <TouchableOpacity onPress={() => setManualZone('Dry')} style={[styles.pill, manualZone === 'Dry' && styles.pillActive]}><Text style={styles.pillText}>Dry</Text></TouchableOpacity>
              </View>
              <TouchableOpacity onPress={detectLocation} style={{marginTop: 12}}>
                <Text style={styles.overrideBtn}>[ Retry Auto-Detect ]</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Image Area ──────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>PHOTO</Text>
        <View style={styles.imageBox}>
          {imageUri ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />

              {loading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color={COLORS.primaryLight} />
                  <Text style={styles.loadingText}>Analyzing coconut leaf...</Text>
                </View>
              )}

              {!loading && (
                <TouchableOpacity style={styles.closeBtn} onPress={clearSelection}>
                  <Ionicons name="close-circle" size={30} color={COLORS.diseased} />
                </TouchableOpacity>
              )}
            </View>
          ) : (
            <View style={styles.emptyImageWrapper}>
              <View style={styles.emptyIconRing}>
                <Ionicons name="camera" size={40} color={COLORS.primaryLight} />
              </View>
              <Text style={styles.emptyImageText}>No Image Selected</Text>
              <Text style={styles.emptyImageHint}>Use Camera or Gallery below</Text>
            </View>
          )}
        </View>

        {/* ── Photo Buttons ────────────────────────────────────── */}
        {!loading && (
          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.mediaButton}
              onPress={() => handlePickImage(true)}
            >
              <Ionicons name="camera-outline" size={20} color={COLORS.primaryLight} />
              <Text style={styles.mediaBtnText}>Take Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.mediaButton}
              onPress={() => handlePickImage(false)}
            >
              <Ionicons name="images-outline" size={20} color={COLORS.primaryLight} />
              <Text style={styles.mediaBtnText}>Choose from Gallery</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Scan Button ──────────────────────────────────────── */}
        {imageUri && (
          <GradientButton
            title={loading ? "Analyzing..." : "Analyze Leaf"}
            onPress={handleAnalyze}
            loading={loading}
            style={styles.scanBtn}
          />
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EAE7DF',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
    marginLeft: -8,
  },
  title: {
    color: '#1B2C1A',
    fontSize: 22,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  infoCard: {
    marginBottom: 24,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  infoCardTitle: {
    color: '#1B2C1A',
    fontSize: 18,
    fontWeight: '700',
  },
  infoCardText: {
    color: '#4B5548',
    fontSize: 14,
    lineHeight: 20,
  },
  sectionLabel: {
    color: '#6E7A6B',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  imageBox: {
    width: '100%',
    height: 280,
    borderRadius: ROUNDING.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#82A878',
    backgroundColor: '#EBF3E8',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 16,
  },
  imagePreviewContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 15,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 31, 13, 0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    zIndex: 20,
  },
  loadingText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  emptyImageWrapper: {
    alignItems: 'center',
    gap: 10,
  },
  emptyIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(76, 175, 80, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyImageText: {
    color: '#4B5548',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyImageHint: {
    color: '#717B6E',
    fontSize: 12,
    fontWeight: '500',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 20,
  },
  mediaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#FFFFFF',
    borderColor: '#EAE7DF',
    borderWidth: 1,
    borderRadius: ROUNDING.sm,
    paddingVertical: 14,
  },
  mediaBtnText: {
    color: '#1B2C1A',
    fontSize: 13,
    fontWeight: '700',
  },
  scanBtn: {
    marginTop: 10,
  },
  contextBox: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: ROUNDING.md,
    borderWidth: 1,
    borderColor: '#EAE7DF',
    marginBottom: 20,
  },
  rowCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowSpace: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  contextText: {
    fontSize: 14,
    color: '#717B6E',
    fontStyle: 'italic',
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1B2C1A',
    marginBottom: 6,
    marginTop: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#EAE7DF',
    borderRadius: 8,
    padding: 12,
    backgroundColor: '#FAFAF8',
    color: '#1B2C1A',
    fontSize: 14,
  },
  zoneSuccessText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2E7D32',
  },
  zoneDetailText: {
    fontSize: 12,
    color: '#717B6E',
    marginTop: 2,
  },
  overrideBtn: {
    fontSize: 13,
    color: '#1565C0',
    fontWeight: '600',
  },
  warningText: {
    color: '#D32F2F',
    fontSize: 12,
    marginBottom: 8,
  },
  pill: {
    borderWidth: 1,
    borderColor: '#EAE7DF',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flex: 1,
    marginHorizontal: 4,
    alignItems: 'center',
    backgroundColor: '#FAFAF8',
  },
  pillActive: {
    backgroundColor: '#EBF3E8',
    borderColor: '#82A878',
  },
  pillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4B5548',
  }
});
