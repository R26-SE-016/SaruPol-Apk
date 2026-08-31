import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, ROUNDING } from '../../constants/theme';
import { getStandardRecommendation } from '../../services/fertilizerTables';

export default function CriRecommendationScreen() {
  const router = useRouter();
  const { palmAge, palmStage, zone } = useLocalSearchParams<{ 
    palmAge?: string;
    palmStage?: string;
    zone?: string;
  }>();
  
  const criRecommendation = getStandardRecommendation(palmAge || '', palmStage || '', zone || '');

  return (
    <View style={styles.container}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1B2C1A" />
        </TouchableOpacity>
        <Text style={styles.title}>CRI Recommendation</Text>
        <TouchableOpacity 
          style={{ padding: 8, marginLeft: 'auto' }} 
          onPress={() => router.replace('/(tabs)/soil')}
          activeOpacity={0.7}
        >
          <Ionicons name="home-outline" size={22} color="#2E7D32" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Parameter Summary Chips */}
        <View style={styles.chipsRow}>
          {palmAge ? (
            <View style={styles.summaryChip}>
              <Ionicons name="calendar-outline" size={14} color="#2E7D32" />
              <Text style={styles.summaryChipText}>{palmAge} Years Old</Text>
            </View>
          ) : null}
          {palmStage ? (
            <View style={styles.summaryChip}>
              <Ionicons name="flower-outline" size={14} color="#2E7D32" />
              <Text style={styles.summaryChipText}>{palmStage}</Text>
            </View>
          ) : null}
          {zone ? (
            <View style={styles.summaryChip}>
              <Ionicons name="location-outline" size={14} color="#2E7D32" />
              <Text style={styles.summaryChipText}>{zone} Zone</Text>
            </View>
          ) : null}
        </View>

        {!criRecommendation ? (
          <View style={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={32} color="#D32F2F" />
            <Text style={styles.errorText}>Could not generate standard recommendation based on the inputs provided.</Text>
          </View>
        ) : (
          <View>
            <View style={styles.introCard}>
              <Ionicons name="information-circle" size={20} color="#2E7D32" style={{ marginRight: 8 }} />
              <Text style={styles.introText}>
                The Coconut Research Institute (CRI) recommends the following annual fertilizer dosage per palm:
              </Text>
            </View>

            {/* ── Fertilizer Cards List ──────────────────────────────── */}
            <Text style={styles.sectionHeader}>Required Nutrient Dosage</Text>
            
            {/* 1. Urea Card */}
            <View style={styles.fertilizerCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.badgeCircle, { backgroundColor: '#E8F5E9' }]}>
                  <Text style={[styles.badgeText, { color: '#2E7D32' }]}>N</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fertilizerName}>Urea</Text>
                  <Text style={styles.fertilizerSource}>Nitrogen Source</Text>
                </View>
                <Text style={styles.dosageValue}>{criRecommendation.urea} <Text style={styles.dosageUnit}>g</Text></Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressBar, { width: `${Math.min(100, (criRecommendation.urea / 1600) * 100)}%`, backgroundColor: '#4CAF50' }]} />
              </View>
            </View>

            {/* 2. ERP/TSP Card */}
            <View style={styles.fertilizerCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.badgeCircle, { backgroundColor: '#E3F2FD' }]}>
                  <Text style={[styles.badgeText, { color: '#005A9C' }]}>P</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fertilizerName}>{criRecommendation.phosphate_type}</Text>
                  <Text style={styles.fertilizerSource}>Phosphorus Source</Text>
                </View>
                <Text style={styles.dosageValue}>{criRecommendation.erp_or_tsp} <Text style={styles.dosageUnit}>g</Text></Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressBar, { width: `${Math.min(100, (criRecommendation.erp_or_tsp / 1600) * 100)}%`, backgroundColor: '#2196F3' }]} />
              </View>
            </View>

            {/* 3. MOP Card */}
            <View style={styles.fertilizerCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.badgeCircle, { backgroundColor: '#FFF8E1' }]}>
                  <Text style={[styles.badgeText, { color: '#F57F17' }]}>K</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fertilizerName}>Muriate of Potash (MOP)</Text>
                  <Text style={styles.fertilizerSource}>Potassium Source</Text>
                </View>
                <Text style={styles.dosageValue}>{criRecommendation.mop} <Text style={styles.dosageUnit}>g</Text></Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressBar, { width: `${Math.min(100, (criRecommendation.mop / 2000) * 100)}%`, backgroundColor: '#FFC107' }]} />
              </View>
            </View>

            {/* 4. Dolomite Card */}
            <View style={styles.fertilizerCard}>
              <View style={styles.cardHeader}>
                <View style={[styles.badgeCircle, { backgroundColor: '#FFEBEE' }]}>
                  <Text style={[styles.badgeText, { color: '#C62828' }]}>Mg</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fertilizerName}>Dolomite</Text>
                  <Text style={styles.fertilizerSource}>Magnesium & Calcium Source</Text>
                </View>
                <Text style={styles.dosageValue}>{criRecommendation.dolomite} <Text style={styles.dosageUnit}>g</Text></Text>
              </View>
              <View style={styles.progressTrack}>
                <View style={[styles.progressBar, { width: `${Math.min(100, (criRecommendation.dolomite / 1200) * 100)}%`, backgroundColor: '#F44336' }]} />
              </View>
            </View>

            {/* ── Guidelines Section ─────────────────────────────────── */}
            <Text style={[styles.sectionHeader, { marginTop: 24 }]}>Application Guidelines</Text>
            
            <View style={styles.guidelineCard}>
              <View style={styles.guidelineRow}>
                <View style={styles.iconContainer}>
                  <Ionicons name="radio-button-off" size={18} color="#2E7D32" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.guidelineTitle}>Circular Trenching</Text>
                  <Text style={styles.guidelineText}>
                    Apply the fertilizer mixture in a circular trench dug 1.8 meters (6 feet) away from the base of the palm.
                  </Text>
                </View>
              </View>

              <View style={styles.guidelineRow}>
                <View style={styles.iconContainer}>
                  <Ionicons name="calendar-outline" size={18} color="#2E7D32" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.guidelineTitle}>Split Application</Text>
                  <Text style={styles.guidelineText}>
                    Divide the annual dosage into two equal applications: one during the Yala season and the other during the Maha season.
                  </Text>
                </View>
              </View>

              <View style={[styles.guidelineRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                <View style={styles.iconContainer}>
                  <Ionicons name="water-outline" size={18} color="#2E7D32" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.guidelineTitle}>Soil Moisture</Text>
                  <Text style={styles.guidelineText}>
                    Ensure there is adequate moisture in the soil during application to facilitate optimal absorption by the roots.
                  </Text>
                </View>
              </View>
            </View>

            {/* Go to Dashboard Action Button */}
            <TouchableOpacity
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                backgroundColor: '#2E7D32',
                paddingVertical: 14,
                borderRadius: 14,
                marginTop: 24,
                marginBottom: 12,
                shadowColor: '#2E7D32',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.2,
                shadowRadius: 6,
                elevation: 3,
              }}
              onPress={() => router.replace('/(tabs)/soil')}
              activeOpacity={0.85}
            >
              <Ionicons name="home" size={20} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', fontSize: 16, fontWeight: '700' }}>
                Go to Dashboard
              </Text>
            </TouchableOpacity>
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
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  summaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#E8F5E9',
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#C8E6C9',
  },
  summaryChipText: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#2E7D32',
  },
  introCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAE7DF',
    padding: 14,
    marginBottom: 20,
    alignItems: 'center',
  },
  introText: {
    flex: 1,
    fontSize: 13,
    color: '#5C6E58',
    fontWeight: '600',
    lineHeight: 18,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#78909C',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
    marginBottom: 12,
    paddingLeft: 4,
  },
  fertilizerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EAE7DF',
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  badgeCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontSize: 14.5,
    fontWeight: '800',
  },
  fertilizerName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B2C1A',
  },
  fertilizerSource: {
    fontSize: 11.5,
    color: '#78909C',
    fontWeight: '600',
    marginTop: 1,
  },
  dosageValue: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1B2C1A',
  },
  dosageUnit: {
    fontSize: 13,
    color: '#78909C',
    fontWeight: '700',
  },
  progressTrack: {
    height: 6,
    backgroundColor: '#ECEFF1',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  guidelineCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EAE7DF',
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 5,
    elevation: 1,
  },
  guidelineRow: {
    flexDirection: 'row',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
    paddingBottom: 14,
    marginBottom: 14,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  guidelineTitle: {
    fontSize: 14.5,
    fontWeight: '800',
    color: '#1B2C1A',
    marginBottom: 4,
  },
  guidelineText: {
    fontSize: 13,
    color: '#546E7A',
    lineHeight: 18,
    fontWeight: '500',
  },
  errorCard: {
    backgroundColor: '#FFEBEE',
    borderColor: '#FFCDD2',
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    gap: 12,
    textAlign: 'center',
  },
  errorText: {
    color: '#C62828',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    lineHeight: 20,
  },
});
