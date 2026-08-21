import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth, rtdb } from "@/services/firebase";
import { ref, onValue } from "firebase/database";
import type { AppUser, Farm, Zone } from "@/types/yield";
import { subscribeFarms, subscribeZones } from "@/services/yieldFarmDb";

interface YieldAppContextValue {
  user: AppUser | null;
  authReady: boolean;
  farms: Farm[];
  currentFarmId: string | null;
  currentFarm: Farm | null;
  currentZones: Zone[];
  setCurrentFarmId: (farmId: string | null) => void;
}

const YieldAppContext = createContext<YieldAppContextValue | null>(null);

export function YieldAppProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [currentFarmId, setCurrentFarmId] = useState<string | null>(null);
  const [currentZones, setCurrentZones] = useState<Zone[]>([]);

  // --- auth ---
  useEffect(() => {
    try {
      if (auth && typeof onAuthStateChanged === "function") {
        const unsub = onAuthStateChanged(auth, (fbUser) => {
          setFirebaseUser(fbUser);
          setAuthReady(true);
        });
        return unsub;
      } else {
        setAuthReady(true);
      }
    } catch {
      setAuthReady(true);
    }
  }, []);

  const user = firebaseUser ? {
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    displayName: firebaseUser.displayName
  } : null;

  // --- farms subscription ---
  useEffect(() => {
    if (!user) {
      setFarms([]);
      return;
    }
    try {
      const unsub = subscribeFarms(user.uid, setFarms);
      return unsub;
    } catch (e) {
      console.warn("[YieldAppContext] Failed to subscribe to farms:", e);
    }
  }, [user]);

  // --- zones subscription for the currently-open farm ---
  useEffect(() => {
    if (!user || !currentFarmId) {
      setCurrentZones([]);
      return;
    }
    try {
      const unsub = subscribeZones(user.uid, currentFarmId, setCurrentZones);
      return unsub;
    } catch (e) {
      console.warn("[YieldAppContext] Failed to subscribe to zones:", e);
    }
  }, [user, currentFarmId]);

  // --- telemetry device id live presence (for "ESP32 LIVE" badge) ---
  const [deviceLive, setDeviceLive] = useState(false);
  useEffect(() => {
    if (!currentFarmId) return;
    const farm = farms.find((f) => f.id === currentFarmId);
    if (!farm || !farm.deviceId) return;
    try {
      if (rtdb && rtdb.app) {
        const unsub = onValue(ref(rtdb, `/devices/${farm.deviceId}/latest`), (snap) => {
          setDeviceLive(!!snap.val());
        });
        return unsub;
      }
    } catch (e) {
      console.warn("[YieldAppContext] Failed to subscribe to device telemetry:", e);
    }
  }, [currentFarmId, farms]);

  const currentFarm = currentFarmId ? farms.find((f) => f.id === currentFarmId) ?? null : null;

  return (
    <YieldAppContext.Provider
      value={{
        user,
        authReady,
        farms,
        currentFarmId,
        currentFarm,
        currentZones,
        setCurrentFarmId,
      }}
    >
      {children}
    </YieldAppContext.Provider>
  );
}

export function useYieldApp() {
  const ctx = useContext(YieldAppContext);
  if (!ctx) throw new Error("useYieldApp must be used within YieldAppProvider");
  return ctx;
}
