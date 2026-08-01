import axios from 'axios';
import { Platform } from 'react-native';
import { useAppStore } from '../store/appStore';

// ============================================================
// BACKEND CONNECTION CONFIGURATION
// ------------------------------------------------------------
// Web Browser (expo web): use localhost
// Android/iOS Phone (expo go via Wi-Fi): use LAN IP
// Run 'ipconfig' to find your LAN IP if you switch networks!
// ============================================================
const IS_WEB = Platform.OS === 'web';
const LAN_IP = '192.168.1.62';  // Your machine LAN IP
const BACKEND_URL = IS_WEB
  ? 'http://localhost:8000'       // Browser: direct localhost
  : `http://${LAN_IP}:8000`;     // Phone: LAN IP

const api = axios.create({
  baseURL: BACKEND_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Request interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const state = useAppStore.getState();
    config.baseURL = BACKEND_URL;
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
