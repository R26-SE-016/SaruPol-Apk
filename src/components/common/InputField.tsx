import React, { useState } from 'react';
import { StyleSheet, TextInput, View, Text, ViewStyle, TextStyle, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ROUNDING } from '../../constants/theme';

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
  icon?: keyof typeof Ionicons.glyphMap;
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
  icon,
}: InputFieldProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const shouldHideText = secureTextEntry ? !isPasswordVisible : false;

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
        {icon && (
          <View pointerEvents="none" style={styles.leadingIcon}>
            <Ionicons
              name={icon}
              size={18}
              color={error ? '#DC2626' : isFocused ? '#16A34A' : '#94A3B8'}
            />
          </View>
        )}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="#94A3B8"
          secureTextEntry={shouldHideText}
          keyboardType={keyboardType}
          autoCapitalize={keyboardType === 'email-address' ? 'none' : 'words'}
          autoCorrect={false}
          editable={true}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          style={[styles.input, inputStyle]}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setIsPasswordVisible(!isPasswordVisible)}
            style={styles.trailingIconBtn}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            activeOpacity={0.7}
          >
            <Ionicons
              name={isPasswordVisible ? 'eye-off-outline' : 'eye-outline'}
              size={20}
              color="#94A3B8"
            />
          </TouchableOpacity>
        )}
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
    color: '#334155',
    fontSize: 13,
    marginBottom: 6,
    fontWeight: '700',
    letterSpacing: 0.1,
  },
  inputWrapper: {
    backgroundColor: '#F8FAF8',
    borderColor: '#E2E8F0',
    borderWidth: 1.5,
    borderRadius: ROUNDING.md,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
  },
  inputWrapperFocused: {
    borderColor: '#16A34A',
    backgroundColor: '#FFFFFF',
  },
  inputWrapperError: {
    borderColor: '#DC2626',
    backgroundColor: '#FFF7F7',
  },
  leadingIcon: {
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: '100%',
    color: '#0F172A',
    fontSize: 15,
    fontWeight: '500',
    paddingVertical: 0,
    ...(Platform.OS === 'web' ? ({ outlineStyle: 'none' } as any) : {}),
  },
  trailingIconBtn: {
    padding: 4,
    marginLeft: 6,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
});
