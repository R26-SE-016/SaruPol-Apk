import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function SoilDashboard() {
  const router = useRouter();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header Section */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle}>Nutrition Checker</Text>
          <Text style={styles.headerSubtitle}>
            Monitor and manage plant & soil nutrients
          </Text>
        </View>
      </View>

      {/* 7 Parameter Cards Row/Grid (N, P, K, pH, Conductivity, Humidity, Temperature) */}
      <View style={styles.cardsGrid}>
        {/* Nitrogen Card */}
        <MetricCard
          icon="leaf-outline"
          label="Nitrogen"
          value="1.9 - 2.1"
          unit="mg/kg"
          status="Optimal"
          currentVal={2}
          minVal={0}
          maxVal={5}
          targetText="CRI Recommendation range"
        />

        {/* Phosphorus Card */}
        <MetricCard
          icon="layers-outline"
          label="Phosphorus"
          value="0.11 - 0.13"
          unit="mg/kg"
          status="Optimal"
          currentVal={0.12}
          minVal={0}
          maxVal={0.5}
          targetText="CRI Recommendation range"
        />

        {/* Potassium Card */}
        <MetricCard
          icon="cube-outline"
          label="Potassium"
          value="1.2 - 1.5"
          unit="mg/kg"
          status="Optimal"
          currentVal={1.35}
          minVal={0}
          maxVal={3}
          targetText="CRI Recommendation range"
        />

        {/* Soil pH Card */}
        <MetricCard
          icon="flask-outline"
          label="Soil pH"
          value="6.4"
          unit=""
          status="Optimal"
          currentVal={6.4}
          minVal={3}
          maxVal={10}
          targetText="CRI Recommendation range"
        />

        {/* Conductivity Card */}
        <MetricCard
          icon="flash-outline"
          label="Conductivity"
          value="1.2"
          unit="dS/m"
          status="Optimal"
          currentVal={1.2}
          minVal={0}
          maxVal={4}
          targetText="CRI Recommendation range"
        />

        {/* Humidity Card */}
        <MetricCard
          icon="water-outline"
          label="Humidity"
          value="48"
          unit="%"
          status="Optimal"
          currentVal={48}
          minVal={0}
          maxVal={100}
          targetText="CRI Recommendation range"
        />

        {/* Temperature Card */}
        <MetricCard
          icon="thermometer-outline"
          label="Temperature"
          value="24"
          unit="°C"
          status="Optimal"
          currentVal={24}
          minVal={0}
          maxVal={50}
          targetText="CRI Recommendation range"
        />
      </View>

      <Text style={styles.sectionHeader}>1. Live IOT Sensors</Text>
      <View style={styles.sectionContainer}>
        <TouchableOpacity 
          style={styles.nutrientBtn} 
          activeOpacity={0.85}
          onPress={() => router.push('/(screens)/check-new-tree')}
        >
          <View style={styles.nutrientBtnContent}>
            <Ionicons name="hardware-chip-outline" size={24} color="#4A7C3B" />
            <View style={{flex: 1}}>
              <Text style={styles.nutrientBtnTitle}>
                Check live sensor data
              </Text>
              <Text style={styles.nutrientBtnSub}>
                View real-time IoT readings from your plantation
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#717B6E" />
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionHeader}>2. Leaf Nutrient Scan</Text>
      <View style={styles.sectionContainer}>
        <TouchableOpacity 
          style={styles.nutrientBtn} 
          activeOpacity={0.85}
          onPress={() => router.push('/(screens)/nutrient-analysis' as any)}
        >
          <View style={styles.nutrientBtnContent}>
            <Ionicons name="camera-outline" size={24} color="#4A7C3B" />
            <View style={{flex: 1}}>
              <Text style={styles.nutrientBtnTitle}>
                Scan Leaf for Nutrients
              </Text>
              <Text style={styles.nutrientBtnSub}>
                Check for Nitrogen & Boron deficiencies via Leaf Image
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#717B6E" />
          </View>
        </TouchableOpacity>
      </View>

      <Text style={styles.sectionHeader}>3. Lab Test Results</Text>
      <View style={styles.sectionContainer}>
        <TouchableOpacity 
          style={styles.labBtn} 
          activeOpacity={0.85}
          onPress={() => router.push('/(screens)/lab-test-entry' as any)}
        >
          <View style={styles.nutrientBtnContent}>
            <Ionicons name="flask-outline" size={24} color="#005A9C" />
            <View style={{flex: 1}}>
              <Text style={[styles.nutrientBtnTitle, { color: '#003366' }]}>
                Enter Lab Test Results
              </Text>
              <Text style={styles.nutrientBtnSub}>
                Add manual lab test results to check conditions
              </Text>
            </View>
            <Ionicons name="add-circle-outline" size={20} color="#717B6E" />
          </View>
        </TouchableOpacity>
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
  const { width } = useWindowDimensions();
  const isMobile = width < 768;

  const percent = Math.min(
    100,
    Math.max(0, ((currentVal - minVal) / (maxVal - minVal || 1)) * 100)
  );

  const isOptimal = status === 'Optimal';

  return (
    <View style={[styles.metricCard, { width: isMobile ? '47%' : '23%' }]}>
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
  nutrientBtn: {
    backgroundColor: '#F3F8F2',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#D4E8D1',
  },
  nutrientBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nutrientBtnTitle: {
    color: '#1B2C1A',
    fontSize: 16,
    fontWeight: '700',
  },
  nutrientBtnSub: {
    color: '#6E7A6B',
    fontSize: 12,
    marginTop: 4,
  },
  labBtn: {
    backgroundColor: '#E6F0FA',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#CCE0F5',
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1B2C1A',
    marginTop: 10,
    marginBottom: 12,
  },
  sectionContainer: {
    marginBottom: 10,
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
    padding: 12,
    flexGrow: 1,
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
    flexWrap: 'wrap',
    gap: 4,
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
    flexWrap: 'wrap',
    marginBottom: 12,
  },
  metricValueText: {
    fontSize: 22,
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
});
