import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Switch, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { COLORS, ROUNDING } from '../../constants/theme';
import GlassCard from '../../components/common/GlassCard';
import InputField from '../../components/common/InputField';
import GradientButton from '../../components/common/GradientButton';
import { predictYieldAnnual, predictYield45Day, YieldPredictionInput } from '../../services/yieldService';
import { getLiveWeather } from '../../services/weatherService';
import { useAppStore } from '../../store/appStore';

export default function PredictScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const addHistoryItem = useAppStore(state => state.addHistoryItem);
  const language = useAppStore(state => state.language);

  // Predict mode: false = Annual (default), true = 45-Day
  const [is45DayMode, setIs45DayMode] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form states
  const [rainfall, setRainfall] = useState('1800');
  const [temp, setTemp] = useState('28.5');
  const [humidity, setHumidity] = useState('78');
  const [soilMoisture, setSoilMoisture] = useState('35');
  const [soilPH, setSoilPH] = useState('6.2');
  const [palmAge, setPalmAge] = useState('12');
  const [palmHealth, setPalmHealth] = useState('4'); // 1 to 5 scale
  const [fertilizer, setFertilizer] = useState('1.5');
  const [pestDisease, setPestDisease] = useState(false); // binary 0/1
  const [prevYield, setPrevYield] = useState('65');
  const [waterTable, setWaterTable] = useState('2.5');

  // Load weather defaults automatically
  useEffect(() => {
    async function loadLocationWeather() {
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          const weather = await getLiveWeather(loc.coords.latitude, loc.coords.longitude);
          setTemp(weather.temp.toString());
          setHumidity(weather.humidity.toString());
          // Approximate rainfall based on recent precipitation
          if (weather.precipitation > 0) {
            setRainfall('2000');
          }
        }
      } catch (err) {
        console.warn('Could not auto-fill weather metrics:', err);
      }
    }
    loadLocationWeather();
  }, []);

  const handlePredict = async () => {
    // Validate inputs
    const numRainfall = parseFloat(rainfall);
    const numTemp = parseFloat(temp);
    const numHumidity = parseFloat(humidity);
    const numMoisture = parseFloat(soilMoisture);
    const numPH = parseFloat(soilPH);
    const numAge = parseFloat(palmAge);
    const numHealth = parseFloat(palmHealth);
    const numFertilizer = parseFloat(fertilizer);
    const numPrevYield = parseFloat(prevYield);
    const numWaterTable = parseFloat(waterTable);

    if (
      isNaN(numRainfall) || isNaN(numTemp) || isNaN(numHumidity) || isNaN(numMoisture) ||
      isNaN(numPH) || isNaN(numAge) || isNaN(numHealth) || isNaN(numFertilizer) ||
      isNaN(numPrevYield) || isNaN(numWaterTable)
    ) {
      Alert.alert(t('common.error'), 'Please fill in all fields with valid numbers.');
      return;
    }

    setLoading(true);
    try {
      const inputData: YieldPredictionInput = {
        Rainfall_mm: numRainfall,
        Temperature_C: numTemp,
        Humidity_pct: numHumidity,
        SoilMoisture_pct: numMoisture,
        SoilpH: numPH,
        PalmAge_years: numAge,
        PalmHealth_1to5: numHealth,
        Fertilizer_kg: numFertilizer,
        PestDisease_binary: pestDisease ? 1 : 0,
        PrevYield_nuts_per_palm: numPrevYield,
        WaterTable_m: numWaterTable,
        Variety: 'Tall', // Default standard
        SunshineHours: 7.2,
        WindSpeed_kmh: 8.5,
        Altitude_m: 25,
        PlantDensity_per_ha: 150,
      };

      let result;
      if (is45DayMode) {
        result = await predictYield45Day({
          ...inputData,
          irrigation: 1,
          mulching: 1,
          intercropping: 0
        });
      } else {
        result = await predictYieldAnnual(inputData);
      }

      // Save to history
      await addHistoryItem({
        type: 'yield',
        input: { ...inputData, is45DayMode },
        result: result
      });

      // Navigate to results screen
      router.push({
        pathname: '/(screens)/predict-result',
        params: {
          is45DayMode: is45DayMode ? 'true' : 'false',
          prediction: result.ensemble_prediction || result.prediction,
          minInterval: result.confidence_interval?.[0] || 0,
          maxInterval: result.confidence_interval?.[1] || 0,
          rf: result.individual_models?.random_forest || 0,
          gb: result.individual_models?.gradient_boosting || 0,
          xgb: result.individual_models?.xgboost || 0,
          lgb: result.individual_models?.lightgbm || 0,
          insights: JSON.stringify(result.insights || result.recommendations || [])
        }
      });
    } catch (err: any) {
      Alert.alert(t('common.error'), 'Yield calculation failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{t('yield.title')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Toggle Switch Mode */}
        <GlassCard style={styles.modeCard}>
          <View style={styles.modeRow}>
            <Text style={[styles.modeLabel, !is45DayMode && styles.modeLabelActive]}>
              {t('yield.predictModeAnnual')}
            </Text>
            <Switch
              value={is45DayMode}
              onValueChange={setIs45DayMode}
              trackColor={{ false: COLORS.primaryLight, true: COLORS.accent }}
              thumbColor={COLORS.textPrimary}
            />
            <Text style={[styles.modeLabel, is45DayMode && styles.modeLabelActive]}>
              {t('yield.predictMode45Day')}
            </Text>
          </View>
        </GlassCard>

        {/* Climate Autofill Alert */}
        <View style={styles.alertRow}>
          <Ionicons name="information-circle" size={18} color={COLORS.primaryLight} />
          <Text style={styles.alertText}>{t('yield.weatherAlert')}</Text>
        </View>

        {/* Input Parameters Form */}
        <GlassCard style={styles.formCard}>
          <View style={styles.inputGrid}>
            <View style={styles.halfInput}>
              <InputField
                label={language === 'en' ? 'Rainfall (mm/yr)' : 'වර්ෂාපතනය (මි.මී.)'}
                value={rainfall}
                onChangeText={setRainfall}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.halfInput}>
              <InputField
                label={language === 'en' ? 'Temp (°C)' : 'උෂ්ණත්වය (°C)'}
                value={temp}
                onChangeText={setTemp}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputGrid}>
            <View style={styles.halfInput}>
              <InputField
                label={language === 'en' ? 'Humidity (%)' : 'ආර්ද්‍රතාවය (%)'}
                value={humidity}
                onChangeText={setHumidity}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.halfInput}>
              <InputField
                label={language === 'en' ? 'Soil pH' : 'පසේ pH අගය'}
                value={soilPH}
                onChangeText={setSoilPH}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputGrid}>
            <View style={styles.halfInput}>
              <InputField
                label={language === 'en' ? 'Soil Moisture (%)' : 'පාංශු තෙතමනය (%)'}
                value={soilMoisture}
                onChangeText={setSoilMoisture}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.halfInput}>
              <InputField
                label={language === 'en' ? 'Palm Age (yrs)' : 'ගසේ වයස (අවුරුදු)'}
                value={palmAge}
                onChangeText={setPalmAge}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputGrid}>
            <View style={styles.halfInput}>
              <InputField
                label={language === 'en' ? 'Palm Health (1-5)' : 'ගසේ සෞඛ්‍යය (1-5)'}
                value={palmHealth}
                onChangeText={setPalmHealth}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.halfInput}>
              <InputField
                label={language === 'en' ? 'Fertilizer (kg/yr)' : 'පොහොර ප්‍රමාණය (කි.ග්‍රෑ.)'}
                value={fertilizer}
                onChangeText={setFertilizer}
                keyboardType="numeric"
              />
            </View>
          </View>

          <View style={styles.inputGrid}>
            <View style={styles.halfInput}>
              <InputField
                label={language === 'en' ? 'Prev Yield (nuts)' : 'පෙර අස්වැන්න (ගෙඩි)'}
                value={prevYield}
                onChangeText={setPrevYield}
                keyboardType="numeric"
              />
            </View>
            <View style={styles.halfInput}>
              <InputField
                label={language === 'en' ? 'Water Table (m)' : 'භූගත ජල මට්ටම (මී.)'}
                value={waterTable}
                onChangeText={setWaterTable}
                keyboardType="numeric"
              />
            </View>
          </View>

          {/* Switch for Pest/Disease */}
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>
                {language === 'en' ? 'Pest & Disease History' : 'මෑතකදී පළිබෝධ/රෝග හානි'}
              </Text>
              <Text style={styles.switchDesc}>
                {language === 'en' ? 'Check if palms faced infestation' : 'ගොයම්/ගස්වලට හානි සිදුවී ඇත්නම් සක්‍රීය කරන්න'}
              </Text>
            </View>
            <Switch
              value={pestDisease}
              onValueChange={setPestDisease}
              trackColor={{ false: '#767577', true: COLORS.diseased }}
              thumbColor={COLORS.textPrimary}
            />
          </View>

          <GradientButton
            title={t('yield.predictBtn')}
            onPress={handlePredict}
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
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: 'bold',
  },
  modeLabelActive: {
    color: COLORS.textPrimary,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  alertText: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  formCard: {
    paddingVertical: 20,
  },
  inputGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  halfInput: {
    width: '48%',
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(76, 175, 80, 0.15)',
    marginTop: 8,
    marginBottom: 20,
  },
  switchLabel: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: 'bold',
  },
  switchDesc: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  btn: {
    marginTop: 8,
  },
});
