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
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import { COLORS, ROUNDING, SHADOWS } from '../../constants/theme';
import GlassCard from '../../components/common/GlassCard';
import GradientButton from '../../components/common/GradientButton';
import { classifyImage, syncDiagnostics, type PathologyResult } from '../../services/pathologyService';
import { useAppStore } from '../../store/appStore';
import { getDiseaseInfo, DISEASE_CLASS_ORDER } from '../../constants/diseaseKnowledge';

// ── Step config ───────────────────────────────────────────────────────
const STEPS = ['Select Part', 'Take Photo', 'Analyze'];

// ── Coconut Part Config ───────────────────────────────────────────────
const PARTS = [
  { id: 'leaf',          labelEn: '🍃 Leaf',        labelSi: '🍃 කොළ' },
  { id: 'trunk',         labelEn: '🪵 Trunk',        labelSi: '🪵 කඳ' },
  { id: 'crown',         labelEn: '👑 Crown',        labelSi: '👑 කරටිය' },
  { id: 'root',          labelEn: '🕸️ Root',         labelSi: '🕸️ මුල්' },
  { id: 'nut',           labelEn: '🥥 Nut',          labelSi: '🥥 ගෙඩි' },
  { id: 'inflorescence', labelEn: '🌾 Flower',       labelSi: '🌾 කරල' },
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
        .then(() => setSyncStatus('synced'))
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
                  <Ionicons name="checkmark" size={12} color={COLORS.textDark} />
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
                {language === 'en' ? part.labelEn : part.labelSi}
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
                <Ionicons name="camera" size={40} color={COLORS.primaryLight} />
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
          >
            <Ionicons name="camera-outline" size={20} color={COLORS.primaryLight} />
            <Text style={styles.mediaBtnText}>
              {language === 'en' ? 'Camera' : 'කැමරාව'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.mediaButton}
            onPress={() => handlePickImage(false)}
            disabled={loading}
          >
            <Ionicons name="images-outline" size={20} color={COLORS.primaryLight} />
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
        <GlassCard style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <Ionicons name="shield-checkmark-outline" size={18} color={COLORS.primaryLight} />
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
        </GlassCard>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // ── Header ─────────────────────────────────────────────────────
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(76, 175, 80, 0.12)',
    backgroundColor: COLORS.surface,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '800',
    textAlign: 'center',
  },
  subtitle: {
    color: COLORS.textSecondary,
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
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(76, 175, 80, 0.08)',
  },
  stepItem: {
    alignItems: 'center',
    gap: 4,
  },
  stepDot: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: COLORS.surfaceLight,
    borderWidth: 1.5,
    borderColor: 'rgba(76, 175, 80, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    borderColor: COLORS.primaryLight,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
  },
  stepDotDone: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryLight,
  },
  stepDotText: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '700',
  },
  stepDotTextActive: {
    color: COLORS.primaryLight,
  },
  stepLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: '600',
  },
  stepLabelActive: {
    color: COLORS.primaryLight,
  },
  stepConnector: {
    width: 28,
    height: 2,
    backgroundColor: 'rgba(76, 175, 80, 0.15)',
    marginBottom: 14,
    marginHorizontal: 4,
    borderRadius: 1,
  },
  stepConnectorDone: {
    backgroundColor: COLORS.primaryLight,
  },
  // ── Scroll Content ──────────────────────────────────────────────
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  sectionLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  // ── Part Selector ───────────────────────────────────────────────
  partsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  partBtn: {
    backgroundColor: COLORS.surface,
    borderColor: 'rgba(76, 175, 80, 0.15)',
    borderWidth: 1.5,
    borderRadius: ROUNDING.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
    minWidth: '47%',
    flexGrow: 1,
    alignItems: 'center',
  },
  partBtnSelected: {
    borderColor: COLORS.primaryLight,
    backgroundColor: 'rgba(27, 94, 32, 0.3)',
  },
  partBtnText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  partBtnTextSelected: {
    color: COLORS.textPrimary,
    fontWeight: '800',
  },
  // ── Image Area ──────────────────────────────────────────────────
  imageBox: {
    width: '100%',
    height: 240,
    borderRadius: ROUNDING.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(76, 175, 80, 0.3)',
    backgroundColor: 'rgba(27, 94, 32, 0.06)',
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
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COLORS.primaryLight,
    opacity: 0.7,
    shadowColor: COLORS.primaryLight,
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
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 31, 13, 0.82)',
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
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 6,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(76, 175, 80, 0.25)',
  },
  loadingDotActive: {
    backgroundColor: COLORS.primaryLight,
  },
  syncBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: ROUNDING.sm,
    backgroundColor: 'rgba(10, 31, 13, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  syncBadgeSynced: { borderColor: 'rgba(34, 197, 94, 0.4)' },
  syncBadgeSyncing: { borderColor: 'rgba(59, 130, 246, 0.4)' },
  syncBadgeFailed: { borderColor: 'rgba(239, 68, 68, 0.4)' },
  syncBadgeText: {
    color: COLORS.textSecondary,
    fontSize: 10,
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
    backgroundColor: 'rgba(76, 175, 80, 0.08)',
    borderWidth: 1.5,
    borderColor: 'rgba(76, 175, 80, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyImageText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
  emptyImageHint: {
    color: COLORS.textMuted,
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
    backgroundColor: COLORS.surface,
    borderColor: 'rgba(76, 175, 80, 0.2)',
    borderWidth: 1.5,
    borderRadius: ROUNDING.sm,
    paddingVertical: 14,
  },
  mediaBtnText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  scanBtn: {
    marginBottom: 20,
  },
  // ── Info Card ───────────────────────────────────────────────────
  infoCard: {
    marginTop: 4,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  infoCardTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  diseaseGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  diseasePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(27, 94, 32, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: ROUNDING.full,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.15)',
  },
  diseasePillDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  diseasePillText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  infoCardFooter: {
    color: COLORS.textMuted,
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(76, 175, 80, 0.1)',
    paddingTop: 10,
    marginTop: 2,
  },
});
