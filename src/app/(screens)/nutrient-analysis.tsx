import React, { useState, useEffect } from 'react';
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
import { useAppStore } from '../../store/appStore';

export default function NutrientAnalysisScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const language = useAppStore(state => state.language);

  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeInput, setActiveInput] = useState<string | null>(null);

  useEffect(() => {
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
  const [showStageDropdown, setShowStageDropdown] = useState(false);

  const handleAgeChange = (text: string) => {
    setPalmAge(text);
    const age = parseFloat(text);
    if (!isNaN(age)) {
      if (age >= 0 && age <= 1.5) {
        setPalmStage('Seedling');
      } else if (age > 1.5 && age <= 5) {
        setPalmStage('Young Palm');
      } else if (age > 5) {
        setPalmStage('Bearing Palm');
      }
    }
  };

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
      const response = await api.post('/soil/location/agro-zone', { latitude, longitude });
      const data = response.data;

      if (data.success && data.zone) {
        setGpsZone(data.zone);
        setDetailedZone(data.agro_ecological_zone);
      } else {
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
  useEffect(() => {
    detectLocation();
  }, []);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const cameraStatus = await Camera.requestCameraPermissionsAsync();
      const galleryStatus = await ImagePicker.requestMediaLibraryPermissionsAsync();
      return cameraStatus.granted && galleryStatus.granted;
    }
    return true;
  };

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

  const handleAnalyze = async () => {
    if (!imageUri) return;

    if (!palmAge.trim()) {
      Alert.alert('Required Field', 'Please enter the Palm Age.');
      return;
    }

    if (!palmStage.trim()) {
      Alert.alert('Required Field', 'Please enter the Palm Stage.');
      return;
    }

    setLoading(true);
    try {
      const result = await analyzeLeafImage(imageUri);

      router.push({
        pathname: '/(screens)/nutrient-result' as any,
        params: {
          data: JSON.stringify(result),
          imageUri: imageUri,
          palmAge: palmAge,
          palmStage: palmStage,
          zone: gpsZone || manualZone || '',
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
        <Text style={styles.title}>Leaf Nutrient Scan</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Info Card */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <Ionicons name="leaf-outline" size={20} color="#1B5E20" />
            <Text style={styles.infoCardTitle}>Visual Leaf Assessment</Text>
          </View>
          <Text style={styles.infoCardText}>
            Capture or upload a clear photo of the coconut leaf to analyze and predict potential Nitrogen & Boron deficiencies.
          </Text>
        </View>

        {/* Guidelines Card */}
        <View style={styles.guidelineCard}>
          <View style={styles.guidelineHeader}>
            <Ionicons name="camera-outline" size={20} color="#004D40" />
            <Text style={styles.guidelineTitle}>
              {language === 'en' ? 'Photo Capture Guidelines' : 'ඡායාරූප මාර්ගෝපදේශය'}
            </Text>
          </View>
          
          <View style={styles.guidelineSection}>
            <View style={styles.doHeader}>
              <Ionicons name="checkmark-circle" size={16} color="#2E7D32" />
              <Text style={styles.doTitle}>
                {language === 'en' ? 'Correct Way (DO):' : 'නිවැරදි ආකාරය:'}
              </Text>
            </View>
            <Text style={styles.guidelineText}>
              {language === 'en' 
                ? '• Take a clear, close-up photo of a single leaf/frond segment.'
                : '• ළඟින් ගත් තනි පොල් කොළයක හෝ පත්‍ර කොටසක පැහැදිලි ඡායාරූපයක් ලබාගන්න.'}
            </Text>
          </View>

          <View style={[styles.guidelineSection, { borderTopWidth: 1, borderTopColor: '#B2DFDB', paddingTop: 10, marginTop: 10 }]}>
            <View style={styles.dontHeader}>
              <Ionicons name="close-circle" size={16} color="#C62828" />
              <Text style={styles.dontTitle}>
                {language === 'en' ? 'Avoid (DON\'T):' : 'මඟහරින්න (වැරදි ආකාර):'}
              </Text>
            </View>
            <View style={styles.bulletList}>
              <Text style={styles.guidelineText}>
                {language === 'en' 
                  ? '• Do not take photos from a distance showing the whole tree.' 
                  : '• ඈත සිට මුළු පොල් ගසම පෙනෙන සේ ඡායාරූප ගැනීම.'}
              </Text>
              <Text style={styles.guidelineText}>
                {language === 'en' 
                  ? '• Do not capture the leaf pointing up against the bright sky.' 
                  : '• අහස පසුබිම් වන සේ යට සිට ඉහළට ඡායාරූප ගැනීම.'}
              </Text>
              <Text style={styles.guidelineText}>
                {language === 'en' 
                  ? '• Avoid images with deep shadows, dark areas, or direct sun glare.' 
                  : '• තද සෙවනැලි හෝ දැඩි හිරු එළිය පත්‍රය මත පතිත වී ඇති ඡායාරූප.'}
              </Text>
            </View>
          </View>
        </View>

        {/* ── Context Form Area ──────────────────────────────────────── */}
        <View style={styles.formCard}>
          <Text style={styles.formSectionTitle}>1. Palm Details</Text>
          
          {/* Palm Age Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Palm Age (Years) *</Text>
            <View style={[
              styles.inputWrapper,
              activeInput === 'palmAge' && styles.inputWrapperFocused
            ]}>
              <Ionicons 
                name="calendar-outline" 
                size={18} 
                color={activeInput === 'palmAge' ? '#2E7D32' : '#90A4AE'} 
                style={styles.inputIcon} 
              />
              <TextInput 
                style={styles.input} 
                placeholder="e.g. 5"
                placeholderTextColor="#90A4AE"
                value={palmAge}
                onChangeText={handleAgeChange}
                keyboardType="numeric"
                onFocus={() => {
                  setActiveInput('palmAge');
                  setShowStageDropdown(false);
                }}
                onBlur={() => setActiveInput(null)}
              />
            </View>
          </View>

          {/* Palm Stage Input */}
          <View style={[styles.inputGroup, { marginBottom: 0 }]}>
            <Text style={styles.inputLabel}>Palm Stage *</Text>
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => {
                setActiveInput(null);
                setShowStageDropdown(!showStageDropdown);
              }}
              style={[
                styles.inputWrapper,
                showStageDropdown && styles.inputWrapperFocused
              ]}
            >
              <Ionicons 
                name="flower-outline" 
                size={18} 
                color={showStageDropdown ? '#2E7D32' : '#90A4AE'} 
                style={styles.inputIcon} 
              />
              <Text style={[
                styles.input, 
                { color: palmStage ? '#1B2C1A' : '#90A4AE', paddingTop: Platform.OS === 'ios' ? 0 : 12 }
              ]}>
                {palmStage || 'Select growth stage'}
              </Text>
              <Ionicons 
                name={showStageDropdown ? "chevron-up" : "chevron-down"} 
                size={18} 
                color="#90A4AE" 
                style={{ marginRight: 10 }}
              />
            </TouchableOpacity>

            {showStageDropdown && (
              <View style={styles.dropdownContainer}>
                {['Seedling', 'Young Palm', 'Bearing Palm'].map((stage) => (
                  <TouchableOpacity
                    key={stage}
                    style={[
                      styles.dropdownOption,
                      palmStage === stage && styles.dropdownOptionSelected
                    ]}
                    onPress={() => {
                      setPalmStage(stage);
                      setShowStageDropdown(false);
                    }}
                  >
                    <Text style={[
                      styles.dropdownOptionText,
                      palmStage === stage && styles.dropdownOptionTextSelected
                    ]}>
                      {stage}
                    </Text>
                    {palmStage === stage && (
                      <Ionicons name="checkmark" size={16} color="#2E7D32" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* ── Agro-climatic Zone Card ───────────────────────────────── */}
        <View style={styles.formCard}>
          <Text style={styles.formSectionTitle}>2. Agro-Climatic Zone</Text>
          
          {fetchingLocation ? (
            <View style={styles.locationDetectionContainer}>
              <ActivityIndicator size="small" color="#2E7D32" />
              <Text style={styles.locationDetectText}>Auto-detecting agro-climatic zone...</Text>
            </View>
          ) : gpsZone && !showManualOverride ? (
            <View style={styles.zoneSuccessContainer}>
              <View style={styles.zoneSuccessHeader}>
                <View style={styles.successPinCircle}>
                  <Ionicons name="location" size={16} color="#2E7D32" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.zoneSuccessText}>{gpsZone} Zone detected</Text>
                  {detailedZone && <Text style={styles.zoneDetailText}>{detailedZone}</Text>}
                </View>
              </View>
              <TouchableOpacity onPress={() => setShowManualOverride(true)} style={styles.changeZoneBtn}>
                <Text style={styles.changeZoneBtnText}>Change Zone Manually</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {locationPermission === false && (
                <View style={styles.warningAlert}>
                  <Ionicons name="warning" size={16} color="#C62828" />
                  <Text style={styles.warningAlertText}>
                    Location permission denied. Please select your zone manually below.
                  </Text>
                </View>
              )}
              <Text style={styles.inputLabel}>Select Your Region Zone</Text>
              <View style={styles.pillRow}>
                <TouchableOpacity 
                  onPress={() => setManualZone('Wet')} 
                  style={[styles.pill, manualZone === 'Wet' && styles.pillActiveWet]}
                >
                  <Text style={[styles.pillText, manualZone === 'Wet' && styles.pillTextActiveWet]}>Wet</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setManualZone('Intermediate')} 
                  style={[styles.pill, manualZone === 'Intermediate' && styles.pillActiveInt]}
                >
                  <Text style={[styles.pillText, manualZone === 'Intermediate' && styles.pillTextActiveInt]}>Intermediate</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setManualZone('Dry')} 
                  style={[styles.pill, manualZone === 'Dry' && styles.pillActiveDry]}
                >
                  <Text style={[styles.pillText, manualZone === 'Dry' && styles.pillTextActiveDry]}>Dry</Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity onPress={detectLocation} style={styles.retryBtn}>
                <Ionicons name="refresh-outline" size={14} color="#005A9C" />
                <Text style={styles.retryBtnText}>Retry Auto-Detection</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* ── Photo Capture Box ─────────────────────────────────────── */}
        <View style={styles.formCard}>
          <Text style={styles.formSectionTitle}>3. Leaf Image Source</Text>
          
          <View style={styles.imageBox}>
            {imageUri ? (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />

                {loading && (
                  <View style={styles.loadingOverlay}>
                    <ActivityIndicator size="large" color="#FFFFFF" />
                    <Text style={styles.loadingText}>Analyzing leaf details...</Text>
                  </View>
                )}

                {!loading && (
                  <TouchableOpacity style={styles.closeBtn} onPress={clearSelection} activeOpacity={0.8}>
                    <Ionicons name="close" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.emptyImageWrapper}
                activeOpacity={0.7}
                onPress={() => handlePickImage(false)}
              >
                <View style={styles.emptyIconRing}>
                  <Ionicons name="cloud-upload" size={32} color="#2E7D32" />
                </View>
                <Text style={styles.emptyImageText}>Select Leaf Photo</Text>
                <Text style={styles.emptyImageHint}>Tap here to select an image from gallery</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Media Capture Button Row */}
          {!loading && (
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.mediaButton}
                onPress={() => handlePickImage(true)}
              >
                <View style={[styles.mediaIconCircle, { backgroundColor: '#E8F5E9' }]}>
                  <Ionicons name="camera" size={18} color="#2E7D32" />
                </View>
                <Text style={styles.mediaBtnText}>Camera</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.mediaButton}
                onPress={() => handlePickImage(false)}
              >
                <View style={[styles.mediaIconCircle, { backgroundColor: '#E3F2FD' }]}>
                  <Ionicons name="images" size={18} color="#005A9C" />
                </View>
                <Text style={styles.mediaBtnText}>Gallery</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Validation Error Message */}
          {(!palmAge.trim() || !palmStage.trim() || !imageUri) && (
            <View style={styles.errorMsgContainer}>
              <Ionicons name="alert-circle-outline" size={16} color="#C62828" />
              <Text style={styles.errorMsgText}>
                {!imageUri 
                  ? "Please select a leaf photo, enter palm age, and stage to proceed."
                  : "Please enter both palm age and growth stage to proceed."}
              </Text>
            </View>
          )}

          {/* ── Scan Trigger Button ──────────────────────────────────── */}
          <GradientButton
            title={loading ? "Analyzing..." : "Run Leaf Assessment"}
            onPress={handleAnalyze}
            loading={loading}
            disabled={loading || !palmAge.trim() || !palmStage.trim() || !imageUri}
            style={styles.scanBtn}
          />
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
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
    fontSize: 20,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  infoCard: {
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6C9',
    borderWidth: 1,
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B5E20',
  },
  infoCardText: {
    color: '#2E7D32',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAE7DF',
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  formSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#78909C',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#37474F',
    fontSize: 12.5,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#ECEFF1',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  inputWrapperFocused: {
    borderColor: '#2E7D32',
    backgroundColor: '#FFFFFF',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1B2C1A',
    fontWeight: '600',
  },
  locationDetectionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    gap: 8,
  },
  locationDetectText: {
    fontSize: 14,
    color: '#546E7A',
    fontWeight: '600',
  },
  zoneSuccessContainer: {
    backgroundColor: '#F1F8E9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#DCEDC8',
    padding: 14,
  },
  zoneSuccessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  successPinCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#DCEDC8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoneSuccessText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#2E7D32',
  },
  zoneDetailText: {
    fontSize: 12,
    color: '#558B2F',
    fontWeight: '600',
    marginTop: 2,
  },
  changeZoneBtn: {
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  changeZoneBtnText: {
    fontSize: 12,
    color: '#005A9C',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  warningAlert: {
    flexDirection: 'row',
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  warningAlertText: {
    flex: 1,
    fontSize: 12,
    color: '#C62828',
    fontWeight: '600',
  },
  pillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },
  pill: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ECEFF1',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  pillActiveWet: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  pillActiveInt: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFC107',
  },
  pillActiveDry: {
    backgroundColor: '#FFE0B2',
    borderColor: '#FF9800',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78909C',
  },
  pillTextActiveWet: {
    color: '#2E7D32',
  },
  pillTextActiveInt: {
    color: '#F57F17',
  },
  pillTextActiveDry: {
    color: '#E65100',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 14,
  },
  retryBtnText: {
    fontSize: 12,
    color: '#005A9C',
    fontWeight: '700',
  },
  imageBox: {
    width: '100%',
    height: 240,
    borderRadius: 18,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#CFD8DC',
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 18,
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
    top: 12,
    right: 12,
    zIndex: 10,
    backgroundColor: 'rgba(0,0,0,0.5)',
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(27, 44, 26, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    zIndex: 20,
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyImageWrapper: {
    alignItems: 'center',
    padding: 20,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
  },
  emptyIconRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyImageText: {
    color: '#1B2C1A',
    fontSize: 15,
    fontWeight: '800',
  },
  emptyImageHint: {
    color: '#78909C',
    fontSize: 12,
    fontWeight: '500',
    marginTop: 4,
    textAlign: 'center',
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 16,
  },
  mediaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#ECEFF1',
    borderWidth: 1,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  mediaIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mediaBtnText: {
    color: '#1B2C1A',
    fontSize: 13.5,
    fontWeight: '800',
  },
  scanBtn: {
    marginTop: 8,
    borderRadius: 14,
  },
  guidelineCard: {
    backgroundColor: '#E0F2F1',
    borderColor: '#B2DFDB',
    borderWidth: 1,
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  guidelineHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  guidelineTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#004D40',
  },
  guidelineSection: {
    paddingLeft: 4,
  },
  doHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  doTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2E7D32',
  },
  dontHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  dontTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#C62828',
  },
  guidelineText: {
    color: '#37474F',
    fontSize: 12.5,
    lineHeight: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  bulletList: {
    gap: 4,
  },
  dropdownContainer: {
    backgroundColor: '#FFFFFF',
    borderColor: '#EAE7DF',
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 6,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  dropdownOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F2EB',
  },
  dropdownOptionSelected: {
    backgroundColor: '#E8F5E9',
  },
  dropdownOptionText: {
    fontSize: 14,
    color: '#1B2C1A',
    fontWeight: '500',
  },
  dropdownOptionTextSelected: {
    color: '#2E7D32',
    fontWeight: '700',
  },
  errorMsgContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    marginTop: 12,
    marginBottom: 8,
    gap: 6,
  },
  errorMsgText: {
    color: '#C62828',
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
});
