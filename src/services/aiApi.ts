import axios from 'axios';
import { getBaseIp } from './api';

// Create a separate client for the Python AI Prediction backend which runs on port 5000
const AI_GATEWAY_URL = `http://${getBaseIp()}:5000/api`;

const aiApi = axios.create({
  baseURL: AI_GATEWAY_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  }
});

// Since Python backend doesn't necessarily use the same JWT as Node (or if it does, it's safe to attach)
// We won't attach it automatically unless required. But for dashboard predictions it's open or handles its own auth.

export default aiApi;
