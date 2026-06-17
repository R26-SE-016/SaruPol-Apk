import React, { useState } from 'react';
import { StyleSheet, TextInput, View, Text, ViewStyle, TextStyle } from 'react-native';
import { COLORS, ROUNDING } from '../../constants/theme';

interface InputFieldProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address';
  style?: ViewStyle;
  inputStyle?: TextStyle;
  error?: string;
}

export default function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  style,
  inputStyle,
  error,
}: InputFieldProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View
        style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          error ? styles.inputWrapperError : null,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={COLORS.textMuted}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[styles.input, inputStyle]}
        />
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: '100%',
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: 14,
    marginBottom: 6,
    fontWeight: '600',
  },
  inputWrapper: {
    backgroundColor: 'rgba(27, 94, 32, 0.08)',
    borderColor: 'rgba(76, 175, 80, 0.2)',
    borderWidth: 1.5,
    borderRadius: ROUNDING.md,
    height: 52,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  inputWrapperFocused: {
    borderColor: COLORS.primaryLight,
    backgroundColor: 'rgba(27, 94, 32, 0.14)',
  },
  inputWrapperError: {
    borderColor: COLORS.diseased,
  },
  input: {
    color: COLORS.textPrimary,
    fontSize: 16,
    height: '100%',
  },
  errorText: {
    color: COLORS.diseased,
    fontSize: 12,
    marginTop: 4,
    fontWeight: '500',
  },
});
