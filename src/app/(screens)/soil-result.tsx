import React from 'react';
import {
  StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, ROUNDING } from '../../constants/theme';
import GradientButton from '../../components/common/GradientButton';
import { useAppStore } from '../../store/appStore';

// Helper: status color (Premium Light Theme Palette)
function statusColor(status: string) {
  const s = status.toLowerCase();
  if (s.includes('optimal')) return '#2E7D32'; // Healthy Green
  if (s.includes('excess')) return '#1565C0'; // Info Blue
  return '#E65100'; // Warning Orange/Red
}

// Helper: eval badge color
function evalColor(evalStr: string) {
  const ev = evalStr?.toLowerCase() || '';
  if (ev.includes('optimal')) return '#2E7D32';
  if (ev.includes('excess')) return '#1565C0';
  if (ev.includes('severe') || ev.includes('deficient')) return '#C62828';
  return '#E65100';
}

function ResultCard({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <View style={[styles.lightCard, style]}>
      {children}
    </View>
  );
}

export default function SoilResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const language = useAppStore(state => state.language);

  // Extract all params passed from soil.tsx or lab-test-entry.tsx
  const {
    treeNo, zoneId, method,
    soilN, soilP, soilK,
    leafN, leafP, leafK, leafMg,
    status,
    urea, erp, mop, dolomite,
    advice,
    evalN, evalP, evalK, evalMg,
    model,
    // Legacy fallback params
    healthScore, fertility
  } = params;

  const isNewFormat = !!treeNo;
  const isLabAnalysis = method?.toString().toLowerCase().includes('laboratory') || method?.toString().toLowerCase().includes('lab');

  // --- Values parsing ---
  const sN = parseFloat(soilN as string || '0');
  const sP = parseFloat(soilP as string || '0');
  const sK = parseFloat(soilK as string || '0');
  const lN = parseFloat(leafN as string || '0');
  const lP = parseFloat(leafP as string || '0');
  const lK = parseFloat(leafK as string || '0');
  const lMg = parseFloat(leafMg as string || '0');
  
  const ureaG = parseInt(urea as string || '800');
  const erpG = parseInt(erp as string || '600');
  const mopG = parseInt(mop as string || '1600');
  const dolomiteG = parseInt(dolomite as string || '1000');
  
  const adviceList: string[] = advice ? JSON.parse(advice as string) : [];
  const healthStatus = status as string || 'Optimal Health';

  // CRI Threshold Reference (14th Leaf Tissue Dry Matter %)
  const CRI_THRESHOLDS = {
    N: { min: 1.90, max: 2.10, unit: '%' },
    P: { min: 0.11, max: 0.13, unit: '%' },
    K: { min: 1.20, max: 1.50, unit: '%' },
    Mg: { min: 0.20, max: 0.35, unit: '%' },
  };

  const statusCol = statusColor(healthStatus);

  const translatedStatus = () => {
    if (healthStatus === 'Healthy Palm') {
      return language === 'en' ? 'Healthy Palm' : 'නිරෝගී ගසක්';
    }
    if (healthStatus === 'Fertilizer Required') {
      return language === 'en' ? 'Fertilizer Required' : 'පොහොර නිර්දේශයක් අවශ්‍යයි';
    }
    return healthStatus;
  };

  const displayEval = (evStr: string) => {
    const s = evStr?.split(' ')[0]?.toLowerCase() || 'n/a';
    if (s === 'optimal') return language === 'en' ? 'Optimal' : 'ප්‍රශස්ත';
    if (s === 'deficient') return language === 'en' ? 'Low' : 'අඩු';
    if (s === 'excess') return language === 'en' ? 'High' : 'වැඩි';
    return s.toUpperCase();
  };

  const overallScore = () => {
    let score = 100;
    let outOfRangeCount = 0;
    
    const evN = evalN?.toString().toLowerCase() || '';
    const evP = evalP?.toString().toLowerCase() || '';
    const evK = evalK?.toString().toLowerCase() || '';
    const evMg = evalMg?.toString().toLowerCase() || '';
    
    if (evN.includes('deficient') || evN.includes('excess')) outOfRangeCount++;
    if (evP.includes('deficient') || evP.includes('excess')) outOfRangeCount++;
    if (evK.includes('deficient') || evK.includes('excess')) outOfRangeCount++;
    if (evMg !== 'n/a' && (evMg.includes('deficient') || evMg.includes('excess'))) outOfRangeCount++;
    
    if (outOfRangeCount > 0) {
      score = Math.max(40, 100 - outOfRangeCount * 15);
    }
    return score;
  };

  // Build the list of active leaf nutrients to display
  const nutrientList = [
    { label: 'N', val: lN, min: CRI_THRESHOLDS.N.min, max: CRI_THRESHOLDS.N.max, eval: evalN as string },
    { label: 'P', val: lP, min: CRI_THRESHOLDS.P.min, max: CRI_THRESHOLDS.P.max, eval: evalP as string },
    { label: 'K', val: lK, min: CRI_THRESHOLDS.K.min, max: CRI_THRESHOLDS.K.max, eval: evalK as string },
  ];
  if (lMg > 0 || evalMg) {
    nutrientList.push({ label: 'Mg', val: lMg, min: CRI_THRESHOLDS.Mg.min, max: CRI_THRESHOLDS.Mg.max, eval: evalMg as string });
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#1B2C1A" />
        </TouchableOpacity>
        <Text style={styles.title}>
          {language === 'en' ? 'CRI Soil & Leaf Advisory Report' : 'CRI පොහොර සහ පත්‍ර නිර්දේශය'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {isNewFormat ? (
          <>
            {/* 1. PALM METADATA BANNER */}
            <ResultCard style={styles.metaBanner}>
              <View style={styles.metaRow}>
                <View>
                  <Text style={styles.palmNo}>🌴 Palm ID: {treeNo}</Text>
                  <Text style={styles.zoneText}>{zoneId}</Text>
                </View>
                <View style={[styles.statusPill, { backgroundColor: statusCol }]}>
                  <Text style={styles.statusPillText}>{translatedStatus()}</Text>
                </View>
              </View>
              <Text style={styles.methodText}>
                📋 {language === 'en' ? 'Method' : 'ක්‍රමය'}: {method}
              </Text>
              <Text style={styles.modelText}>
                🧠 {language === 'en' ? 'Engine' : 'එන්ජිම'}: {model}
              </Text>
            </ResultCard>

            {/* 2. HEALTH SCORE RING */}
            <ResultCard style={styles.scoreCard}>
              <Text style={styles.cardTitle}>
                {language === 'en' ? '🌿 Palm Health Score' : '🌿 ගස් සෞඛ්‍ය ලකුණු'}
              </Text>
              <View style={[styles.ring, { borderColor: statusCol }]}>
                <Text style={[styles.ringVal, { color: statusCol }]}>{overallScore()}</Text>
                <Text style={styles.ringMax}>/100</Text>
              </View>
              <Text style={[styles.statusLabel, { color: statusCol }]}>{translatedStatus()}</Text>
            </ResultCard>

            {/* 3. NUTRIENT LEVEL ANALYSIS DISPLAY */}
            {isLabAnalysis ? (
              // Laboratory Leaf tissue values directly (NO Soil-to-Leaf prediction Stage needed)
              <>
                <Text style={styles.sectionTitle}>
                  {language === 'en' ? '🍃 14th Leaf Nutrient Levels' : '🍃 14 වැනි පිත්තේ පෝෂක මට්ටම්'}
                </Text>

                <ResultCard>
                  <View style={styles.npkBubbleRow}>
                    {nutrientList.map(({ label, val, min, max, eval: ev }) => {
                      const col = val >= min && val <= max ? '#2E7D32' : val > max ? '#1565C0' : '#C62828';
                      const bgCol = val >= min && val <= max ? '#E8F5E9' : val > max ? '#E3F2FD' : '#FFEBEE';
                      return (
                        <View key={label} style={[styles.npkBubble, { borderColor: col, backgroundColor: bgCol }]}>
                          <Text style={styles.npkBubbleLabel}>{label}</Text>
                          <Text style={[styles.npkBubbleVal, { color: col }]}>{val.toFixed(3)}%</Text>
                          <Text style={styles.npkRange}>{min}-{max}%</Text>
                          <View style={[styles.evalTag, { backgroundColor: col }]}>
                            <Text style={styles.evalTagText}>{displayEval(ev)}</Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  <View style={styles.criRefRow}>
                    <Ionicons name="information-circle-outline" size={14} color="#78909C" />
                    <Text style={styles.criRefText}>
                      {language === 'en'
                        ? 'Leaf values compared directly against CRI optimal ranges.'
                        : 'පත්‍ර පටක අගයන් CRI ප්‍රශස්ත සීමාවන් සමඟ සෘජුව සංසන්දනය කර ඇත.'}
                    </Text>
                  </View>
                </ResultCard>
              </>
            ) : (
              // 2-Stage AI pipeline (Sensor Soil NPK to Predicted Leaf NPK)
              <>
                <Text style={styles.sectionTitle}>
                  {language === 'en' ? '📊 2-Stage AI Pipeline Results' : '📊 AI Pipeline ප්‍රතිඵල'}
                </Text>

                <ResultCard style={styles.pipelineCard}>
                  <Text style={styles.pipelineStageLabel}>
                    🔬 {language === 'en' ? 'Stage 1 — Soil → Predicted 14th Leaf NPK' : 'Stage 1 — පස → 14 වන පිත්ත NPK'}
                  </Text>

                  {/* Soil Input Row */}
                  <View style={styles.npkCompareRow}>
                    <Text style={styles.npkGroupLabel}>
                      {language === 'en' ? 'Sensor Soil NPK' : 'Sensor - Soil NPK'}
                    </Text>
                    <View style={styles.npkBubbleRow}>
                      <View style={[styles.npkBubble, { borderColor: '#B0BEC5', backgroundColor: '#F8F9FA' }]}>
                        <Text style={[styles.npkBubbleLabel, { color: '#37474F' }]}>N</Text>
                        <Text style={[styles.npkBubbleVal, { color: '#37474F' }]}>{sN.toFixed(4)}</Text>
                      </View>
                      <View style={[styles.npkBubble, { borderColor: '#B0BEC5', backgroundColor: '#F8F9FA' }]}>
                        <Text style={[styles.npkBubbleLabel, { color: '#37474F' }]}>P</Text>
                        <Text style={[styles.npkBubbleVal, { color: '#37474F' }]}>{sP.toFixed(4)}</Text>
                      </View>
                      <View style={[styles.npkBubble, { borderColor: '#B0BEC5', backgroundColor: '#F8F9FA' }]}>
                        <Text style={[styles.npkBubbleLabel, { color: '#37474F' }]}>K</Text>
                        <Text style={[styles.npkBubbleVal, { color: '#37474F' }]}>{sK.toFixed(4)}</Text>
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
                      {nutrientList.map(({ label, val, min, max, eval: ev }) => {
                        const col = val >= min && val <= max ? '#2E7D32' : val > max ? '#1565C0' : '#C62828';
                        const bgCol = val >= min && val <= max ? '#E8F5E9' : val > max ? '#E3F2FD' : '#FFEBEE';
                        return (
                          <View key={label} style={[styles.npkBubble, { borderColor: col, backgroundColor: bgCol }]}>
                            <Text style={styles.npkBubbleLabel}>{label}</Text>
                            <Text style={[styles.npkBubbleVal, { color: col }]}>{val.toFixed(3)}%</Text>
                            <Text style={styles.npkRange}>{min}-{max}</Text>
                            <View style={[styles.evalTag, { backgroundColor: col }]}>
                              <Text style={styles.evalTagText}>{displayEval(ev)}</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>

                  <View style={styles.criRefRow}>
                    <Ionicons name="information-circle-outline" size={14} color="#78909C" />
                    <Text style={styles.criRefText}>
                      {language === 'en'
                        ? 'CRI Optimal: N:1.9-2.1% | P:0.11-0.13% | K:1.2-1.5% (14th Frond)'
                        : 'CRI ප්‍රශස්ත: N:1.9-2.1% | P:0.11-0.13% | K:1.2-1.5% (14 වැනි පිත්ත)'}
                    </Text>
                  </View>
                </ResultCard>
              </>
            )}

            {/* 4. FERTILIZER RECOMMENDATION */}
            <Text style={styles.sectionTitle}>
              {language === 'en' ? '💊 CRI Fertilizer Dosage (g/palm/year)' : '💊 CRI පොහොර නිර්දේශය (ග්‍රෑම්/ගස/අවුරුද්ද)'}
            </Text>

            {[
              { name: 'Urea', nameS: 'යූරියා', g: ureaG, color: '#0288D1', icon: '🌿', desc: language === 'en' ? 'Nitrogen Source' : 'නයිට්‍රජන් ප්‍රභවය' },
              { name: 'ERP / TSP', nameS: 'එප්පාවල රොක් පොස්පේට්', g: erpG, color: '#E64A19', icon: '🧱', desc: language === 'en' ? 'Phosphorus Source' : 'පොස්පරස් ප්‍රභවය' },
              { name: 'MOP (Muriate of Potash)', nameS: 'MOP (පොටෑෂ්)', g: mopG, color: '#7B1FA2', icon: '🌊', desc: language === 'en' ? 'Potassium Source – Critical for nut yield' : 'පොටෑසියම් - ඵලදාවට ඉතා වැදගත්' },
              { name: 'Dolomite', nameS: 'ඩොලමයිට්', g: dolomiteG, color: '#388E3C', icon: '🪨', desc: language === 'en' ? 'pH neutralizer + Magnesium source' : 'pH සාමාන්‍ය + Mg ප්‍රභවය' },
            ].map((f) => (
              <ResultCard key={f.name} style={styles.fertCard}>
                <View style={styles.fertHeader}>
                  <Text style={styles.fertIcon}>{f.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.fertName}>{language === 'en' ? f.name : f.nameS}</Text>
                    <Text style={styles.fertDesc}>{f.desc}</Text>
                  </View>
                  <View style={[styles.fertAmtBox, { backgroundColor: f.color + '15', borderColor: f.color }]}>
                    <Text style={[styles.fertAmt, { color: f.color }]}>{f.g}</Text>
                    <Text style={[styles.fertAmtUnit, { color: f.color }]}>g</Text>
                  </View>
                </View>
                {/* Visual progress bar */}
                <View style={styles.progressBg}>
                  <View style={[styles.progressFill, {
                    backgroundColor: f.color,
                    width: `${Math.min((f.g / 2200) * 100, 100)}%`
                  }]} />
                </View>
                <Text style={styles.fertSplit}>
                  {language === 'en'
                    ? `Split: ${Math.round(f.g / 2)}g in April–May (Yala), ${Math.round(f.g / 2)}g in Sep–Oct (Maha)`
                    : `සෑදීම: ${Math.round(f.g / 2)}g අප්‍රේල්-මැයි, ${Math.round(f.g / 2)}g සැප්-ඔක්`}
                </Text>
              </ResultCard>
            ))}

            {/* 5. AGRONOMIC ADVICE */}
            {adviceList.length > 0 && (
              <ResultCard style={styles.adviceCard}>
                <Text style={styles.cardTitle}>
                  📝 {language === 'en' ? 'Agronomic Advisory Notes' : 'ගොවිජන නිර්දේශ'}
                </Text>
                <View style={{ height: 10 }} />
                {adviceList.map((adv, i) => (
                  <View key={i} style={styles.adviceItem}>
                    <Ionicons name="checkmark-circle" size={18} color="#2E7D32" style={{ marginTop: 2 }} />
                    <Text style={styles.adviceText}>{adv}</Text>
                  </View>
                ))}
              </ResultCard>
            )}
          </>
        ) : (
          // Legacy format fallback (old soil result screen)
          <ResultCard style={styles.scoreCard}>
            <Text style={styles.cardTitle}>Health Score: {healthScore}</Text>
            <Text style={styles.statusLabel}>{fertility as string}</Text>
          </ResultCard>
        )}

        {/* Action Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.backEntryBtn}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={18} color="#1B5E20" />
            <Text style={styles.backEntryText}>
              {language === 'en' ? 'Back' : 'ආපසු'}
            </Text>
          </TouchableOpacity>

          <View style={{ flex: 1 }}>
            <GradientButton
              title={language === 'en' ? 'Go to Dashboard' : 'ප්‍රධාන පුවරුවට'}
              onPress={() => router.replace('/(tabs)/soil')}
              style={styles.homeBtn}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 35,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#ECEFF1',
  },
  backBtn: { padding: 8 },
  title: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1B2C1A',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 50,
  },
  lightCard: {
    backgroundColor: '#F8F9FA',
    borderRadius: ROUNDING.md,
    borderWidth: 1,
    borderColor: '#ECEFF1',
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 1,
  },
  metaBanner: {
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6C9',
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  palmNo: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1B5E20',
  },
  zoneText: {
    fontSize: 13,
    color: '#37474F',
    fontWeight: '600',
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  methodText: {
    fontSize: 12.5,
    color: '#546E7A',
    fontWeight: '600',
    marginBottom: 4,
  },
  modelText: {
    fontSize: 12.5,
    color: '#546E7A',
    fontWeight: '600',
  },
  scoreCard: {
    alignItems: 'center',
    paddingVertical: 20,
    backgroundColor: '#FFFFFF',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#263238',
    letterSpacing: 0.3,
  },
  ring: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 8,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    marginVertical: 14,
  },
  ringVal: { fontSize: 26, fontWeight: '900' },
  ringMax: {
    color: '#78909C',
    fontSize: 11,
    fontWeight: '700',
    marginLeft: 2,
    marginTop: 8,
  },
  statusLabel: {
    fontSize: 15,
    fontWeight: '800',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#37474F',
    marginTop: 8,
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  pipelineCard: {
    backgroundColor: '#FFFFFF',
  },
  pipelineStageLabel: {
    fontSize: 12.5,
    fontWeight: '800',
    color: '#1B5E20',
    marginBottom: 14,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  npkCompareRow: {
    marginBottom: 10,
  },
  npkGroupLabel: {
    fontSize: 12,
    color: '#546E7A',
    fontWeight: '700',
    marginBottom: 8,
  },
  npkBubbleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  npkBubble: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: ROUNDING.md,
    borderWidth: 1.5,
  },
  npkBubbleLabel: {
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 2,
  },
  npkBubbleVal: {
    fontSize: 15,
    fontWeight: '900',
  },
  npkRange: {
    fontSize: 9,
    marginTop: 2,
    fontWeight: '600',
  },
  evalTag: {
    marginTop: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  evalTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#FFFFFF',
    textTransform: 'uppercase',
  },
  arrowDown: {
    textAlign: 'center',
    color: '#78909C',
    fontWeight: '800',
    fontSize: 11,
    marginVertical: 10,
  },
  criRefRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 12,
    backgroundColor: '#F1F1F1',
    padding: 10,
    borderRadius: 8,
    gap: 6,
  },
  criRefText: {
    fontSize: 10,
    flex: 1,
    lineHeight: 14,
    fontWeight: '600',
  },
  fertCard: {
    backgroundColor: '#FFFFFF',
  },
  fertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  fertIcon: { fontSize: 24 },
  fertName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#263238',
  },
  fertDesc: {
    fontSize: 11,
    color: '#546E7A',
    fontWeight: '500',
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
    fontSize: 20,
    fontWeight: '900',
  },
  fertAmtUnit: {
    fontSize: 11,
    fontWeight: '800',
  },
  progressBg: {
    height: 6,
    backgroundColor: '#ECEFF1',
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
    color: '#78909C',
    fontStyle: 'italic',
    fontWeight: '600',
  },
  adviceCard: {
    backgroundColor: '#FFFFFF',
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
    color: '#37474F',
    lineHeight: 19,
    fontWeight: '600',
  },
  doneBtn: { marginTop: 10 },
  actionRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  backEntryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: ROUNDING.md,
    borderWidth: 1.5,
    borderColor: '#C8E6C9',
    backgroundColor: '#FFFFFF',
  },
  backEntryText: {
    color: '#1B5E20',
    fontWeight: '700',
    fontSize: 14,
  },
  homeBtn: {
    borderRadius: ROUNDING.md,
  },
});
