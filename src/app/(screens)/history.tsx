import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, ROUNDING } from '../../constants/theme';
import GlassCard from '../../components/common/GlassCard';
import GradientButton from '../../components/common/GradientButton';
import { useAppStore } from '../../store/appStore';

export default function HistoryScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { history, clearHistory, language } = useAppStore();

  const handleClearHistory = () => {
    Alert.alert(
      language === 'en' ? 'Clear History' : 'වාර්තා මකා දැමීම',
      language === 'en' ? 'Are you sure you want to clear all history?' : 'පසුගිය සියලු වාර්තා මකා දැමීමට ඔබට අවශ්‍යද?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: language === 'en' ? 'Clear' : 'මකන්න', style: 'destructive', onPress: clearHistory }
      ]
    );
  };

  const handleItemPress = (item: any) => {
    if (item.type === 'pathology') {
      router.push({
        pathname: '/(screens)/scan-result',
        params: {
          part: item.input.part,
          status: item.result.status,
          diagnosis: item.result.diagnosis,
          confidence: item.result.confidence,
          severity: item.result.severity,
          chemical: item.result.recommendations?.chemical || '',
          cultural: item.result.recommendations?.cultural || '',
          preventive: item.result.recommendations?.preventive || '',
          imageUri: item.input.imageUri || ''
        }
      });
    } else if (item.type === 'yield') {
      router.push({
        pathname: '/(screens)/predict-result',
        params: {
          is45DayMode: item.input.is45DayMode ? 'true' : 'false',
          prediction: item.result.ensemble_prediction || item.result.prediction,
          minInterval: item.result.confidence_interval?.[0] || 0,
          maxInterval: item.result.confidence_interval?.[1] || 0,
          rf: item.result.individual_models?.random_forest || 0,
          gb: item.result.individual_models?.gradient_boosting || 0,
          xgb: item.result.individual_models?.xgboost || 0,
          lgb: item.result.individual_models?.lightgbm || 0,
          insights: JSON.stringify(item.result.insights || item.result.recommendations || [])
        }
      });
    } else if (item.type === 'soil') {
      router.push({
        pathname: '/(screens)/soil-result',
        params: {
          healthScore: item.result.health_score,
          fertility: item.result.fertility,
          deficiencies: JSON.stringify(item.result.deficiencies || []),
          optimalRanges: JSON.stringify(item.result.optimal_ranges || {}),
          fertilizerPlan: JSON.stringify(item.result.fertilizer_plan || []),
          pH: item.input.pH.toString(),
          N: item.input.N.toString(),
          P: item.input.P.toString(),
          K: item.input.K.toString(),
          OC: item.input.Organic_Carbon.toString(),
          EC: item.input.EC.toString(),
        }
      });
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'pathology':
        return { name: 'scan', color: COLORS.healthy };
      case 'yield':
        return { name: 'trending-up', color: COLORS.accent };
      case 'soil':
        return { name: 'leaf', color: COLORS.info };
      default:
        return { name: 'document-text', color: COLORS.textSecondary };
    }
  };

  const formatTitle = (item: any) => {
    if (item.type === 'pathology') {
      return language === 'en' 
        ? `Scan: ${item.result.diagnosis || 'Healthy'}`
        : `පරීක්ෂාව: ${item.result.diagnosis || 'නිරෝගී'}`;
    }
    if (item.type === 'yield') {
      const is45 = item.input.is45DayMode;
      const amount = item.result.ensemble_prediction || item.result.prediction;
      return language === 'en'
        ? `Yield: ${amount} nuts (${is45 ? '45d' : 'Annual'})`
        : `අස්වැන්න: ගෙඩි ${amount} (${is45 ? 'දින 45' : 'වාර්ෂික'})`;
    }
    if (item.type === 'soil') {
      return language === 'en'
        ? `Soil Score: ${item.result.health_score}/100`
        : `පාංශු අගය: ${item.result.health_score}/100`;
    }
    return 'Calculation Log';
  };

  const formatDate = (dateString: string) => {
    const d = new Date(dateString);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.title}>
          {language === 'en' ? 'Activity Log' : 'පසුගිය වාර්තා'}
        </Text>
        {history.length > 0 ? (
          <TouchableOpacity onPress={handleClearHistory} style={styles.clearBtn}>
            <Ionicons name="trash-outline" size={22} color={COLORS.diseased} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      {history.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="document-text-outline" size={64} color={COLORS.textMuted} />
          <Text style={styles.emptyText}>{t('home.noRecentActivity')}</Text>
          <GradientButton
            title={language === 'en' ? 'Back' : 'ආපසු'}
            onPress={() => router.back()}
            style={styles.backHomeBtn}
          />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {history.map((item) => {
            const icon = getIcon(item.type);
            return (
              <TouchableOpacity
                key={item.id}
                onPress={() => handleItemPress(item)}
                activeOpacity={0.8}
                style={styles.touchableItem}
              >
                <GlassCard style={styles.itemCard}>
                  <View style={styles.itemRow}>
                    <View style={[styles.iconBox, { backgroundColor: `${icon.color}15` }]}>
                      <Ionicons name={icon.name as any} size={22} color={icon.color} />
                    </View>
                    
                    <View style={styles.infoCol}>
                      <Text style={styles.itemTitle}>{formatTitle(item)}</Text>
                      <Text style={styles.itemDate}>{formatDate(item.date)}</Text>
                    </View>

                    {/* Sync indicator */}
                    <View style={styles.syncBox}>
                      <Ionicons
                        name={item.synced ? "cloud-done-outline" : "phone-portrait-outline"}
                        size={18}
                        color={item.synced ? COLORS.healthy : COLORS.warning}
                      />
                    </View>
                  </View>
                </GlassCard>
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
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(76, 175, 80, 0.12)',
    backgroundColor: COLORS.surface,
  },
  backBtn: {
    padding: 8,
  },
  clearBtn: {
    padding: 8,
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 12,
  },
  touchableItem: {
    width: '100%',
  },
  itemCard: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
  },
  iconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  infoCol: {
    flex: 1,
    justifyContent: 'center',
  },
  itemTitle: {
    color: COLORS.textPrimary,
    fontSize: 15,
    fontWeight: 'bold',
  },
  itemDate: {
    color: COLORS.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  syncBox: {
    paddingLeft: 10,
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyText: {
    color: COLORS.textMuted,
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
  },
  backHomeBtn: {
    paddingHorizontal: 30,
    marginTop: 10,
  },
});
