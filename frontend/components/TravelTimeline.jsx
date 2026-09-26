import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { RADII, GRADIENTS } from '../lib/theme';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../lib/themeContext';

export default function TravelTimeline({ history = [] }) {
  const { colors } = useTheme();

  if (!history || history.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="airplane-outline" size={28} color={colors.textMuted} />
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>No past adventures added yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {history.map((item, index) => {
        const isLast = index === history.length - 1;
        return (
          <View key={index} style={styles.itemRow}>
            {/* Timeline Line & Node */}
            <View style={styles.nodeColumn}>
              <LinearGradient
                colors={['#0F172A', '#334155']}
                style={styles.nodeCircle}
              >
                <Ionicons name="location" size={11} color="#FFFFFF" />
              </LinearGradient>
              {!isLast && <View style={[styles.verticalLine, { backgroundColor: colors.border }]} />}
            </View>

            {/* Content Card */}
            <View
              style={[
                styles.contentCard,
                {
                  backgroundColor: colors.cardBg,
                  borderColor: colors.cardBorder,
                },
                isLast && { marginBottom: 0 },
              ]}
            >
              <View style={styles.textColumn}>
                <Text style={[styles.placeText, { color: colors.textPrimary }]}>{item.place}</Text>
                <View style={styles.badgeRow}>
                  <View style={[styles.yearBadge, { backgroundColor: colors.chipBg, borderColor: colors.border }]}>
                    <Text style={[styles.yearText, { color: colors.textPrimary }]}>
                      {item.year || (item.date_from ? new Date(item.date_from).getFullYear() : 'Recent')}
                    </Text>
                  </View>
                  <Text style={[styles.noteText, { color: colors.textSecondary }]}>Shared solo adventure</Text>
                </View>
              </View>

              {item.photo && (
                <Image
                  source={{ uri: item.photo }}
                  style={[styles.thumbnail, { borderColor: colors.border, backgroundColor: colors.surfaceSubtle }]}
                  resizeMode="cover"
                />
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
  },
  itemRow: {
    flexDirection: 'row',
  },
  nodeColumn: {
    alignItems: 'center',
    width: 28,
    marginRight: 10,
  },
  nodeCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#CBD5E1',
    zIndex: 2,
  },
  verticalLine: {
    flex: 1,
    width: 2,
    backgroundColor: '#E2E8F0',
    marginVertical: 4,
  },
  contentCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: RADII.xl,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 12,
  },
  textColumn: {
    flex: 1,
    marginRight: 10,
  },
  placeText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  yearBadge: {
    backgroundColor: '#F1F5F9',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: RADII.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  yearText: {
    fontSize: 11,
    color: '#0F172A',
    fontWeight: '700',
  },
  noteText: {
    fontSize: 11,
    color: '#64748B',
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: RADII.md,
    backgroundColor: '#F1F5F9',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 6,
  },
});
