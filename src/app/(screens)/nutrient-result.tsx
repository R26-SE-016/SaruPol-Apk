import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { COLORS, ROUNDING } from '../../constants/theme';
import GradientButton from '../../components/common/GradientButton';
import { NutrientAnalysisResponse, saveNutrientScan, getDeficiencies } from '../../services/nutrientService';
import { getStandardRecommendation } from '../../services/fertilizerTables';
import { useAppStore } from '../../store/appStore';

const { width } = Dimensions.get('window');

const DEFICIENCY_EXPLANATIONS: Record<string, { chemicalSymbol: string; themeColor: string; description: string; advice: string }> = {
  nitrogen: {
    chemicalSymbol: 'N',
    themeColor: '#4CAF50',
    description: "Nitrogen deficiency causes general yellowing (chlorosis) of older leaves first, progressing to the younger leaves. The growth rate slows down, fronds become shorter, and the crown becomes thin, significantly dropping nut size and yield.",
    advice: "Apply an additional 100-200g of Urea per palm depending on the growth stage. Incorporate organic manure, compost, or cover crops (like Mucuna) to naturally raise soil organic matter and mulch the base."
  },
  potassium: {
    chemicalSymbol: 'K',
    themeColor: '#FF9800',
    description: "Potassium deficiency is common in sandy soils. It shows as orange-yellow chlorotic spots on older leaves, with leaflet margins and tips exhibiting burning/necrosis. Midribs weaken and fronds hang down or break prematurely.",
    advice: "Apply an additional 500g of Muriate of Potash (MOP) per adult palm per year. Bury coconut husks and fronds in trenches between rows to recycle potassium and preserve moisture."
  },
  magnesium: {
    chemicalSymbol: 'Mg',
    themeColor: '#009688',
    description: "Magnesium deficiency is characterized by a V-shaped yellowing on older leaves, where leaflet margins turn bright orange-yellow while the midrib area remains green. Photosynthesis is severely reduced, affecting root and nut growth.",
    advice: "For severe cases: Apply 1 kg Kieserite (Magnesium Sulphate) per adult palm half-yearly (apply NPK to one half of the circle and Kieserite to the other). For long-term prevention, apply 1 kg Dolomite per palm per year."
  },
  boron: {
    chemicalSymbol: 'B',
    themeColor: '#E91E63',
    description: "Boron deficiency manifests as 'Hook Leaf' on emerging fronds where leaflet tips are bent and rigid. Spear leaves fail to open, inflorescences become necrotic, and the palm produces flat-sided, barren nuts due to poor cell division.",
    advice: "Apply 20g of Sodium Tetraborate (Borax) per mature or young palm at 6-month intervals until symptoms disappear. Seedlings should receive 10g Borax."
  }
};


export default function NutrientResultScreen() {
  const router = useRouter();
  const { t } = useTranslation();
  const { data, imageUri, palmAge, palmStage, zone } = useLocalSearchParams<{ 
    data: string; 
    imageUri: string;
    palmAge?: string;
    palmStage?: string;
    zone?: string;
  }>();
  
  const { user, isGuest, isConnected } = useAppStore();
  const [isSaving, setIsSaving] = useState(false);
  const [deficiencies, setDeficiencies] = useState<any[]>([]);

  let result: NutrientAnalysisResponse | null = null;
  try {
    if (data) {
      result = JSON.parse(data);
    }
  } catch (error) {
    console.error("Failed to parse analysis result:", error);
  }

  useEffect(() => {
    const fetchRules = async () => {
      try {
        const data = await getDeficiencies();
        if (data && data.length > 0) {
          setDeficiencies(data);
        }
      } catch (err) {
        console.warn("Failed to fetch deficiencies. Using offline local fallback.");
      }
    };
    fetchRules();
  }, []);

  const handleSaveResults = async () => {
    if (isGuest || !user) {
      Alert.alert(
        "Guest Mode",
        "You are in guest mode. Scan results will only be saved to local history.",
        [{ text: "OK", onPress: () => router.navigate('/(tabs)/soil') }]
      );
      return;
    }

    setIsSaving(true);
    try {
      if (isConnected) {
        const pred = result?.prediction ? {
          nutrient: result.prediction.nutrient || "Healthy",
          class: result.prediction.class || "Healthy",
          confidence: result.prediction.confidence ?? 0.85
        } : null;

        const rec = result?.recommendation ? {
          source: result.recommendation.source || "Coconut Research Institute (CRI) Diagnostic Protocol",
          assessment_type: result.recommendation.assessment_type || "preliminary_visual_assessment",
          advice: result.recommendation.advice || "Palm foliage appears healthy. Maintain standard CRI circular trench fertilization schedule."
        } : {
          source: "Coconut Research Institute (CRI) Diagnostic Protocol",
          assessment_type: "preliminary_visual_assessment",
          advice: pred?.class === "Healthy"
            ? "Palm foliage appears healthy and balanced. Maintain CRI circular trench fertilization schedule."
            : "Preliminary visual assessment indicates potential deficiency. Confirm with laboratory foliar analysis."
        };

        await saveNutrientScan({
          user_id: user.id.toString(),
          palm_age: palmAge || '8',
          palm_stage: palmStage || 'adult',
          zone: zone || 'wet',
          image_uri: imageUri || '',
          prediction: pred,
          recommendation: rec,
        });
        Alert.alert("Success", "Scan results saved successfully to your cloud profile.", [
          { text: "OK", onPress: () => router.navigate('/(tabs)/soil') }
        ]);
      } else {
        Alert.alert("Offline", "You are offline. Results will be synced when you reconnect.", [
          { text: "OK", onPress: () => router.navigate('/(tabs)/soil') }
        ]);
      }
    } catch (error: any) {
      console.error("Failed to save scan result:", error);
      Alert.alert("Save Failed", "Failed to save results to Firebase. Navigating back to soil tab.", [
        { text: "OK", onPress: () => router.navigate('/(tabs)/soil') }
      ]);
    } finally {
      setIsSaving(false);
    }
  };

  const criRecommendation = getStandardRecommendation(palmAge || '', palmStage || '', zone || '');

  if (!result) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#1B2C1A" />
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
        <View style={styles.card}>
          <View style={[styles.statusHeader, { backgroundColor: '#FFEBEE' }]}>
            <Ionicons name="warning" size={28} color="#D32F2F" />
            <Text style={[styles.statusTitle, { color: '#C62828' }]}>{t('soil.uncertainDetection')}</Text>
          </View>
          <Text style={styles.bodyText}>
            {message || "The leaf image could not be classified confidently. This can happen if the leaf is out of focus, has dirt/debris, or does not clearly display the key deficiency patterns."}
          </Text>
          <View style={styles.divider} />
          <View style={styles.guidelinesBox}>
            <Text style={styles.guidelinesTitle}>{t('soil.uncertainTips')}</Text>
            <View style={styles.guidelineRow}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#7F8C7D" />
              <Text style={styles.guidelineText}>{t('soil.uncertainTip1')}</Text>
            </View>
            <View style={styles.guidelineRow}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#7F8C7D" />
              <Text style={styles.guidelineText}>{t('soil.uncertainTip2')}</Text>
            </View>
          </View>
        </View>
      );
    }

    // 2. HEALTHY
    if (prediction.class === 'Healthy') {
      return (
        <View>
          <View style={styles.card}>
            <View style={[styles.statusHeader, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="checkmark-circle" size={28} color="#2E7D32" />
              <Text style={[styles.statusTitle, { color: '#1B5E20' }]}>{t('soil.healthyPalmLeaf')}</Text>
            </View>

            {/* Confidence Bar */}
            <View style={styles.confidenceContainer}>
              <View style={styles.confidenceRow}>
                <Text style={styles.confidenceLabel}>{t('soil.confidenceScore')}</Text>
                <Text style={[styles.confidenceValueText, { color: '#2E7D32' }]}>{Math.round(prediction.confidence * 100)}%</Text>
              </View>
              <View style={styles.progressBarTrack}>
                <View style={[styles.progressBarFill, { width: `${prediction.confidence * 100}%`, backgroundColor: '#4CAF50' }]} />
              </View>
            </View>

            <View style={styles.divider} />

            <Text style={styles.bodyText}>
              {t('soil.healthyLeafDesc')}
            </Text>
          </View>

          {criRecommendation && (
            <TouchableOpacity 
              style={styles.criCallout}
              activeOpacity={0.9}
              onPress={() => router.push({
                pathname: '/(screens)/cri-recommendation' as any,
                params: { palmAge, palmStage, zone }
              })}
            >
              <View style={styles.criCalloutLeft}>
                <View style={styles.leafIconContainer}>
                  <Ionicons name="leaf" size={22} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={styles.criCalloutTitle}>{t('soil.seeStandardCriPlan')}</Text>
                  <Text style={styles.criCalloutSub}>{t('soil.recommendedSchedule')}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
            </TouchableOpacity>
          )}
        </View>
      );
    }

    // 3. DEFICIENCY (Boron, Nitrogen, etc.)
    const nutrientKey = (prediction.nutrient || '').trim().toLowerCase();
    
    // Find matching deficiency in our fetched list
    const dbDeficiency = deficiencies.find(d => d.id.toLowerCase() === nutrientKey);
    
    // Check if i18n has localized info for this nutrient
    const i18nNutrient = t(`soil.nutrients.${nutrientKey}`, { returnObjects: true }) as any;
    const hasI18n = i18nNutrient && typeof i18nNutrient === 'object' && i18nNutrient.description;

    // Map localized data or db data or fallback to local static data
    const exp = {
      chemicalSymbol: (hasI18n && i18nNutrient.symbol) || dbDeficiency?.chemicalSymbol || DEFICIENCY_EXPLANATIONS[nutrientKey]?.chemicalSymbol || '?',
      themeColor: dbDeficiency?.themeColor || DEFICIENCY_EXPLANATIONS[nutrientKey]?.themeColor || '#FFB300',
      description: (hasI18n && i18nNutrient.description) || dbDeficiency?.description || dbDeficiency?.overview || DEFICIENCY_EXPLANATIONS[nutrientKey]?.description || '',
      advice: (hasI18n && i18nNutrient.advice) || dbDeficiency?.advice || dbDeficiency?.correctiveMeasures?.join('\n') || DEFICIENCY_EXPLANATIONS[nutrientKey]?.advice || ''
    };
    const displayName = (hasI18n && i18nNutrient.name) || prediction.nutrient;

    return (
      <View>
        <View style={styles.card}>
          <View style={[styles.statusHeader, { backgroundColor: '#FFF3E0' }]}>
            <Ionicons name="alert-circle" size={28} color="#EF6C00" />
            <Text style={[styles.statusTitle, { color: '#E65100' }]}>{t('soil.deficiencyDetected')}</Text>
          </View>

          {/* Large Badge Header */}
          <View style={styles.badgeBanner}>
            <View style={[styles.largeSymbolBadge, { backgroundColor: exp ? exp.themeColor : '#FFB300' }]}>
              <Text style={styles.largeSymbolText}>{exp ? exp.chemicalSymbol : '?'}</Text>
            </View>
            <View style={styles.badgeInfo}>
              <Text style={styles.badgeLabel}>{t('soil.targetNutrient')}</Text>
              <Text style={styles.badgeTitle}>{displayName}</Text>
            </View>
          </View>

          {/* Confidence Bar */}
          <View style={styles.confidenceContainer}>
            <View style={styles.confidenceRow}>
              <Text style={styles.confidenceLabel}>{t('soil.scanConfidence')}</Text>
              <Text style={[styles.confidenceValueText, { color: exp ? exp.themeColor : '#FFB300' }]}>
                {Math.round(prediction.confidence * 100)}%
              </Text>
            </View>
            <View style={styles.progressBarTrack}>
              <View style={[styles.progressBarFill, { width: `${prediction.confidence * 100}%`, backgroundColor: exp ? exp.themeColor : '#FFB300' }]} />
            </View>
          </View>

          <View style={styles.divider} />

          {recommendation && (
            <View style={styles.assessmentRow}>
              <Text style={styles.assessmentLabel}>{t('soil.assessmentMode')}</Text>
              <View style={styles.assessmentBadge}>
                <Text style={styles.assessmentBadgeText}>
                  {recommendation.assessment_type === 'preliminary_visual_assessment' 
                    ? t('soil.visualAnalysis')
                    : recommendation.assessment_type}
                </Text>
              </View>
            </View>
          )}

          {exp ? (
            <View style={styles.infoBlock}>
              <Text style={styles.sectionLabel}>{t('soil.deficiencyExplanation')}</Text>
              <Text style={styles.descriptionText}>{exp.description}</Text>
              
              <Text style={[styles.sectionLabel, { marginTop: 20 }]}>{t('soil.criTreatmentProtocol')}</Text>
              <View style={styles.adviceHighlight}>
                <Ionicons name="shield-checkmark" size={20} color="#2E7D32" style={{ marginRight: 8, marginTop: 2 }} />
                <Text style={styles.adviceHighlightText}>{exp.advice}</Text>
              </View>
            </View>
          ) : (
            recommendation && (
              <View style={styles.infoBlock}>
                <Text style={styles.sectionLabel}>{t('soil.recommendation')}</Text>
                <Text style={styles.bodyText}>{recommendation.advice}</Text>
              </View>
            )
          )}
        </View>

        {criRecommendation && (
          <TouchableOpacity 
            style={styles.criCallout}
            activeOpacity={0.9}
            onPress={() => router.push({
              pathname: '/(screens)/cri-recommendation' as any,
              params: { palmAge, palmStage, zone }
            })}
          >
            <View style={styles.criCalloutLeft}>
              <View style={styles.leafIconContainer}>
                <Ionicons name="leaf" size={22} color="#FFFFFF" />
              </View>
              <View>
                <Text style={styles.criCalloutTitle}>{t('soil.seeStandardCriPlan')}</Text>
                <Text style={styles.criCalloutSub}>{t('soil.recommendedSchedule')}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color={COLORS.primary} />
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
        <Text style={styles.title}>{t('soil.analysisResult')}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {imageUri && (
          <View style={styles.imageWrapper}>
            <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
            <View style={styles.imageOverlayBadge}>
              <Ionicons name="scan" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.imageOverlayText}>{t('soil.analyzedSpecimen')}</Text>
            </View>
          </View>
        )}

        {renderContent()}

        <TouchableOpacity 
          style={styles.retryBtn}
          activeOpacity={0.8}
          onPress={() => router.navigate({ pathname: '/(screens)/nutrient-analysis' as any, params: { reset: 'true' } })}
        >
          <Ionicons name="camera" size={20} color={COLORS.primary} />
          <Text style={styles.retryBtnText}>{t('soil.scanAnotherLeaf')}</Text>
        </TouchableOpacity>

        <GradientButton 
          title={isSaving ? t('soil.saving') : t('soil.doneSaveResults')} 
          onPress={handleSaveResults} 
          style={styles.doneBtn}
          disabled={isSaving}
        />
        
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  imageWrapper: {
    width: '100%',
    height: 220,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#EAE7DF',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlayBadge: {
    position: 'absolute',
    bottom: 12,
    left: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageOverlayText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAE7DF',
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 17,
    fontWeight: '800',
    flex: 1,
  },
  badgeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: '#ECEFF1',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  largeSymbolBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  largeSymbolText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  badgeInfo: {
    flex: 1,
  },
  badgeLabel: {
    color: '#78909C',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  badgeTitle: {
    color: '#1B2C1A',
    fontSize: 16,
    fontWeight: '800',
    marginTop: 2,
  },
  confidenceContainer: {
    marginBottom: 4,
  },
  confidenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  confidenceLabel: {
    color: '#546E7A',
    fontSize: 13,
    fontWeight: '600',
  },
  confidenceValueText: {
    fontSize: 15,
    fontWeight: '800',
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: '#ECEFF1',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  divider: {
    height: 1,
    backgroundColor: '#ECEFF1',
    marginVertical: 16,
  },
  assessmentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  assessmentLabel: {
    fontSize: 13,
    color: '#78909C',
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  assessmentBadge: {
    backgroundColor: '#ECEFF1',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  assessmentBadgeText: {
    color: '#455A64',
    fontSize: 12,
    fontWeight: '700',
  },
  infoBlock: {
    marginTop: 4,
  },
  sectionLabel: {
    color: '#546E7A',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.0,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  bodyText: {
    color: '#37474F',
    fontSize: 14,
    lineHeight: 22,
  },
  descriptionText: {
    color: '#37474F',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '500',
  },
  adviceHighlight: {
    flexDirection: 'row',
    backgroundColor: '#F1F8E9',
    borderColor: '#DCEDC8',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    alignItems: 'flex-start',
    marginTop: 4,
  },
  adviceHighlightText: {
    flex: 1,
    fontSize: 13.5,
    color: '#2E7D32',
    lineHeight: 20,
    fontWeight: '600',
  },
  criCallout: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAE7DF',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.02,
    shadowRadius: 4,
    elevation: 2,
  },
  criCalloutLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  leafIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  criCalloutTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B2C1A',
  },
  criCalloutSub: {
    fontSize: 11,
    color: '#78909C',
    marginTop: 2,
    fontWeight: '500',
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 14,
    gap: 8,
    marginBottom: 12,
    marginTop: 4,
  },
  retryBtnText: {
    color: COLORS.primary,
    fontWeight: '700',
    fontSize: 15,
  },
  doneBtn: {
    marginTop: 4,
    borderRadius: 16,
  },
  guidelinesBox: {
    backgroundColor: '#ECEFF1',
    borderRadius: 12,
    padding: 14,
  },
  guidelinesTitle: {
    color: '#455A64',
    fontWeight: '700',
    fontSize: 13,
    marginBottom: 8,
  },
  guidelineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  guidelineText: {
    color: '#546E7A',
    fontSize: 12,
    flex: 1,
  },
});
