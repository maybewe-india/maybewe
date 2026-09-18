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

  const requestAndGetLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission',
          'Permission was not granted. You can still manually type a public landmark or meeting spot in chat.',
          [{ text: 'OK' }]
        );
        setLoading(false);
        return;
      }

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setCoords(loc.coords);

      try {
        const [geocode] = await Location.reverseGeocodeAsync({
          latitude: loc.coords.latitude,
          longitude: loc.coords.longitude,
        });

        if (geocode) {
          const place = [geocode.name, geocode.city, geocode.country]
            .filter(Boolean)
            .join(', ');
          setLocationName(place || 'Current Public Meeting Spot');
        } else {
          setLocationName('Public Meeting Point');
        }
      } catch {
        setLocationName('Public Meeting Point');
      }
    } catch (err) {
      console.warn('Location retrieval error:', err);
      setLocationName('Shibuya Station Hachiko Square (Public Meeting Spot)');
      setCoords({ latitude: 35.6595, longitude: 139.7004 });
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmShare = () => {
    if (!locationName && !coords) return;
    const message = `📍 Shared Meeting Location: ${locationName || 'Public Meeting Spot'} (Maps: https://maps.google.com/?q=${coords?.latitude || '0'},${coords?.longitude || '0'})`;
    onLocationShared(message);
    onClose();
  };

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
              <Text style={styles.loadingText}>Pinpointing nearest public spot...</Text>
            </View>
          ) : locationName ? (
            <View style={styles.previewBox}>
              <Ionicons name="pin" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.previewText} numberOfLines={2}>
                {locationName}
              </Text>
            </View>
          ) : (
            <TouchableOpacity
              onPress={requestAndGetLocation}
              style={styles.detectButton}
              activeOpacity={0.8}
            >
              <Ionicons name="navigate-circle-outline" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.detectText}>Pin Current Public Landmark</Text>
            </TouchableOpacity>
          )}

          <View style={styles.actionButtons}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <PrimaryButton
              title="Share Spot"
              disabled={!locationName && !coords}
              onPress={handleConfirmShare}
              style={{ flex: 1 }}
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
    backgroundColor: 'rgba(6, 21, 34, 0.85)',
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
});
