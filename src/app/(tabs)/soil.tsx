import React, { useState } from 'react';
import { StyleSheet, View, Text, ScrollView, Alert, Switch, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { COLORS, ROUNDING } from '../../constants/theme';
import GlassCard from '../../components/common/GlassCard';
import InputField from '../../components/common/InputField';
import GradientButton from '../../components/common/GradientButton';
import { analyzeSoilNutrients, SoilAnalysisInput } from '../../services/soilService';
import { useAppStore } from '../../store/appStore';

export default function SoilScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const addHistoryItem = useAppStore(state => state.addHistoryItem);
  const language = useAppStore(state => state.language);

  // Mode: false = Quick (only NPK, pH), true = Detailed (full composition)
  const [isDetailedMode, setIsDetailedMode] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states
  const [pH, setPH] = useState('6.2');
  const [N, setN] = useState('220');
  const [P, setP] = useState('18');
  const [K, setK] = useState('160');

  // Detailed inputs
  const [organicCarbon, setOrganicCarbon] = useState('1.8');
  const [ec, setEc] = useState('0.45');
  const [moisture, setMoisture] = useState('32');
  const [sand, setSand] = useState('65');
  const [clay, setClay] = useState('20');
  const [silt, setSilt] = useState('15');

  const handleAnalyze = async () => {
    const numPH = parseFloat(pH);
    const numN = parseFloat(N);
    const numP = parseFloat(P);
    const numK = parseFloat(K);

    if (isNaN(numPH) || isNaN(numN) || isNaN(numP) || isNaN(numK)) {
      Alert.alert(t('common.error'), 'Please fill in all core nutrients (pH, N, P, K).');
      return;
    }

    let numOC = 1.8;
    let numEC = 0.45;
    let numMoisture = 32.0;
    let numSand = 60.0;
    let numClay = 20.0;
    let numSilt = 20.0;

    if (isDetailedMode) {
      numOC = parseFloat(organicCarbon);
      numEC = parseFloat(ec);
      numMoisture = parseFloat(moisture);
      numSand = parseFloat(sand);
      numClay = parseFloat(clay);
      numSilt = parseFloat(silt);

      if (isNaN(numOC) || isNaN(numEC) || isNaN(numMoisture) || isNaN(numSand) || isNaN(numClay) || isNaN(numSilt)) {
        Alert.alert(t('common.error'), 'Please enter valid numbers for detailed composition.');
        return;
      }

      // Check sum of compositions
      const sum = numSand + numClay + numSilt;
      if (Math.abs(sum - 100) > 0.1) {
        Alert.alert(
          t('common.error'),
          language === 'en'
            ? `Soil components (Sand, Clay, Silt) must sum exactly to 100%. Currently: ${sum}%`
            : `පසේ අඩංගු මූලද්‍රව්‍යවල (වැලි, මැටි, ර්‍ලමු) එකතුව 100%ක් විය යුතුය. දැනට: ${sum}%`
        );
        return;
      }
    }

    setLoading(true);
    try {
      const inputData: SoilAnalysisInput = {
        pH: numPH,
        N: numN,
        P: numP,
        K: numK,
        Organic_Carbon: numOC,
        EC: numEC,
        Moisture: numMoisture,
        Sand_pct: numSand,
        Clay_pct: numClay,
        Silt_pct: numSilt,
        Soil_Type: 'Sandy Loam'
      };

      const result = await analyzeSoilNutrients(inputData);

      // Persist to store
      await addHistoryItem({
        type: 'soil',
        input: { ...inputData, isDetailedMode },
        result: result
      });

      // Redirect to soil-result view
      router.push({
        pathname: '/(screens)/soil-result',
        params: {
          healthScore: result.health_score,
          fertility: result.fertility,
          deficiencies: JSON.stringify(result.deficiencies || []),
          optimalRanges: JSON.stringify(result.optimal_ranges || {}),
          fertilizerPlan: JSON.stringify(result.fertilizer_plan || []),
          pH: numPH.toString(),
          N: numN.toString(),
          P: numP.toString(),
          K: numK.toString(),
          OC: numOC.toString(),
          EC: numEC.toString(),
        }
      });
    } catch (err: any) {
      Alert.alert(t('common.error'), 'Soil analysis failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('soil.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Toggle Mode */}
        <GlassCard style={styles.modeCard}>
          <View style={styles.modeRow}>
            <Text style={styles.modeLabel}>
              {language === 'en' ? 'Quick Nutrient Profiling' : 'මූලික පරීක්ෂාව (NPK, pH)'}
            </Text>
            <Switch
              value={isDetailedMode}
              onValueChange={setIsDetailedMode}
              trackColor={{ false: '#767577', true: COLORS.primaryLight }}
              thumbColor={COLORS.textPrimary}
            />
          </View>
        </GlassCard>

        {/* Input Parameters Form */}
        <GlassCard style={styles.formCard}>
          <Text style={styles.cardSectionTitle}>
            {language === 'en' ? 'Core Nutrients' : 'ප්‍රධාන පෝෂක මට්ටම්'}
          </Text>

          <View style={styles.inputGrid}>
            <View style={styles.halfInput}>
              <InputField
                label={language === 'en' ? 'Nitrogen (N - mg/kg)' : 'නයිට්‍රජන් (N)'}
                value={N}
                onChangeText={setN}
                keyboardType="numeric"
                placeholder="200 - 350"
              />
            </View>
            <View style={styles.halfInput}>
              <InputField
                label={language === 'en' ? 'Phosphorus (P - mg/kg)' : 'පොස්පරස් (P)'}
                value={P}
                onChangeText={setP}
                keyboardType="numeric"
                placeholder="15 - 40"
              />
            </View>
          </View>

          <View style={styles.inputGrid}>
            <View style={styles.halfInput}>
              <InputField
                label={language === 'en' ? 'Potassium (K - mg/kg)' : 'පොටෑසියම් (K)'}
                value={K}
                onChangeText={setK}
                keyboardType="numeric"
                placeholder="150 - 300"
              />
            </View>
            <View style={styles.halfInput}>
              <InputField
                label={language === 'en' ? 'Soil pH' : 'පසේ pH අගය'}
                value={pH}
                onChangeText={setPH}
                keyboardType="numeric"
                placeholder="5.5 - 7.0"
              />
            </View>
          </View>

          {/* Detailed Compositions */}
          {isDetailedMode && (
            <View style={styles.detailedSection}>
              <Text style={styles.cardSectionTitle}>
                {language === 'en' ? 'Detailed Soil Matrix' : 'විස්තරාත්මක පාංශු සංයුතිය'}
              </Text>

              <View style={styles.inputGrid}>
                <View style={styles.halfInput}>
                  <InputField
                    label={language === 'en' ? 'Organic Carbon (%)' : 'කාබනික කාබන් (%)'}
                    value={organicCarbon}
                    onChangeText={setOrganicCarbon}
                    keyboardType="numeric"
                    placeholder="1.5 - 3.0"
                  />
                </View>
                <View style={styles.halfInput}>
                  <InputField
                    label={language === 'en' ? 'EC (dS/m)' : 'විද්‍යුත් සන්නායකතාවය'}
                    value={ec}
                    onChangeText={setEc}
                    keyboardType="numeric"
                    placeholder="< 1.0"
                  />
                </View>
              </View>

              <InputField
                label={language === 'en' ? 'Soil Moisture (%)' : 'පාංශු තෙතමනය (%)'}
                value={moisture}
                onChangeText={setMoisture}
                keyboardType="numeric"
                placeholder="25 - 45"
              />

              <Text style={styles.compositionHeader}>
                {language === 'en' ? 'Physical Textures (Must sum to 100%)' : 'භෞතික ව්‍යුහය (එකතුව 100%ක් විය යුතුය)'}
              </Text>

              <View style={styles.compositionRow}>
                <View style={styles.thirdInput}>
                  <InputField
                    label={language === 'en' ? 'Sand (%)' : 'වැලි (%)'}
                    value={sand}
                    onChangeText={setSand}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.thirdInput}>
                  <InputField
                    label={language === 'en' ? 'Clay (%)' : 'මැටි (%)'}
                    value={clay}
                    onChangeText={setClay}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.thirdInput}>
                  <InputField
                    label={language === 'en' ? 'Silt (%)' : 'ර්‍ලමු (%)'}
                    value={silt}
                    onChangeText={setSilt}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
          )}

          <GradientButton
            title={language === 'en' ? 'Run Soil Analysis' : 'පාංශු සෞඛ්‍යය පරීක්ෂා කරන්න'}
            onPress={handleAnalyze}
            loading={loading}
            style={styles.btn}
          />
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
  header: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingBottom: 16,
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
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  modeCard: {
    marginBottom: 16,
  },
  modeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  modeLabel: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  formCard: {
    paddingVertical: 20,
  },
  cardSectionTitle: {
    color: COLORS.accentLight,
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(76,175,80,0.12)',
    paddingBottom: 4,
  },
  inputGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  halfInput: {
    width: '48%',
  },
  detailedSection: {
    marginTop: 10,
  },
  compositionHeader: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 10,
    marginTop: 6,
  },
  compositionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  thirdInput: {
    width: '31%',
  },
  btn: {
    marginTop: 16,
  },
});
