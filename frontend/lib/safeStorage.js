// Safe cross-runtime AsyncStorage wrapper (Expo Web / Mobile / Node.js)
import AsyncStorageModule from '@react-native-async-storage/async-storage';

const memoryStore = new Map();

function resolveStorage() {
  // Node.js test environment has no `window.localStorage`
  if (typeof window === 'undefined') {
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

  if (AsyncStorageModule?.setItem) {
    return AsyncStorageModule;
  }
  if (AsyncStorageModule?.default?.setItem) {
    return AsyncStorageModule.default;
  }
  if (AsyncStorageModule?.default?.default?.setItem) {
    return AsyncStorageModule.default.default;
  }

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
