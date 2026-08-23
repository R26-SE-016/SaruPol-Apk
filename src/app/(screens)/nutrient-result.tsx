import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, ROUNDING } from '../../constants/theme';
import GradientButton from '../../components/common/GradientButton';
import { NutrientAnalysisResponse } from '../../services/nutrientService';
import { getStandardRecommendation } from '../../services/fertilizerTables';

export default function NutrientResultScreen() {
  const router = useRouter();
  const { data, imageUri, palmAge, palmStage, zone } = useLocalSearchParams<{ 
    data: string; 
    imageUri: string;
    palmAge?: string;
    palmStage?: string;
    zone?: string;
  }>();
  
  const criRecommendation = getStandardRecommendation(palmAge || '', palmStage || '', zone || '');
  
  let result: NutrientAnalysisResponse | null = null;
  
  try {
    if (data) {
      result = JSON.parse(data);
    }
  } catch (error) {
    console.error("Failed to parse analysis result:", error);
  }

  if (!result) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>Error</Text>
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load result data.</Text>
          <GradientButton title="Go Back" onPress={() => router.back()} style={{marginTop: 20}} />
        </View>
      </View>
    );
  }

  const { status, message, prediction, recommendation } = result;

  const renderContent = () => {
    // 1. UNCERTAIN
    if (status === 'uncertain' || !prediction) {
      return (
      <View style={styles.whiteCard}>
          <View style={[styles.statusHeader, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
            <Ionicons name="warning-outline" size={28} color="#ef4444" />
            <Text style={[styles.statusTitle, { color: '#ef4444' }]}>Unable to determine nutrient deficiency confidently.</Text>
          </View>
          <Text style={styles.bodyText}>
            {message || "The leaf image could not be classified confidently."}
          </Text>
          <View style={styles.divider} />
          <Text style={styles.disclaimerText}>
            Laboratory/leaf analysis is recommended for confirmation.
          </Text>
        </View>
      );
    }

    // 2. HEALTHY
    if (prediction.class === 'Healthy') {
      return (
      <View style={styles.whiteCard}>
          <View style={[styles.statusHeader, { backgroundColor: 'rgba(34, 197, 94, 0.15)' }]}>
            <Ionicons name="checkmark-circle-outline" size={28} color="#22c55e" />
            <Text style={[styles.statusTitle, { color: '#22c55e' }]}>Healthy Leaf</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Confidence:</Text>
            <Text style={styles.detailValue}>{Math.round(prediction.confidence * 100)}%</Text>
          </View>
          
          <View style={styles.divider} />
          <Text style={styles.bodyText}>
            No nutrient deficiency was detected by the image model.
          </Text>
        </View>
      );
    }

    // 3. DEFICIENCY (Boron, Nitrogen, etc.)
    return (
      <View>
        <View style={styles.whiteCard}>
          <View style={[styles.statusHeader, { backgroundColor: 'rgba(234, 179, 8, 0.15)' }]}>
            <Ionicons name="alert-circle-outline" size={28} color="#eab308" />
            <Text style={[styles.statusTitle, { color: '#eab308' }]}>Deficiency Detected</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Nutrient:</Text>
            <Text style={styles.detailValueHighlight}>{prediction.nutrient}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Confidence:</Text>
            <Text style={styles.detailValue}>{Math.round(prediction.confidence * 100)}%</Text>
          </View>

          {recommendation && (
            <>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Assessment:</Text>
                <Text style={styles.detailValue}>
                  {recommendation.assessment_type === 'preliminary_visual_assessment' 
                    ? 'Preliminary Visual Assessment' 
                    : recommendation.assessment_type}
                </Text>
              </View>

              <View style={styles.divider} />
              
              <Text style={styles.sectionLabel}>Recommendation</Text>
              <Text style={styles.bodyText}>{recommendation.advice}</Text>
            </>
          )}
        </View>

        {/* Disclaimer for Deficiencies */}
        <View style={styles.disclaimerBox}>
          <Ionicons name="information-circle-outline" size={20} color="#82A878" />
          <Text style={styles.disclaimerText}>
            Image-based nutrient assessment is preliminary. Laboratory/leaf analysis is recommended for confirmation before applying a fertilizer treatment.
          </Text>
        </View>

        {criRecommendation && (
          <TouchableOpacity 
            style={[styles.whiteCard, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16 }]}
            onPress={() => router.push({
              pathname: '/(screens)/cri-recommendation' as any,
              params: { palmAge, palmStage, zone }
            })}
          >
            <Ionicons name="leaf" size={20} color={COLORS.primary} />
            <Text style={{color: COLORS.primary, fontWeight: '700', fontSize: 16}}>See CRI Recommendation</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1B2C1A" />
        </TouchableOpacity>
        <Text style={styles.title}>Nutrient Analysis Result</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {imageUri && (
          <View style={styles.imageWrapper}>
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
          </View>
        )}

        {renderContent()}

        <TouchableOpacity 
          style={[styles.whiteCard, { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 16, marginTop: 10, marginBottom: 10, borderColor: COLORS.primary }]}
          onPress={() => router.navigate({ pathname: '/(screens)/nutrient-analysis' as any, params: { reset: 'true' } })}
        >
          <Ionicons name="camera-outline" size={20} color={COLORS.primary} />
          <Text style={{color: COLORS.primary, fontWeight: '700', fontSize: 16}}>Analyze Another Image</Text>
        </TouchableOpacity>

        <GradientButton 
          title="Done" 
          onPress={() => router.navigate('/(tabs)/soil')} 
          style={styles.doneBtn} 
        />
        
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
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    color: '#ef4444',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  imageWrapper: {
    width: '100%',
    height: 200,
    borderRadius: ROUNDING.md,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  image: {
    width: '100%',
    height: '100%',
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
  detailValueHighlight: {
    color: '#eab308',
    fontSize: 16,
    fontWeight: '800',
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
  disclaimerBox: {
    flexDirection: 'row',
    gap: 12,
    backgroundColor: '#EBF3E8',
    padding: 16,
    borderRadius: ROUNDING.sm,
    borderLeftWidth: 4,
    borderLeftColor: '#82A878',
    marginBottom: 24,
  },
  disclaimerText: {
    color: '#4B5548',
    fontSize: 13,
    lineHeight: 20,
    flex: 1,
    fontStyle: 'italic',
  },
  doneBtn: {
    marginTop: 10,
  }
});
