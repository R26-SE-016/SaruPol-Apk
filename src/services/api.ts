import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useAppStore } from '../store/appStore';

// Use the API URL from .env, or fallback to the provided example
const rawApiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.104:8000';
const GATEWAY_URL = rawApiUrl.endsWith('/api') ? rawApiUrl : `${rawApiUrl}/api`;

const api = axios.create({
  baseURL: GATEWAY_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const state = useAppStore.getState();
    config.baseURL = GATEWAY_URL;
    if (state.token) {
      config.headers.Authorization = `Bearer ${state.token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response ? error.response.status : null;
    
    if (status === 401) {
      console.warn('Unauthorized request! Logging out user.');
      useAppStore.getState().logoutUser();
    }
    
    return Promise.reject(error);
  }
);

export default api;

export const getBaseIp = () => {
  const url = new URL(GATEWAY_URL);
  return url.hostname;
};
