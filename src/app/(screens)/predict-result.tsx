import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, ROUNDING } from '../../constants/theme';
import GlassCard from '../../components/common/GlassCard';
import GradientButton from '../../components/common/GradientButton';
import { useAppStore } from '../../store/appStore';

export default function PredictResultScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams();
  const language = useAppStore(state => state.language);

  // Extract params
  const {
    is45DayMode,
    prediction,
    minInterval,
    maxInterval,
    rf,
    gb,
    xgb,
    lgb,
    insights
  } = params;

  const is45Day = is45DayMode === 'true';
  const yieldVal = parseFloat(prediction as string || '0');
  const minVal = parseFloat(minInterval as string || '0');
  const maxVal = parseFloat(maxInterval as string || '0');

  const rfVal = parseFloat(rf as string || '0');
  const gbVal = parseFloat(gb as string || '0');
  const xgbVal = parseFloat(xgb as string || '0');
  const lgbVal = parseFloat(lgb as string || '0');

  const parsedInsights = insights ? JSON.parse(insights as string) : [];

  // Seasonal Forecast defaults if not provided
  const seasonalForecast = [
    { month: "Jan-Feb", yield: Math.round(yieldVal / 6 * 0.95) },
    { month: "Mar-Apr", yield: Math.round(yieldVal / 6 * 1.15) },
    { month: "May-Jun", yield: Math.round(yieldVal / 6 * 1.25) },
    { month: "Jul-Aug", yield: Math.round(yieldVal / 6 * 0.85) },
    { month: "Sep-Oct", yield: Math.round(yieldVal / 6 * 0.90) },
    { month: "Nov-Dec", yield: Math.round(yieldVal / 6 * 1.00) }
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>{t('yield.resultTitle')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Main Projection Value Card */}
        <GlassCard style={styles.heroCard}>
          <Text style={styles.heroLabel}>
            {is45Day ? t('yield.predictMode45Day') : t('yield.predictModeAnnual')}
          </Text>
          <Text style={styles.heroValue}>{yieldVal}</Text>
          <Text style={styles.heroUnit}>
            {is45Day ? t('yield.projectionUnit45') : t('yield.projectionUnit')}
          </Text>
          
          <View style={styles.rangeRow}>
            <Text style={styles.rangeText}>
              {t('yield.confidenceInterval')}: <Text style={styles.bold}>{minVal} - {maxVal}</Text>
            </Text>
          </View>
        </GlassCard>

        {/* Ensemble Model Breakdown */}
        {!is45Day && rfVal > 0 && (
          <GlassCard style={styles.breakdownCard}>
            <Text style={styles.cardTitle}>{t('yield.modelBreakdown')}</Text>
            
            <View style={styles.barItem}>
              <View style={styles.barLabelRow}>
                <Text style={styles.barLabel}>Random Forest</Text>
                <Text style={styles.barVal}>{rfVal} nuts</Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.min(100, (rfVal/120)*100)}%`, backgroundColor: COLORS.healthy }]} />
              </View>
            </View>

            <View style={styles.barItem}>
              <View style={styles.barLabelRow}>
                <Text style={styles.barLabel}>Gradient Boosting</Text>
                <Text style={styles.barVal}>{gbVal} nuts</Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.min(100, (gbVal/120)*100)}%`, backgroundColor: COLORS.info }]} />
              </View>
            </View>

            <View style={styles.barItem}>
              <View style={styles.barLabelRow}>
                <Text style={styles.barLabel}>XGBoost</Text>
                <Text style={styles.barVal}>{xgbVal} nuts</Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.min(100, (xgbVal/120)*100)}%`, backgroundColor: COLORS.accent }]} />
              </View>
            </View>

            <View style={styles.barItem}>
              <View style={styles.barLabelRow}>
                <Text style={styles.barLabel}>LightGBM</Text>
                <Text style={styles.barVal}>{lgbVal} nuts</Text>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${Math.min(100, (lgbVal/120)*100)}%`, backgroundColor: COLORS.primaryLight }]} />
              </View>
            </View>
          </GlassCard>
        )}

        {/* Seasonal Harvest Outlook */}
        {!is45Day && (
          <GlassCard style={styles.seasonalCard}>
            <Text style={styles.cardTitle}>{t('yield.seasonalTitle')}</Text>
            <View style={styles.seasonalGrid}>
              {seasonalForecast.map((item, index) => (
                <View key={index} style={styles.seasonalCell}>
                  <Text style={styles.seasonalMonth}>{item.month}</Text>
                  <Text style={styles.seasonalVal}>{item.yield}</Text>
                  <Text style={styles.seasonalUnit}>nuts</Text>
                </View>
              ))}
            </View>
          </GlassCard>
        )}

        {/* Actionable Insights */}
        {parsedInsights.length > 0 && (
          <View style={styles.insightsSection}>
            <Text style={styles.sectionLabel}>
              {language === 'en' ? 'AI Plantation Advice' : 'වගා බිම සඳහා AI නිර්දේශ'}
            </Text>
            {parsedInsights.map((insight: string, index: number) => (
              <GlassCard key={index} style={styles.insightCard}>
                <Text style={styles.insightText}>💡 {insight}</Text>
              </GlassCard>
            ))}
          </View>
        )}

        {/* Done Button */}
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
  heroCard: {
    alignItems: 'center',
    paddingVertical: 30,
    marginBottom: 20,
    borderColor: 'rgba(255, 143, 0, 0.25)',
    borderWidth: 1.5,
  },
  heroLabel: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
  },
  heroValue: {
    color: COLORS.accentLight,
    fontSize: 54,
    fontWeight: '900',
  },
  heroUnit: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 6,
  },
  rangeRow: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(76, 175, 80, 0.12)',
    width: '100%',
    alignItems: 'center',
    paddingTop: 12,
  },
  rangeText: {
    color: COLORS.textSecondary,
    fontSize: 13,
  },
  bold: {
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  cardTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 14,
  },
  breakdownCard: {
    marginBottom: 20,
  },
  barItem: {
    marginBottom: 12,
  },
  barLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  barLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  barVal: {
    color: COLORS.textPrimary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  barTrack: {
    height: 8,
    backgroundColor: 'rgba(27, 94, 32, 0.15)',
    borderRadius: ROUNDING.full,
    width: '100%',
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: ROUNDING.full,
  },
  seasonalCard: {
    marginBottom: 20,
  },
  seasonalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 8,
  },
  seasonalCell: {
    width: '30%',
    backgroundColor: 'rgba(27, 94, 32, 0.08)',
    borderRadius: ROUNDING.sm,
    paddingVertical: 10,
    alignItems: 'center',
  },
  seasonalMonth: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: 'bold',
  },
  seasonalVal: {
    color: COLORS.primaryLight,
    fontSize: 18,
    fontWeight: 'bold',
    marginVertical: 2,
  },
  seasonalUnit: {
    color: COLORS.textMuted,
    fontSize: 8,
  },
  insightsSection: {
    marginBottom: 24,
    gap: 10,
  },
  sectionLabel: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  insightCard: {
    backgroundColor: 'rgba(27, 94, 32, 0.06)',
  },
  insightText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    lineHeight: 18,
  },
  doneBtn: {
    marginTop: 10,
  },
});
