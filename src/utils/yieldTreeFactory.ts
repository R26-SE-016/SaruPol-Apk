import type { Tree, TreeStatus, TreeHealth, FarmData } from "@/types/yield";

const STATUSES: TreeStatus[] = ["Young", "Bearing", "Diseased", "NonBearing"];

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateFarm(perches: number, totalTrees: number): FarmData {
  const count = Math.max(1, Math.floor(totalTrees));
  const seed = Math.floor(perches * 1000 + count);
  const rand = mulberry32(seed);
  const trees: Tree[] = [];
  const pad = 0.06;
  const span = 1 - pad * 2;

  for (let i = 0; i < count; i++) {
    const statusRoll = rand();
    let status: TreeStatus;
    if (statusRoll < 0.45) status = "Bearing";
    else if (statusRoll < 0.7) status = "NonBearing";
    else if (statusRoll < 0.88) status = "Young";
    else status = "Diseased";

    const yieldNuts =
      status === "Bearing" ? 40 + Math.floor(rand() * 30)
      : status === "NonBearing" ? Math.floor(rand() * 5)
      : status === "Young" ? Math.floor(rand() * 12)
      : 5 + Math.floor(rand() * 10);

    trees.push({
      id: `tree-${i + 1}`,
      number: i + 1,
      status,
      health: statusToHealth(status),
      yield: yieldNuts,
      nx: (rand() - 0.5) * span,
      nz: (rand() - 0.5) * span,
      zoneId: null,
      yieldHistory: [],
      notes: "",
    });
  }
  return { perches, totalTrees: count, trees };
}

export function statusToHealth(status: TreeStatus): TreeHealth {
  if (status === "Bearing") return "Good";
  if (status === "Young") return "Average";
  return "Weak"; // NonBearing, Diseased
}

export function healthToStatus(health: TreeHealth): TreeStatus {
  if (health === "Good") return "Bearing";
  if (health === "Average") return "Young";
  return "Diseased";
}

export function statusLabel(status: TreeStatus): string {
  switch (status) {
    case "Young": return "Young";
    case "Bearing": return "Bearing (Healthy)";
    case "Diseased": return "Diseased / Stressed";
    case "NonBearing": return "Non-Bearing";
  }
}

export function statusColor(status: TreeStatus): string {
  switch (status) {
    case "Bearing": return "#16a34a";
    case "Young": return "#84cc16";
    case "Diseased": return "#dc2626";
    case "NonBearing": return "#d97706";
  }
}

export function healthColor(health: TreeHealth): string {
  if (health === "Good") return "#16a34a";
  if (health === "Average") return "#f59e0b";
  return "#dc2626";
}

export function healthLabel(health: TreeHealth, pct: number): string {
  return `${health} - ${Math.round(pct)}%`;
}

/** Compute aggregate health from a list of trees */
export function aggregateHealth(trees: Tree[]): { health: TreeHealth; pct: number } {
  if (trees.length === 0) return { health: "Average", pct: 50 };
  const scores = trees.map((t) => (t.health === "Good" ? 1 : t.health === "Average" ? 0.6 : 0.35));
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  const pct = avg * 100;
  const health: TreeHealth = pct >= 70 ? "Good" : pct >= 45 ? "Average" : "Weak";
  return { health, pct };
}

/** Generate a stable tree layout for persistence */
export function generateTreeLayout(perches: number, totalTrees: number): { id: string; number: number; nx: number; nz: number }[] {
  const farm = generateFarm(perches, totalTrees);
  return farm.trees.map((t) => ({ id: t.id, number: t.number, nx: t.nx, nz: t.nz }));
}

/** Build a full FarmData (with Tree objects) from a persisted layout + stored tree data */
export function buildFarmData(
  perches: number,
  totalTrees: number,
  layout: { id: string; number: number; nx: number; nz: number }[],
  storedTrees: Record<string, Tree>
): FarmData {
  const base = generateFarm(perches, totalTrees);
  const trees = base.trees.map((t) => {
    const stored = storedTrees[t.id];
    return stored ? { ...t, ...stored } : t;
  });
  return { perches, totalTrees, trees };
}
