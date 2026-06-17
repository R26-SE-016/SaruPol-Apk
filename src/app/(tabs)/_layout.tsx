import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { COLORS } from '../../constants/theme';
import { useTranslation } from 'react-i18next';

export default function TabLayout() {
  const { t } = useTranslation();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primaryLight,
        tabBarInactiveTintColor: COLORS.textSecondary,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: 'rgba(76, 175, 80, 0.15)',
          borderTopWidth: 1.5,
          height: Platform.OS === 'ios' ? 90 : 70,
          paddingBottom: Platform.OS === 'ios' ? 30 : 12,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: t('home.quickActions'),
          tabBarLabel: t('common.welcome'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: t('pathology.title'),
          tabBarLabel: t('pathology.title'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "scan" : "scan-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="predict"
        options={{
          title: t('yield.title'),
          tabBarLabel: t('yield.title'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "trending-up" : "trending-up-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="soil"
        options={{
          title: t('soil.title'),
          tabBarLabel: t('soil.title'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "leaf" : "leaf-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="advisor"
        options={{
          title: t('advisor.title'),
          tabBarLabel: t('advisor.title'),
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "chatbubbles" : "chatbubbles-outline"} size={24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
