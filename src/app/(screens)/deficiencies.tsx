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
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { getDeficiencies } from '../../services/nutrientService';
import { SOIL_DEFICIENCIES_GUIDE, SoilDeficiencyGuideItem, getLocalizedDeficiency } from '../../constants/deficienciesData';

const { width } = Dimensions.get('window');

const LOCAL_DEFICIENCY_IMAGES: Record<string, any> = {
  nitrogen: require('../../../assets/nutrition/Nitrogen.png'),
  potassium: require('../../../assets/nutrition/Potassium.png'),
  magnesium: require('../../../assets/nutrition/Magnesium.png'),
  boron: require('../../../assets/nutrition/Boron.png'),
  phosphorus: require('../../../assets/nutrition/Nitrogen.png'),
  zinc: require('../../../assets/nutrition/Boron.png'),
};

export default function DeficienciesScreen() {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const currentLang = i18n.language || 'en';

  const [deficiencies, setDeficiencies] = useState<any[]>(SOIL_DEFICIENCIES_GUIDE);
  const [selectedDeficiency, setSelectedDeficiency] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadDeficienciesData = async () => {
      try {
        const data = await getDeficiencies();
        if (data && data.length > 0) {
          const merged = data.map((d: any) => {
            const local = SOIL_DEFICIENCIES_GUIDE.find(g => g.id.toLowerCase() === d.id.toLowerCase());
            return local ? { ...d, ...local } : d;
          });
          setDeficiencies(merged);
        }
      } catch (err) {
        console.warn('Failed to load deficiencies from Firebase, using local offline fallback:', err);
      }
    };
    loadDeficienciesData();
  }, []);

  const handleBack = () => {
    if (selectedDeficiency) {
      setSelectedDeficiency(null);
    } else {
      router.back();
    }
  };

  const getDeficiencyImage = (id: string) => {
    return LOCAL_DEFICIENCY_IMAGES[id.toLowerCase()] || LOCAL_DEFICIENCY_IMAGES['nitrogen'];
  };

  const selGuide = selectedDeficiency
    ? (SOIL_DEFICIENCIES_GUIDE.find(g => g.id.toLowerCase() === selectedDeficiency.id.toLowerCase()) || selectedDeficiency)
    : null;
  const localizedSel = selGuide ? getLocalizedDeficiency(selGuide, currentLang) : null;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#1B2C1A" />
        </TouchableOpacity>
        <Text style={styles.title} numberOfLines={1}>
          {localizedSel ? localizedSel.name : t('soil.deficienciesTitle')}
        </Text>
        <TouchableOpacity 
          style={{ padding: 8 }} 
          onPress={() => router.replace('/(tabs)/soil')}
          activeOpacity={0.7}
        >
          <Ionicons name="home-outline" size={22} color="#2E7D32" />
        </TouchableOpacity>
      </View>

      {localizedSel ? (
        /* DETAIL VIEW */
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Main Card */}
          <View style={styles.detailCard}>
            {/* Image banner */}
            <View style={styles.imageContainer}>
              <Image
                source={getDeficiencyImage(localizedSel.id)}
                style={styles.detailImage}
                resizeMode="cover"
              />
              <View style={[styles.symbolBadge, { backgroundColor: localizedSel.themeColor }]}>
                <Text style={styles.symbolText}>{localizedSel.chemicalSymbol}</Text>
              </View>
            </View>

            <View style={styles.detailBody}>
              {/* Name & Symbol */}
              <View style={styles.titleRow}>
                <View style={styles.titleLeftCol}>
                  <Text style={styles.detailNameEn}>{localizedSel.name}</Text>
                </View>
                <View style={styles.rangeBadge}>
                  <Text style={styles.rangeBadgeLabel}>{t('soil.criCriticalRange')}</Text>
                  <Text style={styles.rangeBadgeValue}>{localizedSel.criticalRange}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Overview */}
              <Text style={styles.sectionTitle}>{t('soil.overview')}</Text>
              <Text style={styles.bodyText}>{localizedSel.overview}</Text>

              {/* Symptoms */}
              <Text style={styles.sectionTitle}>{t('soil.keySymptoms')}</Text>
              {localizedSel.symptoms.map((symptom: string, index: number) => (
                <View key={index} style={styles.bulletRow}>
                  <Text style={[styles.bulletPoint, { color: localizedSel.themeColor }]}>•</Text>
                  <Text style={styles.bulletText}>{symptom}</Text>
                </View>
              ))}

              {/* Causes */}
              <Text style={styles.sectionTitle}>{t('soil.commonCauses')}</Text>
              {localizedSel.causes.map((cause: string, index: number) => (
                <View key={index} style={styles.bulletRow}>
                  <Text style={[styles.bulletPoint, { color: localizedSel.themeColor }]}>•</Text>
                  <Text style={styles.bulletText}>{cause}</Text>
                </View>
              ))}

              {/* Corrective Measures */}
              <Text style={[styles.sectionTitle, { color: '#2E7D32' }]}>{t('soil.criCorrectiveMeasures')}</Text>
              {localizedSel.correctiveMeasures.map((measure: string, index: number) => (
                <View key={index} style={styles.adviceRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#2E7D32" style={styles.adviceIcon} />
                  <Text style={styles.adviceText}>{measure}</Text>
                </View>
              ))}

              {/* Go to Dashboard Action */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  backgroundColor: '#2E7D32',
                  paddingVertical: 14,
                  borderRadius: 12,
                  marginTop: 24,
                  elevation: 2,
                }}
                onPress={() => router.replace('/(tabs)/soil')}
                activeOpacity={0.85}
              >
                <Ionicons name="home" size={18} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>
                  {t('soil.goToDashboard')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      ) : (
        /* GRID VIEW */
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.introCard}>
            <Ionicons name="information-circle-outline" size={24} color="#1B5E20" />
            <Text style={styles.introText}>
              {t('soil.deficienciesIntro')}
            </Text>
          </View>

          {isLoading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={{ marginTop: 12, color: '#666', fontSize: 14 }}>{t('soil.loadingDeficiencies')}</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {deficiencies.map((item) => {
                const itemGuide = SOIL_DEFICIENCIES_GUIDE.find(g => g.id.toLowerCase() === item.id.toLowerCase()) || item;
                const localized = getLocalizedDeficiency(itemGuide, currentLang);
                return (
                  <TouchableOpacity
                    key={item.id}
                    style={styles.card}
                    activeOpacity={0.9}
                    onPress={() => setSelectedDeficiency(item)}
                  >
                    <View style={styles.cardImageContainer}>
                      <Image source={getDeficiencyImage(item.id)} style={styles.cardImage} resizeMode="cover" />
                      <View style={[styles.cardSymbolBadge, { backgroundColor: item.themeColor }]}>
                        <Text style={styles.cardSymbolText}>{item.chemicalSymbol}</Text>
                      </View>
                    </View>

                    <View style={styles.cardBody}>
                      <Text style={styles.cardNameEn}>{localized.name}</Text>
                      <Text style={styles.cardRange}>{t('soil.rangeLabel')}: {localized.criticalRange}</Text>

                      <View style={styles.cardFooter}>
                        <Text style={[styles.learnMoreText, { color: COLORS.primary }]}>{t('soil.learnMore')}</Text>
                        <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
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
    fontSize: 18,
    fontWeight: '800',
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  introCard: {
    flexDirection: 'row',
    backgroundColor: '#E8F5E9',
    borderColor: '#C8E6C9',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    gap: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  introText: {
    fontSize: 13,
    color: '#1B5E20',
    flex: 1,
    lineHeight: 18,
    fontWeight: '500',
  },
  grid: {
    flexDirection: 'column',
    gap: 16,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#EAE7DF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 4,
  },
  cardImageContainer: {
    height: 140,
    position: 'relative',
    backgroundColor: '#F3F2EB',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  cardSymbolBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  cardSymbolText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  cardBody: {
    padding: 12,
  },
  cardNameEn: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1B2C1A',
  },
  cardRange: {
    fontSize: 11,
    color: '#8D968A',
    marginTop: 6,
    fontWeight: '600',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    justifyContent: 'space-between',
  },
  learnMoreText: {
    fontSize: 12,
    fontWeight: '700',
  },
  /* DETAIL VIEW STYLES */
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#EAE7DF',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  imageContainer: {
    height: 200,
    position: 'relative',
    backgroundColor: '#F3F2EB',
  },
  detailImage: {
    width: '100%',
    height: '100%',
  },
  symbolBadge: {
    position: 'absolute',
    bottom: -16,
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  symbolText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
  },
  detailBody: {
    padding: 20,
    paddingTop: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  titleLeftCol: {
    flex: 1,
    paddingRight: 10,
  },
  detailNameEn: {
    fontSize: 18,
    fontWeight: '800',
    color: '#1B2C1A',
  },
  rangeBadge: {
    backgroundColor: '#FFF8EC',
    borderColor: '#FFE0B2',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
  },
  rangeBadgeLabel: {
    fontSize: 9,
    color: '#E65100',
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  rangeBadgeValue: {
    fontSize: 12,
    color: '#E65100',
    fontWeight: '800',
    marginTop: 1,
  },
  divider: {
    height: 1,
    backgroundColor: '#EAE7DF',
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#1B2C1A',
    marginBottom: 8,
    marginTop: 14,
  },
  bodyText: {
    fontSize: 13,
    color: '#4B5548',
    lineHeight: 20,
    fontWeight: '500',
  },
  bulletRow: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingLeft: 4,
    alignItems: 'flex-start',
  },
  bulletPoint: {
    fontSize: 16,
    marginRight: 8,
    lineHeight: 18,
    fontWeight: 'bold',
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: '#4B5548',
    lineHeight: 18,
    fontWeight: '500',
  },
  adviceRow: {
    flexDirection: 'row',
    marginBottom: 10,
    backgroundColor: '#F3F8F2',
    borderColor: '#D4E8D1',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: 'flex-start',
  },
  adviceIcon: {
    marginRight: 8,
    marginTop: 1,
  },
  adviceText: {
    flex: 1,
    fontSize: 13,
    color: '#2E7D32',
    lineHeight: 18,
    fontWeight: '600',
  },
});
