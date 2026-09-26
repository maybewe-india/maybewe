import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADII, FONTS } from '../../lib/theme';
import { useTheme } from '../../lib/themeContext';

/**
 * TrustBadge — displays community trust score
 * variant: 'full' | 'compact' | 'score-only'
 */
export default function TrustBadge({ score = 0, verificationStatus, variant = 'compact', style }) {
  const { colors, isDark } = useTheme();
  const isVerified = verificationStatus === 'verified';
  const numScore = typeof score === 'number' ? score : parseFloat(score) || 0;
  const isFiveScale = numScore > 0 && numScore <= 5;
  const displayScore = isFiveScale ? `${numScore.toFixed(2)} / 5` : `${Math.round(numScore)}%`;
  const scorePercent = isFiveScale ? Math.min(100, Math.round(numScore * 20)) : Math.min(100, Math.max(0, Math.round(numScore)));

  const getScoreColor = () => {
    if (scorePercent >= 80) return colors.success;
    if (scorePercent >= 60) return colors.primary;
    if (scorePercent >= 40) return colors.warning;
    return colors.danger;
  };

  const scoreColor = getScoreColor();

  if (variant === 'score-only') {
    return (
      <View style={[styles.scoreOnly, style]}>
        <Text style={[styles.scoreOnlyNumber, { color: scoreColor }]}>{isFiveScale ? numScore.toFixed(2) : scorePercent}</Text>
        <Text style={[styles.scoreOnlyLabel, { color: colors.textMuted }]}>{isFiveScale ? '/ 5 Trust' : 'Trust'}</Text>
      </View>
    );
  }

  if (variant === 'full') {
    return (
      <View style={[styles.fullContainer, { backgroundColor: colors.surfaceGlass, borderColor: colors.border }, style]}>
        <View style={styles.fullRow}>
          <View style={[styles.scoreCircle, { borderColor: scoreColor }]}>
            <Text style={[styles.scoreNumber, { color: scoreColor }]}>{isFiveScale ? numScore.toFixed(2) : scorePercent}</Text>
          </View>
          <View style={styles.fullInfo}>
            <Text style={[styles.fullLabel, { color: colors.textSecondary }]}>
              Community Trust Score ({displayScore})
            </Text>
            <View style={[styles.barTrack, { backgroundColor: colors.border }]}>
              <View style={[styles.barFill, { width: `${scorePercent}%`, backgroundColor: scoreColor }]} />
            </View>
            {isVerified && (
              <View style={styles.verifiedRow}>
                <Ionicons name="shield-checkmark" size={12} color="#C8B27A" />
                <Text style={[styles.verifiedText, { color: '#756345' }]}>Identity Verified</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  }

  // compact
  return (
    <View style={[styles.compactContainer, { backgroundColor: isVerified ? 'rgba(200, 178, 122, 0.12)' : colors.chipBg, borderColor: isVerified ? 'rgba(200, 178, 122, 0.40)' : colors.border }, style]}>
      <Ionicons
        name={isVerified ? 'shield-checkmark' : 'shield-outline'}
        size={12}
        color={isVerified ? '#C8B27A' : colors.textMuted}
      />
      <Text style={[styles.compactScore, { color: scoreColor }]}>{displayScore}</Text>
      <Text style={[styles.compactLabel, { color: isVerified ? '#756345' : colors.textMuted }]}>Trust</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  scoreOnly: {
    alignItems: 'center',
  },
  scoreOnlyNumber: {
    fontSize: 20,
    fontWeight: '800',
  },
  scoreOnlyLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 1,
  },
  fullContainer: {
    borderRadius: RADII.xl,
    padding: 14,
    borderWidth: 1,
  },
  fullRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 2.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  scoreNumber: {
    fontFamily: FONTS.extraBold,
    fontSize: 18,
    fontWeight: '800',
  },
  fullInfo: {
    flex: 1,
  },
  fullLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  barTrack: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 6,
  },
  barFill: {
    height: 5,
    borderRadius: 3,
  },
  verifiedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  verifiedText: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    fontWeight: '600',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: RADII.full,
    borderWidth: 1,
  },
  compactScore: {
    fontFamily: FONTS.extraBold,
    fontSize: 12,
    fontWeight: '800',
  },
  compactLabel: {
    fontFamily: FONTS.semiBold,
    fontSize: 11,
    fontWeight: '600',
  },
});
