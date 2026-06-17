import React from 'react';
import { StyleSheet, View, ViewStyle, Platform, StyleProp } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, ROUNDING } from '../../constants/theme';

interface GlassCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function GlassCard({ children, style }: GlassCardProps) {
  return (
    <LinearGradient
      colors={['rgba(27, 94, 32, 0.18)', 'rgba(18, 38, 23, 0.35)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, style as any]}
    >
      <View style={styles.innerContent}>
        {children}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: ROUNDING.md,
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.22)',
    overflow: 'hidden',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
      web: {
        boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
      }
    })
  },
  innerContent: {
    padding: 16,
  }
});
