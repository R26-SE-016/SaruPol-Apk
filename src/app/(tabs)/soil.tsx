import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
  ScrollView,
  useWindowDimensions,
  Animated,
  ImageBackground,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function SoilDashboard() {
  const router = useRouter();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Top Header Section Card */}
      <View style={styles.headerCard}>
        <View style={styles.headerGreenAccent} />
        <View style={styles.headerTextGroup}>
          <Text style={styles.headerTitle}>Nutrition Checker</Text>
          <Text style={styles.headerSubtitle}>
            Monitor and manage plant nutrients
          </Text>
        </View>
      </View>

      {/* Promo Banner Section */}
      <TouchableOpacity
        style={styles.promoBannerContainer}
        activeOpacity={0.95}
      >
        <ImageBackground
          source={require('../../../assets/images/coconut_promo_bg.png')}
          style={styles.promoBannerBackground}
          imageStyle={styles.promoBannerImage}
        >
          <LinearGradient
            colors={['rgba(27, 44, 26, 0.95)', 'rgba(27, 44, 26, 0.55)', 'rgba(0, 0, 0, 0)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.promoBannerOverlay}
          >

          </LinearGradient>
        </ImageBackground>
      </TouchableOpacity>

      {/* 4 Parameter Cards Row/Grid (N, P, K, Magnesium) */}
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

        {/* Magnesium Card */}
        <MetricCard
          icon="nutrition-outline"
          label="Magnesium"
          value="0.20 - 0.35"
          unit="mg/kg"
          status="Optimal"
          currentVal={0.25}
          minVal={0}
          maxVal={1.0}
          targetText="CRI Recommendation range"
        />
      </View>

      <Text style={styles.sectionHeader}>Nutrient Diagnostic Tools</Text>
      <View style={styles.sectionContainer}>

        {/* Tool 1: Leaf Nutrient Scan */}
        <TouchableOpacity
          style={styles.nutrientBtn}
          activeOpacity={0.85}
          onPress={() => router.push('/(screens)/nutrient-analysis' as any)}
        >
          <View style={styles.nutrientBtnContent}>
            <View style={styles.iconCircleGreen}>
              <Ionicons name="camera" size={20} color="#4CAF50" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.nutrientBtnTitle}>
                Leaf Nutrient Scan
              </Text>
              <Text style={styles.nutrientBtnSub}>
                Analyze Leaf images for Nitrogen & Boron deficiencies instantly
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#4CAF50" />
          </View>
        </TouchableOpacity>

        {/* Tool 2: Enter Lab Test Results */}
        <TouchableOpacity
          style={styles.labBtn}
          activeOpacity={0.85}
          onPress={() => router.push('/(screens)/lab-test-entry' as any)}
        >
          <View style={styles.nutrientBtnContent}>
            <View style={styles.iconCircleBlue}>
              <Ionicons name="flask" size={20} color="#005A9C" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.nutrientBtnTitle, { color: '#005A9C' }]}>
                Lab Test Results
              </Text>
              <Text style={styles.nutrientBtnSub}>
                Enter laboratory soil reports to calculate precise corrective plans
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#005A9C" />
          </View>
        </TouchableOpacity>

        {/* Tool 3: Coconut Deficiencies Guide */}
        <TouchableOpacity
          style={styles.deficiencyBtn}
          activeOpacity={0.85}
          onPress={() => router.push('/(screens)/deficiencies' as any)}
        >
          <View style={styles.nutrientBtnContent}>
            <View style={styles.iconCircleOrange}>
              <Ionicons name="book" size={20} color="#FF6D00" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.nutrientBtnTitle, { color: '#FF6D00' }]}>
                Coconut Deficiencies Guide
              </Text>
              <Text style={styles.nutrientBtnSub}>
                Browse visual symptoms and official CRI corrective measures
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#FF6D00" />
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

  const markerAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    // Run entry animations and progress bar slider animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(slideAnim, {
        toValue: 0,
        friction: 7,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(markerAnim, {
        toValue: percent,
        duration: 1200,
        useNativeDriver: false,
      }),
    ]).start();
  }, [percent]);

  const interpolatedLeft = markerAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  const isOptimal = status === 'Optimal';

  return (
    <Animated.View
      style={[
        styles.metricCard,
        {
          width: isMobile ? '48%' : '23%',
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
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
        <Text
          style={[styles.metricValueText, { fontSize: value.length > 9 ? 16 : 20 }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {value}
          {unit ? <Text style={styles.metricUnitText}> {unit}</Text> : null}
        </Text>
      </View>

      {targetText ? (
        <Text style={{ fontSize: 10, color: '#6A7D64', marginTop: -2, marginBottom: 4, fontWeight: '600' }} numberOfLines={1} adjustsFontSizeToFit>
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
        <Animated.View
          style={[
            styles.rangeBarMarker,
            { left: interpolatedLeft },
          ]}
        />
      </View>

      <View style={styles.rangeLabelsRow}>
        <Text style={styles.rangeLabelText}>{minVal}</Text>
        <Text style={styles.rangeLabelText}>{maxVal}</Text>
      </View>
    </Animated.View>
  );
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F4',
  },
  content: {
    paddingTop: Platform.OS === 'ios' ? 56 : 28,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  headerCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAE7DF',
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    overflow: 'hidden',
    position: 'relative',
  },
  headerGreenAccent: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 6,
    backgroundColor: '#2E7D32',
  },
  headerTextGroup: {
    paddingLeft: 8,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#1B2C1A',
    marginBottom: 3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6E7A6B',
    fontWeight: '600',
  },
  nutrientBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EAE7DF',
    borderLeftWidth: 6,
    borderLeftColor: '#4CAF50',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  nutrientBtnContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  nutrientBtnTitle: {
    color: '#1B2C1A',
    fontSize: 15,
    fontWeight: '800',
  },
  nutrientBtnSub: {
    color: '#78909C',
    fontSize: 11.5,
    marginTop: 4,
    fontWeight: '500',
    lineHeight: 16,
  },
  iconCircleGreen: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleBlue: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleOrange: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFE0B2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  labBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EAE7DF',
    borderLeftWidth: 6,
    borderLeftColor: '#005A9C',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  deficiencyBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#EAE7DF',
    borderLeftWidth: 6,
    borderLeftColor: '#FF6D00',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '800',
    color: '#78909C',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginTop: 20,
    marginBottom: 14,
    paddingLeft: 4,
  },
  sectionContainer: {
    marginBottom: 10,
  },
  cardsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#EAE7DF',
    padding: 12,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
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
    gap: 4,
  },
  metricLabel: {
    fontSize: 12,
    color: '#546E7A',
    fontWeight: '700',
  },
  statusBadge: {
    backgroundColor: '#E8F5E9',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 8,
  },
  statusBadgeText: {
    color: '#2E7D32',
    fontSize: 9.5,
    fontWeight: '800',
  },
  statusBadgeWarning: {
    backgroundColor: '#FFE0B2',
  },
  statusBadgeTextWarning: {
    color: '#E65100',
  },
  metricValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 10,
  },
  metricValueText: {
    fontWeight: '800',
    color: '#1B2C1A',
  },
  metricUnitText: {
    fontSize: 11.5,
    color: '#78909C',
    fontWeight: '700',
  },
  rangeBarTrack: {
    width: '100%',
    height: 6,
    backgroundColor: '#ECEFF1',
    borderRadius: 3,
    position: 'relative',
    marginBottom: 8,
  },
  rangeBarOptimalBand: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    backgroundColor: '#C8E6C9',
  },
  rangeBarMarker: {
    position: 'absolute',
    top: -2,
    width: 10,
    height: 10,
    backgroundColor: '#2E7D32',
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  rangeLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rangeLabelText: {
    fontSize: 10,
    color: '#90A4AE',
    fontWeight: '700',
  },
  promoBannerContainer: {
    height: 120,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EAE7DF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  promoBannerBackground: {
    width: '100%',
    height: '100%',
  },
  promoBannerImage: {
    resizeMode: 'cover',
  },
  promoBannerOverlay: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  promoTextContainer: {
    maxWidth: '70%',
  },
  promoTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#FF6D00',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginBottom: 6,
  },
  promoTagText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
  },
  promoTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 20,
  },
  promoSub: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 10,
    marginTop: 4,
    fontWeight: '600',
  },
});
