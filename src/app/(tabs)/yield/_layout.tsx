import { useRouter, useLocalSearchParams } from "expo-router";
import { Stack } from 'expo-router';

export default function YieldLayout() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const farmId = params.id as string;
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
