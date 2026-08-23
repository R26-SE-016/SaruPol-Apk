import { createContext, useContext, useState, useEffect, useMemo, type ReactNode } from "react";
import type { AppUser, Farm, Zone } from "@/types/yield";
import { subscribeFarms, subscribeZones, fetchDevicePresence } from "@/services/yieldFarmDb";
import { useAppStore } from "@/store/appStore";

const DEFAULT_DEMO_UID = process.env.EXPO_PUBLIC_DEMO_UID || "DkjGfclo7uQnopbpPbmZICE5Vt13";

interface YieldAppContextValue {
  user: AppUser;
  authReady: boolean;
  farms: Farm[];
  currentFarmId: string | null;
  currentFarm: Farm | null;
  currentZones: Zone[];
  setCurrentFarmId: (farmId: string | null) => void;
}

const YieldAppContext = createContext<YieldAppContextValue | null>(null);

export function YieldAppProvider({ children }: { children: ReactNode }) {
  const mainUser = useAppStore((state) => state.user);
  const isGuest = useAppStore((state) => state.isGuest);

  const [farms, setFarms] = useState<Farm[]>([]);
  const [currentFarmId, setCurrentFarmId] = useState<string | null>(null);
  const [currentZones, setCurrentZones] = useState<Zone[]>([]);

  // Derive active user identity directly from SaruPol session
  const user: AppUser = useMemo(() => {
    if (mainUser && !isGuest) {
      return {
        uid: `sarupol_user_${mainUser.id}`,
        email: mainUser.email,
        displayName: mainUser.name,
      };
    }
    return {
      uid: DEFAULT_DEMO_UID,
      email: "guest@sarupol.lk",
      displayName: "Estate Manager",
    };
  }, [mainUser, isGuest]);

  // --- farms subscription ---
  useEffect(() => {
    try {
      const unsub = subscribeFarms(user.uid, setFarms);
      return unsub;
    } catch (e) {
      console.warn("[YieldAppContext] Failed to load farms:", e);
    }
  }, [user.uid]);

  // --- zones subscription for the currently-open farm ---
  useEffect(() => {
    if (!currentFarmId) {
      setCurrentZones([]);
      return;
    }
    try {
      const unsub = subscribeZones(user.uid, currentFarmId, setCurrentZones);
      return unsub;
    } catch (e) {
      console.warn("[YieldAppContext] Failed to load zones:", e);
    }
  }, [user.uid, currentFarmId]);

  // --- telemetry device id live presence (for "ESP32 LIVE" badge) ---
  const [deviceLive, setDeviceLive] = useState(false);
  useEffect(() => {
    if (!currentFarmId) return;
    const farm = farms.find((f) => f.id === currentFarmId);
    if (!farm || !farm.deviceId) return;
    
    fetchDevicePresence(farm.deviceId).then((isLive) => {
      setDeviceLive(isLive);
    });
  }, [currentFarmId, farms]);

  const currentFarm = currentFarmId ? farms.find((f) => f.id === currentFarmId) ?? null : null;

  return (
    <YieldAppContext.Provider
      value={{
        user,
        authReady: true,
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
