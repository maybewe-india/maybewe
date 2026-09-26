import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADII } from '../lib/theme';

export default function InChatSafetyWarning({ warningReason, onDismiss }) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleDismiss = () => {
    setDismissed(true);
    if (onDismiss) onDismiss();
  };

  return (
    <View style={styles.banner}>
      <View style={styles.iconCircle}>
        <Ionicons name="shield-half" size={16} color={COLORS.sunset} />
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.title}>Safety Reminder</Text>
        <Text style={styles.message}>
          {warningReason ? `${warningReason}. ` : ''}
          Avoid sharing personal contact info or financials too early.
        </Text>
      </View>

      <TouchableOpacity
        onPress={handleDismiss}
        style={styles.closeButton}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel="Dismiss safety reminder"
      >
        <Ionicons name="close" size={18} color={COLORS.textMuted} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 208, 166, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(255, 208, 166, 0.28)',
    borderRadius: RADII.xl,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  iconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(255, 208, 166, 0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.sunset,
    marginBottom: 2,
  },
  message: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.75)',
    lineHeight: 16,
  },
  closeButton: {
    padding: 4,
    marginLeft: 8,
  },
});
