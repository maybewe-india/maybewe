// ============================================================================
// MAYBEWE LIVE LOCATION CONSENT MODAL (components/LiveLocationConsentModal.jsx)
// Luxury consent sheet for foreground live location with privacy modes
// Zero TypeScript, Pure JavaScript/JSX
// ============================================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { DURATION_OPTIONS, PRIVACY_MODES, startLiveLocationSession } from '../lib/liveLocation.js';
import { SHADOWS } from '../lib/theme';

export default function LiveLocationConsentModal({
  visible,
  onClose,
  onSessionStarted,
  targetName = 'Travel Companion',
  targetUserId = null,
  chatGroupId = null,
  matchId = null,
  currentUserId = 'user-demo-priya',
}) {
  const [selectedDuration, setSelectedDuration] = useState('1h');
  const [privacyMode, setPrivacyMode] = useState('precise'); // 'precise' | 'approximate'
  const [loading, setLoading] = useState(false);

  const handleStartShare = async () => {
    setLoading(true);
    try {
      // Foreground device location request only
      let coords = { latitude: 15.5801, longitude: 73.7432 };
      let accuracy = 12;

      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (loc?.coords) {
            coords = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            };
            accuracy = loc.coords.accuracy || 12;
          }
        } else {
          Alert.alert(
            'Location Permission Denied',
            'Foreground location was not granted by your device settings. A simulated travel coordinate will be used for demonstration.',
            [{ text: 'Continue' }]
          );
        }
      } catch (locErr) {
        console.warn('Device location retrieval fallback:', locErr);
      }

      const session = await startLiveLocationSession({
        ownerId: currentUserId,
        targetUserId,
        chatGroupId,
        matchId,
        coords,
        duration: selectedDuration,
        privacyMode,
        accuracy,
      });

      if (onSessionStarted) {
        onSessionStarted(session);
      }
      onClose();
    } catch (err) {
      Alert.alert('Unable to Share Location', err.message || 'Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.sheetContainer, SHADOWS.cardElevated]}>
          <View style={styles.dragHandle} />

          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Ionicons name="navigate" size={24} color="#C8B27A" />
            </View>
            <Text style={styles.title}>Share Live Location</Text>
            <Text style={styles.subtitle}>
              Coordinate directly with <Text style={styles.targetHighlight}>{targetName}</Text> in real-time.
            </Text>
          </View>

          {/* Duration Picker */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sharing Duration</Text>
            <View style={styles.durationGrid}>
              {DURATION_OPTIONS.map((d) => {
                const isSelected = selectedDuration === d.id;
                return (
                  <TouchableOpacity
                    key={d.id}
                    style={[styles.durationCard, isSelected && styles.durationCardSelected]}
                    activeOpacity={0.8}
                    onPress={() => setSelectedDuration(d.id)}
                  >
                    <Text style={[styles.durationLabel, isSelected && styles.durationLabelSelected]}>
                      {d.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Privacy Mode Picker */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Privacy Mode</Text>
            <View style={styles.privacyBox}>
              {PRIVACY_MODES.map((mode) => {
                const isSelected = privacyMode === mode.id;
                return (
                  <TouchableOpacity
                    key={mode.id}
                    style={[styles.privacyRow, isSelected && styles.privacyRowSelected]}
                    activeOpacity={0.8}
                    onPress={() => setPrivacyMode(mode.id)}
                  >
                    <View style={styles.radioCircle}>
                      {isSelected && <View style={styles.radioDot} />}
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.privacyLabel, isSelected && styles.privacyLabelSelected]}>
                        {mode.label}
                      </Text>
                      <Text style={styles.privacyDesc}>{mode.description}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Privacy Reassurance Note */}
          <View style={styles.privacyNotice}>
            <Ionicons name="shield-checkmark-outline" size={15} color="#8A867E" style={{ marginRight: 6 }} />
            <Text style={styles.privacyNoticeText}>
              Foreground only. You can stop sharing anytime. Location is never saved permanently.
            </Text>
          </View>

          {/* Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.cancelBtn} activeOpacity={0.7} onPress={onClose}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.confirmBtn}
              activeOpacity={0.85}
              onPress={handleStartShare}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#FAF8F3" />
              ) : (
                <>
                  <Ionicons name="navigate" size={15} color="#FAF8F3" style={{ marginRight: 6 }} />
                  <Text style={styles.confirmBtnText}>Share Location</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  sheetContainer: {
    backgroundColor: '#FAF8F3',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
  },
  dragHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#D7D2C8',
    alignSelf: 'center',
    marginBottom: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 18,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#171817',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#171817',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 13,
    color: '#8A867E',
    marginTop: 4,
    textAlign: 'center',
  },
  targetHighlight: {
    color: '#171817',
    fontWeight: '600',
  },
  section: {
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: '#77766F',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  durationCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#F0ECE1',
    borderWidth: 1,
    borderColor: '#E2DCD1',
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationCardSelected: {
    backgroundColor: '#171817',
    borderColor: '#171817',
  },
  durationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#171817',
  },
  durationLabelSelected: {
    color: '#FAF8F3',
    fontWeight: '700',
  },
  privacyBox: {
    backgroundColor: '#F0ECE1',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2DCD1',
    padding: 6,
    gap: 4,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 10,
  },
  privacyRowSelected: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C8B27A',
  },
  radioCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1.5,
    borderColor: '#8A867E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: '#171817',
  },
  privacyLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#171817',
  },
  privacyLabelSelected: {
    color: '#171817',
  },
  privacyDesc: {
    fontSize: 11,
    color: '#8A867E',
    marginTop: 2,
  },
  privacyNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F2EB',
    padding: 10,
    borderRadius: 10,
    marginBottom: 20,
  },
  privacyNoticeText: {
    flex: 1,
    fontSize: 11,
    color: '#65635C',
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#EBE6DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#171817',
  },
  confirmBtn: {
    flex: 2,
    flexDirection: 'row',
    paddingVertical: 13,
    borderRadius: 14,
    backgroundColor: '#171817',
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FAF8F3',
  },
});
