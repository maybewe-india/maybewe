// Safe cross-runtime AsyncStorage wrapper (Expo Web / Mobile / Node.js)
import AsyncStorageModule from '@react-native-async-storage/async-storage';

let Platform = null;
try {
  const rn = require('react-native');
  if (rn && rn.Platform) Platform = rn.Platform;
} catch (e) {}

const isNativeMobile = Platform && (Platform.OS === 'android' || Platform.OS === 'ios');

const memoryStore = new Map();

function resolveStorage() {
  // 1. On Native Mobile (Android & iOS), bind directly to native AsyncStorage
  if (isNativeMobile) {
    if (AsyncStorageModule?.setItem) return AsyncStorageModule;
    if (AsyncStorageModule?.default?.setItem) return AsyncStorageModule.default;
    if (AsyncStorageModule?.default?.default?.setItem) return AsyncStorageModule.default.default;
  }

  // 2. On Web, bind to AsyncStorage backed by browser localStorage
  if (typeof window !== 'undefined' && window.localStorage) {
    if (AsyncStorageModule?.setItem) return AsyncStorageModule;
    if (AsyncStorageModule?.default?.setItem) return AsyncStorageModule.default;
    if (AsyncStorageModule?.default?.default?.setItem) return AsyncStorageModule.default.default;
  }

  // 3. Fallback for Node.js test runner or headless environments without native bridge
  return {
    async getItem(key) {
      return memoryStore.has(key) ? memoryStore.get(key) : null;
    },
    async setItem(key, value) {
      memoryStore.set(key, String(value));
    },
    async removeItem(key) {
      memoryStore.delete(key);
    },
    async clear() {
      memoryStore.clear();
    },
  };
}

const safeStorage = resolveStorage();

export default safeStorage;
export { safeStorage };
