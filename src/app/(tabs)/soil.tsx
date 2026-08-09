import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SoilMapCanvas, { ZoneNode } from '../../components/SoilMapCanvas';

const INITIAL_ZONES: ZoneNode[] = [
  {
    id: 'A',
    label: 'A',
    title: 'Zone A · North Bed',
    treeNo: 30,
    soilN: 0.0159,
    leafN: 1.1544,
    lat: '7.32041° N',
    lon: '79.98210° E',
    n: 55,
    p: 32,
    k: 180,
    ph: 6.4,
    ec: 1.2,
    humidity: 48,
    temp: 24,
    status: 'Optimal',
    position: { top: '62%', left: '20%' },
  },
  {
    id: 'B',
    label: 'B',
    title: 'Zone B · East Bed',
    treeNo: 49,
    soilN: 0.0335,
    leafN: 1.5392,
    lat: '7.32035° N',
    lon: '79.98245° E',
    n: 62,
    p: 38,
    k: 195,
    ph: 6.6,
    ec: 1.4,
    humidity: 52,
    temp: 25,
    status: 'Optimal',
    position: { top: '35%', left: '68%' },
  },
  {
    id: 'C',
    label: 'C',
    title: 'Zone C · Centre',
    treeNo: 64,
    soilN: 0.0218,
    leafN: 2.4293,
    lat: '7.32021° N',
    lon: '79.98230° E',
    n: 48,
    p: 28,
    k: 165,
    ph: 6.2,
    ec: 1.1,
    humidity: 45,
    temp: 24.5,
    status: 'Optimal',
    position: { top: '78%', left: '42%' },
  },
  {
    id: 'D',
    label: 'D',
    title: 'Zone D · South Bed',
    treeNo: 148,
    soilN: 0.0371,
    leafN: 2.3569,
    lat: '7.32010° N',
    lon: '79.98215° E',
    n: 58,
    p: 34,
    k: 185,
    ph: 6.5,
    ec: 1.3,
    humidity: 50,
    temp: 23.8,
    status: 'Optimal',
    position: { top: '25%', left: '38%' },
  },
  {
    id: 'E',
    label: 'E',
    title: 'Zone E · West Bed',
    treeNo: 209,
    soilN: 0.0265,
    leafN: 2.0483,
    lat: '7.32025° N',
    lon: '79.98195° E',
    n: 52,
    p: 30,
    k: 175,
    ph: 6.3,
    ec: 1.2,
    humidity: 47,
    temp: 24.2,
    status: 'Optimal',
    position: { top: '50%', left: '80%' },
  },
];

export default function SoilDashboard() {
  const router = useRouter();
  const [zones, setZones] = useState<ZoneNode[]>(INITIAL_ZONES);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('A');

  const selectedZone = zones.find((z) => z.id === selectedZoneId) || zones[0];

  const handleZoneSelect = (zone: ZoneNode) => {
    setSelectedZoneId(zone.id);
  };

  // Dynamically update selected zone NPK values when sliders change so cards & bars change instantly
  const updateSelectedNutrient = (key: 'n' | 'p' | 'k', newValue: number) => {
    setZones((prev) =>
      prev.map((zone) =>
        zone.id === selectedZone.id ? { ...zone, [key]: newValue } : zone
      )
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header Section */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>Field Sense</Text>
          <Text style={styles.headerSubtitle}>
            Soil monitoring · live sensor overview
          </Text>
        </View>

        <TouchableOpacity
          style={styles.actionButton}
          activeOpacity={0.85}
          onPress={() => router.push('/(screens)/check-new-tree')}
        >
          <Text style={styles.actionButtonText}>Check your estate soil</Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* 7 Parameter Cards Row/Grid (N, P, K, pH, Conductivity, Humidity, Temperature) */}
      <View style={styles.cardsGrid}>
        {/* Nitrogen Card */}
        <MetricCard
          icon="leaf-outline"
          label="Nitrogen"
          value={selectedZone.n.toString()}
          unit="mg/kg"
          status={selectedZone.n >= 40 && selectedZone.n <= 80 ? 'Optimal' : 'Adjust'}
          currentVal={selectedZone.n}
          minVal={0}
          maxVal={150}
          targetText="CRI Target: 40~80"
        />

        {/* Phosphorus Card */}
        <MetricCard
          icon="layers-outline"
          label="Phosphorus"
          value={selectedZone.p.toString()}
          unit="mg/kg"
          status={selectedZone.p >= 20 && selectedZone.p <= 50 ? 'Optimal' : 'Adjust'}
          currentVal={selectedZone.p}
          minVal={0}
          maxVal={100}
          targetText="CRI Target: 20~50"
        />

        {/* Potassium Card */}
        <MetricCard
          icon="cube-outline"
          label="Potassium"
          value={selectedZone.k.toString()}
          unit="mg/kg"
          status={selectedZone.k >= 120 && selectedZone.k <= 250 ? 'Optimal' : 'Adjust'}
          currentVal={selectedZone.k}
          minVal={0}
          maxVal={300}
          targetText="CRI Target: 120~250"
        />

        {/* Soil pH Card */}
        <MetricCard
          icon="flask-outline"
          label="Soil pH"
          value={selectedZone.ph.toFixed(1)}
          unit=""
          status={selectedZone.ph >= 5.5 && selectedZone.ph <= 7.5 ? 'Optimal' : 'Adjust'}
          currentVal={selectedZone.ph}
          minVal={3}
          maxVal={10}
          targetText="Optimal: 5.5~7.5"
        />

        {/* Conductivity Card */}
        <MetricCard
          icon="flash-outline"
          label="Conductivity"
          value={selectedZone.ec.toFixed(1)}
          unit="dS/m"
          status={selectedZone.ec >= 0.8 && selectedZone.ec <= 1.5 ? 'Optimal' : 'Adjust'}
          currentVal={selectedZone.ec}
          minVal={0}
          maxVal={4}
          targetText="Optimal: 0.8~1.5"
        />

        {/* Humidity Card */}
        <MetricCard
          icon="water-outline"
          label="Humidity"
          value={selectedZone.humidity.toString()}
          unit="%"
          status={selectedZone.humidity >= 40 && selectedZone.humidity <= 60 ? 'Optimal' : 'Adjust'}
          currentVal={selectedZone.humidity}
          minVal={0}
          maxVal={100}
          targetText="Optimal: 40~60%"
        />

        {/* Temperature Card */}
        <MetricCard
          icon="thermometer-outline"
          label="Temperature"
          value={selectedZone.temp.toString()}
          unit="°C"
          status={selectedZone.temp >= 22 && selectedZone.temp <= 28 ? 'Optimal' : 'Adjust'}
          currentVal={selectedZone.temp}
          minVal={0}
          maxVal={50}
          targetText="Optimal: 22~28°C"
        />
      </View>

      {/* Bottom Layout: Field Map & NPK Levels Panel */}
      <View style={styles.bottomSection}>
        {/* Left Card: Field Map (Rathmalagata Estate GIS Map) */}
        <View style={styles.mapCard}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardHeaderTitleGroup}>
              <Ionicons name="location-outline" size={18} color="#2F5826" />
              <Text style={styles.cardTitle}>Field map · Makadura Estate</Text>
            </View>
            <Text style={styles.cardSubtitle}>Satellite & Coconut Tree Layer</Text>
          </View>

          <SoilMapCanvas
            zones={zones}
            selectedZone={selectedZone}
            onSelectZone={handleZoneSelect}
          />
        </View>

        {/* Right Card: NPK Levels & Interactive Sliders */}
        <View style={styles.npkCard}>
          <View style={styles.cardHeaderRow}>
            <Text style={styles.cardTitle}>NPK levels</Text>
            <Text style={styles.cardSubtitle}>adjust to simulate & update cards</Text>
          </View>

          {/* 3 Vertical Bars for N, P, K dynamically linked to selectedZone */}
          <View style={styles.verticalBarsContainer}>
            <VerticalBarItem
              label="Nitrogen"
              icon="leaf-outline"
              value={selectedZone.n}
              max={150}
              targetText="CRI target 40~80"
              barColor="#5C9E43"
            />
            <VerticalBarItem
              label="Phosphorus"
              icon="layers-outline"
              value={selectedZone.p}
              max={100}
              targetText="CRI target 20~50"
              barColor="#1D6F8A"
            />
            <VerticalBarItem
              label="Potassium"
              icon="cube-outline"
              value={selectedZone.k}
              max={300}
              targetText="CRI target 120~250"
              barColor="#8C6324"
            />
          </View>

          {/* Interactive Sliders linking directly to NPK levels */}
          <View style={styles.targetSlidersContainer}>
            <SafeRangeSlider
              label="Nitrogen (N)"
              val={selectedZone.n}
              setVal={(v) => updateSelectedNutrient('n', v)}
              min={10}
              max={140}
              step={2}
              color="#5C9E43"
            />
            <SafeRangeSlider
              label="Phosphorus (P)"
              val={selectedZone.p}
              setVal={(v) => updateSelectedNutrient('p', v)}
              min={5}
              max={90}
              step={2}
              color="#1D6F8A"
            />
            <SafeRangeSlider
              label="Potassium (K)"
              val={selectedZone.k}
              setVal={(v) => updateSelectedNutrient('k', v)}
              min={30}
              max={280}
              step={5}
              color="#8C6324"
            />
          </View>
        </View>
      </View>
    </ScrollView>
  );
}

/* --- Metric Card Component (Top Row Cards) --- */
function MetricCard({
  icon,
  label,
  value,
  unit,
  status,
  currentVal,
  minVal,
  maxVal,
  targetText,
}: {
  icon: any;
  label: string;
  value: string;
  unit: string;
  status: string;
  currentVal: number;
  minVal: number;
  maxVal: number;
  targetText?: string;
}) {
  const percent = Math.min(
    100,
    Math.max(0, ((currentVal - minVal) / (maxVal - minVal || 1)) * 100)
  );

  const isOptimal = status === 'Optimal';

  return (
    <View style={styles.metricCard}>
      <View style={styles.metricHeaderRow}>
        <View style={styles.metricTitleGroup}>
          <Ionicons name={icon} size={15} color="#5C6C57" />
          <Text style={styles.metricLabel}>{label}</Text>
        </View>
        <View style={[styles.statusBadge, !isOptimal && styles.statusBadgeWarning]}>
          <Text style={[styles.statusBadgeText, !isOptimal && styles.statusBadgeTextWarning]}>
            {status}
          </Text>
        </View>
      </View>

      <View style={styles.metricValueRow}>
        <Text style={styles.metricValueText}>{value}</Text>
        {unit ? <Text style={styles.metricUnitText}> {unit}</Text> : null}
      </View>

      {targetText ? (
        <Text style={{ fontSize: 11, color: '#6A7D64', marginTop: -2, marginBottom: 4, fontWeight: '600' }}>
          {targetText}
        </Text>
      ) : null}

      <View style={styles.rangeBarTrack}>
        <View
          style={[
            styles.rangeBarOptimalBand,
            { left: '22%', width: '42%' },
          ]}
        />
        <View
          style={[
            styles.rangeBarMarker,
            { left: `${percent}%` },
          ]}
        />
      </View>

      <View style={styles.rangeLabelsRow}>
        <Text style={styles.rangeLabelText}>{minVal}</Text>
        <Text style={styles.rangeLabelText}>{maxVal}</Text>
      </View>
    </View>
  );
}

/* --- Vertical Bar Item Component (NPK Levels Panel) --- */
function VerticalBarItem({
  label,
  icon,
  value,
  max,
  targetText,
  barColor,
}: {
  label: string;
  icon: any;
  value: number;
  max: number;
  targetText: string;
  barColor: string;
}) {
  const heightPercent = Math.min(100, Math.max(15, (value / max) * 100));

  return (
    <View style={styles.verticalBarCol}>
      <View style={styles.verticalBarHeader}>
        <Ionicons name={icon} size={14} color="#5A6D56" />
        <Text style={styles.verticalBarLabel}>{label}</Text>
      </View>

      <View style={styles.verticalBarTrack}>
        <View
          style={[
            styles.verticalBarFill,
            { height: `${heightPercent}%`, backgroundColor: barColor },
          ]}
        />
      </View>

      <Text style={styles.verticalBarValue}>{value}</Text>
      <Text style={styles.verticalBarTarget}>{targetText}</Text>
    </View>
  );
}

/* --- Safe Cross-Platform Interactive Slider --- */
function SafeRangeSlider({
  label,
  val,
  setVal,
  min,
  max,
  step = 5,
  color,
}: {
  label: string;
  val: number;
  setVal: (v: number) => void;
  min: number;
  max: number;
  step?: number;
  color: string;
}) {
  const progressPercent = Math.min(
    100,
    Math.max(0, ((val - min) / (max - min || 1)) * 100)
  );

  const stepDown = () => {
    setVal(Math.max(min, val - step));
  };

  const stepUp = () => {
    setVal(Math.min(max, val + step));
  };

  return (
    <View style={styles.sliderContainer}>
      <View style={styles.sliderLabelRow}>
        <Text style={styles.sliderLabelText}>{label}</Text>
        <Text style={styles.sliderValText}>{val}</Text>
      </View>

      <View style={styles.safeSliderRow}>
        <TouchableOpacity
          style={styles.sliderButton}
          onPress={stepDown}
          activeOpacity={0.7}
        >
          <Text style={styles.sliderButtonText}>-</Text>
        </TouchableOpacity>

        <View style={styles.safeSliderTrack}>
          <View
            style={[
              styles.safeSliderFill,
              { width: `${progressPercent}%`, backgroundColor: color },
            ]}
          />
          <View
            style={[
              styles.safeSliderThumb,
              { left: `${progressPercent}%`, borderColor: color },
            ]}
          />
        </View>

        <TouchableOpacity
          style={styles.sliderButton}
          onPress={stepUp}
          activeOpacity={0.7}
        >
          <Text style={styles.sliderButtonText}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF8',
  },
  content: {
    paddingTop: Platform.OS === 'ios' ? 56 : 28,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    flexWrap: 'wrap',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#1B2C1A',
    marginBottom: 3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6E7A6B',
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4A7C3B',
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 24,
    gap: 8,
    shadowColor: '#2F5826',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  zonePillsContainer: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
    paddingBottom: 4,
  },
  zonePill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F3F2EB',
    borderWidth: 1,
    borderColor: '#E6E4DC',
  },
  zonePillActive: {
    backgroundColor: '#EBF3E8',
    borderColor: '#82A878',
  },
  zonePillText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5C6A58',
  },
  zonePillTextActive: {
    color: '#2B5722',
    fontWeight: '700',
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAE7DF',
    padding: 14,
    minWidth: 150,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  metricHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  metricTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricLabel: {
    fontSize: 13,
    color: '#4B5548',
    fontWeight: '600',
  },
  statusBadge: {
    backgroundColor: '#EAF5EA',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusBadgeText: {
    color: '#2E7D32',
    fontSize: 11,
    fontWeight: '700',
  },
  statusBadgeWarning: {
    backgroundColor: '#FFF4E5',
  },
  statusBadgeTextWarning: {
    color: '#B76E00',
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  metricValueText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1B2C1A',
  },
  metricUnitText: {
    fontSize: 13,
    color: '#717B6E',
    fontWeight: '600',
  },
  rangeBarTrack: {
    width: '100%',
    height: 10,
    backgroundColor: '#F3EFEA',
    borderRadius: 5,
    position: 'relative',
    marginBottom: 6,
    overflow: 'hidden',
  },
  rangeBarOptimalBand: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#D4E8D1',
  },
  rangeBarMarker: {
    position: 'absolute',
    top: 1,
    width: 6,
    height: 8,
    backgroundColor: '#2F5826',
    borderRadius: 3,
  },
  rangeLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rangeLabelText: {
    fontSize: 11,
    color: '#8D968A',
    fontWeight: '600',
  },
  bottomSection: {
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    flexWrap: 'wrap',
    gap: 16,
  },
  mapCard: {
    flex: 1.3,
    minWidth: 290,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAE7DF',
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  npkCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAE7DF',
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
    justifyContent: 'space-between',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardHeaderTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1B2C1A',
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#717B6E',
    fontWeight: '500',
  },
  verticalBarsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 190,
    paddingVertical: 10,
  },
  verticalBarCol: {
    alignItems: 'center',
    flex: 1,
  },
  verticalBarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  verticalBarLabel: {
    fontSize: 12,
    color: '#5C6C57',
    fontWeight: '600',
  },
  verticalBarTrack: {
    width: 38,
    height: 110,
    backgroundColor: '#F3EFEA',
    borderRadius: 10,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E7E3DC',
    marginBottom: 8,
  },
  verticalBarFill: {
    width: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
  },
  verticalBarValue: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B2C1A',
  },
  verticalBarTarget: {
    fontSize: 11,
    color: '#7A8477',
    marginTop: 2,
  },
  targetSlidersContainer: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#F0EEE8',
    paddingTop: 12,
    gap: 12,
  },
  sliderContainer: {
    width: '100%',
  },
  sliderLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sliderLabelText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#3A4B38',
  },
  sliderValText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#2E5A27',
  },
  safeSliderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sliderButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F0EEE8',
    borderWidth: 1,
    borderColor: '#E4DFD5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sliderButtonText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#3A4B38',
  },
  safeSliderTrack: {
    flex: 1,
    height: 8,
    backgroundColor: '#F3EFEA',
    borderRadius: 4,
    position: 'relative',
  },
  safeSliderFill: {
    height: '100%',
    borderRadius: 4,
  },
  safeSliderThumb: {
    position: 'absolute',
    top: -4,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 3,
    transform: [{ translateX: -8 }],
  },
});
