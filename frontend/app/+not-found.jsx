import React, { useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, usePathname, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, RADII } from '../lib/theme';

export default function NotFoundScreen() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Automatically redirect known paths with group prefixes
    if (pathname && typeof pathname === 'string') {
      try {
        const lower = decodeURIComponent(pathname).toLowerCase();
        if (lower.includes('welcome')) {
          router.replace('/(auth)/welcome');
        } else if (lower.includes('login')) {
          router.replace('/(auth)/login');
        } else if (lower.includes('signup')) {
          router.replace('/(auth)/signup');
        } else if (lower.includes('showcase')) {
          router.replace('/showcase');
        }
      } catch {
        // Fallback
      }
    }
  }, [pathname]);

  return (
    <>
      <Stack.Screen options={{ title: 'Page Not Found', headerShown: false }} />
      <View style={styles.container}>
        <Ionicons name="compass-outline" size={64} color="#B99A5E" style={{ marginBottom: 16 }} />
        <Text style={styles.title}>Destination Not Found</Text>
        <Text style={styles.subtitle}>The requested travel coordinates could not be located.</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/(auth)/welcome')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Return to Sanctuary</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => router.replace('/showcase')}
          activeOpacity={0.8}
        >
          <Text style={styles.secondaryButtonText}>Open Merged Showcase</Text>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F5F0',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#171817',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#77766F',
    textAlign: 'center',
    marginBottom: 28,
  },
  button: {
    backgroundColor: '#171817',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: RADII.full,
    marginBottom: 12,
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FBFAF7',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: 'rgba(251, 250, 247, 0.88)',
    borderWidth: 1,
    borderColor: '#D7D2C8',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: RADII.full,
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#171817',
    fontWeight: '600',
    fontSize: 15,
  },
});
