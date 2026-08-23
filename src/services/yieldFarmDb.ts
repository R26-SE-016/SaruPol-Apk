import api from "@/services/api";
import type { Farm, Zone, Tree } from "@/types/yield";

/* ---------- Farms ---------- */

export async function fetchFarms(uid: string): Promise<Farm[]> {
  try {
    const res = await api.get('/yield/farms', { params: { uid } });
    if (res.data && res.data.farms) {
      return res.data.farms;
    }
    return [];
  } catch (err: any) {
    console.warn("[yieldFarmDb] fetchFarms error:", err.message);
    return [];
  }
}

export async function createFarm(uid: string, farm: Omit<Farm, "id" | "createdAt">): Promise<string> {
  try {
    const res = await api.post('/yield/farms', { uid, farm });
    return res.data?.id || `farm_${Date.now()}`;
  } catch (err: any) {
    console.warn("[yieldFarmDb] createFarm error:", err.message);
    return `farm_${Date.now()}`;
  }
}

export async function updateFarm(uid: string, farmId: string, patch: Partial<Farm>): Promise<void> {
  try {
    await api.put(`/yield/farms/${farmId}`, { uid, patch });
  } catch (err: any) {
    console.warn("[yieldFarmDb] updateFarm error:", err.message);
  }
}

export async function deleteFarm(uid: string, farmId: string): Promise<void> {
  try {
    await api.delete(`/yield/farms/${farmId}`, { params: { uid } });
  } catch (err: any) {
    console.warn("[yieldFarmDb] deleteFarm error:", err.message);
  }
}

export async function getFarm(uid: string, farmId: string): Promise<Farm | null> {
  try {
    const res = await api.get(`/yield/farms/${farmId}`, { params: { uid } });
    return res.data?.farm || null;
  } catch (err: any) {
    console.warn("[yieldFarmDb] getFarm error:", err.message);
    return null;
  }
}

export function subscribeFarms(uid: string, cb: (farms: Farm[]) => void): () => void {
  let active = true;
  fetchFarms(uid).then((farms) => {
    if (active) cb(farms);
  });
  return () => {
    active = false;
  };
}

/* ---------- Zones ---------- */

export async function fetchZones(uid: string, farmId: string): Promise<Zone[]> {
  try {
    const res = await api.get(`/yield/farms/${farmId}/zones`, { params: { uid } });
    return res.data?.zones || [];
  } catch (err: any) {
    console.warn("[yieldFarmDb] fetchZones error:", err.message);
    return [];
  }
}

export async function createZone(uid: string, farmId: string, zone: Omit<Zone, "id" | "createdAt">): Promise<string> {
  try {
    const res = await api.post(`/yield/farms/${farmId}/zones`, { uid, zone });
    return res.data?.id || `zone_${Date.now()}`;
  } catch (err: any) {
    console.warn("[yieldFarmDb] createZone error:", err.message);
    return `zone_${Date.now()}`;
  }
}

export async function updateZone(uid: string, farmId: string, zoneId: string, patch: Partial<Zone>): Promise<void> {
  try {
    await api.put(`/yield/farms/${farmId}/zones/${zoneId}`, { uid, patch });
  } catch (err: any) {
    console.warn("[yieldFarmDb] updateZone error:", err.message);
  }
}

export async function deleteZone(uid: string, farmId: string, zoneId: string): Promise<void> {
  try {
    await api.delete(`/yield/farms/${farmId}/zones/${zoneId}`, { params: { uid } });
  } catch (err: any) {
    console.warn("[yieldFarmDb] deleteZone error:", err.message);
  }
}

export function subscribeZones(uid: string, farmId: string, cb: (zones: Zone[]) => void): () => void {
  let active = true;
  fetchZones(uid, farmId).then((zones) => {
    if (active) cb(zones);
  });
  return () => {
    active = false;
  };
}

/** Return all tree numbers already claimed by *other* zones */
export async function getClaimedTreeNumbers(uid: string, farmId: string, excludeZoneId?: string): Promise<Set<number>> {
  const claimed = new Set<number>();
  try {
    const zones = await fetchZones(uid, farmId);
    for (const zone of zones) {
      if (excludeZoneId && zone.id === excludeZoneId) continue;
      zone.treeNumbers?.forEach((n) => claimed.add(n));
    }
  } catch (err: any) {
    console.warn("[yieldFarmDb] getClaimedTreeNumbers error:", err.message);
  }
  return claimed;
}

/* ---------- Trees (per-tree data) ---------- */

export async function fetchTrees(uid: string, farmId: string): Promise<Record<string, Tree>> {
  try {
    const res = await api.get(`/yield/farms/${farmId}/trees`, { params: { uid } });
    return res.data?.trees || {};
  } catch (err: any) {
    console.warn("[yieldFarmDb] fetchTrees error:", err.message);
    return {};
  }
}

export function subscribeTrees(uid: string, farmId: string, cb: (trees: Record<string, Tree>) => void): () => void {
  let active = true;
  fetchTrees(uid, farmId).then((trees) => {
    if (active) cb(trees);
  });
  return () => {
    active = false;
  };
}

export async function upsertTreeData(uid: string, farmId: string, tree: Tree): Promise<void> {
  try {
    await api.put(`/yield/farms/${farmId}/trees/${tree.id}`, { uid, tree });
  } catch (err: any) {
    console.warn("[yieldFarmDb] upsertTreeData error:", err.message);
  }
}

export async function updateTreeData(uid: string, farmId: string, treeId: string, patch: Partial<Tree>): Promise<void> {
  try {
    await api.put(`/yield/farms/${farmId}/trees/${treeId}`, { uid, patch });
  } catch (err: any) {
    console.warn("[yieldFarmDb] updateTreeData error:", err.message);
  }
}

/* ---------- Telemetry / Device Presence ---------- */

export async function fetchDevicePresence(deviceId: string): Promise<boolean> {
  try {
    const res = await api.get(`/yield/devices/${deviceId}/latest`);
    return !!res.data?.isLive;
  } catch {
    return false;
  }
}

/* ---------- Harvest Logs ---------- */

export async function fetchHarvestLogs(uid: string, farmId: string): Promise<any[]> {
  try {
    const res = await api.get(`/yield/farms/${farmId}/harvests`, { params: { uid } });
    return res.data?.logs || [];
  } catch (err: any) {
    console.warn("[yieldFarmDb] fetchHarvestLogs error:", err.message);
    return [];
  }
}

export async function saveHarvestLog(uid: string, farmId: string, log: any, logId?: string): Promise<void> {
  try {
    await api.post(`/yield/farms/${farmId}/harvests`, { uid, log, logId });
  } catch (err: any) {
    console.warn("[yieldFarmDb] saveHarvestLog error:", err.message);
  }
}

export async function deleteHarvestLog(uid: string, farmId: string, logId: string): Promise<void> {
  try {
    await api.delete(`/yield/farms/${farmId}/harvests/${logId}`, { params: { uid } });
  } catch (err: any) {
    console.warn("[yieldFarmDb] deleteHarvestLog error:", err.message);
  }
}

