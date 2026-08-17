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

          <SoilMapCanvas />
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
