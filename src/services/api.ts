import axios from 'axios';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { useAppStore } from '../store/appStore';

// Dynamically determine the backend IP in development so physical devices on the same Wi-Fi can connect automatically.
const getGatewayUrl = () => {
  if (__DEV__) {
    // Constants.expoConfig?.hostUri contains the dev server's host and port (e.g. "192.168.1.7:8081")
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const ip = hostUri.split(':')[0];
      return `http://${ip}:8000`;
    }
    // Fallback for emulators if hostUri is not available
    return Platform.OS === 'android' ? 'http://10.0.2.2:8000' : 'http://localhost:8000';
  }
  // Production/fallback URL (update this if you deploy the backend to a cloud service)
  return 'http://192.168.1.7:8000';
};

const GATEWAY_URL = getGatewayUrl();

const api = axios.create({
  baseURL: GATEWAY_URL,
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const state = useAppStore.getState();

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
