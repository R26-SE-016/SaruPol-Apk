import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { COLORS, ROUNDING, SHADOWS } from '../../constants/theme';
import GradientButton from '../../components/common/GradientButton';
import { classifyImage, syncDiagnostics, updateHotspotStatus, type PathologyResult } from '../../services/pathologyService';
import { useAppStore } from '../../store/appStore';
import { getDiseaseInfo, DISEASE_CLASS_ORDER } from '../../constants/diseaseKnowledge';

const PALETTE = {
  bg: '#F8FAF8',
  cardBg: '#FFFFFF',
  cardBorder: '#E8EDE8',
  subtleBorder: '#EEF2EE',
  brandDark: '#142817',
  brandPrimary: '#15803D',
  brandEmerald: '#16A34A',
  brandLight: '#DCFCE7',
  brandSubtle: '#F0FDF4',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textLight: '#94A3B8',
  red: '#DC2626',
  redLight: '#FEE2E2',
  redSubtle: '#FFF7F7',
  redBorder: '#FECACA',
};

// ── Step config ───────────────────────────────────────────────────────
const STEPS = ['Select Part', 'Take Photo', 'Analyze'];

// ── Coconut Part Config ───────────────────────────────────────────────
const PARTS = [
  { id: 'leaf',          labelEn: '🍃 Leaf',        labelSi: '🍃 කොළ',       labelTa: '🍃 இலை' },
  { id: 'trunk',         labelEn: '🪵 Trunk',        labelSi: '🪵 කඳ',        labelTa: '🪵 தண்டு' },
  { id: 'crown',         labelEn: '👑 Crown',        labelSi: '👑 කරටිය',     labelTa: '👑 கிரீடம்' },
  { id: 'root',          labelEn: '🕸️ Root',         labelSi: '🕸️ මුල්',       labelTa: '🕸️ வேர்' },
  { id: 'nut',           labelEn: '🥥 Nut',          labelSi: '🥥 ගෙඩි',       labelTa: '🥥 காய்' },
  { id: 'inflorescence', labelEn: '🌾 Flower',       labelSi: '🌾 කරල',       labelTa: '🌾 பூ' },
];

// ── Analysis step labels ──────────────────────────────────────────────
const ANALYSIS_STEPS = [
  { label: 'Preparing image...', icon: 'image-outline' },
  { label: 'Uploading to AI model...', icon: 'cloud-upload-outline' },
  { label: 'Running MobileNetV2 inference...', icon: 'hardware-chip-outline' },
  { label: 'Processing results...', icon: 'analytics-outline' },
];

export default function ScanScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ hotspot_id?: string; target_lat?: string; target_lng?: string; hotspot_action?: string }>();
  const addHistoryItem = useAppStore(state => state.addHistoryItem);
  const user = useAppStore(state => state.user);
  const language = useAppStore(state => state.language);


  const [selectedPart, setSelectedPart] = useState('leaf');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'failed'>('idle');
  const [quickResult, setQuickResult] = useState<PathologyResult | null>(null);

  // Animations
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const stepProgress = useRef(new Animated.Value(0)).current;

  // ── Current wizard step ───────────────────────────────────────────
  const currentStep = imageUri ? (loading ? 2 : 1) : 0;

  // ── Scan line animation ───────────────────────────────────────────
  useEffect(() => {
    if (imageUri && !loading) {
      const scanLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(scanLineAnim, { toValue: 1, duration: 2000, useNativeDriver: true }),
          Animated.timing(scanLineAnim, { toValue: 0, duration: 2000, useNativeDriver: true }),
        ])
      );
      scanLoop.start();
      return () => scanLoop.stop();
    }
  }, [imageUri, loading]);

  // ── Pulse animation for the scan button ──────────────────────────
  useEffect(() => {
    if (imageUri && !loading) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.04, duration: 800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1.0, duration: 800, useNativeDriver: true }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    }
  }, [imageUri, loading]);

  // ── Fade in quick result ──────────────────────────────────────────
  useEffect(() => {
    if (quickResult) {
      Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [quickResult]);

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
      Alert.alert(t('common.error'), 'Camera or Gallery permissions are required.');
      return;
    }

    const pickerOptions: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    };

    const result = useCamera
      ? await ImagePicker.launchCameraAsync(pickerOptions)
      : await ImagePicker.launchImageLibraryAsync(pickerOptions);

    if (!result.canceled && result.assets?.[0]) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 || null);
      setQuickResult(null);
      setSyncStatus('idle');
    }
  };

  // ── Simulate analysis steps ───────────────────────────────────────
  const runStepAnimation = () => {
    let step = 0;
    const advance = () => {
      if (step < ANALYSIS_STEPS.length - 1) {
        step++;
        setAnalysisStep(step);
        setTimeout(advance, 900);
      }
    };
    setTimeout(advance, 900);
  };

  // ── Main scan handler ─────────────────────────────────────────────
  const handleScan = async () => {
    if (!imageBase64) {
      Alert.alert(
        t('common.error'),
        language === 'en'
          ? 'Please capture or choose an image first.'
          : 'කරුණාකර පළමුව ඡායාරූපයක් ලබාගන්න.'
      );
      return;
    }

    setLoading(true);
    setAnalysisStep(0);
    setQuickResult(null);
    runStepAnimation();

    try {
      const result = await classifyImage({
        imageBase64,
        part: selectedPart,
        system: 'B',
      });

      // Save to local history
      await addHistoryItem({
        type: 'pathology',
        input: { part: selectedPart, imageUri },
        result,
      });

      // Show quick result inline
      setQuickResult(result);
      setLoading(false);

      // Background sync to Firestore
      setSyncStatus('syncing');
      const userId = user?.id ? String(user.id) : 'guest_user';
      syncDiagnostics({
        user_id: userId,
        device_id: `sarupol_apk_${Platform.OS}`,
        estate_id: 'default_estate',
        batch: [{
          disease_class: result.disease_class,
          confidence: result.confidence,
          gps: { lat: 7.2906, lng: 80.6337 }, // Default — can be GPS location
          captured_at: result.timestamp,
          image_ref: `mobile_uploads/${userId}/scan_${Date.now()}.jpg`,
          local_id: `local_${Date.now()}`,
          part: selectedPart,
        }],
      })
        .then(() => {
          setSyncStatus('synced');
          if (params.hotspot_id) {
            updateHotspotStatus(params.hotspot_id, 'inspected');
          }
        })
        .catch(() => setSyncStatus('failed'));


      // Navigate to full result screen
      router.push({
        pathname: '/(screens)/scan-result',
        params: {
          part: selectedPart,
          disease_class: result.disease_class,
          status: result.status,
          diagnosis: result.diagnosis,
          confidence: String(result.confidence),
          severity: result.severity,
          chemical: result.recommendations?.chemical || '',
          cultural: result.recommendations?.cultural || '',
          preventive: result.recommendations?.preventive || '',
          inference_time_ms: String(result.inference_time_ms || 0),
          all_predictions: JSON.stringify(result.all_predictions || []),
          imageUri: imageUri || '',
        },
      });
    } catch (err: any) {
      setLoading(false);
      Alert.alert(
        t('common.error'),
        language === 'en'
          ? `Diagnosis failed: ${err.message}`
          : `රෝගය හඳුනා ගැනීම අසාර්ථක විය: ${err.message}`
      );
    }
  };

  const clearSelection = () => {
    setImageUri(null);
    setImageBase64(null);
    setQuickResult(null);
    setSyncStatus('idle');
  };

  // ── Computed values ───────────────────────────────────────────────
  const scanLineTranslate = scanLineAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-110, 110],
  });

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {language === 'en' ? '🔬 Disease Detection' : '🔬 රෝග හඳුනාගැනීම'}
        </Text>
        <Text style={styles.subtitle}>
          {language === 'en'
            ? 'MobileNetV2-INT8 · 6 Disease Classes'
            : 'MobileNetV2-INT8 · රෝග වර්ග 6'}
        </Text>
      </View>

      {/* ── Step Indicator ─────────────────────────────────────── */}
      <View style={styles.stepBar}>
        {STEPS.map((step, idx) => (
          <React.Fragment key={step}>
            <View style={styles.stepItem}>
              <View style={[
                styles.stepDot,
                idx < currentStep && styles.stepDotDone,
                idx === currentStep && styles.stepDotActive,
              ]}>
                {idx < currentStep ? (
                  <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                ) : (
                  <Text style={[
                    styles.stepDotText,
                    idx === currentStep && styles.stepDotTextActive
                  ]}>
                    {idx + 1}
                  </Text>
                )}
              </View>
              <Text style={[
                styles.stepLabel,
                idx === currentStep && styles.stepLabelActive
              ]}>
                {step}
              </Text>
            </View>
            {idx < STEPS.length - 1 && (
              <View style={[
                styles.stepConnector,
                idx < currentStep && styles.stepConnectorDone
              ]} />
            )}
          </React.Fragment>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

        {/* ── Targeted Hotspot Inspection Banner (Macro-to-Micro Bridge) ── */}
        {params.hotspot_id && (
          <View style={styles.hotspotBanner}>
            <View style={styles.hotspotLeftBar} />
            <View style={styles.hotspotBannerContent}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                <Ionicons name="airplane" size={18} color={PALETTE.red} style={{ marginRight: 6 }} />
                <Text style={styles.hotspotBannerTitle}>
                  TARGETED DRONE HOTSPOT INSPECTION
                </Text>
              </View>
              <Text style={styles.hotspotBannerDesc}>
                {params.hotspot_action || 'Stressed tree flagged by aerial spectral scan.'}
              </Text>
              {params.target_lat && params.target_lng && (
                <Text style={styles.hotspotGps}>
                  📍 GPS: {parseFloat(params.target_lat).toFixed(5)}, {parseFloat(params.target_lng).toFixed(5)}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* ── Part Selector ───────────────────────────────────── */}
        <Text style={styles.sectionLabel}>

          {language === 'en' ? 'SELECT PALM PART' : 'කොටස තෝරන්න'}
        </Text>
        <View style={styles.partsGrid}>
          {PARTS.map((part) => (
            <TouchableOpacity
              key={part.id}
              style={[styles.partBtn, selectedPart === part.id && styles.partBtnSelected]}
              onPress={() => setSelectedPart(part.id)}
              activeOpacity={0.75}
            >
              <Text style={[
                styles.partBtnText,
                selectedPart === part.id && styles.partBtnTextSelected
              ]}>
                {language === 'ta' ? part.labelTa : language === 'si' ? part.labelSi : part.labelEn}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Image Area ──────────────────────────────────────── */}
        <Text style={styles.sectionLabel}>
          {language === 'en' ? 'PHOTO' : 'ඡායාරූපය'}
        </Text>
        <View style={styles.imageBox}>
          {imageUri ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />

              {/* Scan Line Overlay (only when not loading) */}
              {!loading && (
                <Animated.View
                  style={[
                    styles.scanLine,
                    { transform: [{ translateY: scanLineTranslate }] }
                  ]}
                />
              )}

              {/* Loading overlay with step progress */}
              {loading && (
                <View style={styles.loadingOverlay}>
                  <ActivityIndicator size="large" color={COLORS.primaryLight} />
                  <View style={styles.loadingStepContainer}>
                    <Ionicons
                      name={ANALYSIS_STEPS[analysisStep].icon as any}
                      size={18}
                      color={COLORS.primaryLight}
                    />
                    <Text style={styles.loadingStepText}>
                      {ANALYSIS_STEPS[analysisStep].label}
                    </Text>
                  </View>
                  <View style={styles.loadingDots}>
                    {ANALYSIS_STEPS.map((_, idx) => (
                      <View
                        key={idx}
                        style={[
                          styles.loadingDot,
                          idx <= analysisStep && styles.loadingDotActive
                        ]}
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* Close button */}
              {!loading && (
                <TouchableOpacity style={styles.closeBtn} onPress={clearSelection}>
                  <Ionicons name="close-circle" size={30} color={COLORS.diseased} />
                </TouchableOpacity>
              )}

              {/* Sync Status Badge */}
              {syncStatus !== 'idle' && !loading && (
                <View style={[
                  styles.syncBadge,
                  syncStatus === 'synced' && styles.syncBadgeSynced,
                  syncStatus === 'syncing' && styles.syncBadgeSyncing,
                  syncStatus === 'failed' && styles.syncBadgeFailed,
                ]}>
                  <Ionicons
                    name={syncStatus === 'synced' ? 'cloud-done' : syncStatus === 'syncing' ? 'cloud-upload' : 'cloud-offline'}
                    size={12}
                    color={COLORS.textPrimary}
                  />
                  <Text style={styles.syncBadgeText}>
                    {syncStatus === 'synced' ? 'Synced' : syncStatus === 'syncing' ? 'Syncing...' : 'Offline'}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyImageWrapper}>
              <View style={styles.emptyIconRing}>
                <Ionicons name="camera" size={38} color={PALETTE.brandEmerald} />
              </View>
              <Text style={styles.emptyImageText}>
                {language === 'en' ? 'No Image Selected' : 'ඡායාරූපයක් තෝරාගෙන නැත'}
              </Text>
              <Text style={styles.emptyImageHint}>
                {language === 'en'
                  ? 'Use Camera or Gallery below'
                  : 'පහතින් කැමරාව හෝ ගැලරිය භාවිතා කරන්න'}
              </Text>
            </View>
          )}
        </View>

        {/* ── Photo Buttons ────────────────────────────────────── */}
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={styles.mediaButton}
            onPress={() => handlePickImage(true)}
            disabled={loading}
            activeOpacity={0.75}
          >
            <Ionicons name="camera-outline" size={20} color={PALETTE.brandEmerald} />
            <Text style={styles.mediaBtnText}>
              {language === 'en' ? 'Camera' : 'කැමරාව'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mediaButton}
            onPress={() => handlePickImage(false)}
            disabled={loading}
            activeOpacity={0.75}
          >
            <Ionicons name="images-outline" size={20} color={PALETTE.brandEmerald} />
            <Text style={styles.mediaBtnText}>
              {language === 'en' ? 'Gallery' : 'ගැලරිය'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Scan Button ──────────────────────────────────────── */}
        {imageUri && !loading && (
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <GradientButton
              title={language === 'en' ? '🔬 Run AI Diagnosis' : '🔬 AI රෝග හඳුනාගැනීම'}
              onPress={handleScan}
              loading={loading}
              style={styles.scanBtn}
            />
          </Animated.View>
        )}

        {/* ── Disease Classes Info Card ────────────────────────── */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <Ionicons name="shield-checkmark-outline" size={18} color={PALETTE.brandEmerald} />
            <Text style={styles.infoCardTitle}>
              {language === 'en' ? 'Detectable Diseases' : 'හඳුනාගත හැකි රෝග'}
            </Text>
          </View>
          <View style={styles.diseaseGrid}>
            {DISEASE_CLASS_ORDER.map((cls) => {
              const info = getDiseaseInfo(cls);
              return (
                <View key={cls} style={styles.diseasePill}>
                  <View style={[styles.diseasePillDot, { backgroundColor: info.color }]} />
                  <Text style={styles.diseasePillText}>{info.displayName}</Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.infoCardFooter}>
            {language === 'en'
              ? 'Powered by MobileNetV2-INT8 · Cloud Backend'
              : 'MobileNetV2-INT8 · Cloud Backend මගින් ක්‍රියා කරයි'}
          </Text>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PALETTE.bg,
  },
  // ── Header ─────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 56 : 38,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2EE',
    backgroundColor: PALETTE.cardBg,
    ...Platform.select({
      ios: {
        shadowColor: '#12211C',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  title: {
    color: PALETTE.textPrimary,
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: PALETTE.textSecondary,
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
    fontWeight: '500',
  },
  // ── Step Indicator ──────────────────────────────────────────────
  stepBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: PALETTE.cardBg,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2EE',
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F1F5F2',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    borderColor: PALETTE.brandEmerald,
    backgroundColor: PALETTE.brandLight,
  },
  stepDotDone: {
    backgroundColor: PALETTE.brandEmerald,
    borderColor: PALETTE.brandEmerald,
  },
  stepDotText: {
    color: PALETTE.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  stepDotTextActive: {
    color: PALETTE.brandPrimary,
  },
  stepLabel: {
    color: PALETTE.textLight,
    fontSize: 10,
    fontWeight: '600',
  },
  stepLabelActive: {
    color: PALETTE.brandEmerald,
    fontWeight: '700',
  },
  stepConnector: {
    width: 28,
    height: 2,
    backgroundColor: '#E2E8F0',
    marginBottom: 14,
    marginHorizontal: 4,
    borderRadius: 1,
  },
  stepConnectorDone: {
    backgroundColor: PALETTE.brandEmerald,
  },
  // ── Scroll Content ──────────────────────────────────────────────
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 40,
  },
  sectionLabel: {
    color: PALETTE.textSecondary,
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  // ── Drone Hotspot Banner ────────────────────────────────────────
  hotspotBanner: {
    backgroundColor: PALETTE.redSubtle,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PALETTE.redBorder,
    overflow: 'hidden',
    marginBottom: 20,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: PALETTE.red,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  hotspotLeftBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4.5,
    backgroundColor: PALETTE.red,
  },
  hotspotBannerContent: {
    padding: 14,
    paddingLeft: 16,
  },
  hotspotBannerTitle: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#991B1B',
  },
  hotspotBannerDesc: {
    fontSize: 12,
    color: '#7F1D1D',
    marginBottom: 3,
  },
  hotspotGps: {
    fontSize: 11,
    color: '#991B1B',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  // ── Part Selector ───────────────────────────────────────────────
  partsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  partBtn: {
    backgroundColor: PALETTE.cardBg,
    borderColor: PALETTE.cardBorder,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: '47%',
    flexGrow: 1,
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#12211C',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  partBtnSelected: {
    borderColor: PALETTE.brandEmerald,
    backgroundColor: PALETTE.brandSubtle,
  },
  partBtnText: {
    color: PALETTE.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  partBtnTextSelected: {
    color: PALETTE.brandPrimary,
    fontWeight: '800',
  },
  // ── Image Area ──────────────────────────────────────────────────
  imageBox: {
    width: '100%',
    height: 240,
    borderRadius: 22,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    backgroundColor: PALETTE.cardBg,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
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
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2.5,
    backgroundColor: PALETTE.brandEmerald,
    opacity: 0.85,
    shadowColor: PALETTE.brandEmerald,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
    elevation: 4,
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 10,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 2,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    zIndex: 20,
  },
  loadingStepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loadingStepText: {
    color: PALETTE.textPrimary,
    fontSize: 13.5,
    fontWeight: '700',
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 6,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E2E8F0',
  },
  loadingDotActive: {
    backgroundColor: PALETTE.brandEmerald,
  },
  syncBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  syncBadgeSynced: { borderColor: '#86EFAC' },
  syncBadgeSyncing: { borderColor: '#93C5FD' },
  syncBadgeFailed: { borderColor: '#FCA5A5' },
  syncBadgeText: {
    color: PALETTE.textPrimary,
    fontSize: 10.5,
    fontWeight: '700',
  },
  emptyImageWrapper: {
    alignItems: 'center',
    gap: 10,
  },
  emptyIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: PALETTE.brandSubtle,
    borderWidth: 1.5,
    borderColor: PALETTE.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyImageText: {
    color: PALETTE.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  emptyImageHint: {
    color: PALETTE.textLight,
    fontSize: 12,
    fontWeight: '500',
  },
  // ── Button Row ──────────────────────────────────────────────────
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: 16,
  },
  mediaButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: PALETTE.cardBg,
    borderColor: '#E2E8F0',
    borderWidth: 1.5,
    borderRadius: 16,
    paddingVertical: 14,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  mediaBtnText: {
    color: PALETTE.textPrimary,
    fontSize: 13.5,
    fontWeight: '800',
  },
  scanBtn: {
    marginBottom: 20,
  },
  // ── Info Card ─────────────────────────────────────────────────
  infoCard: {
    backgroundColor: PALETTE.cardBg,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: PALETTE.cardBorder,
    padding: 18,
    marginTop: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#12211C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  infoCardTitle: {
    color: PALETTE.textPrimary,
    fontSize: 14.5,
    fontWeight: '800',
  },
  diseaseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  diseasePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAF8',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EAEFEA',
  },
  diseasePillDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  diseasePillText: {
    color: PALETTE.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  infoCardFooter: {
    color: PALETTE.textLight,
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F2',
    paddingTop: 10,
    marginTop: 2,
  },
});
