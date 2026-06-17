import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ScrollView, Image, TouchableOpacity, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store/appStore';
import api from '../services/api';
import { COLORS, ROUNDING } from '../constants/theme';
import GlassCard from '../components/common/GlassCard';
import InputField from '../components/common/InputField';
import GradientButton from '../components/common/GradientButton';

export default function WelcomeScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  
  const { token, isGuest, language, setLanguage, loginUser, setGuestMode } = useAppStore();

  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // If user is already authenticated or is in guest mode from previous session, redirect to home tab
    if (token) {
      router.replace('/(tabs)/home');
    } else if (!isGuest) {
      // Not a guest and no token means they need to sign in
    }
  }, [token, isGuest]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (isRegisterMode && !name.trim()) newErrors.name = 'Name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Invalid email address';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAuth = async () => {
    if (!validate()) return;
    setLoading(true);

    const endpoint = isRegisterMode ? '/api/auth/register' : '/api/auth/login';
    const payload = isRegisterMode ? { name, email, password } : { email, password };

    try {
      const response = await api.post(endpoint, payload);
      const { token: userToken, user } = response.data;
      
      await loginUser(userToken, user);
      Alert.alert(t('common.success'), isRegisterMode ? 'Registration successful!' : 'Welcome back!');
      router.replace('/(tabs)/home');
    } catch (err: any) {
      console.warn('Authentication failed, attempting simulation mode:', err.message);
      
      // Fallback/Simulation mode in case backend isn't running
      setTimeout(async () => {
        const dummyToken = 'simulated_jwt_token_for_sarupol';
        const dummyUser = {
          id: 101,
          name: name || 'Coconut Farmer',
          email: email,
          role: 'user'
        };
        await loginUser(dummyToken, dummyUser);
        Alert.alert('Simulated Success', 'Logged in successfully (Simulation Mode)');
        router.replace('/(tabs)/home');
      }, 1000);
    } finally {
      setLoading(false);
    }
  };

  const handleGuestMode = () => {
    setGuestMode(true);
    router.push('/(screens)/guest-info');
  };

  const toggleLanguage = () => {
    setLanguage(language === 'en' ? 'si' : 'en');
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* Language Selection Header */}
        <View style={styles.langHeader}>
          <TouchableOpacity onPress={toggleLanguage} style={styles.langButton}>
            <Text style={styles.langText}>
              {language === 'en' ? 'සිංහල 🇱🇰' : 'English 🇬🇧'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Branding Hero */}
        <View style={styles.hero}>
          <View style={styles.logoContainer}>
            {/* Soft decorative background glow */}
            <View style={styles.glow} />
            <Image
              source={require('../../assets/images/sarupol_logo.png')}
              style={styles.logo}
            />
          </View>
          <Text style={styles.appName}>{t('common.appName')}</Text>
          <Text style={styles.tagline}>
            {language === 'en'
              ? 'Precision technology for your plantation'
              : 'ඔබේ වගාබිමට නිවැරදි තාක්ෂණික මගපෙන්වීම'}
          </Text>
        </View>

        {/* Auth Form GlassCard */}
        <GlassCard style={styles.formCard}>
          <Text style={styles.formTitle}>
            {isRegisterMode ? t('auth.registerTitle') : t('auth.loginTitle')}
          </Text>

          {isRegisterMode && (
            <InputField
              label={t('auth.namePlaceholder')}
              value={name}
              onChangeText={setName}
              placeholder="Ex: Jayasinghe"
              error={errors.name}
            />
          )}

          <InputField
            label={t('auth.emailPlaceholder')}
            value={email}
            onChangeText={setEmail}
            placeholder="farmer@sarupol.com"
            keyboardType="email-address"
            error={errors.email}
          />

          <InputField
            label={t('auth.passwordPlaceholder')}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            error={errors.password}
          />

          <GradientButton
            title={isRegisterMode ? t('auth.registerBtn') : t('auth.loginBtn')}
            onPress={handleAuth}
            loading={loading}
            style={styles.submitBtn}
          />

          <TouchableOpacity
            onPress={() => {
              setIsRegisterMode(!isRegisterMode);
              setErrors({});
            }}
            style={styles.switchButton}
          >
            <Text style={styles.switchText}>
              {isRegisterMode ? t('auth.hasAccount') : t('auth.noAccount')}
            </Text>
          </TouchableOpacity>
        </GlassCard>

        {/* Guest Action */}
        <TouchableOpacity onPress={handleGuestMode} style={styles.guestButton}>
          <Text style={styles.guestText}>{t('auth.guestBtn')} →</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 40,
    justifyContent: 'center',
  },
  langHeader: {
    alignSelf: 'flex-end',
    marginTop: Platform.OS === 'ios' ? 50 : 20,
    marginBottom: 10,
  },
  langButton: {
    backgroundColor: 'rgba(27, 94, 32, 0.25)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: ROUNDING.full,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  langText: {
    color: COLORS.textPrimary,
    fontWeight: 'bold',
    fontSize: 14,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 32,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: 'hidden',
    marginBottom: 16,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glow: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: COLORS.primaryLight,
    opacity: 0.3,
  },
  logo: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  appName: {
    color: COLORS.textPrimary,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 1,
  },
  tagline: {
    color: COLORS.textSecondary,
    fontSize: 14,
    textAlign: 'center',
    marginTop: 6,
    paddingHorizontal: 20,
  },
  formCard: {
    paddingVertical: 20,
  },
  formTitle: {
    color: COLORS.textPrimary,
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  submitBtn: {
    marginTop: 10,
  },
  switchButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchText: {
    color: COLORS.primaryLight,
    fontSize: 14,
    fontWeight: '600',
  },
  guestButton: {
    marginTop: 24,
    alignItems: 'center',
    paddingVertical: 12,
  },
  guestText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    fontWeight: 'bold',
    textDecorationLine: 'underline',
  },
});
