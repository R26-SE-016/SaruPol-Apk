import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { onAuthStateChanged, signInAnonymously } from "firebase/auth";
import { auth, rtdb } from "@/services/firebase";
import { ref, onValue } from "firebase/database";
import type { AppUser, Farm, Zone } from "@/types";
import { subscribeFarms, subscribeZones } from "@/services/yieldFarmDb";

interface YieldAppContextValue {
  user: AppUser | null;
  authReady: boolean;
  farms: Farm[];
  currentFarm: Farm | null;
  currentZones: Zone[];
  setCurrentFarmId: (farmId: string | null) => void;
}

const YieldAppContext = createContext<YieldAppContextValue | null>(null);

export function YieldAppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [farms, setFarms] = useState<Farm[]>([]);
  const [currentFarmId, setCurrentFarmId] = useState<string | null>(null);
  const [currentZones, setCurrentZones] = useState<Zone[]>([]);

  // --- auth ---
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (fbUser) => {
      if (fbUser) {
        setUser({ uid: fbUser.uid, email: fbUser.email, displayName: fbUser.displayName });
      } else {
        // auto anon sign-in so the app is usable without account creation friction
        signInAnonymously(auth).catch(() => setAuthReady(true));
        setUser(null);
      }
      setAuthReady(true);
    });
    return unsub;
  }, []);

  // --- farms subscription (only when we have a uid) ---
  useEffect(() => {
    if (!user) {
      setFarms([]);
      return;
    }
    const unsub = subscribeFarms(user.uid, setFarms);
    return unsub;
  }, [user]);

  // --- zones subscription for the currently-open farm ---
  useEffect(() => {
    if (!user || !currentFarmId) {
      setCurrentZones([]);
      return;
    }
    const unsub = subscribeZones(user.uid, currentFarmId, setCurrentZones);
    return unsub;
  }, [user, currentFarmId]);

  // --- telemetry device id live presence (for "ESP32 LIVE" badge) ---
  const [deviceLive, setDeviceLive] = useState(false);
  useEffect(() => {
    if (!currentFarmId) return;
    const farm = farms.find((f) => f.id === currentFarmId);
    if (!farm) return;
    const unsub = onValue(ref(rtdb, `/devices/${farm.deviceId}/latest`), (snap) => {
      setDeviceLive(!!snap.val());
    });
    return unsub;
  }, [currentFarmId, farms]);

  const currentFarm = currentFarmId ? farms.find((f) => f.id === currentFarmId) ?? null : null;

  return (
    <YieldAppContext.Provider
      value={{
        user,
        authReady,
        farms,
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
