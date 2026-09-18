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
        <Ionicons name="compass-outline" size={64} color={COLORS.lavender} style={{ marginBottom: 16 }} />
        <Text style={styles.title}>Page Not Found</Text>
        <Text style={styles.subtitle}>The requested URL was not found.</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/(auth)/welcome')}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Go to Welcome Screen</Text>
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
    backgroundColor: '#061522',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: 28,
  },
  button: {
    backgroundColor: COLORS.lavender,
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: RADII.full,
    marginBottom: 12,
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
  },
  buttonText: {
    color: '#061522',
    fontWeight: '600',
    fontSize: 15,
  },
  secondaryButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: RADII.full,
    width: '100%',
    maxWidth: 280,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '500',
    fontSize: 15,
  },
});
