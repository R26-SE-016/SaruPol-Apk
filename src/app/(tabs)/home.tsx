import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Platform, Alert, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useAppStore } from '../../store/appStore';
import { COLORS, ROUNDING } from '../../constants/theme';
import GlassCard from '../../components/common/GlassCard';
import GradientButton from '../../components/common/GradientButton';
import { getLiveWeather, WeatherData } from '../../services/weatherService';

export default function HomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const { user, isGuest, language, setLanguage, logoutUser, history, isConnected } = useAppStore();

  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(true);

  // Time-aware greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return t('home.greetingMorning');
    if (hour < 18) return t('home.greetingAfternoon');
    return t('home.greetingEvening');
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

    fetchWeather();
  }, []);

  const handleLogout = () => {
    const logoutTitle = language === 'ta' ? 'வெளியேறு' : language === 'si' ? 'පිටවීම' : 'Logout';
    const logoutMsg = language === 'ta' ? 'நீங்கள் வெளியேற விரும்புகிறீர்களா?' : language === 'si' ? 'ඔබට ගිණුමෙන් ඉවත් වීමට අවශ්‍ය බව ස්ථිරද?' : 'Are you sure you want to log out?';
    Alert.alert(
      logoutTitle,
      logoutMsg,
      [
        { text: t('common.cancel'), style: 'cancel' },
        { text: t('auth.loginBtn'), onPress: async () => {
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
      {/* Top Banner / Navigation Bar */}
      <View style={styles.header}>
        <View style={styles.userSection}>
          <Text style={styles.greetingText} numberOfLines={1}>{getGreeting()},</Text>
          <Text style={styles.userNameText} numberOfLines={1} ellipsizeMode="tail">
            {isGuest ? t('common.guest') : (user?.name || 'Farmer')}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <View style={styles.langSelectorRow}>
            {(['en', 'si', 'ta'] as const).map((lang) => (
              <TouchableOpacity
                key={lang}
                style={[
                  styles.langToggle,
                  language === lang && styles.langToggleActive
                ]}
                onPress={() => setLanguage(lang)}
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
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={24} color={COLORS.diseased} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Offline Warning banner */}
        {!isConnected && (
          <View style={styles.offlineBanner}>
            <Ionicons name="wifi-outline" size={20} color={COLORS.background} style={styles.offlineIcon} />
            <Text style={styles.offlineText}>{t('common.offlineWarning')}</Text>
          </View>
        )}

        {/* Live Weather Widget */}
        <GlassCard style={styles.weatherCard}>
          <Text style={styles.cardHeader}>{t('home.weatherTitle')}</Text>
          {weatherLoading ? (
            <ActivityIndicator size="small" color={COLORS.primaryLight} style={styles.spinner} />
          ) : (
            <View style={styles.weatherRow}>
              <View>
                <Text style={styles.weatherTemp}>{weather?.temp}°C</Text>
                <Text style={styles.weatherCondition}>{weather?.condition}</Text>
              </View>
              <View style={styles.weatherDetailCol}>
                <Text style={styles.weatherDetailText}>
                  💧 {language === 'ta' ? 'ஈரப்பதம்' : language === 'si' ? 'තෙතමනය' : 'Humidity'}: {weather?.humidity}%
                </Text>
                <Text style={styles.weatherDetailText}>
                  💨 {language === 'ta' ? 'காற்று' : language === 'si' ? 'සුළඟ' : 'Wind'}: {weather?.windSpeed} km/h
                </Text>
              </View>
            </View>
          )}
        </GlassCard>

        {/* Quick Actions Shortcuts */}
        <Text style={styles.sectionTitle}>{t('home.quickActions')}</Text>
        <View style={styles.actionGrid}>
          <TouchableOpacity
            style={styles.gridBtn}
            onPress={() => router.push('/(tabs)/scan')}
          >
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(76,175,80,0.15)' }]}>
              <Ionicons name="scan" size={28} color={COLORS.healthy} />
            </View>
            <Text style={styles.gridBtnText}>
              {language === 'ta' ? 'நோய் ஸ்கேன்' : language === 'si' ? 'රෝග හඳුනාගැනීම' : 'Disease Scan'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridBtn}
            onPress={() => router.push('/(tabs)/yield')}
          >
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,143,0,0.15)' }]}>
              <Ionicons name="trending-up" size={28} color={COLORS.accent} />
            </View>
            <Text style={styles.gridBtnText}>
              {language === 'ta' ? 'விளைச்சல் கணிப்பு' : language === 'si' ? 'අස්වනු අනාවැකි' : 'Yield Predict'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridBtn}
            onPress={() => router.push('/(tabs)/soil')}
          >
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(41,182,246,0.15)' }]}>
              <Ionicons name="leaf" size={28} color={COLORS.info} />
            </View>
            <Text style={styles.gridBtnText}>
              {language === 'ta' ? 'மண் ஆரோக்கியம்' : language === 'si' ? 'පාංශු පරීක්ෂාව' : 'Soil Health'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.gridBtn}
            onPress={() => router.push('/(tabs)/advisor')}
          >
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(239,83,80,0.15)' }]}>
              <Ionicons name="chatbubbles" size={28} color={COLORS.diseased} />
            </View>
            <Text style={styles.gridBtnText}>
              {language === 'ta' ? 'AI ஆலோசகர்' : language === 'si' ? 'AI උපදේශක' : 'Ask AI Expert'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Plantation Statistics */}
        <Text style={styles.sectionTitle}>
          {language === 'ta' ? 'தோட்ட புள்ளிவிவரம்' : language === 'si' ? 'වතු දත්ත සාරාංශය' : 'Plantation Stats'}
        </Text>
        <View style={styles.statsRow}>
          <GlassCard style={styles.statCard}>
            <Text style={styles.statVal}>{scanCount}</Text>
            <Text style={styles.statLabel}>{t('home.statsTotalScans')}</Text>
          </GlassCard>

          <GlassCard style={styles.statCard}>
            <Text style={styles.statVal}>{formatAvgYield()}</Text>
            <Text style={styles.statLabel}>{t('home.statsAvgYield')}</Text>
          </GlassCard>

          <GlassCard style={styles.statCard}>
            <Text style={styles.statVal}>{soilScore}</Text>
            <Text style={styles.statLabel}>{t('home.statsSoilScore')}</Text>
          </GlassCard>
        </View>

        {/* Tip of the Day Card */}
        <GlassCard style={styles.tipCard}>
          <View style={styles.tipTitleRow}>
            <Ionicons name="bulb-outline" size={22} color={COLORS.accent} />
            <Text style={styles.tipHeader}>{t('home.tipTitle')}</Text>
          </View>
          <Text style={styles.tipBody}>
            {language === 'ta'
              ? 'நிலையான NPK உரத்துடன் கரிம உரத்தைச் சேர்ப்பதன் மூலம் மண்ணின் கரிம செறிவு மற்றும் ஈரப்பதத்தை தக்கவைக்கும் திறன் மேம்படும், இது ஒட்டுமொத்த விளைச்சலை 15% வரை அதிகரிக்கும்.'
              : language === 'si'
              ? 'සාමාන්‍ය NPK පොහොර සමඟ කාබනික කොම්පෝස්ට් යෙදීමෙන් පසේ කාබන් සාන්ද්‍රණය සහ ජලය රඳවා ගැනීමේ හැකියාව වැඩි දියුණු වන අතර එමඟින් මුළු අස්වැන්න 15% කින් පමණ ඉහළ යයි.'
              : 'Applying Organic Compost along with standard NPK doses improves soil carbon concentration and moisture holding capacity, raising overall palm yield by up to 15%.'}
          </Text>
        </GlassCard>

        {/* Quick History Link */}
        {history.length > 0 && (
          <TouchableOpacity
            style={styles.historyLink}
            onPress={() => router.push('/(screens)/history')}
          >
            <Text style={styles.historyLinkText}>
              {language === 'ta' ? 'அனைத்து வரலாற்றுப் பதிவுகளையும் பார்க்க' : language === 'si' ? 'පසුගිය වාර්තා සියල්ල බලන්න' : 'View All History Logs'} →
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
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
  userSection: {
    flex: 1,
    marginRight: 8,
    justifyContent: 'center',
  },
  greetingText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  userNameText: {
    color: COLORS.textPrimary,
    fontSize: 17,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: 8,
  },
  langSelectorRow: {
    flexDirection: 'row',
    gap: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.22)',
    padding: 2,
    borderRadius: ROUNDING.sm,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.2)',
  },
  langToggle: {
    backgroundColor: 'transparent',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: ROUNDING.sm - 2,
    minWidth: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langToggleActive: {
    backgroundColor: 'rgba(76, 175, 80, 0.40)',
    borderColor: COLORS.primaryLight,
    borderWidth: 1,
  },
  langToggleText: {
    color: COLORS.textSecondary,
    fontWeight: 'bold',
    fontSize: 11,
  },
  langToggleTextActive: {
    color: '#FFFFFF',
  },
  logoutBtn: {
    padding: 6,
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  offlineBanner: {
    backgroundColor: COLORS.warning,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: ROUNDING.sm,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  offlineIcon: {
    marginRight: 10,
  },
  offlineText: {
    color: COLORS.background,
    fontSize: 12,
    fontWeight: 'bold',
    flex: 1,
  },
  weatherCard: {
    marginBottom: 24,
  },
  cardHeader: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  weatherRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  weatherTemp: {
    color: COLORS.textPrimary,
    fontSize: 32,
    fontWeight: 'bold',
  },
  weatherCondition: {
    color: COLORS.accentLight,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 2,
  },
  weatherDetailCol: {
    alignItems: 'flex-end',
    gap: 4,
  },
  weatherDetailText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '500',
  },
  spinner: {
    marginVertical: 12,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 14,
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 14,
    marginBottom: 24,
  },
  gridBtn: {
    width: '47%',
    backgroundColor: COLORS.surface,
    borderColor: 'rgba(76, 175, 80, 0.1)',
    borderWidth: 1.5,
    borderRadius: ROUNDING.md,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  iconContainer: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridBtnText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  statCard: {
    width: '31%',
    alignItems: 'center',
    paddingVertical: 12,
  },
  statVal: {
    color: COLORS.primaryLight,
    fontSize: 22,
    fontWeight: 'bold',
  },
  statLabel: {
    color: COLORS.textSecondary,
    fontSize: 10,
    fontWeight: '600',
    marginTop: 4,
    textAlign: 'center',
  },
  tipCard: {
    marginBottom: 20,
    backgroundColor: 'rgba(27, 94, 32, 0.08)',
  },
  tipTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  tipHeader: {
    color: COLORS.accentLight,
    fontWeight: 'bold',
    fontSize: 14,
  },
  tipBody: {
    color: COLORS.textPrimary,
    fontSize: 13,
    lineHeight: 18,
  },
  historyLink: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  historyLinkText: {
    color: COLORS.primaryLight,
    fontWeight: 'bold',
    fontSize: 14,
  },
});
