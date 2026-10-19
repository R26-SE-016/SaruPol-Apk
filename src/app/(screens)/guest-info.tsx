import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { ROUNDING } from '../../constants/theme';
import GradientButton from '../../components/common/GradientButton';

const PALETTE = {
  bg: '#F8FAF8',
  cardBg: '#FFFFFF',
  cardBorder: '#E8EDE8',
  brandDark: '#142817',
  brandPrimary: '#15803D',
  brandEmerald: '#16A34A',
  brandLight: '#DCFCE7',
  brandSubtle: '#F0FDF4',
  textPrimary: '#0F172A',
  textSecondary: '#475569',
  textMuted: '#64748B',
  amberLight: '#FEF3C7',
};

export default function GuestInfoScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
            <Ionicons name="arrow-back" size={18} color={PALETTE.textPrimary} />
            <Text style={styles.backText}>{t('common.back')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('guest.title')}</Text>
          <View style={{ width: 60 }} />
        </View>

        {/* Banner Image */}
        <View style={styles.bannerWrapper}>
          <Image
            source={require('../../../assets/images/plantation_banner.png')}
            style={styles.banner}
          />
        </View>

        {/* Who We Are Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.iconCircleGreen}>
              <Ionicons name="information" size={16} color={PALETTE.brandEmerald} />
            </View>
            <Text style={styles.sectionTitle}>{t('guest.whoWeAreTitle')}</Text>
          </View>
          <Text style={styles.sectionText}>{t('guest.whoWeAreText')}</Text>
        </View>

        {/* What We Do Section */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeaderRow}>
            <View style={styles.iconCircleAmber}>
              <Ionicons name="layers" size={16} color="#D97706" />
            </View>
            <Text style={styles.sectionTitle}>{t('guest.whatWeDoTitle')}</Text>
          </View>
          <Text style={styles.sectionText}>{t('guest.whatWeDoText')}</Text>
          
          <View style={styles.featuresList}>
            <View style={styles.featureItemRow}>
              <Ionicons name="checkmark-circle" size={16} color={PALETTE.brandEmerald} />
              <Text style={styles.featureItemText}>{t('guest.featuresList.pathology')}</Text>
            </View>
            <View style={styles.featureItemRow}>
              <Ionicons name="checkmark-circle" size={16} color={PALETTE.brandEmerald} />
              <Text style={styles.featureItemText}>{t('guest.featuresList.yield')}</Text>
            </View>
            <View style={styles.featureItemRow}>
              <Ionicons name="checkmark-circle" size={16} color={PALETTE.brandEmerald} />
              <Text style={styles.featureItemText}>{t('guest.featuresList.soil')}</Text>
            </View>
            <View style={styles.featureItemRow}>
              <Ionicons name="checkmark-circle" size={16} color={PALETTE.brandEmerald} />
              <Text style={styles.featureItemText}>{t('guest.featuresList.advisor')}</Text>
            </View>
          </View>
        </View>

        {/* Prompt to register */}
        <View style={styles.registerPromptCard}>
          <View style={styles.promptHeader}>
            <Ionicons name="sparkles" size={18} color="#D97706" />
            <Text style={styles.promptTitle}>Premium Features</Text>
          </View>
          <Text style={styles.promptText}>{t('guest.getStartedText')}</Text>
          <GradientButton
            title={t('auth.registerTitle')}
            onPress={() => router.replace('/')}
            style={styles.regBtn}
          />
        </View>

        {/* Continue as Guest Button */}
        <GradientButton
          title={t('common.guest') + " (Enter App)"}
          onPress={() => router.replace('/(tabs)/home')}
          variant="accent"
          style={styles.enterBtn}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PALETTE.bg,
  },
  scrollContainer: {
    paddingHorizontal: 22,
    paddingTop: Platform.OS === 'ios' ? 56 : 38,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 12,
    backgroundColor: PALETTE.cardBg,
    borderRadius: ROUNDING.sm,
    borderColor: '#E2E8F0',
    borderWidth: 1,
  },
  backText: {
    color: PALETTE.textPrimary,
    fontWeight: '700',
    fontSize: 13,
  },
  title: {
    color: PALETTE.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  bannerWrapper: {
    height: 160,
    borderRadius: 20,
    overflow: 'hidden',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: PALETTE.cardBorder,
  },
  banner: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  sectionCard: {
    backgroundColor: PALETTE.cardBg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PALETTE.cardBorder,
    padding: 18,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#12211C',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  iconCircleGreen: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: PALETTE.brandLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleAmber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: PALETTE.amberLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    color: PALETTE.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  sectionText: {
    color: PALETTE.textSecondary,
    fontSize: 13.5,
    lineHeight: 20,
  },
  featuresList: {
    marginTop: 14,
    gap: 8,
    backgroundColor: '#F8FAF8',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EEF2EE',
  },
  featureItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureItemText: {
    color: PALETTE.textPrimary,
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  registerPromptCard: {
    backgroundColor: '#FEFBF2',
    borderColor: '#FEF08A',
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    marginBottom: 20,
  },
  promptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  promptTitle: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '800',
  },
  promptText: {
    color: '#78350F',
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 14,
  },
  regBtn: {
    alignSelf: 'stretch',
  },
  enterBtn: {
    marginTop: 4,
  },
});
