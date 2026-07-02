import axios from 'axios';
import { Platform } from 'react-native';
import { useAppStore } from '../store/appStore';

// Point to the unified API Gateway
// Use your local machine's IP address so physical mobile devices on the same Wi-Fi can connect.
const BACKEND_IP = '10.54.124.87'; 
const GATEWAY_URL = `http://${BACKEND_IP}:8000`;

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
    
    // Use the local IP for both Android and iOS physical/emulator devices
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
