import axios from 'axios';
import { Platform } from 'react-native';
import { useAppStore } from '../store/appStore';

import Constants from 'expo-constants';

let ipAddress = 'localhost';
if (Constants.expoConfig?.hostUri) {
  ipAddress = Constants.expoConfig.hostUri.split(':')[0];
} else if (Platform.OS === 'android') {
  ipAddress = '10.0.2.2';
}

const GATEWAY_URL = `http://${ipAddress}:8000/api`;

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
