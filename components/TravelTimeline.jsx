import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADII, GRADIENTS } from '../lib/theme';
import { LinearGradient } from 'expo-linear-gradient';

export default function TravelTimeline({ history = [] }) {
  if (!history || history.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="airplane-outline" size={28} color={COLORS.textMuted} />
        <Text style={styles.emptyText}>No past adventures added yet.</Text>
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
                colors={GRADIENTS.lavenderViolet}
                style={styles.nodeCircle}
              >
                <Ionicons name="location" size={11} color="#FFFFFF" />
              </LinearGradient>
              {!isLast && <View style={styles.verticalLine} />}
            </View>

            {/* Content Card */}
            <View style={[styles.contentCard, isLast && { marginBottom: 0 }]}>
              <View style={styles.textColumn}>
                <Text style={styles.placeText}>{item.place}</Text>
                <View style={styles.badgeRow}>
                  <View style={styles.yearBadge}>
                    <Text style={styles.yearText}>
                      {item.year || (item.date_from ? new Date(item.date_from).getFullYear() : 'Recent')}
                    </Text>
                  </View>
                  <Text style={styles.noteText}>Shared solo adventure</Text>
                </View>
              </View>

              {item.photo && (
                <Image
                  source={{ uri: item.photo }}
                  style={styles.thumbnail}
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
    borderColor: 'rgba(255, 255, 255, 0.25)',
    zIndex: 2,
  },
  verticalLine: {
    flex: 1,
    width: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    marginVertical: 4,
  },
  contentCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(11, 29, 45, 0.75)',
    borderRadius: RADII.xl,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 12,
  },
  textColumn: {
    flex: 1,
    marginRight: 10,
  },
  placeText: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  yearBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: RADII.sm,
  },
  yearText: {
    fontSize: 11,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  noteText: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  thumbnail: {
    width: 48,
    height: 48,
    borderRadius: RADII.md,
    backgroundColor: COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 6,
  },
});
