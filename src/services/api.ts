import axios from 'axios';
import { Platform } from 'react-native';
import { useAppStore } from '../store/appStore';

// Point to the unified API Gateway
// We use 10.0.2.2 for Android Emulator, or localhost for iOS/web.
// During setup, we can use localhost, but let's make it configurable or fallback gracefully.
const GATEWAY_URL = 'http://localhost:8000'; 
const EMULATOR_GATEWAY_URL = 'http://10.0.2.2:8000';

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
    
    // Fallback to Android emulator IP if running on android emulator
    if (Platform.OS === 'android') {
      config.baseURL = EMULATOR_GATEWAY_URL;
    }

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
