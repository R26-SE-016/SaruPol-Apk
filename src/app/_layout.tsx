import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import NetInfo from '@react-native-community/netinfo';
import { initI18n } from '../utils/i18n';
import { useAppStore } from '../store/appStore';
import { COLORS } from '../constants/theme';

export default function RootLayout() {
  const [initialized, setInitialized] = useState(false);
  const loadPersistedData = useAppStore((state) => state.loadPersistedData);
  const setConnectionStatus = useAppStore((state) => state.setConnectionStatus);

  useEffect(() => {
    async function prepare() {
      try {
        // Initialize i18n translations
        await initI18n();
        // Load offline persisted app data
        await loadPersistedData();
      } catch (e) {
        console.warn('Initialization warning:', e);
      } finally {
        setInitialized(true);
      }
    }

    prepare();

    // Subscribe to network connection updates
    const unsubscribe = NetInfo.addEventListener((state) => {
      setConnectionStatus(!!state.isConnected);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  if (!initialized) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primaryLight} />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(screens)/scan-result" />
        <Stack.Screen name="(screens)/predict-result" />
        <Stack.Screen name="(screens)/soil-result" />
        <Stack.Screen name="(screens)/guest-info" />
        <Stack.Screen name="(screens)/history" />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
