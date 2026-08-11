import React from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, ROUNDING } from '../../constants/theme';
import GlassCard from '../../components/common/GlassCard';
import GradientButton from '../../components/common/GradientButton';
import { useAppStore } from '../../store/appStore';

// Helper: status color
function statusColor(status: string) {
  if (status.toLowerCase().includes('optimal')) return COLORS.healthy;
  if (status.toLowerCase().includes('excess')) return COLORS.info;
  return COLORS.warning;
}

// Helper: eval badge color
function evalColor(evalStr: string) {
  if (evalStr?.toLowerCase().includes('optimal')) return COLORS.healthy;
  if (evalStr?.toLowerCase().includes('excess')) return COLORS.info;
  if (evalStr?.toLowerCase().includes('severe')) return COLORS.diseased;
  return COLORS.warning;
}

export default function SoilResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const language = useAppStore(state => state.language);

  // Extract all params passed from soil.tsx navigateToResult()
  const {
    treeNo, zoneId, method,
    soilN, soilP, soilK,
    leafN, leafP, leafK,
    status,
    urea, erp, mop, dolomite,
    advice,
    evalN, evalP, evalK,
    model,
    // Legacy fallback params
    healthScore, fertility, deficiencies, fertilizerPlan, N, P, K, pH, OC, EC
  } = params;

  const isNewFormat = !!treeNo;

  // --- New format values ---
  const sN = parseFloat(soilN as string || '0');
  const sP = parseFloat(soilP as string || '0');
  const sK = parseFloat(soilK as string || '0');
  const lN = parseFloat(leafN as string || '0');
  const lP = parseFloat(leafP as string || '0');
  const lK = parseFloat(leafK as string || '0');
  const ureaG = parseInt(urea as string || '800');
  const erpG = parseInt(erp as string || '600');
  const mopG = parseInt(mop as string || '1600');
  const dolomiteG = parseInt(dolomite as string || '1000');
  const adviceList: string[] = advice ? JSON.parse(advice as string) : [];
  const healthStatus = status as string || 'Optimal Health';

  // CRI Threshold Reference
  const CRI_THRESHOLDS = {
    N: { min: 1.90, max: 2.10, unit: '%' },
    P: { min: 0.11, max: 0.13, unit: '%' },
    K: { min: 1.20, max: 1.50, unit: '%' },
  };

  const statusCol = statusColor(healthStatus);

  const overallScore = () => {
    let score = 100;
    if (healthStatus.toLowerCase().includes('severe')) score = 25;
    else if (healthStatus.toLowerCase().includes('moderate')) score = 55;
    else if (healthStatus.toLowerCase().includes('excess')) score = 70;
    return score;
  };

  // Nutrient progress bar percentage relative to CRI optimal range
  const getNutPct = (val: number, min: number, max: number) => {
    if (val <= 0) return 5;
    const optimal = (min + max) / 2;
    const pct = (val / (optimal * 2)) * 100;
    return Math.min(Math.max(pct, 5), 100);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>
          {language === 'en' ? 'AI Soil Advisory Report' : 'AI පස් පරීක්ෂා වාර්තාව'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {isNewFormat ? (
          <>
            {/* 1. PALM METADATA BANNER */}
            <GlassCard style={styles.metaBanner}>
              <View style={styles.metaRow}>
                <View>
                  <Text style={styles.palmNo}>🌴 Palm #{treeNo}</Text>
                  <Text style={styles.zoneText}>{zoneId}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: statusCol }]}>
                  <Text style={styles.statusPillText}>{healthStatus}</Text>
                </View>
              </View>
              <Text style={styles.methodText}>
                📋 {language === 'en' ? 'Method' : 'ක්‍රමය'}: {method}
              </Text>
              <Text style={styles.modelText}>
                🧠 {language === 'en' ? 'AI Model' : 'AI Model'}: {model}
              </Text>
            </GlassCard>

            {/* 2. HEALTH SCORE RING */}
            <GlassCard style={styles.scoreCard}>
              <Text style={styles.cardTitle}>
                {language === 'en' ? '🌿 Palm Health Score' : '🌿 ගස් සෞඛ්‍ය ලකුණු'}
              </Text>
              <View style={[styles.ring, { borderColor: statusCol }]}>
                <Text style={[styles.ringVal, { color: statusCol }]}>{overallScore()}</Text>
                <Text style={styles.ringMax}>/100</Text>
              </View>
              <Text style={[styles.statusLabel, { color: statusCol }]}>{healthStatus}</Text>
            </GlassCard>

            {/* 3. TWO-STAGE PIPELINE RESULTS */}
            <Text style={styles.sectionTitle}>
              {language === 'en' ? '📊 2-Stage AI Pipeline Results' : '📊 AI Pipeline ප්‍රතිඵල'}
            </Text>

            {/* Stage 1: Soil Input → Predicted Leaf */}
            <GlassCard style={styles.pipelineCard}>
              <Text style={styles.pipelineStageLabel}>
                🔬 {language === 'en' ? 'Stage 1 — Soil → Predicted 14th Leaf NPK' : 'Stage 1 — පස → 14 වන පිත්ත NPK'}
              </Text>

              {/* Soil Input Row */}
              <View style={styles.npkCompareRow}>
                <Text style={styles.npkGroupLabel}>
                  {language === 'en' ? 'Sensor Soil NPK' : 'Sensor - Soil NPK'}
                </Text>
                <View style={styles.npkBubbleRow}>
                  <View style={[styles.npkBubble, { borderColor: COLORS.info }]}>
                    <Text style={styles.npkBubbleLabel}>N</Text>
                    <Text style={styles.npkBubbleVal}>{sN.toFixed(4)}</Text>
                  </View>
                  <View style={[styles.npkBubble, { borderColor: COLORS.info }]}>
                    <Text style={styles.npkBubbleLabel}>P</Text>
                    <Text style={styles.npkBubbleVal}>{sP.toFixed(4)}</Text>
                  </View>
                  <View style={[styles.npkBubble, { borderColor: COLORS.info }]}>
                    <Text style={styles.npkBubbleLabel}>K</Text>
                    <Text style={styles.npkBubbleVal}>{sK.toFixed(4)}</Text>
                  </View>
                </View>
              </View>

              <Text style={styles.arrowDown}>↓  Random Forest Regression  ↓</Text>

              {/* Predicted Leaf */}
              <View style={styles.npkCompareRow}>
                <Text style={styles.npkGroupLabel}>
                  {language === 'en' ? 'Predicted 14th Leaf NPK' : 'පුරෝකථිත 14 වැනි පිත්ත NPK'}
                </Text>
                <View style={styles.npkBubbleRow}>
                  {[
                    { label: 'N', val: lN, min: CRI_THRESHOLDS.N.min, max: CRI_THRESHOLDS.N.max, eval: evalN as string },
                    { label: 'P', val: lP, min: CRI_THRESHOLDS.P.min, max: CRI_THRESHOLDS.P.max, eval: evalP as string },
                    { label: 'K', val: lK, min: CRI_THRESHOLDS.K.min, max: CRI_THRESHOLDS.K.max, eval: evalK as string },
                  ].map(({ label, val, min, max, eval: ev }) => {
                    const col = val >= min && val <= max ? COLORS.healthy : val > max ? COLORS.info : COLORS.warning;
                    return (
                      <View key={label} style={[styles.npkBubble, { borderColor: col, backgroundColor: `${col}18` }]}>
                        <Text style={styles.npkBubbleLabel}>{label}</Text>
                        <Text style={[styles.npkBubbleVal, { color: col }]}>{val.toFixed(3)}%</Text>
                        <Text style={styles.npkRange}>{min}-{max}</Text>
                        <View style={[styles.evalTag, { backgroundColor: evalColor(ev) }]}>
                          <Text style={styles.evalTagText}>{ev?.split(' ')[0] || 'N/A'}</Text>
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>

              <View style={styles.criRefRow}>
                <Ionicons name="information-circle-outline" size={14} color={COLORS.textMuted} />
                <Text style={styles.criRefText}>
                  {language === 'en'
                    ? 'CRI Optimal: N:1.9-2.1% | P:0.11-0.13% | K:1.2-1.5% (14th Frond)'
                    : 'CRI ප්‍රශස්ත: N:1.9-2.1% | P:0.11-0.13% | K:1.2-1.5% (14 වැනි පිත්ත)'}
                </Text>
              </View>
            </GlassCard>

            {/* 4. STAGE 2: CRI FERTILIZER RECOMMENDATION */}
            <Text style={styles.sectionTitle}>
              {language === 'en' ? '💊 Stage 2 — CRI Fertilizer Dosage (g/palm/year)' : '💊 CRI පොහොර නිර්දේශය (ග්‍රෑම්/ගස/අවුරුද්ද)'}
            </Text>

            {[
              { name: 'Urea', nameS: 'යූරියා', g: ureaG, color: '#4FC3F7', icon: '🌿', desc: language === 'en' ? 'Nitrogen Source' : 'නයිට්‍රජන් ප්‍රභවය' },
              { name: 'ERP (Rock Phosphate)', nameS: 'එප්පාවල රොක් පොස්පේට්', g: erpG, color: '#FF8A65', icon: '🧱', desc: language === 'en' ? 'Phosphorus Source' : 'පොස්පරස් ප්‍රභවය' },
              { name: 'MOP (Muriate of Potash)', nameS: 'MOP (පොටෑෂ්)', g: mopG, color: '#CE93D8', icon: '🌊', desc: language === 'en' ? 'Potassium Source – Critical for nut yield' : 'පොටෑසියම් - ඵලදාවට ඉතා වැදගත්' },
              { name: 'Dolomite', nameS: 'ඩොලමයිට්', g: dolomiteG, color: '#A5D6A7', icon: '🪨', desc: language === 'en' ? 'pH neutralizer + Mg source' : 'pH සාමාන්‍ය + Mg ප්‍රභවය' },
            ].map((f) => (
              <GlassCard key={f.name} style={styles.fertCard}>
                <View style={styles.fertHeader}>
                  <Text style={styles.fertIcon}>{f.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fertName}>{language === 'en' ? f.name : f.nameS}</Text>
                    <Text style={styles.fertDesc}>{f.desc}</Text>
                  </View>
                  <View style={[styles.fertAmtBox, { backgroundColor: f.color + '30', borderColor: f.color }]}>
                    <Text style={[styles.fertAmt, { color: f.color }]}>{f.g}</Text>
                    <Text style={styles.fertAmtUnit}>g</Text>
                  </View>
                </View>
                {/* Visual bar */}
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, {
                    backgroundColor: f.color,
                    width: `${Math.min((f.g / 2200) * 100, 100)}%`
                  }]} />
                </View>
                <Text style={styles.fertSplit}>
                  {language === 'en'
                    ? `Split: ${Math.round(f.g / 2)}g in April–May, ${Math.round(f.g / 2)}g in Sep–Oct`
                    : `සෑදීම: ${Math.round(f.g / 2)}g අප්‍රේල්-මැයි, ${Math.round(f.g / 2)}g සැප්-ඔක්`}
                </Text>
              </GlassCard>
            ))}

            {/* 5. AGRONOMIC ADVICE */}
            {adviceList.length > 0 && (
              <GlassCard style={styles.adviceCard}>
                <Text style={styles.cardTitle}>
                  📝 {language === 'en' ? 'Agronomic Advisory Notes' : 'ගොවිජන නිර්දේශ'}
                </Text>
                {adviceList.map((adv, i) => (
                  <View key={i} style={styles.adviceItem}>
                    <Ionicons name="checkmark-circle" size={18} color={COLORS.primaryLight} style={{ marginTop: 2 }} />
                    <Text style={styles.adviceText}>{adv}</Text>
                  </View>
                ))}
              </GlassCard>
            )}
          </>
        ) : (
          // Legacy format fallback (old soil result screen)
          <GlassCard style={styles.scoreCard}>
            <Text style={styles.cardTitle}>Health Score: {healthScore}</Text>
            <Text style={styles.statusLabel}>{fertility as string}</Text>
          </GlassCard>
        )}

        {/* Done Button */}
        <GradientButton
          title={language === 'en' ? '← Back to Soil Test' : '← පස පරීක්ෂාවට ආපසු'}
          onPress={() => router.back()}
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
    paddingTop: Platform.OS === 'ios' ? 60 : 35,
    paddingBottom: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.glassBorder,
  },
  backBtn: { padding: 8 },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textPrimary,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 50,
  },

  // Meta Banner
  metaBanner: {
    padding: 16,
    marginBottom: 14,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  palmNo: {
    fontSize: 22,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  zoneText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000',
  },
  methodText: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  modelText: {
    fontSize: 12,
    color: COLORS.textMuted,
  },

  // Score ring
  scoreCard: {
    alignItems: 'center',
    paddingVertical: 20,
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 14,
  },
  ring: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 12,
  },
  ringVal: { fontSize: 26, fontWeight: '900' },
  ringMax: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: 'bold',
    marginLeft: 2,
    marginTop: 8,
  },
  statusLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },

  // Section title
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 10,
    marginLeft: 2,
  },

  // Pipeline Card
  pipelineCard: {
    padding: 16,
    marginBottom: 20,
  },
  pipelineStageLabel: {
    fontSize: 13,
    fontWeight: 'bold',
    color: COLORS.accentLight,
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  npkCompareRow: {
    marginBottom: 10,
  },
  npkGroupLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: '600',
    marginBottom: 8,
  },
  npkBubbleRow: {
    flexDirection: 'row',
    gap: 10,
  },
  npkBubble: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: ROUNDING.md,
    borderWidth: 1.5,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  npkBubbleLabel: {
    fontSize: 12,
    fontWeight: 'bold',
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  npkBubbleVal: {
    fontSize: 15,
    fontWeight: '900',
    color: COLORS.textPrimary,
  },
  npkRange: {
    fontSize: 9,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  evalTag: {
    marginTop: 4,
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 8,
  },
  evalTagText: {
    fontSize: 9,
    fontWeight: 'bold',
    color: '#000',
  },
  arrowDown: {
    textAlign: 'center',
    color: COLORS.accentLight,
    fontWeight: 'bold',
    fontSize: 12,
    marginVertical: 12,
    letterSpacing: 0.5,
  },
  criRefRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    padding: 8,
    borderRadius: 8,
    gap: 6,
  },
  criRefText: {
    fontSize: 10,
    color: COLORS.textMuted,
    flex: 1,
    lineHeight: 15,
  },

  // Fertilizer Cards
  fertCard: {
    padding: 14,
    marginBottom: 12,
  },
  fertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  fertIcon: { fontSize: 24 },
  fertName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: COLORS.textPrimary,
  },
  fertDesc: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 1,
  },
  fertAmtBox: {
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignItems: 'center',
  },
  fertAmt: {
    fontSize: 22,
    fontWeight: '900',
  },
  fertAmtUnit: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: 'bold',
  },
  progressBg: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  progressFill: {
    height: 6,
    borderRadius: 3,
  },
  fertSplit: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontStyle: 'italic',
  },

  // Advice Card
  adviceCard: {
    padding: 16,
    marginBottom: 14,
    borderColor: COLORS.accentLight,
  },
  adviceItem: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  adviceText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 19,
  },

  doneBtn: { marginTop: 10 },
});
