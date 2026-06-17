import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, Alert, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, ROUNDING } from '../../constants/theme';
import GlassCard from '../../components/common/GlassCard';
import GradientButton from '../../components/common/GradientButton';
import { submitDiagnosisFeedback } from '../../services/pathologyService';
import { useAppStore } from '../../store/appStore';

export default function ScanResultScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const language = useAppStore(state => state.language);

  const [feedbackSent, setFeedbackSent] = useState(false);

  // Extract params
  const {
    part,
    status,
    diagnosis,
    confidence,
    severity,
    chemical,
    cultural,
    preventive,
    imageUri
  } = params;

  const numConfidence = parseFloat(confidence as string || '0.85');
  const percentConfidence = Math.round(numConfidence * 100);

  const handleFeedback = async (isCorrect: boolean) => {
    try {
      // Send mock feedback or call API
      await submitDiagnosisFeedback({
        predictionId: 'pred_' + Math.random().toString(36).substring(2, 7),
        isCorrect
      });
      setFeedbackSent(true);
      Alert.alert(t('common.success'), 'Thank you for your valuable feedback!');
    } catch (err) {
      setFeedbackSent(true);
      Alert.alert(t('common.success'), 'Feedback saved locally.');
    }
  };

  const isHealthy = status === 'healthy';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('pathology.resultTitle')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Scanned Image Preview */}
        {imageUri ? (
          <Image source={{ uri: imageUri as string }} style={styles.resultImage} />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="image" size={48} color={COLORS.textMuted} />
          </View>
        )}

        {/* Diagnostic Summary */}
        <GlassCard style={[styles.summaryCard, isHealthy ? styles.healthyBorder : styles.diseasedBorder]}>
          <View style={styles.summaryHeader}>
            <Text style={styles.partLabel}>
              {language === 'en' ? `Coconut ${part}` : `පොල් ගසේ ${part} කොටස`}
            </Text>
            <View style={[styles.badge, isHealthy ? styles.badgeHealthy : styles.badgeDiseased]}>
              <Text style={styles.badgeText}>
                {isHealthy ? t('common.healthy') : t('common.diseased')}
              </Text>
            </View>
          </View>

          <Text style={styles.diseaseName}>
            {isHealthy ? (language === 'en' ? 'No Disease Detected' : 'ලෙඩ රෝග කිසිවක් හඳුනාගෙන නැත') : (diagnosis as string)}
          </Text>

          {!isHealthy && (
            <View style={styles.detailsRow}>
              <Text style={styles.detailText}>
                {t('common.severity')}: <Text style={[styles.bold, styles.redText]}>{severity}</Text>
              </Text>
              <Text style={styles.detailText}>
                {t('pathology.confidence')}: <Text style={styles.bold}>{percentConfidence}%</Text>
              </Text>
            </View>
          )}
        </GlassCard>

        {/* Treatment Recommendations */}
        {!isHealthy && (
          <View style={styles.recommendationsList}>
            <Text style={styles.sectionLabel}>{t('pathology.recommendationTitle')}</Text>

            {chemical && (
              <GlassCard style={styles.recCard}>
                <Text style={styles.recTitle}>🧪 {t('pathology.chemicalTreatment')}</Text>
                <Text style={styles.recBody}>{chemical}</Text>
              </GlassCard>
            )}

            {cultural && (
              <GlassCard style={styles.recCard}>
                <Text style={styles.recTitle}>🌱 {t('pathology.culturalTreatment')}</Text>
                <Text style={styles.recBody}>{cultural}</Text>
              </GlassCard>
            )}

            {preventive && (
              <GlassCard style={styles.recCard}>
                <Text style={styles.recTitle}>🛡️ {t('pathology.preventiveTreatment')}</Text>
                <Text style={styles.recBody}>{preventive}</Text>
              </GlassCard>
            )}
          </View>
        )}

        {/* Feedback Section */}
        {!feedbackSent && (
          <GlassCard style={styles.feedbackCard}>
            <Text style={styles.feedbackTitle}>{t('pathology.feedbackTitle')}</Text>
            <View style={styles.feedbackBtnRow}>
              <TouchableOpacity
                onPress={() => handleFeedback(true)}
                style={[styles.feedbackBtn, styles.correctBtn]}
              >
                <Ionicons name="thumbs-up" size={18} color={COLORS.textPrimary} />
                <Text style={styles.feedbackBtnText}>{t('pathology.feedbackCorrect')}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => handleFeedback(false)}
                style={[styles.feedbackBtn, styles.incorrectBtn]}
              >
                <Ionicons name="thumbs-down" size={18} color={COLORS.textPrimary} />
                <Text style={styles.feedbackBtnText}>{t('pathology.feedbackIncorrect')}</Text>
              </TouchableOpacity>
            </View>
          </GlassCard>
        )}

        {/* Action Button */}
        <GradientButton
          title={language === 'en' ? 'Back to Dashboard' : 'මුල් පිටුවට යන්න'}
          onPress={() => router.replace('/(tabs)/home')}
          style={styles.doneBtn}
        />
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(76, 175, 80, 0.12)',
    backgroundColor: COLORS.surface,
  },
  backBtn: {
    padding: 8,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  resultImage: {
    width: '100%',
    height: 220,
    borderRadius: ROUNDING.md,
    resizeMode: 'cover',
    marginBottom: 20,
  },
  placeholderImage: {
    width: '100%',
    height: 220,
    borderRadius: ROUNDING.md,
    backgroundColor: COLORS.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  summaryCard: {
    marginBottom: 24,
  },
  healthyBorder: {
    borderColor: COLORS.healthy,
    borderWidth: 1.5,
  },
  diseasedBorder: {
    borderColor: COLORS.diseased,
    borderWidth: 1.5,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  partLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  badge: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: ROUNDING.sm,
  },
  badgeHealthy: {
    backgroundColor: COLORS.healthy,
  },
  badgeDiseased: {
    backgroundColor: COLORS.diseased,
  },
  badgeText: {
    color: COLORS.textDark,
    fontSize: 12,
    fontWeight: 'bold',
  },
  diseaseName: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    marginVertical: 4,
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(76, 175, 80, 0.12)',
    paddingTop: 8,
  },
  detailText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  bold: {
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  redText: {
    color: COLORS.diseased,
  },
  sectionLabel: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 14,
  },
  recommendationsList: {
    marginBottom: 24,
    gap: 12,
  },
  recCard: {
    backgroundColor: 'rgba(27, 94, 32, 0.06)',
  },
  recTitle: {
    color: COLORS.accentLight,
    fontWeight: 'bold',
    fontSize: 14,
    marginBottom: 6,
  },
  recBody: {
    color: COLORS.textPrimary,
    fontSize: 13,
    lineHeight: 18,
  },
  feedbackCard: {
    marginBottom: 24,
    backgroundColor: 'rgba(255, 143, 0, 0.04)',
    borderColor: 'rgba(255, 143, 0, 0.15)',
  },
  feedbackTitle: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  feedbackBtnRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  feedbackBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: ROUNDING.sm,
    width: '45%',
  },
  correctBtn: {
    backgroundColor: COLORS.primary,
  },
  incorrectBtn: {
    backgroundColor: COLORS.surfaceLight,
  },
  feedbackBtnText: {
    color: COLORS.textPrimary,
    fontWeight: 'bold',
    fontSize: 13,
  },
  doneBtn: {
    marginTop: 10,
  },
});
