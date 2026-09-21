import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADII, FONTS } from '../../lib/theme';
import { useTheme } from '../../lib/themeContext';

export default function InputField({
  label,
  placeholder,
  value,
  onChangeText,
  secureTextEntry,
  keyboardType,
  autoCapitalize = 'sentences',
  autoCorrect,
  autoComplete,
  textContentType,
  accessibilityLabel,
  icon,
  error,
  style,
  inputStyle,
  multiline,
  numberOfLines,
  maxLength,
  rightAction,
  rightActionIcon,
  editable = true,
  onFocus,
  onBlur,
  returnKeyType,
  onSubmitEditing,
}) {
  const { colors, isDark } = useTheme();
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const borderAnim = useRef(new Animated.Value(0)).current;

  const handleFocus = () => {
    setIsFocused(true);
    Animated.timing(borderAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: false,
    }).start();
    onFocus?.();
  };

  const handleBlur = () => {
    setIsFocused(false);
    Animated.timing(borderAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
    onBlur?.();
  };

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [colors.inputBorder, colors.primary],
  });

  const borderWidth = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.5],
  });

  return (
    <View style={[styles.wrapper, style]}>
      {label && <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>}
      <Animated.View
        style={[
          styles.inputContainer,
          {
            backgroundColor: colors.inputBg,
            borderColor,
            borderWidth,
          },
          error && { borderColor: colors.danger },
          !editable && styles.inputDisabled,
        ]}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={isFocused ? colors.primary : colors.textMuted}
            style={styles.leftIcon}
          />
        )}
        <TextInput
          style={[
            styles.input,
            { color: colors.textPrimary },
            icon && styles.inputWithIcon,
            multiline && styles.multilineInput,
            inputStyle,
          ]}
          placeholder={placeholder}
          placeholderTextColor={colors.textDisabled}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry && !showPassword}
          keyboardType={keyboardType || 'default'}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          autoComplete={autoComplete}
          textContentType={textContentType}
          accessibilityLabel={accessibilityLabel || label}
          onFocus={handleFocus}
          onBlur={handleBlur}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          editable={editable}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          selectionColor={colors.primary}
        />
        {secureTextEntry && (
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.rightIcon}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityRole="button"
            accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        )}
        {rightActionIcon && rightAction && !secureTextEntry && (
          <TouchableOpacity onPress={rightAction} style={styles.rightIcon}>
            <Ionicons name={rightActionIcon} size={18} color={colors.primary} />
          </TouchableOpacity>
        )}
      </Animated.View>
      {error ? <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 14,
  },
  label: {
    fontFamily: FONTS.semiBold,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 7,
    letterSpacing: 0.2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: RADII.lg,
    borderWidth: 1,
    minHeight: 52,
    paddingHorizontal: 14,
  },
  leftIcon: {
    marginRight: 10,
  },
  rightIcon: {
    marginLeft: 10,
    padding: 2,
  },
  input: {
    fontFamily: FONTS.regular,
    flex: 1,
    fontSize: 15,
    paddingVertical: 14,
    fontWeight: '400',
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  multilineInput: {
    paddingTop: 14,
    paddingBottom: 14,
    minHeight: 90,
    textAlignVertical: 'top',
  },
  inputDisabled: {
    opacity: 0.5,
  },
  errorText: {
    fontFamily: FONTS.medium,
    fontSize: 12,
    marginTop: 5,
    marginLeft: 4,
    fontWeight: '500',
  },
});
