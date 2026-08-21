import { Stack } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useYieldApp } from '@/store/YieldAppContext';
import YieldAuthScreen from '@/components/yield/YieldAuthScreen';

export default function YieldLayout() {
  const { user, authReady } = useYieldApp();

  if (!authReady) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0C3B2E', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#86efac" />
      </View>
    );
  }

  if (!user) {
    return <YieldAuthScreen />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="list" />
      <Stack.Screen name="add-farm" />
      <Stack.Screen name="[id]/index" />
      <Stack.Screen name="[id]/analytics" />
      <Stack.Screen name="[id]/mapper" />
      <Stack.Screen name="[id]/telemetry" />
      <Stack.Screen name="[id]/logs" />
      <Stack.Screen name="[id]/add-zone" />
    </Stack>
  );
}
