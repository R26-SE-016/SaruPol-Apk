import React from 'react';
import { StyleSheet, View, Text, ScrollView, TouchableOpacity, Image, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { COLORS, ROUNDING } from '../../constants/theme';
import GlassCard from '../../components/common/GlassCard';
import GradientButton from '../../components/common/GradientButton';

export default function GuestInfoScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Text style={styles.backText}>← {t('common.back')}</Text>
          </TouchableOpacity>
          <Text style={styles.title}>{t('guest.title')}</Text>
        </View>

        {/* Banner Image */}
        <View style={styles.bannerWrapper}>
          <Image
            source={require('../../../assets/images/plantation_banner.png')}
            style={styles.banner}
          />
        </View>

        {/* Who We Are Section */}
        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('guest.whoWeAreTitle')}</Text>
          <Text style={styles.sectionText}>{t('guest.whoWeAreText')}</Text>
        </GlassCard>

        {/* What We Do Section */}
        <GlassCard style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('guest.whatWeDoTitle')}</Text>
          <Text style={styles.sectionText}>{t('guest.whatWeDoText')}</Text>
          
          <View style={styles.featuresList}>
            <Text style={styles.featureItem}>{t('guest.featuresList.pathology')}</Text>
            <Text style={styles.featureItem}>{t('guest.featuresList.yield')}</Text>
            <Text style={styles.featureItem}>{t('guest.featuresList.soil')}</Text>
            <Text style={styles.featureItem}>{t('guest.featuresList.advisor')}</Text>
          </View>
        </GlassCard>

        {/* Prompt to register */}
        <GlassCard style={styles.registerPromptCard}>
          <Text style={styles.promptText}>{t('guest.getStartedText')}</Text>
          <GradientButton
            title={t('auth.registerTitle')}
            onPress={() => router.replace('/')}
            style={styles.regBtn}
          />
        </GlassCard>

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
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    paddingHorizontal: 24,
    paddingTop: Platform.OS === 'ios' ? 60 : 30,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  backButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: 'rgba(27, 94, 32, 0.2)',
    borderRadius: ROUNDING.sm,
    borderColor: 'rgba(76, 175, 80, 0.2)',
    borderWidth: 1,
    position: 'absolute',
    left: 0,
    zIndex: 10,
  },
  backText: {
    color: COLORS.textPrimary,
    fontWeight: 'bold',
  },
  title: {
    flex: 1,
    textAlign: 'center',
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  bannerWrapper: {
    height: 160,
    borderRadius: ROUNDING.md,
    overflow: 'hidden',
    marginBottom: 20,
  },
  banner: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  sectionCard: {
    marginBottom: 16,
  },
  sectionTitle: {
    color: COLORS.accentLight,
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  sectionText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
  featuresList: {
    marginTop: 12,
    gap: 8,
  },
  featureItem: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    paddingLeft: 6,
  },
  registerPromptCard: {
    backgroundColor: 'rgba(255, 143, 0, 0.08)',
    borderColor: 'rgba(255, 143, 0, 0.25)',
    marginBottom: 24,
  },
  promptText: {
    color: COLORS.textPrimary,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  regBtn: {
    alignSelf: 'center',
    paddingHorizontal: 32,
  },
  enterBtn: {
    marginTop: 10,
  },
});
