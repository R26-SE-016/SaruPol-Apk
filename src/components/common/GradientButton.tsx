import React from 'react';
import { StyleSheet, Text, TouchableOpacity, ViewStyle, TextStyle, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { COLORS, ROUNDING, SHADOWS } from '../../constants/theme';

interface GradientButtonProps {
  title: string;
  onPress: () => void;
  style?: ViewStyle;
  textStyle?: TextStyle;
  variant?: 'primary' | 'accent' | 'danger';
  loading?: boolean;
  disabled?: boolean;
}

export default function GradientButton({
  title,
  onPress,
  style,
  textStyle,
  variant = 'primary',
  loading = false,
  disabled = false,
}: GradientButtonProps) {
  const getGradientColors = (): [string, string] => {
    if (disabled) return ['#334E39', '#2D4232'];
    switch (variant) {
      case 'accent':
        return [COLORS.accent, COLORS.accentLight];
      case 'danger':
        return [COLORS.diseased, '#D32F2F'];
      case 'primary':
      default:
        return [COLORS.primaryLight, COLORS.primary];
    }
  };

  const handlePress = () => {
    if (loading || disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={handlePress}
      disabled={disabled || loading}
      style={[styles.touchable, disabled && styles.disabled, style]}
    >
      <LinearGradient
        colors={getGradientColors()}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        {loading ? (
          <ActivityIndicator color={COLORS.textPrimary} size="small" />
        ) : (
          <Text style={[styles.text, textStyle]}>{title}</Text>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  touchable: {
    borderRadius: ROUNDING.md,
    overflow: 'hidden',
    ...SHADOWS.soft,
  },
  gradient: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: COLORS.textPrimary,
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  disabled: {
    opacity: 0.65,
    elevation: 0,
    shadowOpacity: 0,
  },
});
