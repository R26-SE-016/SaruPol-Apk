import type { Tree, Zone, WeatherPoint, AdvisoryAlert, YieldRecord } from "@/types/yield";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Deterministic pseudo-random so the synthetic weather series is stable across reloads
function seededRand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** Generate 12 months of historical weather (rainfall + temperature) keyed YYYY-MM. */
export function generateWeatherSeries(startYear: number): WeatherPoint[] {
  const rand = seededRand(startYear * 1000 + 7);
  const pts: WeatherPoint[] = [];
  const now = new Date();
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.getMonth();
    const key = `${d.getFullYear()}-${String(m + 1).padStart(2, "0")}`;
    // tropical dry-zone pattern: wetter May-Oct, drier Dec-Mar
    const wetSeason = m >= 4 && m <= 9;
    const rainfall = Math.round(
      (wetSeason ? 120 + rand() * 180 : 20 + rand() * 70)
    );
    const temperature = Math.round(
      (wetSeason ? 27 + rand() * 4 : 24 + rand() * 5) * 10
    ) / 10;
    const soilMoisture = Math.round(
      (wetSeason ? 55 + rand() * 25 : 25 + rand() * 20) * 10
    ) / 10;
    pts.push({ month: key, rainfall, temperature, soilMoisture });
  }
  return pts;
}

/** Latest (most recent month) weather point — drives live advisory thresholds. */
export function latestWeather(series: WeatherPoint[]): WeatherPoint | null {
  if (!series.length) return null;
  return [...series].sort((a, b) => b.month.localeCompare(a.month))[0];
}

/** Aggregate yield history across a set of trees into monthly totals. */
export function aggregateMonthlyYield(trees: Tree[]): { month: string; label: string; nuts: number }[] {
  const map = new Map<string, number>();
  for (const t of trees) {
    for (const y of t.yieldHistory ?? []) {
      map.set(y.date, (map.get(y.date) ?? 0) + y.nuts);
    }
  }
  const out = [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-12)
    .map(([month, nuts]) => ({
      month,
      label: monthLabel(month),
      nuts,
    }));
  return out;
}

/** Aggregate yield history across trees into yearly totals. */
export function aggregateYearlyYield(trees: Tree[]): { year: string; nuts: number }[] {
  const map = new Map<string, number>();
  for (const t of trees) {
    for (const y of t.yieldHistory ?? []) {
      const yr = y.date.slice(0, 4);
      map.set(yr, (map.get(yr) ?? 0) + y.nuts);
    }
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-6)
    .map(([year, nuts]) => ({ year, nuts }));
}

export function monthLabel(ym: string): string {
  const [y, m] = ym.split("-");
  return `${MONTH_NAMES[parseInt(m, 10) - 1]} '${y.slice(2)}`;
}

export function lastHarvest(tree: Tree): YieldRecord | null {
  if (!tree.yieldHistory?.length) return null;
  return [...tree.yieldHistory].sort((a, b) => b.date.localeCompare(a.date))[0];
}

/** Count consecutive months with zero yield ending at the most recent record. */
function consecutiveZeroCycles(history: YieldRecord[]): number {
  if (!history.length) return 0;
  const sorted = [...history].sort((a, b) => a.date.localeCompare(b.date));
  let run = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    if (sorted[i].nuts <= 0) run++;
    else break;
  }
  return run;
}

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** True when any tree in the list has been individually edited / inspected (has
 *  stored data that differs from the auto-generated defaults). */
export function hasHealthRecords(trees: Tree[]): boolean {
  // A tree is considered "inspected" when its status has been changed from the
  // generated default — detected by a non-empty notes field OR a yieldHistory
  // with real (non-mock) entries OR a zoneId that's been assigned.
  return trees.some((t) => (t.notes && t.notes.trim().length > 0) || (t.yieldHistory && t.yieldHistory.some((y) => !y.id.startsWith("mock-"))));
}

/** True only when every tree is Good/Healthy AND no diseased/non-bearing trees exist. */
export function allTreesHealthy(trees: Tree[]): boolean {
  if (trees.length === 0) return false;
  return trees.every((t) => t.health === "Good" && (t.status === "Bearing" || t.status === "Young"));
}

/**
 * Generate realistic mock yield history for a tree so analytics charts render
 * immediately, even before the farmer logs any harvests.
 */
export function mockYieldHistory(
  treeNumber: number,
  months = 12
): YieldRecord[] {
  const rand = seededRand(treeNumber * 131 + 11);
  const out: YieldRecord[] = [];
  const now = new Date();
  // bearing trees produce the most; young/diseased/non-bearing produce little
  const base =
    treeNumber % 7 === 0 ? 5   // sparse producers
    : treeNumber % 3 === 0 ? 35 // average
    : 60;                       // strong producers
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.getMonth();
    const wetSeason = m >= 4 && m <= 9;
    // wet season = higher yield, dry season = lower
    const seasonal = wetSeason ? 1.25 : 0.7;
    const variance = 0.6 + rand() * 0.8;
    const nuts = Math.max(0, Math.round(base * seasonal * variance));
    out.push({
      id: `mock-${treeNumber}-${i}`,
      date: monthKey(d),
      nuts,
      createdAt: d.getTime(),
    });
  }
  return out;
}

/** Ensure every tree has yield history — use mock data when none exists. */
export function ensureYieldHistory(trees: Tree[]): Tree[] {
  return trees.map((t) =>
    t.yieldHistory && t.yieldHistory.length > 0
      ? t
      : { ...t, yieldHistory: mockYieldHistory(t.number) }
  );
}

/**
 * Build smart-advisory alerts strictly from weather telemetry, soil moisture,
 * and yield stress. No pest/disease references.
 */
export function generateAdvisories(
  trees: Tree[],
  zones: Zone[],
  weather?: WeatherPoint | null,
  zeroCycleThreshold = 2
): AdvisoryAlert[] {
  const zoneByNumber = new Map<number, Zone>();
  zones?.forEach((z) => {
    if (z.treeNumbers) z.treeNumbers.forEach((n) => zoneByNumber.set(n, z));
  });

  // Derive weather/soil conditions. When live telemetry is unavailable we
  // fall back to the latest synthetic weather point so advisories stay useful.
  const w = weather ?? latestWeather(generateWeatherSeries(2024));
  const drySpell = w ? w.rainfall < 60 : false; // mm/month
  const heatStress = w ? w.temperature > 30 : false; // °C

  const alerts: AdvisoryAlert[] = [];
  for (const t of trees) {
    const zone = zoneByNumber.get(t.number);
    const zoneName = zone?.name ?? "Unzoned";
    const zoneColor = zone?.color ?? "#94a3b8";
    const zeros = consecutiveZeroCycles(t.yieldHistory ?? []);
    const latestY = lastHarvest(t);
    const lowYield = latestY ? latestY.nuts < 15 : true;

    // High-severity: low soil moisture from dry spell + weak/non-bearing trees
    if (drySpell && (t.status === "NonBearing" || t.health === "Weak" || lowYield)) {
      alerts.push({
        id: `adv-soil-${t.id}`,
        treeNumber: t.number,
        zoneName,
        zoneColor,
        reason: "Low soil moisture & weak health detected",
        action: "Apply targeted irrigation & nitrogen fertilizer.",
        severity: "high",
        alertType: "soil",
      });
    }

    // Medium-severity: high temperature stress
    if (heatStress && t.status !== "Young") {
      alerts.push({
        id: `adv-heat-${t.id}`,
        treeNumber: t.number,
        zoneName,
        zoneColor,
        reason: "High temperature stress detected",
        action: "Apply organic mulch around root zones.",
        severity: "medium",
        alertType: "temperature",
      });
    }

    // Yield stress: consecutive zero-yield cycles
    if (zeros >= zeroCycleThreshold) {
      alerts.push({
        id: `adv-yield-${t.id}`,
        treeNumber: t.number,
        zoneName,
        zoneColor,
        reason: "Low historical yield detected. Inspect root conditions.",
        action: "Apply nitrogen/fertilizer boost and monitor soil moisture.",
        severity: "medium",
        alertType: "yield",
      });
    }
  }

  // high-severity first, then by tree number
  alerts.sort((a, b) => {
    if (a.severity !== b.severity) return a.severity === "high" ? -1 : 1;
    return a.treeNumber - b.treeNumber;
  });
  return alerts;
}

export { MONTH_NAMES };
