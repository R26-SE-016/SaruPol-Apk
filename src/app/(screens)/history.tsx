import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, ROUNDING } from '../../constants/theme';
import GradientButton from '../../components/common/GradientButton';
import { useAppStore } from '../../store/appStore';

export default function HistoryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { history, clearHistory, language, user, isGuest } = useAppStore();

  const currentUserId = isGuest || !user ? 'guest' : user.id.toString();

  // Filter history strictly for the logged in user
  const userHistory = history.filter((item) => {
    if (!item.userId) return true;
    return item.userId === currentUserId;
  });

  const handleClearHistory = () => {
    Alert.alert(
      language === 'en' ? 'Clear History' : 'වාර්තා මකා දැමීම',
      language === 'en' ? 'Are you sure you want to clear all history logs?' : 'පසුගිය සියලු වාර්තා මකා දැමීමට ඔබට අවශ්‍යද?',
      [
        { text: t('common.cancel') || 'Cancel', style: 'cancel' },
        { text: language === 'en' ? 'Clear All' : 'මකන්න', style: 'destructive', onPress: clearHistory }
      ]
    );
  };

  const handleItemPress = (item: any) => {
    if (item.type === 'pathology') {
      router.push({
        pathname: '/(screens)/scan-result',
        params: {
          part: item.input?.part || 'Leaf',
          status: item.result?.status || 'healthy',
          diagnosis: item.result?.diagnosis || 'Healthy',
          confidence: item.result?.confidence || 0.9,
          severity: item.result?.severity || 'low',
          chemical: item.result?.recommendations?.chemical || '',
          cultural: item.result?.recommendations?.cultural || '',
          preventive: item.result?.recommendations?.preventive || '',
          imageUri: item.input?.imageUri || ''
        }
      });
    } else if (item.type === 'yield') {
      router.push({
        pathname: '/(screens)/predict-result',
        params: {
          is45DayMode: item.input?.is45DayMode ? 'true' : 'false',
          prediction: item.result?.ensemble_prediction || item.result?.prediction || 0,
          minInterval: item.result?.confidence_interval?.[0] || 0,
          maxInterval: item.result?.confidence_interval?.[1] || 0,
          rf: item.result?.individual_models?.random_forest || 0,
          gb: item.result?.individual_models?.gradient_boosting || 0,
          xgb: item.result?.individual_models?.xgboost || 0,
          lgb: item.result?.individual_models?.lightgbm || 0,
          insights: JSON.stringify(item.result?.insights || item.result?.recommendations || [])
        }
      });
    } else if (item.type === 'soil') {
      router.push({
        pathname: '/(screens)/soil-result',
        params: {
          treeNo: item.input?.treeNo || `Palm #${item.input?.N || 'N/A'}`,
          zoneId: item.input?.zoneId || 'Wet Zone',
          method: item.input?.method || 'Laboratory Analysis',
          model: item.input?.model || 'CRI Standard Expert Rules',
          soilN: item.input?.soilN || item.input?.N?.toString() || '0',
          soilP: item.input?.soilP || item.input?.P?.toString() || '0',
          soilK: item.input?.soilK || item.input?.K?.toString() || '0',
          leafN: item.input?.leafN || item.input?.N?.toString() || '0',
          leafP: item.input?.leafP || item.input?.P?.toString() || '0',
          leafK: item.input?.leafK || item.input?.K?.toString() || '0',
          leafMg: item.input?.leafMg || 'N/A',
          status: item.result?.status || item.result?.fertility || 'Optimal',
          urea: item.result?.urea?.toString() || '800',
          erp: item.result?.erp?.toString() || '600',
          mop: item.result?.mop?.toString() || '1600',
          dolomite: item.result?.dolomite?.toString() || '1000',
          advice: JSON.stringify(item.result?.advice || item.result?.fertilizer_plan || []),
          evalN: item.result?.evalN || 'Optimal',
          evalP: item.result?.evalP || 'Optimal',
          evalK: item.result?.evalK || 'Optimal',
          evalMg: item.result?.evalMg || 'Optimal',
          healthScore: item.result?.health_score || 85,
          fertility: item.result?.fertility || 'Optimal',
          deficiencies: JSON.stringify(item.result?.deficiencies || []),
          optimalRanges: JSON.stringify(item.result?.optimal_ranges || {}),
          fertilizerPlan: JSON.stringify(item.result?.fertilizer_plan || []),
          pH: item.input?.pH?.toString() || '6.5',
          N: item.input?.N?.toString() || '0',
          P: item.input?.P?.toString() || '0',
          K: item.input?.K?.toString() || '0',
          OC: item.input?.Organic_Carbon?.toString() || '1.2',
          EC: item.input?.EC?.toString() || '0.5',
        }
      });
    } else if (item.type === 'leaf_scan') {
      router.push({
        pathname: '/(screens)/nutrient-result',
        params: {
          data: JSON.stringify(item.result || {}),
          imageUri: item.input?.imageUri || '',
          palmAge: item.input?.palmAge || '',
          palmStage: item.input?.palmStage || '',
          zone: item.input?.zone || '',
        }
      });
    }
  };

  const getItemMeta = (type: string) => {
    switch (type) {
      case 'pathology':
        return { 
          icon: 'scan-outline', 
          color: '#E53935', 
          bgColor: '#FFEBEE',
          badgeText: language === 'en' ? 'Disease Scan' : 'රෝග පරීක්ෂාව' 
        };
      case 'yield':
        return { 
          icon: 'trending-up-outline', 
          color: '#F57C00', 
          bgColor: '#FFF3E0',
          badgeText: language === 'en' ? 'Yield Predict' : 'අස්වැන්න ගණනය' 
        };
      case 'soil':
        return { 
          icon: 'flask-outline', 
          color: '#1E88E5', 
          bgColor: '#E3F2FD',
          badgeText: language === 'en' ? 'Soil Lab' : 'පස් පරීක්ෂාව' 
        };
      case 'leaf_scan':
        return { 
          icon: 'leaf-outline', 
          color: '#2E7D32', 
          bgColor: '#E8F5E9',
          badgeText: language === 'en' ? 'Leaf Assessment' : 'පත්‍ර පරීක්ෂාව' 
        };
      default:
        return { 
          icon: 'document-text-outline', 
          color: '#546E7A', 
          bgColor: '#ECEFF1',
          badgeText: 'Activity Log' 
        };
    }
  };

  const formatTitle = (item: any) => {
    if (item.type === 'pathology') {
      return item.result?.diagnosis || (language === 'en' ? 'Pathology Scan' : 'රෝග පරීක්ෂාව');
    }
    if (item.type === 'yield') {
      const is45 = item.input?.is45DayMode;
      const amount = item.result?.ensemble_prediction || item.result?.prediction || 0;
      return language === 'en'
        ? `Yield: ${amount} nuts (${is45 ? '45d' : 'Annual'})`
        : `අස්වැන්න: ගෙඩි ${amount} (${is45 ? 'දින 45' : 'වාර්ෂික'})`;
    }
    if (item.type === 'soil') {
      let score = item.result?.health_score;
      if (item.result?.evalN || item.result?.evalP || item.result?.evalK || item.result?.evalMg) {
        let outOfRange = 0;
        const evN = item.result.evalN?.toString().toLowerCase() || '';
        const evP = item.result.evalP?.toString().toLowerCase() || '';
        const evK = item.result.evalK?.toString().toLowerCase() || '';
        const evMg = item.result.evalMg?.toString().toLowerCase() || '';
        if (evN.includes('deficient') || evN.includes('excess') || evN.includes('low') || evN.includes('high')) outOfRange++;
        if (evP.includes('deficient') || evP.includes('excess') || evP.includes('low') || evP.includes('high')) outOfRange++;
        if (evK.includes('deficient') || evK.includes('excess') || evK.includes('low') || evK.includes('high')) outOfRange++;
        if (evMg !== 'n/a' && (evMg.includes('deficient') || evMg.includes('excess') || evMg.includes('low') || evMg.includes('high'))) outOfRange++;
        score = outOfRange > 0 ? Math.max(40, 100 - outOfRange * 15) : 100;
      }
      return language === 'en'
        ? `Soil Fertility: ${score ?? 85}/100`
        : `පාංශු සාරවත් බව: ${score ?? 85}/100`;
    }
    if (item.type === 'leaf_scan') {
      const className = item.result?.prediction?.class || item.result?.prediction?.nutrient || 'Nutrient Analysis';
      return `${className}`;
    }
    return 'Analysis Result';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) + ' • ' + 
           d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      {/* ── App Header ────────────────────────────────────────────── */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="arrow-back" size={22} color="#1B2C1A" />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Text style={styles.headerTitle}>
            {language === 'en' ? 'Activity Log' : 'පසුගිය වාර්තා'}
          </Text>
          {userHistory.length > 0 && (
            <Text style={styles.headerSubtitle}>
              {userHistory.length} {userHistory.length === 1 ? 'saved record' : 'saved records'}
            </Text>
          )}
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* ── Main Content Area ───────────────────────────────────────── */}
      {userHistory.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="folder-open-outline" size={48} color="#2E7D32" />
          </View>
          <Text style={styles.emptyTitle}>
            {language === 'en' ? 'No History Records Yet' : 'පසුගිය වාර්තා කිසිවක් නැත'}
          </Text>
          <Text style={styles.emptyText}>
            {language === 'en' 
              ? 'Your completed leaf assessments, soil lab tests, and yield predictions will appear here.'
              : 'ඔබ සිදුකළ පත්‍ර පරීක්ෂණ, පාංශු පරීක්ෂණ සහ අස්වැන්න ගණනය කිරීම් මෙතැන සටහන් වේ.'}
          </Text>
          <GradientButton
            title={language === 'en' ? 'Return to Dashboard' : 'ප්‍රධාන පිටුවට'}
            onPress={() => router.back()}
            style={styles.backHomeBtn}
          />
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {userHistory.map((item) => {
            const meta = getItemMeta(item.type);
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => handleItemPress(item)}
                activeOpacity={0.88}
                style={styles.touchableCard}
              >
                <View style={[styles.card, { borderLeftColor: meta.color }]}>
                  <View style={styles.cardHeaderRow}>
                    {/* Icon Avatar */}
                    <View style={[styles.iconAvatar, { backgroundColor: meta.bgColor }]}>
                      <Ionicons name={meta.icon as any} size={22} color={meta.color} />
                    </View>
                    
                    {/* Content Column */}
                    <View style={styles.cardContentCol}>
                      <View style={styles.badgeRow}>
                        <View style={[styles.typeBadge, { backgroundColor: meta.bgColor }]}>
                          <Text style={[styles.typeBadgeText, { color: meta.color }]}>
                            {meta.badgeText}
                          </Text>
                        </View>

                        {/* Sync Status Badge */}
                        <View style={styles.syncStatusBadge}>
                          <Ionicons
                            name={item.synced ? "cloud-done" : "cloud-offline-outline"}
                            size={14}
                            color={item.synced ? "#2E7D32" : "#FB8C00"}
                          />
                          <Text style={[
                            styles.syncStatusText, 
                            { color: item.synced ? "#2E7D32" : "#E65100" }
                          ]}>
                            {item.synced 
                              ? (language === 'en' ? 'Cloud Synced' : 'සංරක්ෂිතයි') 
                              : (language === 'en' ? 'Local' : 'දේශීය')}
                          </Text>
                        </View>
                      </View>

                      {/* Record Title */}
                      <Text style={styles.recordTitle} numberOfLines={1}>
                        {formatTitle(item)}
                      </Text>

                      {/* Date & Time */}
                      <View style={styles.dateRow}>
                        <Ionicons name="time-outline" size={13} color="#78909C" />
                        <Text style={styles.dateText}>{formatDate(item.date)}</Text>
                      </View>
                    </View>

                    {/* Chevron Arrow */}
                    <View style={styles.chevronBox}>
                      <Ionicons name="chevron-forward" size={18} color="#B0BEC5" />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F6F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 40,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    alignItems: 'center',
  },
  headerTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    color: '#64748B',
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  clearBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FEF2F2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 36,
    gap: 12,
  },
  touchableCard: {
    width: '100%',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 5,
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconAvatar: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cardContentCol: {
    flex: 1,
    justifyContent: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  syncStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  syncStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  recordTitle: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dateText: {
    color: '#64748B',
    fontSize: 12,
    fontWeight: '500',
  },
  chevronBox: {
    marginLeft: 8,
    padding: 4,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 36,
  },
  emptyIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    color: '#0F172A',
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyText: {
    color: '#64748B',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  backHomeBtn: {
    paddingHorizontal: 28,
    width: '100%',
  },
});

