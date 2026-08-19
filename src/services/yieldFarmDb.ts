import {
  ref,
  push,
  set,
  update,
  remove,
  onValue,
  get,
  type Unsubscribe,
} from "firebase/database";
import { rtdb } from "@/services/firebase";
import type { Farm, Zone, Tree } from "@/types/yield";

function farmRef(uid: string, farmId: string) {
  return ref(rtdb, `farms/${uid}/${farmId}`);
}
function farmsRef(uid: string) {
  return ref(rtdb, `farms/${uid}`);
}
function zonesRef(uid: string, farmId: string) {
  return ref(rtdb, `zones/${uid}/${farmId}`);
}
function zoneRef(uid: string, farmId: string, zoneId: string) {
  return ref(rtdb, `zones/${uid}/${farmId}/${zoneId}`);
}
function treesRef(uid: string, farmId: string) {
  return ref(rtdb, `trees/${uid}/${farmId}`);
}
function treeRef(uid: string, farmId: string, treeId: string) {
  return ref(rtdb, `trees/${uid}/${farmId}/${treeId}`);
}

/* ---------- Helpers ---------- */
export function sanitizeForFirebase(obj: any): any {
  if (obj === undefined) return null;
  if (obj === null || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeForFirebase);
  
  const sanitized: any = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      sanitized[key] = obj[key] === undefined ? null : sanitizeForFirebase(obj[key]);
    }
  }
  return sanitized;
}

/* ---------- Farms ---------- */

export async function createFarm(uid: string, farm: Omit<Farm, "id" | "createdAt">): Promise<string> {
  const node = push(farmsRef(uid));
  const id = node.key!;
  await set(node, sanitizeForFirebase({ ...farm, id, createdAt: Date.now() }));
  return id;
}

export async function updateFarm(uid: string, farmId: string, patch: Partial<Farm>): Promise<void> {
  await update(farmRef(uid, farmId), sanitizeForFirebase(patch));
}

export async function deleteFarm(uid: string, farmId: string): Promise<void> {
  await Promise.all([
    remove(farmRef(uid, farmId)),
    remove(zonesRef(uid, farmId)),
    remove(treesRef(uid, farmId)),
  ]);
}

export function subscribeFarms(uid: string, cb: (farms: Farm[]) => void): Unsubscribe {
  return onValue(farmsRef(uid), (snap) => {
    const v = snap.val();
    if (!v) return cb([]);
    const arr: Farm[] = Object.values(v);
    arr.sort((a, b) => a.createdAt - b.createdAt);
    cb(arr);
  });
}

export async function getFarm(uid: string, farmId: string): Promise<Farm | null> {
  const snap = await get(farmRef(uid, farmId));
  return snap.val() ?? null;
}

/* ---------- Zones ---------- */

export async function createZone(uid: string, farmId: string, zone: Omit<Zone, "id" | "createdAt">): Promise<string> {
  const node = push(zonesRef(uid, farmId));
  const id = node.key!;
  await set(node, { ...zone, id, createdAt: Date.now() });
  return id;
}

export async function updateZone(uid: string, farmId: string, zoneId: string, patch: Partial<Zone>): Promise<void> {
  await update(zoneRef(uid, farmId, zoneId), patch);
}

export async function deleteZone(uid: string, farmId: string, zoneId: string): Promise<void> {
  await remove(zoneRef(uid, farmId, zoneId));
}

export function subscribeZones(uid: string, farmId: string, cb: (zones: Zone[]) => void): Unsubscribe {
  return onValue(zonesRef(uid, farmId), (snap) => {
    const v = snap.val();
    if (!v) return cb([]);
    const arr: Zone[] = Object.values(v);
    arr.sort((a, b) => a.createdAt - b.createdAt);
    cb(arr);
  });
}

/** Return all tree numbers already claimed by *other* zones */
export async function getClaimedTreeNumbers(uid: string, farmId: string, excludeZoneId?: string): Promise<Set<number>> {
  const snap = await get(zonesRef(uid, farmId));
  const v = snap.val();
  const claimed = new Set<number>();
  if (!v) return claimed;
  for (const [zid, zone] of Object.entries(v) as [string, Zone][]) {
    if (excludeZoneId && zid === excludeZoneId) continue;
    zone.treeNumbers?.forEach((n) => claimed.add(n));
  }
  return claimed;
}

/* ---------- Trees (per-tree data) ---------- */

export function subscribeTrees(uid: string, farmId: string, cb: (trees: Record<string, Tree>) => void): Unsubscribe {
  return onValue(treesRef(uid, farmId), (snap) => {
    cb(snap.val() ?? {});
  });
}

export async function upsertTreeData(uid: string, farmId: string, tree: Tree): Promise<void> {
  await set(treeRef(uid, farmId, tree.id), tree);
}

export async function updateTreeData(uid: string, farmId: string, treeId: string, patch: Partial<Tree>): Promise<void> {
  await update(treeRef(uid, farmId, treeId), patch);
}
