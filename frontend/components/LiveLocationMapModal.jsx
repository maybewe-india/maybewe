// ============================================================================
// MAYBEWE LIVE LOCATION MAP MODAL (components/LiveLocationMapModal.jsx)
// Refined luxury travel map view for real-time foreground travel presence
// Zero TypeScript, Pure JavaScript/JSX
// ============================================================================

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Easing,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import {
  subscribeToLiveLocation,
  stopLiveLocationSession,
  calculateDistance,
  formatRemainingTime,
} from '../lib/liveLocation.js';
import { SHADOWS } from '../lib/theme';

export default function LiveLocationMapModal({
  visible,
  onClose,
  session,
  companionName = 'Travel Companion',
  currentUserId = 'user-demo-priya',
  onSessionStopped,
}) {
  const [currentSession, setCurrentSession] = useState(session);
  const [myCoords, setMyCoords] = useState({ latitude: 15.5801, longitude: 73.7432 });
  const [countdown, setCountdown] = useState('');
  const [lastUpdatedText, setLastUpdatedText] = useState('Just now');
  const [stopping, setStopping] = useState(false);

  // Smooth marker position animation
  const markerXAnim = useRef(new Animated.Value(0)).current;
  const markerYAnim = useRef(new Animated.Value(0)).current;

  // Radar ping pulse animation
  const pulseAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    setCurrentSession(session);
  }, [session]);

  // Pulse animation loop
  useEffect(() => {
    let loop = null;
    if (visible) {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2200,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );
      loop.start();
    }
    return () => loop?.stop();
  }, [visible]);

  // Subscribe to real-time updates for this specific session
  useEffect(() => {
    if (!visible || !currentSession?.id) return;

    const unsubscribe = subscribeToLiveLocation(currentSession.id, (updated) => {
      if (updated) {
        setCurrentSession((prev) => ({
          ...prev,
          ...updated,
        }));
        setLastUpdatedText('Just now');

        // Animate marker slightly to reflect smooth movement
        Animated.parallel([
          Animated.spring(markerXAnim, {
            toValue: (Math.random() - 0.5) * 20,
            friction: 7,
            useNativeDriver: true,
          }),
          Animated.spring(markerYAnim, {
            toValue: (Math.random() - 0.5) * 20,
            friction: 7,
            useNativeDriver: true,
          }),
        ]).start();
      }
    });

    return () => unsubscribe();
  }, [visible, currentSession?.id]);

  // Fetch device foreground location for distance calculation
  useEffect(() => {
    if (!visible) return;

    let mounted = true;
    (async () => {
      try {
        const { status } = await Location.getForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (mounted && loc?.coords) {
            setMyCoords({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
          }
        }
      } catch (e) {}
    })();

    return () => {
      mounted = false;
    };
  }, [visible]);

  // Expiration countdown
  useEffect(() => {
    const updateTime = () => {
      if (!currentSession?.expires_at) return;
      const str = formatRemainingTime(currentSession.expires_at);
      setCountdown(str);
      if (str === 'Location expired') {
        setCurrentSession((prev) => ({ ...prev, status: 'expired' }));
      }
    };
    updateTime();
    const timer = setInterval(updateTime, 10000);
    return () => clearInterval(timer);
  }, [currentSession?.expires_at]);

  const isOwner = currentSession?.owner_user_id === currentUserId;
  const isApproximate = currentSession?.privacy_mode === 'approximate';
  const isActive = currentSession?.status === 'active';

  // Distance computation
  const distanceStr =
    currentSession?.latitude && currentSession?.longitude && myCoords
      ? calculateDistance(
          myCoords.latitude,
          myCoords.longitude,
          currentSession.latitude,
          currentSession.longitude
        )
      : null;

  const handleStopSession = async () => {
    if (!currentSession?.id) return;
    setStopping(true);
    try {
      await stopLiveLocationSession(currentSession.id, currentUserId);
      setCurrentSession((prev) => ({
        ...prev,
        status: 'stopped',
        stopped_at: new Date().toISOString(),
      }));
      if (onSessionStopped) {
        onSessionStopped(currentSession.id);
      }
      Alert.alert('Live Location Ended', 'Your location session has stopped immediately.');
    } catch (err) {
      Alert.alert('Notice', err.message || 'Unable to stop session.');
    } finally {
      setStopping(false);
    }
  };

  const pulseScale = pulseAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 2.4],
  });

  const pulseOpacity = pulseAnim.interpolate({
    inputRange: [0, 0.4, 1],
    outputRange: [0.6, 0.3, 0],
  });

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={[styles.modalCard, SHADOWS.cardElevated]}>
          {/* Top Bar */}
          <View style={styles.topBar}>
            <View style={styles.topInfo}>
              <View style={styles.statusPill}>
                <View style={[styles.statusDot, !isActive && styles.statusDotInactive]} />
                <Text style={styles.statusText}>
                  {isActive ? 'Live location on' : currentSession?.status === 'stopped' ? 'Sharing stopped' : 'Location expired'}
                </Text>
              </View>
              <Text style={styles.countdownText}>{countdown || 'Session Active'}</Text>
            </View>

            <TouchableOpacity style={styles.closeBtn} activeOpacity={0.7} onPress={onClose}>
              <Ionicons name="close" size={20} color="#171817" />
            </TouchableOpacity>
          </View>

          {/* Luxury Travel Map Visual Canvas */}
          <View style={styles.mapCanvas}>
            {/* Elegant topographical grid overlay */}
            <LinearGradient
              colors={['#1F211F', '#141514', '#0F100F']}
              style={StyleSheet.absoluteFillObject}
            />

            {/* Subtle concentric radar distance rings */}
            <View style={[styles.radarRing, { width: 140, height: 140 }]} />
            <View style={[styles.radarRing, { width: 230, height: 230 }]} />
            <View style={[styles.radarRing, { width: 320, height: 320 }]} />

            {/* Companion Live Marker */}
            <Animated.View
              style={[
                styles.markerWrapper,
                {
                  transform: [
                    { translateX: markerXAnim },
                    { translateY: markerYAnim },
                  ],
                },
              ]}
            >
              {isActive && (
                <Animated.View
                  style={[
                    styles.champagnePulse,
                    {
                      transform: [{ scale: pulseScale }],
                      opacity: pulseOpacity,
                    },
                  ]}
                />
              )}

              {/* Luxury Champagne Marker */}
              <View style={styles.markerGlassRing}>
                <View style={styles.markerChampagneCore}>
                  <Ionicons name="navigate" size={14} color="#171817" />
                </View>
              </View>

              {/* Companion Callout Badge */}
              <View style={[styles.markerCallout, SHADOWS.cardElevated]}>
                <Text style={styles.markerName} numberOfLines={1}>
                  {isOwner ? 'You' : companionName}
                </Text>
                {distanceStr && !isOwner && (
                  <Text style={styles.markerDistance}>{distanceStr}</Text>
                )}
              </View>
            </Animated.View>

            {/* Approximate area circle if in approximate mode */}
            {isApproximate && (
              <View style={styles.approximateAreaHalo}>
                <Text style={styles.approximateHaloText}>~1 km privacy radius</Text>
              </View>
            )}

            {/* Bottom Floating Stats Pill inside Map */}
            <View style={styles.mapStatsBar}>
              <View style={styles.statItem}>
                <Ionicons
                  name={isApproximate ? 'eye-off-outline' : 'shield-checkmark-outline'}
                  size={12}
                  color="#C8B27A"
                />
                <Text style={styles.statItemText}>
                  {isApproximate ? 'Approximate Mode' : 'Precise Coordinates'}
                </Text>
              </View>

              <View style={styles.statDivider} />

              <View style={styles.statItem}>
                <Ionicons name="time-outline" size={12} color="#A39F95" />
                <Text style={styles.statItemText}>{lastUpdatedText}</Text>
              </View>
            </View>
          </View>

          {/* Bottom Details & Controls */}
          <View style={styles.footer}>
            <View style={styles.detailsRow}>
              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>COMPANION</Text>
                <Text style={styles.detailValue} numberOfLines={1}>
                  {companionName}
                </Text>
              </View>

              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>DISTANCE</Text>
                <Text style={styles.detailValue}>
                  {distanceStr || 'Nearby'}
                </Text>
              </View>

              <View style={styles.detailBox}>
                <Text style={styles.detailLabel}>ACCURACY</Text>
                <Text style={styles.detailValue}>
                  {isApproximate ? '~1 km' : '±10m'}
                </Text>
              </View>
            </View>

            {isApproximate && (
              <View style={styles.approxNoticeBox}>
                <Ionicons name="information-circle-outline" size={14} color="#77766F" style={{ marginRight: 6 }} />
                <Text style={styles.approxNoticeText}>
                  Approximate location hides your exact position for traveler privacy.
                </Text>
              </View>
            )}

            {/* Actions */}
            <View style={styles.actionRow}>
              {isOwner && isActive ? (
                <TouchableOpacity
                  style={styles.stopButton}
                  activeOpacity={0.8}
                  disabled={stopping}
                  onPress={handleStopSession}
                >
                  {stopping ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="stop-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                      <Text style={styles.stopButtonText}>Stop Live Sharing</Text>
                    </>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity style={styles.doneButton} activeOpacity={0.8} onPress={onClose}>
                  <Text style={styles.doneButtonText}>Close Map</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FAF8F3',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '84%',
    overflow: 'hidden',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#EBE6DC',
  },
  topInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EBE6DC',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#2E7D32',
    marginRight: 6,
  },
  statusDotInactive: {
    backgroundColor: '#8A867E',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#171817',
  },
  countdownText: {
    fontSize: 12,
    color: '#77766F',
    fontWeight: '600',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EBE6DC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mapCanvas: {
    flex: 1,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  radarRing: {
    position: 'absolute',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(200, 178, 122, 0.12)',
  },
  markerWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  champagnePulse: {
    position: 'absolute',
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#C8B27A',
  },
  markerGlassRing: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(200, 178, 122, 0.65)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  markerChampagneCore: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#C8B27A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#C8B27A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  markerCallout: {
    backgroundColor: '#FAF8F3',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2DCD1',
  },
  markerName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#171817',
  },
  markerDistance: {
    fontSize: 10,
    color: '#8A867E',
    fontWeight: '600',
  },
  approximateAreaHalo: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: 'rgba(200, 178, 122, 0.4)',
    backgroundColor: 'rgba(200, 178, 122, 0.05)',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 6,
  },
  approximateHaloText: {
    fontSize: 9,
    color: '#C8B27A',
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  mapStatsBar: {
    position: 'absolute',
    bottom: 12,
    backgroundColor: 'rgba(23, 24, 23, 0.85)',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statItemText: {
    fontSize: 11,
    color: '#FAF8F3',
    fontWeight: '600',
  },
  statDivider: {
    width: 1,
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 10,
  },
  footer: {
    backgroundColor: '#FAF8F3',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 32,
    borderTopWidth: 1,
    borderTopColor: '#EBE6DC',
  },
  detailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  detailBox: {
    flex: 1,
    backgroundColor: '#F0ECE1',
    padding: 10,
    borderRadius: 10,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 9,
    fontWeight: '700',
    color: '#8A867E',
    letterSpacing: 0.5,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#171817',
    marginTop: 2,
  },
  approxNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F2EB',
    padding: 10,
    borderRadius: 8,
    marginBottom: 14,
  },
  approxNoticeText: {
    fontSize: 11,
    color: '#65635C',
    flex: 1,
    lineHeight: 15,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  stopButton: {
    flex: 1,
    backgroundColor: '#D32F2F',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
  stopButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  doneButton: {
    flex: 1,
    backgroundColor: '#171817',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
  doneButtonText: {
    color: '#FAF8F3',
    fontSize: 13,
    fontWeight: '700',
  },
});
