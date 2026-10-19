import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAppStore } from '../../store/appStore';
import { ROUNDING } from '../../constants/theme';
import { getLiveWeather, WeatherData } from '../../services/weatherService';
import { getCanopyHotspots, CanopyHotspotItem } from '../../services/pathologyService';

// Light theme color tokens specifically designed for modern, high-contrast outdoor & mobile use
const PALETTE = {
  bg: '#F8FAF8',
  cardBg: '#FFFFFF',
  cardBorder: '#E8EDE8',
  subtleBorder: '#F1F5F2',
  
  // Brand greens
  brandDark: '#142817',
  brandPrimary: '#15803D',
  brandEmerald: '#16A34A',
  brandLight: '#DCFCE7',
  brandSubtle: '#F0FDF4',
  
  // Accents & status
  amber: '#D97706',
  amberLight: '#FEF3C7',
  blue: '#0284C7',
  blueLight: '#E0F2FE',
  rose: '#E11D48',
  roseLight: '#FCE7F3',
  red: '#DC2626',
  redLight: '#FEE2E2',
  redSubtle: '#FFF5F5',
  redBorder: '#FECACA',
  
  // Text hierarchy
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  textLight: '#94A3B8',
};

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, isGuest, language, setLanguage, logoutUser, history, isConnected } = useAppStore();

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);
  const [hotspots, setHotspots] = useState<CanopyHotspotItem[]>([]);

  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('home.greetingMorning');
    if (hour < 18) return t('home.greetingAfternoon');
    return t('home.greetingEvening');
  };

  const getWeatherIcon = (cond: string = '') => {
    const c = cond.toLowerCase();
    if (c.includes('thunder')) return 'thunderstorm';
    if (c.includes('rain') || c.includes('shower') || c.includes('drizzle')) return 'rainy';
    if (c.includes('cloud')) return 'partly-sunny';
    if (c.includes('fog')) return 'cloudy';
    return 'sunny';
  };

  useEffect(() => {
    async function fetchWeather() {
      setWeatherLoading(true);
      try {
        let { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.log('Location permission denied, using defaults.');
          const data = await getLiveWeather(6.9271, 79.8612); // Colombo default
          setWeather(data);
          return;
        }

        let loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const data = await getLiveWeather(loc.coords.latitude, loc.coords.longitude);
        setWeather(data);
      } catch (err) {
        console.warn('Weather loading error:', err);
        const data = await getLiveWeather(6.9271, 79.8612);
        setWeather(data);
      } finally {
        setWeatherLoading(false);
      }
    }

    async function loadHotspots() {
      try {
        const res = await getCanopyHotspots(user?.estate_id || 'estate_001');
        setHotspots(res.hotspots || []);
      } catch (e) {
        // non-blocking
      }
    }

    fetchWeather();
    loadHotspots();
  }, [user?.estate_id]);

  const handleLogout = () => {
    Alert.alert(
      t('home.logoutTitle'),
      t('home.logoutMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('auth.loginBtn'), onPress: async () => {
            await logoutUser();
            router.replace('/');
          }
        }
      ]
    );
  };

  // Compute Stats
  const scanCount = history.filter(h => h.type === 'pathology').length;
  const avgYield = history.filter(h => h.type === 'yield').reduce((acc, h) => acc + (h.result.ensemble_prediction || h.result.prediction || 0), 0) / (history.filter(h => h.type === 'yield').length || 1);
  const soilScore = history.filter(h => h.type === 'soil')[0]?.result.health_score || '--';

  const formatAvgYield = () => {
    if (avgYield === 0) return '--';
    return Math.round(avgYield).toString();
  };

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      {/* Top Banner / Modern White Navigation Bar */}
      <View style={styles.header}>
        <View style={styles.userSection}>
          <View style={styles.greetingRow}>
            <Ionicons name="sunny" size={14} color={PALETTE.amber} style={{ marginRight: 4 }} />
            <Text style={styles.greetingText} numberOfLines={1}>{getGreeting()},</Text>
          </View>
          <Text style={styles.userNameText} numberOfLines={1} ellipsizeMode="tail">
            {isGuest ? t('common.guest') : (user?.name || 'Farmer')}
          </Text>
        </View>

        <View style={styles.headerActions}>
          {/* Segmented language toggle */}
          <View style={styles.langSelectorRow}>
            {(['en', 'si', 'ta'] as const).map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[
                  styles.langToggle,
                  language === lang && styles.langToggleActive
                ]}
                onPress={() => setLanguage(lang)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.langToggleText,
                  language === lang && styles.langToggleTextActive
                ]}>
                  {lang === 'en' ? 'EN' : lang === 'si' ? 'සිං' : 'த'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {!isGuest && (
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
              <Ionicons name="log-out-outline" size={20} color={PALETTE.red} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Offline Warning banner */}
        {!isConnected && (
          <View style={styles.offlineBanner}>
            <Ionicons name="wifi-outline" size={18} color={PALETTE.amber} style={styles.offlineIcon} />
            <Text style={styles.offlineText}>{t('common.offlineWarning')}</Text>
          </View>
        )}

        {/* Live Plantation Weather Card */}
        <View style={styles.weatherCard}>
          <View style={styles.weatherCardHeader}>
            <View style={styles.weatherTitleGroup}>
              <Ionicons name="leaf-outline" size={15} color={PALETTE.brandEmerald} style={{ marginRight: 6 }} />
              <Text style={styles.cardHeader}>{t('home.weatherTitle')}</Text>
            </View>
            <View style={styles.liveBadge}>
              <View style={styles.livePulseDot} />
              <Text style={styles.liveBadgeText}>LIVE GPS</Text>
            </View>
          </View>

          {weatherLoading ? (
            <ActivityIndicator size="small" color={PALETTE.brandEmerald} style={styles.spinner} />
          ) : (
            <View style={styles.weatherRow}>
              {/* Left Temperature & Condition */}
              <View style={styles.weatherMainCol}>
                <View style={styles.tempRow}>
                  <Text style={styles.weatherTemp}>{Math.round(weather?.temp ?? 26)}</Text>
                  <Text style={styles.tempDegree}>°C</Text>
                </View>
                <View style={styles.conditionChip}>
                  <Ionicons name={getWeatherIcon(weather?.condition)} size={14} color={PALETTE.amber} style={{ marginRight: 4 }} />
                  <Text style={styles.weatherCondition}>{weather?.condition || 'Partly Cloudy'}</Text>
                </View>
              </View>

              {/* Right Weather Metrics Pills */}
              <View style={styles.weatherDetailCol}>
                <View style={styles.metricPill}>
                  <View style={styles.metricIconWrapBlue}>
                    <Ionicons name="water" size={13} color={PALETTE.blue} />
                  </View>
                  <View>
                    <Text style={styles.metricLabel}>
                      {language === 'ta' ? 'ஈரப்பதம்' : language === 'si' ? 'තෙතමනය' : 'Humidity'}
                    </Text>
                    <Text style={styles.metricValue}>{weather?.humidity ?? 85}%</Text>
                  </View>
                </View>

                <View style={styles.metricPill}>
                  <View style={styles.metricIconWrapGreen}>
                    <Ionicons name="speedometer-outline" size={13} color={PALETTE.brandEmerald} />
                  </View>
                  <View>
                    <Text style={styles.metricLabel}>
                      {language === 'ta' ? 'காற்று' : language === 'si' ? 'සුළඟ' : 'Wind'}
                    </Text>
                    <Text style={styles.metricValue}>{weather?.windSpeed ?? 5.2} km/h</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Aerial Canopy Stress Hotspots Alert Card */}
        {hotspots.length > 0 && (
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => router.push('/(screens)/canopy-hotspots' as any)}
            style={styles.hotspotCard}
          >
            <View style={styles.hotspotLeftBar} />
            <View style={styles.hotspotContent}>
              <View style={styles.hotspotIconWrap}>
                <Ionicons name="airplane" size={20} color={PALETTE.red} />
              </View>
              <View style={styles.hotspotInfo}>
                <View style={styles.hotspotTitleRow}>
                  <Text style={styles.hotspotTitle}>
                    {language === 'ta'
                      ? `${hotspots.length} விமான அச்சுறுத்தல்கள்`
                      : language === 'si'
                      ? `ගුවන් තර්ජන කලාප ${hotspots.length} ක්`
                      : `${hotspots.length} Aerial Stress Hotspots`}
                  </Text>
                  <View style={styles.actionChip}>
                    <Text style={styles.actionChipText}>ALERT</Text>
                  </View>
                </View>
                <Text style={styles.hotspotSubtitle} numberOfLines={2}>
                  {language === 'ta'
                    ? 'ட்ரோன் ஸ்கேன் மூலம் கொடியிடப்பட்ட மரங்கள்'
                    : language === 'si'
                    ? 'ඩ්‍රෝන් මඟින් හඳුනාගත් ගස් පරීක්ෂා කරන්න'
                    : 'Drone NDVI/VARI flagged trees requiring leaf scans'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={PALETTE.red} />
            </View>
          </TouchableOpacity>
        )}

        {/* Quick Actions Shortcuts Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>{t('home.quickActions')}</Text>
          <Text style={styles.sectionSubtitle}>AI Farming Tools</Text>
        </View>

        {/* 2x2 Quick Action Cards Grid */}
        <View style={styles.actionGrid}>
          {/* 1. Disease Scan */}
          <TouchableOpacity
            style={styles.gridBtn}
            onPress={() => router.push('/(tabs)/scan')}
            activeOpacity={0.8}
          >
            <View style={[styles.iconContainer, { backgroundColor: PALETTE.brandLight }]}>
              <Ionicons name="scan" size={26} color={PALETTE.brandEmerald} />
            </View>
            <Text style={styles.gridBtnText}>
              {t('home.diseaseScan')}
            </Text>
            <Text style={styles.gridBtnSubtext}>
              {language === 'ta' ? 'இலை ஸ்கேன்' : language === 'si' ? 'කොළ පරීක්ෂාව' : 'Leaf AI Vision'}
            </Text>
          </TouchableOpacity>

          {/* 2. Yield Predict */}
          <TouchableOpacity
            style={styles.gridBtn}
            onPress={() => router.push('/(tabs)/yield')}
            activeOpacity={0.8}
          >
            <View style={[styles.iconContainer, { backgroundColor: PALETTE.amberLight }]}>
              <Ionicons name="trending-up" size={26} color={PALETTE.amber} />
            </View>
            <Text style={styles.gridBtnText}>
              {t('home.yieldPredict')}
            </Text>
            <Text style={styles.gridBtnSubtext}>
              {language === 'ta' ? 'முன்னறிவிப்பு' : language === 'si' ? 'අස්වනු පෙරදැක්ම' : 'Harvest Forecast'}
            </Text>
          </TouchableOpacity>

          {/* 3. Nutrition Checker */}
          <TouchableOpacity
            style={styles.gridBtn}
            onPress={() => router.push('/(tabs)/soil')}
            activeOpacity={0.8}
          >
            <View style={[styles.iconContainer, { backgroundColor: PALETTE.blueLight }]}>
              <Ionicons name="leaf" size={26} color={PALETTE.blue} />
            </View>
            <Text style={styles.gridBtnText}>
              {t('home.nutritionChecker')}
            </Text>
            <Text style={styles.gridBtnSubtext}>
              {language === 'ta' ? 'மண் பரிசோதனை' : language === 'si' ? 'පස් පෝෂණ මට්ටම' : 'Soil & Nutrients'}
            </Text>
          </TouchableOpacity>

          {/* 4. Ask AI Expert */}
          <TouchableOpacity
            style={styles.gridBtn}
            onPress={() => router.push('/(tabs)/advisor')}
            activeOpacity={0.8}
          >
            <View style={[styles.iconContainer, { backgroundColor: PALETTE.roseLight }]}>
              <Ionicons name="chatbubbles" size={26} color={PALETTE.rose} />
            </View>
            <Text style={styles.gridBtnText}>
              {t('home.askAiExpert')}
            </Text>
            <Text style={styles.gridBtnSubtext}>
              {language === 'ta' ? '24/7 உதவி' : language === 'si' ? '24/7 AI සහායක' : '24/7 Agro Copilot'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Plantation Statistics Header */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>
            {language === 'ta' ? 'தோட்ட புள்ளிவிவரம்' : language === 'si' ? 'වතු දත්ත සාරාංශය' : 'Plantation Stats'}
          </Text>
          <Text style={styles.sectionSubtitle}>Overview</Text>
        </View>

        {/* 3 Stat Cards Row */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <View style={styles.statTopRow}>
              <Ionicons name="scan-outline" size={13} color={PALETTE.brandEmerald} />
            </View>
            <Text style={[styles.statVal, { color: PALETTE.brandEmerald }]}>{scanCount}</Text>
            <Text style={styles.statLabel}>{t('home.statsTotalScans')}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statTopRow}>
              <Ionicons name="trending-up-outline" size={13} color={PALETTE.amber} />
            </View>
            <Text style={[styles.statVal, { color: PALETTE.amber }]}>{formatAvgYield()}</Text>
            <Text style={styles.statLabel}>{t('home.statsAvgYield')}</Text>
          </View>

          <View style={styles.statCard}>
            <View style={styles.statTopRow}>
              <Ionicons name="leaf-outline" size={13} color={PALETTE.blue} />
            </View>
            <Text style={[styles.statVal, { color: PALETTE.blue }]}>{soilScore}</Text>
            <Text style={styles.statLabel}>{t('home.statsSoilScore')}</Text>
          </View>
        </View>

        {/* Tip of the Day Card */}
        <View style={styles.tipCard}>
          <View style={styles.tipTitleRow}>
            <View style={styles.tipIconWrap}>
              <Ionicons name="bulb" size={16} color={PALETTE.amber} />
            </View>
            <Text style={styles.tipHeader}>{t('home.tipTitle')}</Text>
          </View>
          <Text style={styles.tipBody}>
            {language === 'ta'
              ? 'நிலையான NPK உரத்துடன் கரிம உரத்தைச் சேர்ப்பதன் மூலம் மண்ணின் கரிம செறிவு மற்றும் ஈரப்பதத்தை தக்கவைக்கும் திறன் மேம்படும், இது ஒட்டுமொத்த விளைச்சலை 15% வரை அதிகரிக்கும்.'
              : language === 'si'
                ? 'සාමාන්‍ය NPK පොහොර සමඟ කාබනික කොම්පෝස්ට් යෙදීමෙන් පසේ කාබන් සාන්ද්‍රණය සහ ජලය රඳවා ගැනීමේ හැකියාව වැඩි දියුණු වන අතර එමඟින් මුළු අස්වැන්න 15% කින් පමණ ඉහළ යයි.'
                : 'Applying Organic Compost along with standard NPK doses improves soil carbon concentration and moisture holding capacity, raising overall palm yield by up to 15%.'}
          </Text>
        </View>

        {/* Quick History Logs Link */}
        {history.length > 0 && (
          <TouchableOpacity
            style={styles.historyLinkCard}
            onPress={() => router.push('/(screens)/history')}
            activeOpacity={0.8}
          >
            <View style={styles.historyLinkLeft}>
              <View style={styles.historyIconWrap}>
                <Ionicons name="time-outline" size={18} color={PALETTE.brandEmerald} />
              </View>
              <Text style={styles.historyLinkText}>
                {language === 'ta' ? 'அனைத்து வரலாற்றுப் பதிவுகளையும் பார்க்க' : language === 'si' ? 'පසුගිය වාර්තා සියල්ල බලන්න' : 'View All History Logs'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={PALETTE.brandEmerald} />
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PALETTE.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 56 : 38,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEF2EE',
    backgroundColor: PALETTE.cardBg,
    ...Platform.select({
      ios: {
        shadowColor: '#12211C',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  userSection: {
    flex: 1,
    marginRight: 10,
    justifyContent: 'center',
  },
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  greetingText: {
    color: PALETTE.textSecondary,
    fontSize: 12.5,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
  userNameText: {
    color: PALETTE.textPrimary,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 8,
  },
  langSelectorRow: {
    flexDirection: 'row',
    gap: 2,
    backgroundColor: '#F1F5F2',
    padding: 3,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#E5EBE5',
  },
  langToggle: {
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 16,
    minWidth: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langToggleActive: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(21, 128, 61, 0.25)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  langToggleText: {
    color: PALETTE.textSecondary,
    fontWeight: '700',
    fontSize: 11,
  },
  langToggleTextActive: {
    color: PALETTE.brandEmerald,
    fontWeight: '800',
  },
  logoutBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: PALETTE.redLight,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: PALETTE.redBorder,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 40,
  },
  offlineBanner: {
    backgroundColor: PALETTE.amberLight,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#FDE68A',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  offlineIcon: {
    marginRight: 8,
  },
  offlineText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '700',
    flex: 1,
  },
  // Weather Card
  weatherCard: {
    backgroundColor: PALETTE.cardBg,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: PALETTE.cardBorder,
    padding: 18,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#142817',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  weatherCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F4F7F4',
  },
  weatherTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardHeader: {
    color: PALETTE.brandDark,
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: PALETTE.brandLight,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 5,
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: PALETTE.brandEmerald,
  },
  liveBadgeText: {
    color: PALETTE.brandPrimary,
    fontSize: 9.5,
    fontWeight: '800',
    letterSpacing: 0.4,
  },
  weatherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weatherMainCol: {
    flex: 1,
  },
  tempRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  weatherTemp: {
    color: PALETTE.textPrimary,
    fontSize: 40,
    fontWeight: '900',
    letterSpacing: -1,
    lineHeight: 46,
  },
  tempDegree: {
    color: PALETTE.brandEmerald,
    fontSize: 20,
    fontWeight: '700',
    marginTop: 4,
    marginLeft: 2,
  },
  conditionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF9EE',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#FEF08A',
  },
  weatherCondition: {
    color: '#B45309',
    fontSize: 12,
    fontWeight: '700',
  },
  weatherDetailCol: {
    gap: 8,
    alignItems: 'flex-end',
  },
  metricPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAF8',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EAEFEA',
    gap: 8,
    minWidth: 120,
  },
  metricIconWrapBlue: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: PALETTE.blueLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricIconWrapGreen: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: PALETTE.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricLabel: {
    color: PALETTE.textLight,
    fontSize: 10,
    fontWeight: '600',
  },
  metricValue: {
    color: PALETTE.textPrimary,
    fontSize: 12,
    fontWeight: '800',
  },
  spinner: {
    marginVertical: 18,
  },
  // Hotspot Alert Card
  hotspotCard: {
    backgroundColor: PALETTE.redSubtle,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PALETTE.redBorder,
    overflow: 'hidden',
    marginBottom: 22,
    position: 'relative',
    ...Platform.select({
      ios: {
        shadowColor: PALETTE.red,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  hotspotLeftBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4.5,
    backgroundColor: PALETTE.red,
  },
  hotspotContent: {
    padding: 14,
    paddingLeft: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  hotspotIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: PALETTE.redLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  hotspotInfo: {
    flex: 1,
    marginRight: 8,
  },
  hotspotTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  hotspotTitle: {
    fontSize: 13.5,
    fontWeight: '800',
    color: '#991B1B',
  },
  actionChip: {
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 6,
    paddingVertical: 1.5,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  actionChipText: {
    color: PALETTE.red,
    fontSize: 9,
    fontWeight: '800',
  },
  hotspotSubtitle: {
    fontSize: 11.5,
    color: '#7F1D1D',
    lineHeight: 16,
    fontWeight: '500',
  },
  // Section Headers
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 12,
  },
  sectionTitle: {
    color: PALETTE.textPrimary,
    fontSize: 17,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  sectionSubtitle: {
    color: PALETTE.textLight,
    fontSize: 11.5,
    fontWeight: '600',
  },
  // Quick Actions Grid
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 14,
    marginBottom: 24,
  },
  gridBtn: {
    width: '48%',
    backgroundColor: PALETTE.cardBg,
    borderColor: PALETTE.cardBorder,
    borderWidth: 1.5,
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#12211C',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  iconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  gridBtnText: {
    color: PALETTE.textPrimary,
    fontSize: 13.5,
    fontWeight: '800',
    textAlign: 'center',
  },
  gridBtnSubtext: {
    color: PALETTE.textLight,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    textAlign: 'center',
  },
  // Stats Row
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
    gap: 10,
  },
  statCard: {
    flex: 1,
    backgroundColor: PALETTE.cardBg,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: PALETTE.cardBorder,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 6,
    ...Platform.select({
      ios: {
        shadowColor: '#12211C',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statTopRow: {
    marginBottom: 4,
  },
  statVal: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  statLabel: {
    color: PALETTE.textSecondary,
    fontSize: 10.5,
    fontWeight: '700',
    marginTop: 4,
    textAlign: 'center',
  },
  // Tip Card
  tipCard: {
    backgroundColor: PALETTE.brandSubtle,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#DCFCE7',
    borderLeftWidth: 5,
    borderLeftColor: PALETTE.brandEmerald,
    padding: 16,
    marginBottom: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#15803D',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  tipTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  tipIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: PALETTE.amberLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipHeader: {
    color: PALETTE.brandDark,
    fontWeight: '800',
    fontSize: 12.5,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tipBody: {
    color: '#334155',
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '400',
  },
  // History Link
  historyLinkCard: {
    backgroundColor: PALETTE.cardBg,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: PALETTE.cardBorder,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  historyLinkLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  historyIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: PALETTE.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  historyLinkText: {
    color: PALETTE.textPrimary,
    fontWeight: '700',
    fontSize: 13,
    flex: 1,
  },
});
