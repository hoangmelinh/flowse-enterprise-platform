import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

const STORAGE_KEYS = {
  ACCESS_TOKEN: 'flowse_access_token',
  USER_DATA: 'flowse_user_data',
  CURRENT_WORKSPACE_ID: 'flowse_workspace_id',
} as const;

export const secureStorage = {
  async saveToken(token: string): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
      } else {
        await SecureStore.setItemAsync(STORAGE_KEYS.ACCESS_TOKEN, token);
      }
    } catch (e) {
      console.warn('SecureStore saveToken error:', e);
    }
  },

  async getToken(): Promise<string | null> {
    try {
      if (Platform.OS === 'web') {
        return localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
      }
      return await SecureStore.getItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
    } catch (e) {
      console.warn('SecureStore getToken error:', e);
      return null;
    }
  },

  async removeToken(): Promise<void> {
    try {
      if (Platform.OS === 'web') {
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      } else {
        await SecureStore.deleteItemAsync(STORAGE_KEYS.ACCESS_TOKEN);
      }
    } catch (e) {
      console.warn('SecureStore removeToken error:', e);
    }
  },

  async saveCurrentWorkspaceId(id: number): Promise<void> {
    try {
      const val = id.toString();
      if (Platform.OS === 'web') {
        localStorage.setItem(STORAGE_KEYS.CURRENT_WORKSPACE_ID, val);
      } else {
        await SecureStore.setItemAsync(STORAGE_KEYS.CURRENT_WORKSPACE_ID, val);
      }
    } catch (e) {
      console.warn('SecureStore saveCurrentWorkspaceId error:', e);
    }
  },

  async getCurrentWorkspaceId(): Promise<number | null> {
    try {
      let val: string | null = null;
      if (Platform.OS === 'web') {
        val = localStorage.getItem(STORAGE_KEYS.CURRENT_WORKSPACE_ID);
      } else {
        val = await SecureStore.getItemAsync(STORAGE_KEYS.CURRENT_WORKSPACE_ID);
      }
      return val ? parseInt(val, 10) : null;
    } catch (e) {
      return null;
    }
  },
};

export default secureStorage;
