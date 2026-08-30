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
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../constants/theme';
import { getDeficiencies, DeficiencyDetail } from '../../services/nutrientService';

const { width } = Dimensions.get('window');

const LOCAL_DEFICIENCY_IMAGES: Record<string, any> = {
  nitrogen: require('../../../assets/nutrition/Nitrogen.png'),
  potassium: require('../../../assets/nutrition/Potassium.png'),
  magnesium: require('../../../assets/nutrition/Magnesium.png'),
  boron: require('../../../assets/nutrition/Boron.png'),
};

const LOCAL_DEFICIENCIES_DATA: DeficiencyDetail[] = [
  {
    id: 'nitrogen',
    nameEn: 'Nitrogen Deficiency',
    chemicalSymbol: 'N',
    criticalRange: '1.80% - 2.00%',
    overview: 'Nitrogen is a primary macronutrient essential for vegetative growth, leaf production, and chlorophyll synthesis. When deficient, the palm cannot photosynthesize efficiently, leading to reduced vigor and stunted growth.',
    symptoms: [
      'General yellowing (chlorosis) of the older leaves first, which slowly spreads to the younger ones.',
      'Leaflets turn pale green to golden yellow.',
      'The growth rate of the palm slows down, and fronds become shorter.',
      'Thin crowns and slender trunks develop over time.',
      'Nut size and yield drop significantly.'
    ],
    causes: [
      'Acidic soil conditions which limit nitrogen availability.',
      'Heavy leaching in sandy/gravelly soils during monsoon seasons.',
      'Low soil organic matter and poor biological activity.'
    ],
    correctiveMeasures: [
      'Apply an additional 100-200g of Urea per palm depending on the growth stage (under CRI A7 Guidelines).',
      'Incorporate organic manure or compost around the manure circle to naturally raise soil organic matter.',
      'Grow cover crops (like Mucuna bracteata) in the interspaces to fix atmospheric nitrogen.',
      'Practice proper mulching with coconut husks in the 1.8m manure circle to retain soil moisture and reduce nitrogen volatilization.'
    ],
    themeColor: '#4CAF50',
    description: 'Nitrogen deficiency causes general yellowing (chlorosis) of older leaves first, progressing to the younger leaves. The growth rate slows down, fronds become shorter, and the crown becomes thin, significantly dropping nut size and yield.',
    advice: 'Apply an additional 100-200g of Urea per palm depending on the growth stage. Incorporate organic manure, compost, or cover crops (like Mucuna) to naturally raise soil organic matter and mulch the base.'
  },
  {
    id: 'potassium',
    nameEn: 'Potassium Deficiency',
    chemicalSymbol: 'K',
    criticalRange: '1.20% - 1.50%',
    overview: 'Potassium is the most heavily extracted nutrient by coconut palms. It regulates stomatal opening, water relations, carbohydrate translocation, and directly influences nut size, weight, and copra quality.',
    symptoms: [
      'Orange-yellow chlorotic spots appear on older leaves first.',
      'Leaflet margins and tips show necrosis (scorching or burning) that moves inwards.',
      'Midribs and petioles become weak, causing older fronds to hang down or break prematurely.',
      'Yield decreases rapidly with smaller nut sizes and thin, fiberless husks.',
      'Increased susceptibility to droughts and pest attacks.'
    ],
    causes: [
      'Highly leached sandy or gravelly soils where potassium is easily washed away.',
      'Acidic soils or soils with low cation exchange capacity.',
      'Harvesting nuts repeatedly without replacing the extracted potassium.'
    ],
    correctiveMeasures: [
      'Apply an additional 500g of Muriate of Potash (MOP) per adult palm per year (CRI A7 Guidance).',
      'Bury coconut husks and fronds in trenches between rows (husk burial). Coconut husks are rich in potassium and store moisture.',
      'Ensure balanced fertilizer application since excess calcium/magnesium can inhibit potassium uptake.'
    ],
    themeColor: '#FF9800',
    description: 'Potassium deficiency is common in sandy soils. It shows as orange-yellow chlorotic spots on older leaves, with leaflet margins and tips exhibiting burning/necrosis. Midribs weaken and fronds hang down or break prematurely.',
    advice: 'Apply an additional 500g of Muriate of Potash (MOP) per adult palm per year. Bury coconut husks and fronds in trenches between rows to recycle potassium and preserve moisture.'
  },
  {
    id: 'magnesium',
    nameEn: 'Magnesium Deficiency',
    chemicalSymbol: 'Mg',
    criticalRange: '0.20% - 0.35%',
    overview: 'Magnesium is the central component of the chlorophyll molecule, making it essential for photosynthesis. Deficiency leads to direct yellowing of mature leaves and significantly reduces starch synthesis.',
    symptoms: [
      'Classic "V-shaped" yellowing on older leaves; leaflet margins turn bright orange-yellow while the area near the midrib remains green.',
      'Translucent yellow spotting on leaflets exposed to direct sunlight.',
      'Leaf tips become necrotic and die back in severe stages.',
      'Healthy young green leaves are only found at the center of the crown.'
    ],
    causes: [
      'Highly acidic, sandy soils prone to leaching.',
      'Excessive application of Potassium or Ammonium fertilizers which competitively inhibits Magnesium uptake.'
    ],
    correctiveMeasures: [
      'For severe cases: Apply 1 kg of Kieserite (Magnesium Sulphate) per adult palm half-yearly. Apply Kieserite to one half of the manure circle and NPK to the other half.',
      'For young palms showing symptoms: Apply 0.5 kg of Kieserite half-yearly.',
      'For long-term prevention: Apply 1 kg of Dolomite per palm per year. Apply dolomite at least 2 weeks before or after applying chemical fertilizers.'
    ],
    themeColor: '#009688',
    description: 'Magnesium deficiency is characterized by a V-shaped yellowing on older leaves, where leaflet margins turn bright orange-yellow while the midrib area remains green. Photosynthesis is severely reduced, affecting root and nut growth.',
    advice: 'For severe cases: Apply 1 kg Kieserite (Magnesium Sulphate) per adult palm half-yearly (apply NPK to one half of the circle and Kieserite to the other). For long-term prevention, apply 1 kg Dolomite per palm per year.'
  },
  {
    id: 'boron',
    nameEn: 'Boron Deficiency',
    chemicalSymbol: 'B',
    criticalRange: '8 - 10 ppm',
    overview: 'Boron is a vital micronutrient required for cell division, cell wall development, pollen germination, and sugar transport. Deficiency causes severe malformations in growing tissues.',
    symptoms: [
      '"Hook Leaf": Young emerging fronds show leaflets with bent, rigid tips that cannot be straightened.',
      'Spear leaves fail to open properly or appear crinkled ("crown choke").',
      'The crown may exhibit a zigzag or serrated silhouette.',
      'Deformed, flat-sided, or undersized nuts (barren nuts).',
      'Severe button shedding and necrotic inflorescence.'
    ],
    causes: [
      'Leached sandy soils or highly alkaline soils.',
      'Extended drought periods which restrict water movement and boron transport in the soil.',
      'Imbalanced soil chemistry.'
    ],
    correctiveMeasures: [
      'Apply 20g of Sodium Tetraborate (Borax) per mature or young palm at 6-month intervals until symptoms disappear (CRI A7 Guidance).',
      'For seedlings: Apply 10g of Borax at 6-month intervals.',
      'Ensure the soil is moist during application to facilitate uptake.',
      'Caution: Apply strictly according to recommended rates, as boron has a narrow range between deficiency and toxicity.'
    ],
    themeColor: '#E91E63',
    description: 'Boron deficiency manifests as \'Hook Leaf\' on emerging fronds where leaflet tips are bent and rigid. Spear leaves fail to open, inflorescences become necrotic, and the palm produces flat-sided, barren nuts due to poor cell division.',
    advice: 'Apply 20g of Sodium Tetraborate (Borax) per mature or young palm at 6-month intervals until symptoms disappear. Seedlings should receive 10g Borax.'
  }
];

export default function DeficienciesScreen() {
  const router = useRouter();
  const [deficiencies, setDeficiencies] = useState<DeficiencyDetail[]>(LOCAL_DEFICIENCIES_DATA);
  const [selectedDeficiency, setSelectedDeficiency] = useState<DeficiencyDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadDeficienciesData = async () => {
      setIsLoading(true);
      try {
        const data = await getDeficiencies();
        if (data && data.length > 0) {
          setDeficiencies(data);
        }
      } catch (err) {
        console.warn('Failed to load deficiencies from Firebase, using local offline fallback:', err);
      } finally {
        setIsLoading(false);
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color="#1B2C1A" />
        </TouchableOpacity>
        <Text style={styles.title}>
          {selectedDeficiency ? selectedDeficiency.nameEn : 'Coconut Deficiencies'}
        </Text>
      </View>

      {selectedDeficiency ? (
        /* DETAIL VIEW */
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Main Card */}
          <View style={styles.detailCard}>
            {/* Image banner */}
            <View style={styles.imageContainer}>
              <Image
                source={getDeficiencyImage(selectedDeficiency.id)}
                style={styles.detailImage}
                resizeMode="cover"
              />
              <View style={[styles.symbolBadge, { backgroundColor: selectedDeficiency.themeColor }]}>
                <Text style={styles.symbolText}>{selectedDeficiency.chemicalSymbol}</Text>
              </View>
            </View>

            <View style={styles.detailBody}>
              {/* Name & Symbol */}
              <View style={styles.titleRow}>
                <View style={styles.titleLeftCol}>
                  <Text style={styles.detailNameEn}>{selectedDeficiency.nameEn}</Text>
                </View>
                <View style={styles.rangeBadge}>
                  <Text style={styles.rangeBadgeLabel}>CRI Critical Range</Text>
                  <Text style={styles.rangeBadgeValue}>{selectedDeficiency.criticalRange}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              {/* Overview */}
              <Text style={styles.sectionTitle}>Overview</Text>
              <Text style={styles.bodyText}>{selectedDeficiency.overview}</Text>

              {/* Symptoms */}
              <Text style={styles.sectionTitle}>Key Symptoms</Text>
              {selectedDeficiency.symptoms.map((symptom, index) => (
                <View key={index} style={styles.bulletRow}>
                  <Text style={[styles.bulletPoint, { color: selectedDeficiency.themeColor }]}>•</Text>
                  <Text style={styles.bulletText}>{symptom}</Text>
                </View>
              ))}

              {/* Causes */}
              <Text style={styles.sectionTitle}>Common Causes</Text>
              {selectedDeficiency.causes.map((cause, index) => (
                <View key={index} style={styles.bulletRow}>
                  <Text style={[styles.bulletPoint, { color: selectedDeficiency.themeColor }]}>•</Text>
                  <Text style={styles.bulletText}>{cause}</Text>
                </View>
              ))}

              {/* Corrective Measures */}
              <Text style={[styles.sectionTitle, { color: '#2E7D32' }]}>CRI Corrective Measures (A7)</Text>
              {selectedDeficiency.correctiveMeasures.map((measure, index) => (
                <View key={index} style={styles.adviceRow}>
                  <Ionicons name="checkmark-circle" size={18} color="#2E7D32" style={styles.adviceIcon} />
                  <Text style={styles.adviceText}>{measure}</Text>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>
      ) : (
        /* GRID VIEW */
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <View style={styles.introCard}>
            <Ionicons name="information-circle-outline" size={24} color="#1B5E20" />
            <Text style={styles.introText}>
              Coconut palms require balanced nutrition to ensure optimal yields. Review the official CRI guidelines below to identify, prevent, and treat critical nutrient deficiencies.
            </Text>
          </View>

          {isLoading ? (
            <View style={{ paddingVertical: 40, alignItems: 'center' }}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={{ marginTop: 12, color: '#666', fontSize: 14 }}>Loading deficiency guidelines...</Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {deficiencies.map((item) => (
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
                    <Text style={styles.cardNameEn}>{item.nameEn}</Text>
                    <Text style={styles.cardRange}>Range: {item.criticalRange}</Text>

                    <View style={styles.cardFooter}>
                      <Text style={[styles.learnMoreText, { color: COLORS.primary }]}>Learn More</Text>
                      <Ionicons name="arrow-forward" size={16} color={COLORS.primary} />
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
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
