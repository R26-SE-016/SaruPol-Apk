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
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1B2C1A" />
        </TouchableOpacity>
        <Text style={styles.title}>CRI Recommendation</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {!criRecommendation ? (
          <View style={styles.whiteCard}>
            <Text style={styles.errorText}>Could not generate recommendation based on provided inputs.</Text>
          </View>
        ) : (
          <View style={styles.whiteCard}>
            <View style={[styles.statusHeader, { backgroundColor: 'rgba(76, 175, 80, 0.15)', marginBottom: 8 }]}>
              <Ionicons name="leaf-outline" size={28} color={COLORS.primary} />
              <Text style={[styles.statusTitle, { color: COLORS.primary }]}>CRI Standard Recommendation</Text>
            </View>
            
            <Text style={styles.bodyText}>
              Based on the {zone ? `${zone} zone` : 'zone'} and palm age/stage provided, here is the standard CRI recommendation per palm per year:
            </Text>
            <View style={styles.divider} />
            
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Urea:</Text>
              <Text style={styles.detailValue}>{criRecommendation.urea} g</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>{criRecommendation.phosphate_type}:</Text>
              <Text style={styles.detailValue}>{criRecommendation.erp_or_tsp} g</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Muriate of Potash (MOP):</Text>
              <Text style={styles.detailValue}>{criRecommendation.mop} g</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Dolomite:</Text>
              <Text style={styles.detailValue}>{criRecommendation.dolomite} g</Text>
            </View>

            <View style={styles.divider} />
            <Text style={[styles.sectionLabel, { color: COLORS.primary }]}>Application Guidelines</Text>
            <Text style={[styles.bodyText, { fontSize: 13, color: '#4B5548', marginBottom: 8 }]}>
              • Apply fertilizer in a circular trench 1.8m away from the base of the palm.
            </Text>
            <Text style={[styles.bodyText, { fontSize: 13, color: '#4B5548', marginBottom: 8 }]}>
              • Divide the annual dosage into two equal applications (Yala and Maha seasons).
            </Text>
            <Text style={[styles.bodyText, { fontSize: 13, color: '#4B5548' }]}>
              • Ensure the soil is moist during application.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
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
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  whiteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAE7DF',
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: ROUNDING.sm,
    marginBottom: 16,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailLabel: {
    color: '#6E7A6B',
    fontSize: 15,
    fontWeight: '600',
  },
  detailValue: {
    color: '#1B2C1A',
    fontSize: 15,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#EAE7DF',
    marginVertical: 16,
  },
  sectionLabel: {
    color: '#6E7A6B',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  bodyText: {
    color: '#1B2C1A',
    fontSize: 15,
    lineHeight: 22,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
});
