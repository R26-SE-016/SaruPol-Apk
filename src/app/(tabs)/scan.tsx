// ══════════════════════════════════════════════════════════════════════
// SaruPol — Coconut Pathology Detection Screen (System B: Leaf Diagnostics)
// Project: R26-SE-016 · Precision Computer Vision for Coconut Pathology
//
// Powered by MobileNetV2-INT8 quantized on-device/cloud fallback model.
// System A (UAV aerial canopy surveillance) is reserved for the web platform.
// ══════════════════════════════════════════════════════════════════════

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
  Modal,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';
import * as Location from 'expo-location';
import { StatusBar } from 'expo-status-bar';
import { COLORS, ROUNDING } from '../../constants/theme';
import GradientButton from '../../components/common/GradientButton';
import {
  classifyImage,
  syncDiagnostics,
  type PathologyResult,
} from '../../services/pathologyService';
import { useAppStore } from '../../store/appStore';
import {
  getDiseaseInfo,
  DISEASE_CLASS_ORDER,
  type DiseaseClass,
  type DiseaseInfo,
} from '../../constants/diseaseKnowledge';

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
  amber: '#D97706',
  amberLight: '#FEF3C7',
};

// ── Step config ───────────────────────────────────────────────────────
const STEPS = ['Select Part', 'Take Photo', 'Analyze'];

// ── Coconut Anatomical Part Config ─────────────────────────────────────
const PARTS = [
  { id: 'leaf',          labelEn: '🍃 Leaf / Frond',  labelSi: '🍃 කොළය / පිත්ත', labelTa: '🍃 இலை / மட்டை' },
  { id: 'trunk',         labelEn: '🪵 Trunk / Stem',   labelSi: '🪵 කඳ',          labelTa: '🪵 தண்டு' },
  { id: 'crown',         labelEn: '👑 Spear Leaf',     labelSi: '👑 කරටිය',       labelTa: '👑 குருத்து' },
  { id: 'root',          labelEn: '🕸️ Root Zone',      labelSi: '🕸️ මුල් කලාපය',    labelTa: '🕸️ வேர் பகுதி' },
  { id: 'nut',           labelEn: '🥥 Nut',            labelSi: '🥥 ගෙඩි',        labelTa: '🥥 காய்' },
  { id: 'inflorescence', labelEn: '🌾 Flower',         labelSi: '🌾 කරල / මල',   labelTa: '🌾 பூங்கொத்து' },
];

// ── Analysis step labels ──────────────────────────────────────────────
const ANALYSIS_STEPS = [
  { label: 'Preparing high-resolution frame...', icon: 'image-outline' },
  { label: 'Uploading to System B engine...', icon: 'cloud-upload-outline' },
  { label: 'Running MobileNetV2-INT8 inference...', icon: 'hardware-chip-outline' },
  { label: 'Synthesizing CRI treatment plan...', icon: 'analytics-outline' },
];

export default function ScanScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const addHistoryItem = useAppStore((state) => state.addHistoryItem);
  const user = useAppStore((state) => state.user);
  const language = useAppStore((state) => state.language);

  const [selectedPart, setSelectedPart] = useState('leaf');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'failed'>('idle');
  const [quickResult, setQuickResult] = useState<PathologyResult | null>(null);
  const [selectedDiseaseModal, setSelectedDiseaseModal] = useState<DiseaseInfo | null>(null);
  const [showTips, setShowTips] = useState(false);

  // Animations
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

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
      Alert.alert(
        t('common.error'),
        language === 'ta'
          ? 'கேமரா அல்லது கேலரி அனுமதி தேவைப்படுகிறது.'
          : language === 'si'
          ? 'කැමරා හෝ ගැලරි අවසරය අවශ්‍ය වේ.'
          : 'Camera or Gallery permissions are required.'
      );
      return;
    }

    const pickerOptions: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.75,
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
        setTimeout(advance, 850);
      }
    };
    setTimeout(advance, 850);
  };

  // ── Main scan handler ─────────────────────────────────────────────
  const handleScan = async () => {
    if (!imageBase64) {
      Alert.alert(
        t('common.error'),
        language === 'ta'
          ? 'தயவுசெய்து முதலில் ஒரு புகைப்படத்தைப் பிடிக்கவும்.'
          : language === 'si'
          ? 'කරුණාකර පළමුව ඡායාරූපයක් ලබාගන්න.'
          : 'Please capture or choose an image first.'
      );
      return;
    }

    setLoading(true);
    setAnalysisStep(0);
    setQuickResult(null);
    runStepAnimation();

    // Fetch ground GPS coordinates for research & batch sync
    let currentGps = { lat: 7.2906, lng: 80.6337 };
    try {
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        currentGps = { lat: loc.coords.latitude, lng: loc.coords.longitude };
      }
    } catch {
      // Use fallback default coordinates
    }

    try {
      const result = await classifyImage({
        imageBase64,
        part: selectedPart,
        system: 'B',
      });

      // Save to local SQLite / store history
      await addHistoryItem({
        type: 'pathology',
        input: { part: selectedPart, imageUri, gps: currentGps },
        result,
      });

      // Show quick result inline
      setQuickResult(result);
      setLoading(false);

      // Background batch synchronization to Firestore BulkWriter
      setSyncStatus('syncing');
      const userId = user?.id ? String(user.id) : 'guest_user';
      syncDiagnostics({
        user_id: userId,
        device_id: `sarupol_apk_${Platform.OS}`,
        estate_id: user?.estate_id || 'default_estate',
        batch: [
          {
            disease_class: result.disease_class,
            confidence: result.confidence,
            gps: currentGps,
            captured_at: result.timestamp,
            image_ref: `mobile_uploads/${userId}/scan_${Date.now()}.jpg`,
            local_id: `local_${Date.now()}`,
            part: selectedPart,
          },
        ],
      })
        .then(() => setSyncStatus('synced'))
        .catch(() => setSyncStatus('failed'));

      // Navigate to full result view
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
        language === 'ta'
          ? `நோயைக் கண்டறிய முடியவில்லை: ${err.message}`
          : language === 'si'
          ? `රෝගය හඳුනා ගැනීම අසාර්ථක විය: ${err.message}`
          : `Diagnosis failed: ${err.message}`
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

      {/* ── Top App Bar ─────────────────────────────────────────── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>
            {language === 'ta'
              ? '🔬 இலை நோய் கண்டறிதல்'
              : language === 'si'
              ? '🔬 පත්‍ර රෝග හඳුනාගැනීම'
              : '🔬 Leaf Pathology Scanner'}
          </Text>
          <Text style={styles.subtitle}>
            {language === 'ta'
              ? 'MobileNetV2-INT8 · கணினி பார்வை அமைப்பு B'
              : language === 'si'
              ? 'MobileNetV2-INT8 · පරිගණක දෘෂ්ටි පද්ධති B'
              : 'MobileNetV2-INT8 · Vision System B'}
          </Text>
        </View>

        <TouchableOpacity
          style={styles.historyBtn}
          onPress={() => router.push('/(screens)/history')}
          activeOpacity={0.7}
        >
          <Ionicons name="time-outline" size={20} color={PALETTE.brandEmerald} />
        </TouchableOpacity>
      </View>

      {/* ── Step Progress Bar ───────────────────────────────────── */}
      <View style={styles.stepBar}>
        {STEPS.map((step, idx) => (
          <React.Fragment key={step}>
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.stepDot,
                  idx < currentStep && styles.stepDotDone,
                  idx === currentStep && styles.stepDotActive,
                ]}
              >
                {idx < currentStep ? (
                  <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                ) : (
                  <Text
                    style={[
                      styles.stepDotText,
                      idx === currentStep && styles.stepDotTextActive,
                    ]}
                  >
                    {idx + 1}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.stepLabel,
                  idx === currentStep && styles.stepLabelActive,
                ]}
              >
                {step}
              </Text>
            </View>
            {idx < STEPS.length - 1 && (
              <View
                style={[
                  styles.stepConnector,
                  idx < currentStep && styles.stepConnectorDone,
                ]}
              />
            )}
          </React.Fragment>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── Field Scanning Guidance Card ────────────────────────── */}
        <TouchableOpacity
          style={styles.tipsToggleCard}
          onPress={() => setShowTips(!showTips)}
          activeOpacity={0.8}
        >
          <View style={styles.tipsIconWrap}>
            <Ionicons name="sparkles" size={16} color={PALETTE.brandPrimary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.tipsTitle}>
              {language === 'ta'
                ? 'துல்லியமான இலை பரிசோதனை வழிகாட்டி'
                : language === 'si'
                ? 'නිවැරදි පත්‍ර පරීක්ෂණ උපදෙස්'
                : 'Field Leaf Scanning Guide'}
            </Text>
            <Text style={styles.tipsSubtitle}>
              {language === 'ta'
                ? 'உயர்தர கண்டறிதலுக்கான குறிப்புகள்'
                : language === 'si'
                ? 'නිරවද්‍යතාව වැඩි කරගැනීමට අවශ්‍ය උපදෙස්'
                : 'Tips to maximize AI model diagnostic precision'}
            </Text>
          </View>
          <Ionicons
            name={showTips ? 'chevron-up' : 'chevron-down'}
            size={18}
            color={PALETTE.textMuted}
          />
        </TouchableOpacity>

        {showTips && (
          <View style={styles.tipsExpandedCard}>
            <View style={styles.tipItem}>
              <Ionicons name="sunny-outline" size={16} color={PALETTE.amber} style={styles.tipIcon} />
              <Text style={styles.tipText}>
                {language === 'ta'
                  ? 'நல்ல இயற்கை பகல் வெளிச்சத்தில் புகைப்படம் எடுக்கவும்; நிழல்களைத் தவிர்க்கவும்.'
                  : language === 'si'
                  ? 'ප්‍රමාණවත් ස්වාභාවික හිරු එළිය යටතේ ඡායාරූප ගන්න; දැඩි සෙවනැලි වළක්වා ගන්න.'
                  : 'Capture under natural daylight; avoid strong shadows across leaf lesions.'}
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="scan-outline" size={16} color={PALETTE.brandEmerald} style={styles.tipIcon} />
              <Text style={styles.tipText}>
                {language === 'ta'
                  ? 'பாதிக்கப்பட்ட இலை அல்லது புள்ளி மையத்தில் தெளிவாக இருக்குமாறு வைக்கவும்.'
                  : language === 'si'
                  ? 'රෝගී පත්‍ර ලපය හෝ රෝගී ප්‍රදේශය රාමුව මධ්‍යයේ තබා ගන්න.'
                  : 'Frame infected leaf spot or lesions clearly in the center of the viewfinder.'}
              </Text>
            </View>
            <View style={styles.tipItem}>
              <Ionicons name="hand-left-outline" size={16} color={PALETTE.textSecondary} style={styles.tipIcon} />
              <Text style={styles.tipText}>
                {language === 'ta'
                  ? 'கை அசைவைத் தவிர்க்கவும்; தெளிவற்ற மங்கலான படங்களை தவிர்க்கவும்.'
                  : language === 'si'
                  ? 'කැමරාව සෙලවීමෙන් තොරව තබාගන්න; බොඳ වූ ඡායාරූප ලබාගැනීමෙන් වළකින්න.'
                  : 'Hold steady to prevent motion blur for clear vein pattern recognition.'}
              </Text>
            </View>
          </View>
        )}

        {/* ── Anatomical Part Selector ────────────────────────── */}
        <Text style={styles.sectionLabel}>
          {language === 'ta'
            ? 'தாவரப் பகுதியைத் தேர்ந்தெடுக்கவும்'
            : language === 'si'
            ? 'කොටස තෝරන්න'
            : 'Select Coconut Part'}
        </Text>
        <View style={styles.partsGrid}>
          {PARTS.map((part) => (
            <TouchableOpacity
              key={part.id}
              style={[styles.partBtn, selectedPart === part.id && styles.partBtnSelected]}
              onPress={() => setSelectedPart(part.id)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.partBtnText,
                  selectedPart === part.id && styles.partBtnTextSelected,
                ]}
              >
                {language === 'ta' ? part.labelTa : language === 'si' ? part.labelSi : part.labelEn}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Image Capture / Preview Box ─────────────────────── */}
        <Text style={styles.sectionLabel}>
          {language === 'ta' ? 'இலை புகைப்படம்' : language === 'si' ? 'පත්‍ර ඡායාරූපය' : 'Leaf Photograph'}
        </Text>
        <View style={styles.imageBox}>
          {imageUri ? (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: imageUri }} style={styles.imagePreview} resizeMode="cover" />

              {/* Laser Scan Line Overlay */}
              {!loading && (
                <Animated.View
                  style={[
                    styles.scanLine,
                    { transform: [{ translateY: scanLineTranslate }] },
                  ]}
                />
              )}

              {/* Progress Overlay during Inference */}
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
                          idx <= analysisStep && styles.loadingDotActive,
                        ]}
                      />
                    ))}
                  </View>
                </View>
              )}

              {/* Dismiss / Retake Button */}
              {!loading && (
                <TouchableOpacity style={styles.closeBtn} onPress={clearSelection}>
                  <Ionicons name="close-circle" size={30} color={COLORS.diseased} />
                </TouchableOpacity>
              )}

              {/* Sync Status Badge */}
              {syncStatus !== 'idle' && !loading && (
                <View
                  style={[
                    styles.syncBadge,
                    syncStatus === 'synced' && styles.syncBadgeSynced,
                    syncStatus === 'syncing' && styles.syncBadgeSyncing,
                    syncStatus === 'failed' && styles.syncBadgeFailed,
                  ]}
                >
                  <Ionicons
                    name={
                      syncStatus === 'synced'
                        ? 'cloud-done'
                        : syncStatus === 'syncing'
                        ? 'cloud-upload'
                        : 'cloud-offline'
                    }
                    size={12}
                    color="#FFFFFF"
                  />
                  <Text style={styles.syncBadgeText}>
                    {syncStatus === 'synced'
                      ? 'SYNCED TO CLOUD'
                      : syncStatus === 'syncing'
                      ? 'SYNCING...'
                      : 'OFFLINE SAVED'}
                  </Text>
                </View>
              )}
            </View>
          ) : (
            <View style={styles.emptyImageBox}>
              <View style={styles.emptyIconCircle}>
                <Ionicons name="leaf-outline" size={38} color={PALETTE.brandEmerald} />
              </View>
              <Text style={styles.emptyTitle}>
                {language === 'ta'
                  ? 'இலை படத்தை பதிவேற்றவும்'
                  : language === 'si'
                  ? 'පත්‍ර ඡායාරූපයක් එක් කරන්න'
                  : 'Capture or Select Leaf'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {language === 'ta'
                  ? 'களத்தில் உள்ள இலையின் தெளிவான புகைப்படத்தை எடுக்கவும்'
                  : language === 'si'
                  ? 'පොල් පත්‍රයේ පැහැදිලි ඡායාරූපයක් ලබාගන්න'
                  : 'Take a clear photo of the infected frond or leaf'}
              </Text>
            </View>
          )}
        </View>

        {/* ── Camera & Gallery Buttons ─────────────────────────── */}
        <View style={styles.btnRow}>
          <TouchableOpacity
            style={[styles.actionBtn, styles.cameraBtn]}
            onPress={() => handlePickImage(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="camera" size={20} color="#FFFFFF" />
            <Text style={styles.cameraBtnText}>
              {language === 'ta' ? 'கேமரா' : language === 'si' ? 'කැමරාව' : 'Open Camera'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.galleryBtn]}
            onPress={() => handlePickImage(false)}
            activeOpacity={0.8}
          >
            <Ionicons name="images" size={20} color={PALETTE.brandPrimary} />
            <Text style={styles.galleryBtnText}>
              {language === 'ta' ? 'கேலரி' : language === 'si' ? 'ගැලරිය' : 'From Gallery'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* ── Execute Diagnosis Button ─────────────────────────── */}
        {imageUri && !loading && (
          <Animated.View style={{ transform: [{ scale: pulseAnim }], marginTop: 6, marginBottom: 12 }}>
            <GradientButton
              title={
                language === 'ta'
                  ? '🔬 AI நோயறிதலை இயக்கவும்'
                  : language === 'si'
                  ? '🔬 AI රෝග හඳුනාගැනීම'
                  : '🔬 Run System B Leaf Diagnosis'
              }
              onPress={handleScan}
              loading={loading}
              style={styles.scanBtn}
            />
          </Animated.View>
        )}

        {/* ── Detectable Diseases Encyclopedia ─────────────────── */}
        <View style={styles.infoCard}>
          <View style={styles.infoCardHeader}>
            <Ionicons name="shield-checkmark" size={18} color={PALETTE.brandEmerald} />
            <Text style={styles.infoCardTitle}>
              {language === 'ta'
                ? 'கண்டறியக்கூடிய 6 நோய்கள்'
                : language === 'si'
                ? 'හඳුනාගත හැකි රෝග 6'
                : 'System B Detectable Diseases (CRI)'}
            </Text>
          </View>
          <Text style={styles.infoCardSubtitle}>
            {language === 'ta'
              ? 'விவரங்கள் மற்றும் பரிந்துரைகளைக் காண கிளிக் செய்யவும்'
              : language === 'si'
              ? 'රෝග විස්තර සහ ප්‍රතිකාර බැලීමට තෝරන්න'
              : 'Tap any disease to view clinical symptoms & treatment'}
          </Text>

          <View style={styles.diseaseGrid}>
            {DISEASE_CLASS_ORDER.map((cls) => {
              const info = getDiseaseInfo(cls);
              return (
                <TouchableOpacity
                  key={cls}
                  style={styles.diseasePill}
                  onPress={() => setSelectedDiseaseModal(info)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.diseasePillDot, { backgroundColor: info.color }]} />
                  <Text style={styles.diseasePillText}>
                    {language === 'ta' && info.tamilName
                      ? info.tamilName
                      : language === 'si'
                      ? info.sinhalaName
                      : info.displayName}
                  </Text>
                  <Ionicons name="chevron-forward" size={12} color={PALETTE.textLight} />
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.infoCardFooterRow}>
            <Ionicons name="hardware-chip-outline" size={13} color={PALETTE.textMuted} />
            <Text style={styles.infoCardFooter}>
              MobileNetV2-INT8 Quantized · Sri Lanka CRI Certified
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* ── Disease Encyclopedia Modal ───────────────────────── */}
      <Modal
        visible={!!selectedDiseaseModal}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedDiseaseModal(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {selectedDiseaseModal && (
              <>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleRow}>
                    <Text style={styles.modalIcon}>{selectedDiseaseModal.icon}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.modalTitle}>{selectedDiseaseModal.displayName}</Text>
                      <Text style={styles.modalSinhalaTitle}>
                        {selectedDiseaseModal.sinhalaName}
                        {selectedDiseaseModal.tamilName ? ` · ${selectedDiseaseModal.tamilName}` : ''}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setSelectedDiseaseModal(null)}
                    style={styles.modalCloseBtn}
                  >
                    <Ionicons name="close" size={20} color={PALETTE.textPrimary} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                  <Text style={styles.modalDesc}>{selectedDiseaseModal.description}</Text>

                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Severity:</Text>
                    <Text
                      style={[
                        styles.modalDetailVal,
                        { color: selectedDiseaseModal.color, fontWeight: '800' },
                      ]}
                    >
                      {selectedDiseaseModal.severity}
                    </Text>
                  </View>

                  <View style={styles.modalDetailRow}>
                    <Text style={styles.modalDetailLabel}>Affected Part:</Text>
                    <Text style={styles.modalDetailVal}>{selectedDiseaseModal.affectedPart}</Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>🧪 Chemical Recommendation</Text>
                    <Text style={styles.modalSectionText}>{selectedDiseaseModal.chemical}</Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>🌱 Cultural Practices</Text>
                    <Text style={styles.modalSectionText}>{selectedDiseaseModal.cultural}</Text>
                  </View>

                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>🛡️ Preventive Measures</Text>
                    <Text style={styles.modalSectionText}>{selectedDiseaseModal.preventive}</Text>
                  </View>
                </ScrollView>

                <TouchableOpacity
                  style={styles.modalDoneBtn}
                  onPress={() => setSelectedDiseaseModal(null)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalDoneBtnText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
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
  headerLeft: {
    flex: 1,
  },
  title: {
    color: PALETTE.textPrimary,
    fontSize: 19,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: PALETTE.textSecondary,
    fontSize: 11.5,
    marginTop: 2,
    fontWeight: '500',
  },
  historyBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: PALETTE.brandSubtle,
    borderWidth: 1,
    borderColor: PALETTE.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
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
    paddingTop: 16,
    paddingBottom: 40,
  },
  // ── Tips Toggle Card ────────────────────────────────────────────
  tipsToggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PALETTE.cardBorder,
    padding: 12,
    marginBottom: 16,
    gap: 10,
  },
  tipsIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: PALETTE.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipsTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: PALETTE.textPrimary,
  },
  tipsSubtitle: {
    fontSize: 11,
    color: PALETTE.textMuted,
    marginTop: 1,
  },
  tipsExpandedCard: {
    backgroundColor: PALETTE.brandSubtle,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PALETTE.brandLight,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  tipIcon: {
    marginTop: 2,
  },
  tipText: {
    flex: 1,
    fontSize: 11.5,
    color: PALETTE.textSecondary,
    lineHeight: 16,
  },
  sectionLabel: {
    color: PALETTE.textSecondary,
    fontSize: 11.5,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  // ── Part Selector ───────────────────────────────────────────────
  partsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  partBtn: {
    backgroundColor: PALETTE.cardBg,
    borderColor: PALETTE.cardBorder,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
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
    fontSize: 12.5,
    fontWeight: '600',
  },
  partBtnTextSelected: {
    color: PALETTE.brandPrimary,
    fontWeight: '800',
  },
  // ── Image Area ──────────────────────────────────────────────────
  imageBox: {
    marginBottom: 16,
  },
  imagePreviewContainer: {
    height: 240,
    borderRadius: 20,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#000',
    borderWidth: 1.5,
    borderColor: PALETTE.cardBorder,
  },
  imagePreview: {
    width: '100%',
    height: '100%',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: '50%',
    height: 3,
    backgroundColor: PALETTE.brandEmerald,
    shadowColor: PALETTE.brandEmerald,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 6,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 40, 23, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingStepContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  loadingStepText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  loadingDots: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 12,
  },
  loadingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  loadingDotActive: {
    backgroundColor: PALETTE.brandEmerald,
    width: 20,
  },
  closeBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 16,
  },
  syncBadge: {
    position: 'absolute',
    bottom: 10,
    left: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  syncBadgeSynced: {
    backgroundColor: PALETTE.brandEmerald,
  },
  syncBadgeSyncing: {
    backgroundColor: PALETTE.amber,
  },
  syncBadgeFailed: {
    backgroundColor: PALETTE.textMuted,
  },
  syncBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  emptyImageBox: {
    height: 200,
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    backgroundColor: PALETTE.cardBg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: PALETTE.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: PALETTE.textPrimary,
  },
  emptySubtitle: {
    fontSize: 12,
    color: PALETTE.textMuted,
    marginTop: 4,
    textAlign: 'center',
  },
  // ── Action Buttons ──────────────────────────────────────────────
  btnRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    gap: 8,
  },
  cameraBtn: {
    backgroundColor: PALETTE.brandPrimary,
  },
  cameraBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  galleryBtn: {
    backgroundColor: PALETTE.brandSubtle,
    borderWidth: 1.5,
    borderColor: PALETTE.brandLight,
  },
  galleryBtnText: {
    color: PALETTE.brandPrimary,
    fontSize: 14,
    fontWeight: '700',
  },
  scanBtn: {
    marginBottom: 12,
  },
  // ── Info Card (Detectable Diseases) ─────────────────────────────
  infoCard: {
    backgroundColor: PALETTE.cardBg,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: PALETTE.cardBorder,
    marginBottom: 20,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: PALETTE.textPrimary,
  },
  infoCardSubtitle: {
    fontSize: 11,
    color: PALETTE.textMuted,
    marginTop: 2,
    marginBottom: 12,
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
    borderRadius: 10,
    borderWidth: 1,
    borderColor: PALETTE.subtleBorder,
    paddingVertical: 7,
    paddingHorizontal: 10,
    minWidth: '47%',
    flexGrow: 1,
    justifyContent: 'space-between',
  },
  diseasePillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  diseasePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: PALETTE.textSecondary,
    flex: 1,
    marginLeft: 2,
  },
  infoCardFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderTopWidth: 1,
    borderTopColor: PALETTE.subtleBorder,
    paddingTop: 10,
  },
  infoCardFooter: {
    fontSize: 10.5,
    color: PALETTE.textMuted,
    fontWeight: '500',
  },
  // ── Modal Styles ────────────────────────────────────────────────
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    width: '100%',
    maxHeight: '80%',
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2EE',
    paddingBottom: 14,
    marginBottom: 14,
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  modalIcon: {
    fontSize: 24,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: PALETTE.textPrimary,
  },
  modalSinhalaTitle: {
    fontSize: 12,
    color: PALETTE.textMuted,
    marginTop: 1,
  },
  modalCloseBtn: {
    padding: 6,
  },
  modalBody: {
    marginBottom: 16,
  },
  modalDesc: {
    fontSize: 13,
    color: PALETTE.textSecondary,
    lineHeight: 18,
    marginBottom: 12,
  },
  modalDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAF8',
  },
  modalDetailLabel: {
    fontSize: 12,
    color: PALETTE.textMuted,
    fontWeight: '600',
  },
  modalDetailVal: {
    fontSize: 12,
    color: PALETTE.textPrimary,
    fontWeight: '600',
  },
  modalSection: {
    marginTop: 12,
    backgroundColor: '#F8FAF8',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#EEF2EE',
  },
  modalSectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: PALETTE.brandPrimary,
    marginBottom: 4,
  },
  modalSectionText: {
    fontSize: 11.5,
    color: PALETTE.textSecondary,
    lineHeight: 16,
  },
  modalDoneBtn: {
    backgroundColor: PALETTE.brandPrimary,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalDoneBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
