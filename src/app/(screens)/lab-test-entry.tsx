import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Platform,
  Alert,
  Dimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS, ROUNDING } from '../../constants/theme';
import GradientButton from '../../components/common/GradientButton';

const { width } = Dimensions.get('window');

export default function LabTestEntryScreen() {
  const router = useRouter();

  // Multi-step state
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);

  // Section 1: Palm Details
  const [palmId, setPalmId] = useState('');
  const [plantAge, setPlantAge] = useState('');
  const [zone, setZone] = useState<'Wet' | 'Intermediate' | 'Dry' | null>('Wet');
  const [sampleDate, setSampleDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [lastFertDate, setLastFertDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().split('T')[0];
  });

  // Date picker visibility states (for native platforms)
  const [showSampleDatePicker, setShowSampleDatePicker] = useState(false);
  const [showLastFertDatePicker, setShowLastFertDatePicker] = useState(false);

  // Section 2: Nutrient Levels
  const [nitrogen, setNitrogen] = useState('');
  const [phosphorus, setPhosphorus] = useState('');
  const [potassium, setPotassium] = useState('');
  const [magnesium, setMagnesium] = useState('');

  const [activeInput, setActiveInput] = useState<string | null>(null);

  const handleNextStep = () => {
    if (
      !palmId.trim() || 
      !plantAge.trim() || 
      !zone || 
      !sampleDate.trim() || 
      !lastFertDate.trim()
    ) {
      Alert.alert('Missing Fields', 'Please fill in all required palm details before continuing.');
      return;
    }

    const ageVal = parseFloat(plantAge);
    if (isNaN(ageVal) || ageVal <= 0) {
      Alert.alert('Invalid Age', 'Please enter a valid plant age.');
      return;
    }

    setCurrentStep(2);
  };

  const handleCheckResults = () => {
    if (
      !nitrogen.trim() || 
      !phosphorus.trim() || 
      !potassium.trim()
    ) {
      Alert.alert('Missing Fields', 'Please enter Nitrogen, Phosphorus, and Potassium values.');
      return;
    }

    const nVal = parseFloat(nitrogen);
    const pVal = parseFloat(phosphorus);
    const kVal = parseFloat(potassium);
    const mgVal = magnesium.trim() ? parseFloat(magnesium) : null;
    const ageVal = parseFloat(plantAge);

    if (isNaN(nVal) || isNaN(pVal) || isNaN(kVal) || (mgVal !== null && isNaN(mgVal))) {
      Alert.alert('Invalid Values', 'Please enter valid numeric values for all nutrients.');
      return;
    }

    // Determine evaluations
    // N range: 1.90 - 2.10
    let evalN = 'Optimal';
    if (nVal < 1.90) evalN = 'Deficient';
    else if (nVal > 2.10) evalN = 'Excess';

    // P range: 0.11 - 0.13
    let evalP = 'Optimal';
    if (pVal < 0.11) evalP = 'Deficient';
    else if (pVal > 0.13) evalP = 'Excess';

    // K range: 1.20 - 1.50
    let evalK = 'Optimal';
    if (kVal < 1.20) evalK = 'Deficient';
    else if (kVal > 1.50) evalK = 'Excess';

    // Mg range: 0.20 - 0.35
    let evalMg = 'N/A';
    if (mgVal !== null) {
      evalMg = 'Optimal';
      if (mgVal < 0.20) evalMg = 'Deficient';
      else if (mgVal > 0.35) evalMg = 'Excess';
    }

    // Fertilizer calculation (grams per palm per year)
    const isAdult = ageVal >= 4;

    let baseUrea = isAdult ? 800 : 470;
    let baseErpTsp = isAdult ? (zone === 'Dry' ? 400 : 900) : (zone === 'Dry' ? 400 : 1060);
    let baseMop = isAdult ? 1600 : 470;
    let baseDolomite = isAdult ? 1000 : 500;

    // Adjust Urea based on N
    let finalUrea = baseUrea;
    if (evalN === 'Deficient') finalUrea += isAdult ? 150 : 80;
    else if (evalN === 'Excess') finalUrea -= isAdult ? 300 : 150;

    // Adjust ERP/TSP based on P
    let finalErpTsp = baseErpTsp;
    if (evalP === 'Deficient') finalErpTsp += isAdult ? 200 : 100;
    else if (evalP === 'Excess') finalErpTsp -= isAdult ? 300 : 150;

    // Adjust MOP based on K
    let finalMop = baseMop;
    if (evalK === 'Deficient') finalMop += isAdult ? 500 : 250;
    else if (evalK === 'Excess') finalMop -= isAdult ? 600 : 300;

    // Adjust Dolomite based on Mg
    let finalDolomite = baseDolomite;
    if (evalMg === 'Deficient') finalDolomite += isAdult ? 500 : 250;
    else if (evalMg === 'Excess') finalDolomite -= isAdult ? 400 : 200;

    // Ensure non-negative values
    finalUrea = Math.max(0, finalUrea);
    finalErpTsp = Math.max(0, finalErpTsp);
    finalMop = Math.max(0, finalMop);
    finalDolomite = Math.max(0, finalDolomite);

    // Build overall status string
    let isHealthy = true;
    if (evalN !== 'Optimal') isHealthy = false;
    if (evalP !== 'Optimal') isHealthy = false;
    if (evalK !== 'Optimal') isHealthy = false;
    if (evalMg !== 'N/A' && evalMg !== 'Optimal') isHealthy = false;

    let healthStatus = isHealthy ? 'Healthy Palm' : 'Fertilizer Required';

    // Build agronomic advice list
    let adviceList: string[] = [
      'Apply fertilizer in a circular trench 1.8m away from the base of the palm.',
      'Divide the annual dosage into two equal applications (Yala and Maha seasons).'
    ];

    if (evalN === 'Deficient') {
      adviceList.push('Apply Urea corrective dose to correct Nitrogen deficiency.');
    }
    if (evalK === 'Deficient') {
      adviceList.push('Bury coconut husks in trenches between rows to help conserve moisture and recycle Potassium.');
    }
    if (evalMg === 'Deficient') {
      adviceList.push('Apply Dolomite (or Kieserite for rapid recovery) to treat Magnesium deficiency.');
    }

    router.push({
      pathname: '/(screens)/soil-result' as any,
      params: {
        treeNo: palmId,
        zoneId: `${zone} Zone`,
        method: 'Laboratory Analysis',
        model: 'CRI Standard Expert Rules',
        soilN: nitrogen,
        soilP: phosphorus,
        soilK: potassium,
        leafN: nitrogen,
        leafP: phosphorus,
        leafK: potassium,
        leafMg: magnesium.trim() || 'N/A',
        status: healthStatus,
        urea: finalUrea.toString(),
        erp: finalErpTsp.toString(),
        mop: finalMop.toString(),
        dolomite: finalDolomite.toString(),
        advice: JSON.stringify(adviceList),
        evalN: `${evalN} (N)`,
        evalP: `${evalP} (P)`,
        evalK: `${evalK} (K)`,
        evalMg: evalMg === 'N/A' ? 'N/A' : `${evalMg} (Mg)`,
      }
    });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1B2C1A" />
        </TouchableOpacity>
        <Text style={styles.title}>Lab Test Entry</Text>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        
        {/* Step Indicator */}
        <View style={styles.stepIndicatorContainer}>
          <View style={styles.stepTextRow}>
            <Text style={styles.stepSubtitle}>STEP {currentStep} OF 2</Text>
            <Text style={styles.stepTitle}>
              {currentStep === 1 ? 'Palm & Sample Details' : 'Leaf Nutrient Levels'}
            </Text>
          </View>
          <View style={styles.stepTrack}>
            <View 
              style={[
                styles.stepProgress, 
                { width: currentStep === 1 ? '50%' : '100%' }
              ]} 
            />
          </View>
        </View>

        {/* ── STEP 1: Palm Details ─────────────────────────────────── */}
        {currentStep === 1 && (
          <View style={styles.formCard}>
            {/* Palm ID */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Palm ID *</Text>
              <View style={[
                styles.inputWrapper,
                activeInput === 'palmId' && styles.inputWrapperFocused
              ]}>
                <Ionicons name="barcode-outline" size={18} color={activeInput === 'palmId' ? '#2E7D32' : '#90A4AE'} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. PLM-102"
                  placeholderTextColor="#90A4AE"
                  value={palmId}
                  onChangeText={setPalmId}
                  onFocus={() => setActiveInput('palmId')}
                  onBlur={() => setActiveInput(null)}
                />
              </View>
            </View>

            {/* Plant Age */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Plant Age (Years) *</Text>
              <View style={[
                styles.inputWrapper,
                activeInput === 'plantAge' && styles.inputWrapperFocused
              ]}>
                <Ionicons name="calendar-outline" size={18} color={activeInput === 'plantAge' ? '#2E7D32' : '#90A4AE'} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 5"
                  placeholderTextColor="#90A4AE"
                  keyboardType="numeric"
                  value={plantAge}
                  onChangeText={setPlantAge}
                  onFocus={() => setActiveInput('plantAge')}
                  onBlur={() => setActiveInput(null)}
                />
              </View>
            </View>

            {/* Zone Selector */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Zone</Text>
              <View style={styles.pillRow}>
                <TouchableOpacity 
                  onPress={() => setZone('Wet')} 
                  style={[styles.pill, zone === 'Wet' && styles.pillActiveWet]}
                >
                  <Text style={[styles.pillText, zone === 'Wet' && styles.pillTextActiveWet]}>Wet</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setZone('Intermediate')} 
                  style={[styles.pill, zone === 'Intermediate' && styles.pillActiveInt]}
                >
                  <Text style={[styles.pillText, zone === 'Intermediate' && styles.pillTextActiveInt]}>Intermediate</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setZone('Dry')} 
                  style={[styles.pill, zone === 'Dry' && styles.pillActiveDry]}
                >
                  <Text style={[styles.pillText, zone === 'Dry' && styles.pillTextActiveDry]}>Dry</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Sample Date */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Sample Date</Text>
              {Platform.OS === 'web' ? (
                <View style={[styles.inputWrapper, activeInput === 'sampleDate' && styles.inputWrapperFocused]}>
                  <Ionicons name="time-outline" size={18} color="#2E7D32" style={styles.inputIcon} />
                  <TextInput
                    {...({ type: 'date' } as any)}
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#90A4AE"
                    value={sampleDate}
                    onChangeText={setSampleDate}
                    onFocus={() => setActiveInput('sampleDate')}
                    onBlur={() => setActiveInput(null)}
                  />
                </View>
              ) : (
                <TouchableOpacity 
                  style={[styles.inputWrapper, showSampleDatePicker && styles.inputWrapperFocused]}
                  onPress={() => setShowSampleDatePicker(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="time-outline" size={18} color="#2E7D32" style={styles.inputIcon} />
                  <Text style={styles.dateText}>{sampleDate}</Text>
                </TouchableOpacity>
              )}

              {Platform.OS !== 'web' && showSampleDatePicker && (
                <DateTimePicker
                  value={new Date(sampleDate)}
                  mode="date"
                  display="default"
                  maximumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    setShowSampleDatePicker(false);
                    if (selectedDate) {
                      setSampleDate(selectedDate.toISOString().split('T')[0]);
                    }
                  }}
                />
              )}
            </View>

            {/* Last Fertilizer Date */}
            <View style={[styles.inputGroup, { marginBottom: 0 }]}>
              <Text style={styles.inputLabel}>Last Fertilizer Application Date *</Text>
              {Platform.OS === 'web' ? (
                <View style={[styles.inputWrapper, activeInput === 'lastFertDate' && styles.inputWrapperFocused]}>
                  <Ionicons name="leaf-outline" size={18} color="#2E7D32" style={styles.inputIcon} />
                  <TextInput
                    {...({ type: 'date' } as any)}
                    style={styles.input}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor="#90A4AE"
                    value={lastFertDate}
                    onChangeText={setLastFertDate}
                    onFocus={() => setActiveInput('lastFertDate')}
                    onBlur={() => setActiveInput(null)}
                  />
                </View>
              ) : (
                <TouchableOpacity 
                  style={[styles.inputWrapper, showLastFertDatePicker && styles.inputWrapperFocused]}
                  onPress={() => setShowLastFertDatePicker(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="leaf-outline" size={18} color="#2E7D32" style={styles.inputIcon} />
                  <Text style={styles.dateText}>{lastFertDate}</Text>
                </TouchableOpacity>
              )}

              {Platform.OS !== 'web' && showLastFertDatePicker && (
                <DateTimePicker
                  value={new Date(lastFertDate)}
                  mode="date"
                  display="default"
                  maximumDate={new Date()}
                  onChange={(event, selectedDate) => {
                    setShowLastFertDatePicker(false);
                    if (selectedDate) {
                      setLastFertDate(selectedDate.toISOString().split('T')[0]);
                    }
                  }}
                />
              )}
            </View>
          </View>
        )}

        {/* ── STEP 2: Nutrient Levels ──────────────────────────────── */}
        {currentStep === 2 && (
          <View style={styles.formCard}>
            {/* Nitrogen Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Nitrogen (N) *</Text>
              <View style={[
                styles.inputWrapper,
                activeInput === 'nitrogen' && styles.inputWrapperFocused
              ]}>
                <Ionicons name="leaf-outline" size={18} color={activeInput === 'nitrogen' ? '#2E7D32' : '#90A4AE'} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 1.95"
                  placeholderTextColor="#90A4AE"
                  keyboardType="numeric"
                  value={nitrogen}
                  onChangeText={setNitrogen}
                  onFocus={() => setActiveInput('nitrogen')}
                  onBlur={() => setActiveInput(null)}
                  autoFocus
                />
                <Text style={styles.unitText}>%</Text>
              </View>
              <Text style={styles.rangeHint}>CRI Optimal Range: 1.90% - 2.10%</Text>
            </View>

            {/* Phosphorus Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Phosphorus (P) *</Text>
              <View style={[
                styles.inputWrapper,
                activeInput === 'phosphorus' && styles.inputWrapperFocused
              ]}>
                <Ionicons name="layers-outline" size={18} color={activeInput === 'phosphorus' ? '#2E7D32' : '#90A4AE'} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 0.12"
                  placeholderTextColor="#90A4AE"
                  keyboardType="numeric"
                  value={phosphorus}
                  onChangeText={setPhosphorus}
                  onFocus={() => setActiveInput('phosphorus')}
                  onBlur={() => setActiveInput(null)}
                />
                <Text style={styles.unitText}>%</Text>
              </View>
              <Text style={styles.rangeHint}>CRI Optimal Range: 0.11% - 0.13%</Text>
            </View>

            {/* Potassium Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Potassium (K) *</Text>
              <View style={[
                styles.inputWrapper,
                activeInput === 'potassium' && styles.inputWrapperFocused
              ]}>
                <Ionicons name="cube-outline" size={18} color={activeInput === 'potassium' ? '#2E7D32' : '#90A4AE'} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 1.35"
                  placeholderTextColor="#90A4AE"
                  keyboardType="numeric"
                  value={potassium}
                  onChangeText={setPotassium}
                  onFocus={() => setActiveInput('potassium')}
                  onBlur={() => setActiveInput(null)}
                />
                <Text style={styles.unitText}>%</Text>
              </View>
              <Text style={styles.rangeHint}>CRI Optimal Range: 1.20% - 1.50%</Text>
            </View>

            {/* Magnesium Input */}
            <View style={[styles.inputGroup, { marginBottom: 0 }]}>
              <Text style={styles.inputLabel}>Magnesium (Mg) (Optional)</Text>
              <View style={[
                styles.inputWrapper,
                activeInput === 'magnesium' && styles.inputWrapperFocused
              ]}>
                <Ionicons name="flash-outline" size={18} color={activeInput === 'magnesium' ? '#2E7D32' : '#90A4AE'} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 0.25 (optional)"
                  placeholderTextColor="#90A4AE"
                  keyboardType="numeric"
                  value={magnesium}
                  onChangeText={setMagnesium}
                  onFocus={() => setActiveInput('magnesium')}
                  onBlur={() => setActiveInput(null)}
                />
                <Text style={styles.unitText}>%</Text>
              </View>
              <Text style={styles.rangeHint}>CRI Optimal Range: 0.20% - 0.35%</Text>
            </View>
          </View>
        )}

        {/* Navigation Buttons */}
        {currentStep === 1 ? (
          <GradientButton
            title="Continue to Step 2"
            onPress={handleNextStep}
            style={styles.submitBtn}
          />
        ) : (
          <View style={styles.navRow}>
            <TouchableOpacity 
              style={styles.backStepBtn} 
              onPress={() => setCurrentStep(1)}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={20} color="#2E7D32" />
              <Text style={styles.backStepText}>Back</Text>
            </TouchableOpacity>

            <View style={{ flex: 1 }}>
              <GradientButton
                title="Recommend Fertilizer"
                onPress={handleCheckResults}
                style={styles.submitBtnNoMargin}
              />
            </View>
          </View>
        )}

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F4',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EAE7DF',
    backgroundColor: '#FFFFFF',
  },
  backBtn: {
    padding: 8,
    marginRight: 8,
    marginLeft: -8,
  },
  title: {
    color: '#1B2C1A',
    fontSize: 20,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  stepIndicatorContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAE7DF',
    padding: 16,
    marginBottom: 16,
  },
  stepTextRow: {
    marginBottom: 10,
  },
  stepSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: '#78909C',
    letterSpacing: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1B2C1A',
    marginTop: 2,
  },
  stepTrack: {
    height: 6,
    backgroundColor: '#ECEFF1',
    borderRadius: 3,
    overflow: 'hidden',
  },
  stepProgress: {
    height: '100%',
    backgroundColor: '#2E7D32',
    borderRadius: 3,
  },
  infoCard: {
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6C9',
    borderWidth: 1,
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  infoCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  infoCardTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B5E20',
  },
  infoCardText: {
    color: '#2E7D32',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAE7DF',
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#37474F',
    fontSize: 12.5,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#ECEFF1',
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  inputWrapperFocused: {
    borderColor: '#2E7D32',
    backgroundColor: '#FFFFFF',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 15,
    color: '#1B2C1A',
    fontWeight: '600',
  },
  dateText: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1B2C1A',
    fontWeight: '600',
  },
  unitText: {
    color: '#78909C',
    fontSize: 13,
    fontWeight: '700',
  },
  rangeHint: {
    color: '#78909C',
    fontSize: 11,
    marginTop: 6,
    paddingLeft: 4,
    fontWeight: '500',
  },
  pillRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 4,
  },
  pill: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ECEFF1',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  pillActiveWet: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  pillActiveInt: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFC107',
  },
  pillActiveDry: {
    backgroundColor: '#FFE0B2',
    borderColor: '#FF9800',
  },
  pillText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#78909C',
  },
  pillTextActiveWet: {
    color: '#2E7D32',
  },
  pillTextActiveInt: {
    color: '#F57F17',
  },
  pillTextActiveDry: {
    color: '#E65100',
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  backStepBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2E7D32',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: '#FFFFFF',
    gap: 6,
  },
  backStepText: {
    color: '#2E7D32',
    fontSize: 15,
    fontWeight: '700',
  },
  submitBtn: {
    borderRadius: 16,
    marginBottom: 20,
  },
  submitBtnNoMargin: {
    borderRadius: 16,
    marginBottom: 0,
  },
});
