// ============================================================================
// MAYBEWE LIVE LOCATION CARD (components/LiveLocationCard.jsx)
// Interactive luxury travel card for real-time location sessions in chat
// Zero TypeScript, Pure JavaScript/JSX
// ============================================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatRemainingTime, stopLiveLocationSession } from '../lib/liveLocation.js';
import { SHADOWS } from '../lib/theme';

export default function LiveLocationCard({
  session = {},
  currentUserId = 'user-demo-priya',
  onViewLiveMap,
  onSessionStopped,
}) {
  const [timeRemaining, setTimeRemaining] = useState('');
  const [stopping, setStopping] = useState(false);
  const [localStatus, setLocalStatus] = useState(session?.status || 'active');

  const isOwner = session?.owner_user_id === currentUserId;
  const isApproximate = session?.privacy_mode === 'approximate';
  const expiresAt = session?.expires_at;

  useEffect(() => {
    setLocalStatus(session?.status || 'active');
  }, [session?.status]);

  useEffect(() => {
    const updateCountdown = () => {
      if (localStatus !== 'active') {
        setTimeRemaining(localStatus === 'stopped' ? 'Sharing stopped' : 'Location expired');
        return;
      }
      if (expiresAt) {
        const remaining = formatRemainingTime(expiresAt);
        setTimeRemaining(remaining);
        if (remaining === 'Location expired') {
          setLocalStatus('expired');
        }
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 15000); // 15s interval is gentle on CPU
    return () => clearInterval(interval);
  }, [expiresAt, localStatus]);

  const handleStop = async () => {
    if (!session?.id) return;
    setStopping(true);
    try {
      await stopLiveLocationSession(session.id, currentUserId);
      setLocalStatus('stopped');
      if (onSessionStopped) {
        onSessionStopped(session.id);
      }
    } catch (err) {
      console.warn('Error stopping live location session:', err);
    } finally {
      setStopping(false);
    }
  };

  const isActive = localStatus === 'active';

  return (
    <View style={[styles.cardContainer, SHADOWS.cardElevated]}>
      {/* Top Banner with Pulse */}
      <View style={styles.headerRow}>
        <View style={styles.statusIndicatorRow}>
          <View style={[styles.outerPulse, !isActive && styles.outerPulseInactive]}>
            <View style={[styles.innerDot, !isActive && styles.innerDotInactive]} />
          </View>
          <View style={{ marginLeft: 8 }}>
            <Text style={styles.cardHeaderTitle}>
              {isActive ? 'Live location shared' : localStatus === 'stopped' ? 'Location sharing stopped' : 'Location expired'}
            </Text>
            <Text style={styles.expiryText}>
              {timeRemaining || 'Active session'}
            </Text>
          </View>
        </View>

        <View style={[styles.modeBadge, isApproximate && styles.modeBadgeApprox]}>
          <Ionicons
            name={isApproximate ? 'eye-off-outline' : 'navigate'}
            size={11}
            color={isApproximate ? '#77766F' : '#C8B27A'}
            style={{ marginRight: 3 }}
          />
          <Text style={[styles.modeBadgeText, isApproximate && styles.modeBadgeTextApprox]}>
            {isApproximate ? 'Approximate location' : 'Precise GPS'}
          </Text>
        </View>
      </View>

      {/* Description Info */}
      <View style={styles.infoBox}>
        <Text style={styles.infoText}>
          {isOwner
            ? isActive
              ? 'You are currently sharing real-time foreground coordinates with your authorized travel companion.'
              : 'Your live location session has ended. Coordinates are no longer visible.'
            : isActive
            ? 'Your companion is sharing real-time foreground coordinates with you.'
            : 'Live location sharing has ended.'}
        </Text>
      </View>

      {/* Action Buttons */}
      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.viewMapBtn, !isActive && styles.viewMapBtnDisabled]}
          activeOpacity={0.8}
          disabled={!isActive}
          onPress={() => onViewLiveMap && onViewLiveMap(session)}
        >
          <Ionicons name="map-outline" size={13} color="#FAF8F3" style={{ marginRight: 5 }} />
          <Text style={styles.viewMapBtnText}>View Live Map</Text>
        </TouchableOpacity>

        {isOwner && isActive && (
          <TouchableOpacity
            style={styles.stopBtn}
            activeOpacity={0.8}
            disabled={stopping}
            onPress={handleStop}
          >
            {stopping ? (
              <ActivityIndicator size="small" color="#D32F2F" />
            ) : (
              <>
                <Ionicons name="stop-circle-outline" size={13} color="#D32F2F" style={{ marginRight: 4 }} />
                <Text style={styles.stopBtnText}>Stop Sharing</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FAF8F3',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E0D8',
    padding: 12,
    marginVertical: 4,
    minWidth: 260,
    maxWidth: 310,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  outerPulse: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(200, 178, 122, 0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  outerPulseInactive: {
    backgroundColor: 'rgba(138, 134, 126, 0.15)',
  },
  innerDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#C8B27A',
  },
  innerDotInactive: {
    backgroundColor: '#8A867E',
  },
  cardHeaderTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#171817',
    letterSpacing: -0.2,
  },
  expiryText: {
    fontSize: 11,
    color: '#77766F',
    marginTop: 1,
    fontWeight: '500',
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#171817',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  modeBadgeApprox: {
    backgroundColor: '#EBE6DC',
  },
  modeBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FAF8F3',
  },
  modeBadgeTextApprox: {
    color: '#4A4B45',
  },
  infoBox: {
    backgroundColor: '#F5F2EB',
    padding: 8,
    borderRadius: 8,
    marginVertical: 4,
    borderWidth: 0.5,
    borderColor: '#E8E3D8',
  },
  infoText: {
    fontSize: 11,
    color: '#55544E',
    lineHeight: 15,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  viewMapBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#171817',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  viewMapBtnDisabled: {
    backgroundColor: '#B5B1A8',
  },
  viewMapBtnText: {
    color: '#FAF8F3',
    fontSize: 11,
    fontWeight: '700',
  },
  stopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FDECEC',
    borderWidth: 1,
    borderColor: '#FACDCD',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  stopBtnText: {
    color: '#D32F2F',
    fontSize: 11,
    fontWeight: '700',
  },
});
