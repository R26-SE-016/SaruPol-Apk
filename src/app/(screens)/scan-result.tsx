import React, { useState, useEffect, useRef } from 'react';
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
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { COLORS, ROUNDING, SHADOWS } from '../../constants/theme';
import GradientButton from '../../components/common/GradientButton';
import { submitDiagnosisFeedback } from '../../services/pathologyService';
import { useAppStore } from '../../store/appStore';
import {
  getDiseaseInfo,
  DISEASE_CLASS_ORDER,
  SEVERITY_COLORS,
  type DiseaseClass,
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
};

// ── Prediction bar item ───────────────────────────────────────────────
interface PredBar {
  class: DiseaseClass;
  confidence: number;
}

// ── Animated Confidence Bar ───────────────────────────────────────────
function ConfidenceBar({
  value,
  color,
  delay = 0,
}: {
  value: number;
  color: string;
  delay?: number;
}) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: Math.min(value, 1),
      duration: 700,
      delay,
      useNativeDriver: false,
    }).start();
  }, [value]);

  const width = anim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={barStyles.track}>
      <Animated.View style={[barStyles.fill, { width, backgroundColor: color }]} />
    </View>
  );
}

const barStyles = StyleSheet.create({
  track: {
    flex: 1,
    height: 6,
    backgroundColor: '#EEF2EE',
    borderRadius: 3,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 3,
  },
});

// ── Severity Badge ────────────────────────────────────────────────────
function SeverityBadge({ severity }: { severity: string }) {
  const color = SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] || COLORS.textMuted;
  return (
    <View style={[sevStyles.badge, { borderColor: color + '55', backgroundColor: color + '18' }]}>
      <View style={[sevStyles.dot, { backgroundColor: color }]} />
      <Text style={[sevStyles.text, { color }]}>{severity}</Text>
    </View>
  );
}

const sevStyles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: ROUNDING.full,
    borderWidth: 1,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  text: { fontSize: 12, fontWeight: '700' },
});

// ── Main Screen ───────────────────────────────────────────────────────
export default function ScanResultScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const language = useAppStore(state => state.language);

  const [feedbackSent, setFeedbackSent] = useState(false);
  const headerAnim = useRef(new Animated.Value(0)).current;
  const contentAnim = useRef(new Animated.Value(0)).current;

  // Extract params
  const {
    part,
    disease_class,
    status,
    diagnosis,
    confidence,
    severity,
    chemical,
    cultural,
    preventive,
    inference_time_ms,
    all_predictions,
    imageUri,
  } = params;

  // Parse predictions
  const predictions: PredBar[] = (() => {
    try {
      return JSON.parse(all_predictions as string || '[]') as PredBar[];
    } catch {
      return [];
    }
  })();

  const numConfidence = parseFloat(confidence as string || '0');
  const percentConfidence = Math.round(numConfidence * 100);
  const inferenceMs = parseInt(inference_time_ms as string || '0', 10);
  const isHealthy = status === 'healthy';
  const diseaseClass = (disease_class as string || 'healthy leaves').toLowerCase() as DiseaseClass;
  const info = getDiseaseInfo(diseaseClass);

  // Entrance animations
  useEffect(() => {
    Animated.sequence([
      Animated.timing(headerAnim, { toValue: 1, duration: 400, useNativeDriver: true }),
      Animated.timing(contentAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleFeedback = async (isCorrect: boolean) => {
    try {
      await submitDiagnosisFeedback({
        predictionId: `pred_${Date.now().toString(36)}`,
        isCorrect,
      });
      setFeedbackSent(true);
      Alert.alert(t('common.success'), 'Thank you for your feedback!');
    } catch {
      setFeedbackSent(true);
      Alert.alert(t('common.success'), 'Feedback saved locally.');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      {/* ── Header ─────────────────────────────────────────────── */}
      <Animated.View
        style={[
          styles.header,
          {
            opacity: headerAnim,
            transform: [{ translateY: headerAnim.interpolate({ inputRange: [0, 1], outputRange: [-20, 0] }) }],
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={PALETTE.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.title}>
            {language === 'en' ? 'Diagnosis Result' : 'රෝග හඳුනාගැනීමේ ප්‍රතිඵලය'}
          </Text>
          {inferenceMs > 0 && (
            <View style={styles.inferenceTag}>
              <Ionicons name="flash" size={11} color="#D97706" />
              <Text style={styles.inferenceText}>{inferenceMs}ms</Text>
            </View>
          )}
        </View>
        <View style={{ width: 40 }} />
      </Animated.View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View
          style={{
            opacity: contentAnim,
            transform: [{ translateY: contentAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
          }}
        >
          {/* ── Scanned Image ─────────────────────────────────── */}
          {imageUri ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: imageUri as string }} style={styles.resultImage} resizeMode="cover" />
              {/* Disease class overlay */}
              <View style={[
                styles.imageOverlay,
                { backgroundColor: isHealthy ? 'rgba(21, 128, 61, 0.90)' : `${info.color}EE` }
              ]}>
                <Text style={styles.imageOverlayIcon}>{info.icon}</Text>
                <Text style={styles.imageOverlayText}>{info.displayName}</Text>
                <Text style={styles.imageOverlayConfidence}>{percentConfidence}%</Text>
              </View>
            </View>
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="image" size={48} color={PALETTE.textLight} />
            </View>
          )}

          {/* ── Diagnosis Summary Card ───────────────────────── */}
          <View style={[
            styles.summaryCard,
            isHealthy ? styles.healthyCardStyle : styles.diseasedCardStyle,
          ]}>
            {/* Header row */}
            <View style={styles.summaryHeader}>
              <View style={styles.partTag}>
                <Ionicons name="leaf-outline" size={13} color={PALETTE.brandPrimary} />
                <Text style={styles.partTagText}>
                  {language === 'en' ? `Coconut ${part}` : `${part} කොටස`}
                </Text>
              </View>
              <SeverityBadge severity={severity as string || info.severity} />
            </View>

            {/* Disease name */}
            <Text style={[styles.diseaseName, { color: isHealthy ? PALETTE.brandPrimary : info.color }]}>
              {isHealthy
                ? (language === 'en' ? 'No Disease Detected' : 'ලෙඩ රෝග කිසිවක් නැත')
                : (diagnosis as string || info.displayName)}
            </Text>

            {/* Disease description */}
            <Text style={styles.diseaseDesc}>{info.description}</Text>

            {/* Confidence bar */}
            <View style={styles.confRow}>
              <Text style={styles.confLabel}>
                {language === 'en' ? 'Confidence' : 'විශ්වාස දර්ශකය'}
              </Text>
              <Text style={[styles.confValue, { color: info.color }]}>
                {percentConfidence}%
              </Text>
            </View>
            <ConfidenceBar value={numConfidence} color={info.color} />
          </View>

          {/* ── All Predictions Chart ────────────────────────── */}
          {predictions.length > 0 && (
            <View style={styles.predictionsCard}>
              <Text style={styles.predictionsTitle}>
                {language === 'en' ? '📊 All Class Probabilities' : '📊 සියලු පංතිවල සම්භාවිතාව'}
              </Text>
              <View style={styles.predList}>
                {(predictions.length > 0 ? predictions : DISEASE_CLASS_ORDER.map(cls => ({ class: cls, confidence: 0 }))).map(
                  (pred, idx) => {
                    const predInfo = getDiseaseInfo(pred.class);
                    const pct = Math.round((pred.confidence || 0) * 100);
                    const isTop = pred.class === diseaseClass;
                    return (
                      <View key={pred.class} style={[styles.predRow, isTop && styles.predRowTop]}>
                        <View style={styles.predLabelRow}>
                          <View style={[styles.predDot, { backgroundColor: predInfo.color }]} />
                          <Text style={[styles.predLabel, isTop && styles.predLabelTop]}>
                            {predInfo.displayName}
                          </Text>
                          <Text style={[styles.predPct, { color: predInfo.color }]}>
                            {pct}%
                          </Text>
                        </View>
                        <ConfidenceBar
                          value={pred.confidence || 0}
                          color={predInfo.color}
                          delay={idx * 80}
                        />
                      </View>
                    );
                  }
                )}
              </View>
            </View>
          )}

          {/* ── Treatment Recommendations ────────────────────── */}
          {!isHealthy && (
            <View style={styles.recommendationsSection}>
              <Text style={styles.sectionTitle}>
                {language === 'en' ? '💊 Treatment Plan' : '💊 ප්‍රතිකාර සැලැස්ම'}
              </Text>

              {[
                { icon: '🧪', label: language === 'en' ? 'Chemical Treatment' : 'රසායනික ප්‍රතිකාරය', text: chemical },
                { icon: '🌱', label: language === 'en' ? 'Cultural Practice' : 'කෘෂිකාර්මික ක්‍රමය', text: cultural },
                { icon: '🛡️', label: language === 'en' ? 'Preventive Measure' : 'වැලැක්වීමේ ක්‍රමය', text: preventive },
              ].map(({ icon, label, text }) =>
                text ? (
                  <View key={label} style={styles.recCard}>
                    <View style={styles.recHeader}>
                      <Text style={styles.recIcon}>{icon}</Text>
                      <Text style={styles.recTitle}>{label}</Text>
                    </View>
                    <Text style={styles.recBody}>{text}</Text>
                  </View>
                ) : null
              )}
            </View>
          )}

          {/* ── Healthy Message ──────────────────────────────── */}
          {isHealthy && (
            <View style={[styles.healthyCard]}>
              <View style={styles.healthyRow}>
                <Text style={styles.healthyEmoji}>✅</Text>
                <View style={styles.healthyTextBlock}>
                  <Text style={styles.healthyTitle}>
                    {language === 'en' ? 'Palm is Healthy!' : 'පොල් ගස සෞඛ්‍ය සම්පන්නයි!'}
                  </Text>
                  <Text style={styles.healthyDesc}>
                    {language === 'en'
                      ? 'No disease symptoms detected. Continue regular monitoring every 2–4 weeks.'
                      : 'රෝග ලක්ෂණ නොමැත. සෑම සති 2–4කට වරක් නිරීක්ෂණය කරන්න.'}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* ── Feedback Card ────────────────────────────────── */}
          {!feedbackSent && (
            <View style={styles.feedbackCard}>
              <Text style={styles.feedbackTitle}>
                {language === 'en'
                  ? 'Was this diagnosis accurate?'
                  : 'මෙම රෝග හඳුනාගැනීම නිවැරදිද?'}
              </Text>
              <View style={styles.feedbackBtnRow}>
                <TouchableOpacity
                  onPress={() => handleFeedback(true)}
                  style={[styles.feedbackBtn, styles.correctBtn]}
                >
                  <Ionicons name="thumbs-up" size={18} color="#FFFFFF" />
                  <Text style={[styles.feedbackBtnText, { color: '#FFFFFF' }]}>
                    {language === 'en' ? 'Correct' : 'නිවැරදියි'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleFeedback(false)}
                  style={[styles.feedbackBtn, styles.incorrectBtn]}
                >
                  <Ionicons name="thumbs-down" size={18} color={PALETTE.textSecondary} />
                  <Text style={[styles.feedbackBtnText, { color: PALETTE.textSecondary }]}>
                    {language === 'en' ? 'Incorrect' : 'වැරදියි'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── Action Buttons ───────────────────────────────── */}
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.scanAgainBtn}
              onPress={() => router.back()}
            >
              <Ionicons name="camera-outline" size={18} color={PALETTE.brandEmerald} />
              <Text style={styles.scanAgainText}>
                {language === 'en' ? 'Scan Again' : 'නැවත ස්කෑන් කරන්න'}
              </Text>
            </TouchableOpacity>

            <GradientButton
              title={language === 'en' ? 'Back to Home' : 'මුල් පිටුව'}
              onPress={() => router.replace('/(tabs)/home')}
              style={styles.homeBtn}
            />
          </View>
        </Animated.View>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: PALETTE.subtleBorder,
    backgroundColor: PALETTE.cardBg,
  },
  backBtn: { padding: 8 },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  title: {
    color: PALETTE.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  inferenceTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: ROUNDING.full,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  inferenceText: {
    color: '#D97706',
    fontSize: 10,
    fontWeight: '700',
  },
  // ── Scroll ──────────────────────────────────────────────────────
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 50,
  },
  // ── Image ───────────────────────────────────────────────────────
  imageContainer: {
    width: '100%',
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
    backgroundColor: '#EEF2EE',
  },
  resultImage: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  imageOverlayIcon: { fontSize: 18 },
  imageOverlayText: {
    flex: 1,
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  imageOverlayConfidence: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '800',
  },
  placeholderImage: {
    width: '100%',
    height: 180,
    borderRadius: 20,
    backgroundColor: '#EEF2EE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  // ── Summary Card ────────────────────────────────────────────────
  summaryCard: {
    backgroundColor: PALETTE.cardBg,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: PALETTE.cardBorder,
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
  healthyCardStyle: {
    borderColor: '#86EFAC',
  },
  diseasedCardStyle: {
    borderColor: '#FECACA',
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  partTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: PALETTE.brandSubtle,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: ROUNDING.full,
    borderWidth: 1,
    borderColor: PALETTE.brandLight,
  },
  partTagText: {
    color: PALETTE.brandPrimary,
    fontSize: 11.5,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  diseaseName: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 6,
  },
  diseaseDesc: {
    color: PALETTE.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  confRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  confLabel: {
    color: PALETTE.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  confValue: {
    fontSize: 14,
    fontWeight: '800',
  },
  // ── Predictions Chart ────────────────────────────────────────────
  predictionsCard: {
    backgroundColor: PALETTE.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PALETTE.cardBorder,
    padding: 18,
    marginBottom: 16,
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
  predictionsTitle: {
    color: PALETTE.textPrimary,
    fontSize: 14.5,
    fontWeight: '800',
    marginBottom: 14,
  },
  predList: { gap: 10 },
  predRow: {
    gap: 6,
    padding: 10,
    borderRadius: 14,
    backgroundColor: '#F8FAF8',
    borderWidth: 1,
    borderColor: '#EEF2EE',
  },
  predRowTop: {
    backgroundColor: PALETTE.brandSubtle,
    borderWidth: 1.5,
    borderColor: PALETTE.brandLight,
  },
  predLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  predDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    flexShrink: 0,
  },
  predLabel: {
    flex: 1,
    color: PALETTE.textSecondary,
    fontSize: 12.5,
    fontWeight: '600',
  },
  predLabelTop: {
    color: PALETTE.textPrimary,
    fontWeight: '800',
  },
  predPct: {
    fontSize: 12.5,
    fontWeight: '800',
    minWidth: 36,
    textAlign: 'right',
  },
  // ── Recommendations ──────────────────────────────────────────────
  recommendationsSection: {
    marginBottom: 16,
    gap: 12,
  },
  sectionTitle: {
    color: PALETTE.textPrimary,
    fontSize: 16,
    fontWeight: '800',
    marginBottom: 2,
  },
  recCard: {
    backgroundColor: PALETTE.cardBg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PALETTE.cardBorder,
    padding: 16,
    gap: 8,
    ...Platform.select({
      ios: {
        shadowColor: '#12211C',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  recHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  recIcon: { fontSize: 18 },
  recTitle: {
    color: PALETTE.brandPrimary,
    fontWeight: '800',
    fontSize: 13.5,
  },
  recBody: {
    color: PALETTE.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  // ── Healthy Card ─────────────────────────────────────────────────
  healthyCard: {
    backgroundColor: PALETTE.brandSubtle,
    borderColor: '#86EFAC',
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  healthyRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  healthyEmoji: { fontSize: 28, marginTop: 2 },
  healthyTextBlock: { flex: 1, gap: 4 },
  healthyTitle: {
    color: PALETTE.brandPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  healthyDesc: {
    color: PALETTE.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  // ── Feedback ─────────────────────────────────────────────────────
  feedbackCard: {
    backgroundColor: PALETTE.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PALETTE.cardBorder,
    padding: 18,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#12211C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  feedbackTitle: {
    color: PALETTE.textPrimary,
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 14,
  },
  feedbackBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 12,
  },
  feedbackBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
  },
  correctBtn: {
    backgroundColor: PALETTE.brandPrimary,
  },
  incorrectBtn: {
    backgroundColor: '#F8FAF8',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  feedbackBtnText: {
    fontWeight: '700',
    fontSize: 13,
  },
  // ── Actions ──────────────────────────────────────────────────────
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginTop: 6,
  },
  scanAgainBtn: {
    flex: 0.45,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: PALETTE.brandEmerald,
    backgroundColor: PALETTE.cardBg,
    ...Platform.select({
      ios: {
        shadowColor: '#12211C',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  scanAgainText: {
    color: PALETTE.brandEmerald,
    fontWeight: '800',
    fontSize: 13.5,
  },
  homeBtn: { flex: 0.55 },
});
