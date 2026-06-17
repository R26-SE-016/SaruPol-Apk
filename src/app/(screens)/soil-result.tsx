import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, ROUNDING } from '../../constants/theme';
import GlassCard from '../../components/common/GlassCard';
import GradientButton from '../../components/common/GradientButton';
import { useAppStore } from '../../store/appStore';

export default function SoilResultScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const language = useAppStore(state => state.language);

  // Extract params
  const {
    healthScore,
    fertility,
    deficiencies,
    optimalRanges,
    fertilizerPlan,
    pH,
    N,
    P,
    K,
    OC,
    EC,
  } = params;

  const scoreVal = parseInt(healthScore as string || '75');
  const fertilityStatus = fertility as string || 'Medium';

  const parsedDeficiencies = deficiencies ? JSON.parse(deficiencies as string) : [];
  const parsedRanges = optimalRanges ? JSON.parse(optimalRanges as string) : {};
  const parsedPlan = fertilizerPlan ? JSON.parse(fertilizerPlan as string) : [];

  const getScoreColor = () => {
    if (scoreVal >= 80) return COLORS.healthy;
    if (scoreVal >= 50) return COLORS.warning;
    return COLORS.diseased;
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('soil.title')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Soil Health Score Ring Card */}
        <GlassCard style={styles.scoreCard}>
          <Text style={styles.scoreLabel}>{t('soil.healthScore')}</Text>
          <View style={[styles.ring, { borderColor: getScoreColor() }]}>
            <Text style={[styles.ringVal, { color: getScoreColor() }]}>{scoreVal}</Text>
            <Text style={styles.ringMax}>/ 100</Text>
          </View>
          <Text style={styles.fertilityText}>
            {t('soil.fertilityLabel')}: <Text style={[styles.bold, { color: getScoreColor() }]}>{fertilityStatus}</Text>
          </Text>
        </GlassCard>

        {/* Nutrient Status Dashboard */}
        <GlassCard style={styles.dashboardCard}>
          <Text style={styles.cardTitle}>{t('soil.nutrientsDashboard')}</Text>
          
          <View style={styles.nutrientRow}>
            <View style={styles.nutrientCell}>
              <Text style={styles.nLabel}>Nitrogen (N)</Text>
              <Text style={styles.nVal}>{N} mg/kg</Text>
              <Text style={styles.nRange}>Opt: {parsedRanges.N || '200-350'}</Text>
            </View>
            <View style={styles.nutrientCell}>
              <Text style={styles.nLabel}>Phosphorus (P)</Text>
              <Text style={styles.nVal}>{P} mg/kg</Text>
              <Text style={styles.nRange}>Opt: {parsedRanges.P || '15-40'}</Text>
            </View>
          </View>

          <View style={styles.nutrientRow}>
            <View style={styles.nutrientCell}>
              <Text style={styles.nLabel}>Potassium (K)</Text>
              <Text style={styles.nVal}>{K} mg/kg</Text>
              <Text style={styles.nRange}>Opt: {parsedRanges.K || '150-300'}</Text>
            </View>
            <View style={styles.nutrientCell}>
              <Text style={styles.nLabel}>Soil pH</Text>
              <Text style={styles.nVal}>{pH}</Text>
              <Text style={styles.nRange}>Opt: {parsedRanges.pH || '5.5-7.0'}</Text>
            </View>
          </View>

          <View style={styles.nutrientRow}>
            <View style={styles.nutrientCell}>
              <Text style={styles.nLabel}>Organic Carbon</Text>
              <Text style={styles.nVal}>{OC}%</Text>
              <Text style={styles.nRange}>Opt: 1.5 - 3.0%</Text>
            </View>
            <View style={styles.nutrientCell}>
              <Text style={styles.nLabel}>EC (Conductivity)</Text>
              <Text style={styles.nVal}>{EC} dS/m</Text>
              <Text style={styles.nRange}>Opt: &lt; 1.0 dS/m</Text>
            </View>
          </View>
        </GlassCard>

        {/* Deficiency Warning Panel */}
        {parsedDeficiencies.length > 0 && (
          <GlassCard style={styles.deficiencyCard}>
            <Text style={styles.defCardTitle}>⚠️ {t('soil.deficiencyAlertTitle')}</Text>
            {parsedDeficiencies.map((def: any, i: number) => (
              <View key={i} style={styles.defItem}>
                <Text style={styles.defNutrient}>{def.nutrient} - <Text style={styles.redText}>{def.status}</Text></Text>
                <Text style={styles.defComment}>{def.comment}</Text>
              </View>
            ))}
          </GlassCard>
        )}

        {/* Customized Fertilizer Plan Card */}
        {parsedPlan.length > 0 && (
          <View style={styles.planSection}>
            <Text style={styles.sectionLabel}>{t('soil.fertilizerPlanTitle')}</Text>
            {parsedPlan.map((plan: any, i: number) => (
              <GlassCard key={i} style={styles.planCard}>
                <View style={styles.planHeader}>
                  <Text style={styles.planName}>🌱 {plan.fertilizer}</Text>
                  <Text style={styles.planAmount}>
                    {plan.amount_kg_per_palm} kg <Text style={styles.mutedText}>{t('soil.amountPerPalm')}</Text>
                  </Text>
                </View>
                
                <Text style={styles.planSubLabel}>🕒 {t('soil.schedule')}:</Text>
                <Text style={styles.planText}>{plan.schedule}</Text>

                <Text style={styles.planSubLabel}>📝 {t('soil.instructions')}:</Text>
                <Text style={styles.planText}>{plan.instructions}</Text>
              </GlassCard>
            ))}
          </View>
        )}

        {/* Done button */}
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
  scoreCard: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 20,
  },
  scoreLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  ring: {
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 14,
  },
  ringVal: {
    fontSize: 28,
    fontWeight: '900',
  },
  ringMax: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 2,
    marginTop: 8,
  },
  fertilityText: {
    color: COLORS.textPrimary,
    fontSize: 14,
  },
  bold: {
    fontWeight: 'bold',
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 14,
  },
  dashboardCard: {
    marginBottom: 20,
  },
  nutrientRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  nutrientCell: {
    width: '48%',
    backgroundColor: 'rgba(27, 94, 32, 0.08)',
    borderRadius: ROUNDING.sm,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  nLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: 'bold',
  },
  nVal: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: 'bold',
    marginVertical: 2,
  },
  nRange: {
    color: COLORS.textMuted,
    fontSize: 10,
  },
  deficiencyCard: {
    backgroundColor: 'rgba(239, 83, 80, 0.05)',
    borderColor: 'rgba(239, 83, 80, 0.25)',
    marginBottom: 20,
  },
  defCardTitle: {
    color: COLORS.diseased,
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  defItem: {
    marginBottom: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(239, 83, 80, 0.15)',
    paddingBottom: 6,
  },
  defNutrient: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: 'bold',
  },
  redText: {
    color: COLORS.diseased,
    fontWeight: 'bold',
  },
  defComment: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  planSection: {
    marginBottom: 24,
    gap: 12,
  },
  sectionLabel: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  planCard: {
    backgroundColor: 'rgba(27, 94, 32, 0.05)',
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(76, 175, 80, 0.15)',
    paddingBottom: 6,
  },
  planName: {
    color: COLORS.primaryLight,
    fontWeight: 'bold',
    fontSize: 15,
  },
  planAmount: {
    color: COLORS.accentLight,
    fontWeight: 'bold',
    fontSize: 14,
  },
  mutedText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: 'normal',
  },
  planSubLabel: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: 'bold',
    marginTop: 6,
    marginBottom: 2,
    textTransform: 'uppercase',
  },
  planText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    lineHeight: 18,
  },
  doneBtn: {
    marginTop: 10,
  },
});
