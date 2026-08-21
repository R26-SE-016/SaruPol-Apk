import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const dbUrl = process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL;
const apiKey = process.env.EXPO_PUBLIC_FIREBASE_API_KEY;

// Safe fallback config so missing local .env variables do not crash other components on startup
const firebaseConfig = {
  apiKey: apiKey || "dummy-api-key",
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || "sarupol-dummy.firebaseapp.com",
  databaseURL: dbUrl && dbUrl.startsWith("http") ? dbUrl : "https://sarupol-default-rtdb.firebaseio.com",
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || "sarupol-dummy",
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || "",
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || "",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

let rtdb: ReturnType<typeof getDatabase>;
let auth: ReturnType<typeof getAuth>;

try {
  rtdb = getDatabase(app);
  auth = getAuth(app);
} catch (e) {
  console.warn("[Firebase] Failed to initialize services in offline/unconfigured mode:", e);
  rtdb = {} as any;
  auth = {} as any;
}

export { app, rtdb, auth };
export const googleProvider = new GoogleAuthProvider();
