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
import { COLORS, RADII } from '../lib/theme';
import PrimaryButton from './ui/PrimaryButton';

export default function LiveLocationShare({
  visible,
  onClose,
  onLocationShared,
  partnerName = 'Traveler',
}) {
  const [loading, setLoading] = useState(false);
  const [locationName, setLocationName] = useState('');
  const [coords, setCoords] = useState(null);
  const [gpsStatus, setGpsStatus] = useState('idle'); // 'idle' | 'acquired' | 'permission_denied' | 'unavailable'
  const [errorMessage, setErrorMessage] = useState('');

  const requestAndGetLocation = async () => {
    setLoading(true);
    setErrorMessage('');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setGpsStatus('permission_denied');
        setErrorMessage('Location permission was denied. Please enable device location permissions in Settings to share your meeting spot.');
        setCoords(null);
        setLocationName('');
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      if (!loc?.coords || typeof loc.coords.latitude !== 'number' || typeof loc.coords.longitude !== 'number' || isNaN(loc.coords.latitude) || isNaN(loc.coords.longitude)) {
        setGpsStatus('unavailable');
        setErrorMessage('Could not acquire valid GPS coordinates from your device. Please ensure location services are active.');
        setCoords(null);
        setLocationName('');
        setLoading(false);
        return;
      }

      setCoords(loc.coords);
      setGpsStatus('acquired');

      try {
        const [geocode] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });

        if (geocode) {
          const place = [geocode.name, geocode.city || geocode.district, geocode.region || geocode.country]
            .filter(Boolean)
            .join(', ');
          setLocationName(place || `GPS: ${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`);
        } else {
          setLocationName(`GPS: ${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`);
        }
      } catch {
        setLocationName(`GPS: ${loc.coords.latitude.toFixed(4)}, ${loc.coords.longitude.toFixed(4)}`);
      }
    } catch (err) {
      console.warn('Authoritative GPS retrieval error:', err);
      setGpsStatus('unavailable');
      setErrorMessage('Device GPS is currently unavailable or timed out. Please check signal and retry.');
      setCoords(null);
      setLocationName('');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmShare = () => {
    if (!coords || typeof coords.latitude !== 'number' || typeof coords.longitude !== 'number') {
      Alert.alert('Device GPS Required', 'Actual device GPS coordinates are required before sharing your location. Please tap "Pin Current Public Landmark" first.');
      return;
    }
    const message = `📍 Shared Meeting Location: ${locationName || 'Current GPS Location'} (Maps: https://maps.google.com/?q=${coords.latitude},${coords.longitude})`;
    onLocationShared(message);
    onClose();
  };

  const hasValidGps = coords && typeof coords.latitude === 'number' && typeof coords.longitude === 'number';

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.content}>
          <View style={styles.iconCircle}>
            <Ionicons name="location" size={28} color="#FFFFFF" />
          </View>

          <Text style={styles.title}>Share Meeting Location</Text>
          <Text style={styles.comfortNotice}>Only share when you're comfortable.</Text>

          <Text style={styles.description}>
            Always choose a safe, well-lit public place (such as a cafe, museum, or transit hub) when meeting {partnerName}.
          </Text>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="small" color="#FFFFFF" />
              <Text style={styles.loadingText}>Acquiring device GPS coordinates...</Text>
            </View>
          ) : hasValidGps ? (
            <View style={styles.previewBox}>
              <Ionicons name="checkmark-circle" size={20} color="#6EE7B7" style={{ marginRight: 8 }} />
              <View style={{ flex: 1 }}>
                <Text style={styles.previewText} numberOfLines={2}>
                  {locationName}
                </Text>
                <Text style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 2 }}>
                  Authoritative GPS: {coords.latitude.toFixed(4)}, {coords.longitude.toFixed(4)}
                </Text>
              </View>
            </View>
          ) : (
            <View style={{ width: '100%', marginBottom: 20 }}>
              {errorMessage ? (
                <View style={styles.errorNoticeBox}>
                  <Ionicons name="alert-circle-outline" size={18} color="#F87171" style={{ marginRight: 6 }} />
                  <Text style={styles.errorNoticeText}>{errorMessage}</Text>
                </View>
              ) : null}
              <TouchableOpacity
                onPress={requestAndGetLocation}
                style={styles.detectButton}
                activeOpacity={0.8}
              >
                <Ionicons name="navigate-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
                <Text style={styles.detectText}>
                  {gpsStatus === 'unavailable' || gpsStatus === 'permission_denied'
                    ? 'Retry GPS Detection'
                    : 'Pin Current Public Landmark'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.actionButtons}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <PrimaryButton
              title="Share Spot"
              disabled={!hasValidGps}
              onPress={handleConfirmShare}
              style={{ flex: 1, opacity: hasValidGps ? 1 : 0.45 }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.60)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  content: {
    backgroundColor: COLORS.surface,
    borderRadius: RADII['3xl'],
    padding: 24,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.borderGlass,
  },
  iconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: 'rgba(255, 255, 255, 0.10)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textPrimary,
    marginBottom: 4,
    letterSpacing: -0.3,
  },
  comfortNotice: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '600',
    marginBottom: 12,
    letterSpacing: 0.2,
  },
  description: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  loadingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: RADII.xl,
    backgroundColor: COLORS.backgroundSecondary,
    width: '100%',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginLeft: 10,
  },
  detectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: RADII.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.20)',
    width: '100%',
    marginBottom: 20,
  },
  detectText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: RADII.xl,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1.5,
    borderColor: '#FFFFFF',
    width: '100%',
    marginBottom: 20,
  },
  previewText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textPrimary,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    gap: 12,
  },
  cancelBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  errorNoticeBox: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: RADII.lg,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.25)',
    marginBottom: 12,
  },
  errorNoticeText: {
    fontSize: 12,
    color: '#F87171',
    flex: 1,
    lineHeight: 16,
    fontWeight: '500',
  },
});
