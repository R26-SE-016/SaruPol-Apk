import { Platform } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { Farm, Tree, Zone, TelemetryData } from "@/types/yield";
import { weatherInfo, type WeatherData } from "@/services/weatherService";
import { aggregateHealth } from "@/utils/yieldTreeFactory";
import {
  hasHealthRecords,
  allTreesHealthy,
  generateAdvisories,
  generateWeatherSeries,
  latestWeather,
  ensureYieldHistory,
} from "@/utils/yieldAnalytics";

export interface ReportData {
  farm: Farm;
  zones: Zone[];
  trees: Tree[];
  telemetry: TelemetryData | null;
  weather: WeatherData | null;
  source: "iot" | "api" | "none";
  env: {
    temperature: number | null;
    humidity: number | null;
    precipitation: number | null;
    windSpeed: number | null;
    soilMoisture: number | null;
    weatherCode: number | null;
  };
  predictedYield: number;
}

export async function exportReportPDF(data: ReportData): Promise<void> {
  const { farm, zones, trees, telemetry, weather, source, env, predictedYield } = data;

  const { health, pct } = aggregateHealth(trees);
  const enriched = ensureYieldHistory(trees);
  const weatherSeries = generateWeatherSeries(new Date(farm.createdAt).getFullYear());
  const latestW = latestWeather(weatherSeries);
  const advisories = generateAdvisories(enriched, zones, latestW);
  const hasRecs = hasHealthRecords(trees);
  const allHealthy = allTreesHealthy(trees);

  const dist = { Good: 0, Average: 0, Weak: 0 };
  trees.forEach((t) => { dist[t.health]++; });

  const byZone = new Map<string, typeof advisories>();
  for (const a of advisories) {
    if (!byZone.has(a.zoneName)) byZone.set(a.zoneName, []);
    byZone.get(a.zoneName)!.push(a);
  }

  const wInfo = weatherInfo(env.weatherCode ?? -1);
  const farmName = farm.name;
  const dateStr = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const soilImpact = env.soilMoisture != null && env.soilMoisture < 35 ? 42 : 18;
  const tempImpact = env.temperature != null && env.temperature > 33 ? 35 : 15;
  const histLag = 100 - soilImpact - tempImpact;

  const html = buildHTML({
    farmName, dateStr, farm, env, source, telemetry, weather, wInfo,
    health, pct, dist, trees, zones, byZone, advisories, hasRecs, allHealthy,
    predictedYield, soilImpact, tempImpact, histLag,
  });

  if (Platform.OS === "web") {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
    return;
  }

  try {
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: "Telemetry & Yield Report" });
    }
  } catch (e) {
    console.error("PDF export failed:", e);
  }
}

function buildHTML(p: {
  farmName: string; dateStr: string; farm: Farm;
  env: ReportData["env"]; source: string; telemetry: TelemetryData | null; weather: WeatherData | null;
  wInfo: ReturnType<typeof weatherInfo>;
  health: string; pct: number; dist: Record<string, number>;
  trees: Tree[]; zones: Zone[]; byZone: Map<string, any[]>; advisories: any[];
  hasRecs: boolean; allHealthy: boolean;
  predictedYield: number; soilImpact: number; tempImpact: number; histLag: number;
}): string {
  const {
    farmName, dateStr, farm, env, source, telemetry, weather, wInfo,
    health, pct, dist, trees, byZone, advisories,
    predictedYield, soilImpact, tempImpact, histLag,
  } = p;

  const dataSourceLabel = source === "iot" ? "ESP32 IoT Sensor (Live)" : source === "api" ? "Open-Meteo Live API" : "No Data";

  const telemetryRows = [
    ["Air Temperature", env.temperature != null ? `${env.temperature} °C` : "—"],
    ["Relative Humidity", env.humidity != null ? `${env.humidity} %` : "—"],
    ["Soil Moisture", env.soilMoisture != null ? `${env.soilMoisture} %` : "—"],
    ["Rainfall / Precipitation", env.precipitation != null ? `${env.precipitation} mm` : "—"],
    ["Wind Speed", env.windSpeed != null ? `${env.windSpeed} km/h` : "—"],
    ["Weather Condition", env.weatherCode != null ? wInfo.label : "—"],
  ].map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join("");

  const healthRows = Object.entries(dist).map(([k, v]) => {
    const color = k === "Good" ? "#16a34a" : k === "Average" ? "#f59e0b" : "#dc2626";
    return `<tr><td><span class="dot" style="background:${color}"></span>${k}</td><td>${v} trees</td><td>${trees.length ? Math.round((v / trees.length) * 100) : 0}%</td></tr>`;
  }).join("");

  const attentionHTML = advisories.length === 0
    ? `<p class="ok-msg">All trees in ${farmName} are thriving in optimal condition.</p>`
    : [...byZone.entries()].map(([zoneName, zoneAlerts]) => {
        const treeLabels = zoneAlerts.map((a) => `#${String(a.treeNumber).padStart(2, "0")}`).join(", ");
        const reasons = zoneAlerts.map((a) => `<li><strong>${a.action}</strong> &mdash; ${a.reason}</li>`).join("");
        return `<div class="zone-block"><h4>${zoneName} &mdash; Tree ${treeLabels}</h4><ul>${reasons}</ul></div>`;
      }).join("");

  const stressAlerts: string[] = [];
  if (env.soilMoisture != null && env.soilMoisture < 35) stressAlerts.push("Prolonged Drought Stress Detected &mdash; Yield Reduction Expected in Next Cycle");
  if (env.temperature != null && env.temperature > 33) stressAlerts.push("High Temperature Stress Detected &mdash; Increased Flower Dropping Risk");
  if (stressAlerts.length === 0 && env.temperature != null && env.soilMoisture != null) stressAlerts.push("Optimal Micro-Climate Conditions &mdash; Trees Thriving");

  const stressHTML = stressAlerts.map((s) => {
    const isOk = s.includes("Optimal");
    return `<div class="alert ${isOk ? "alert-ok" : "alert-warn"}">${isOk ? "✅" : "⚠️"} ${s}</div>`;
  }).join("");

  const recs: string[] = [];
  if (env.soilMoisture != null && env.soilMoisture < 35) recs.push("Apply targeted irrigation to raise soil moisture above 35% &mdash; prioritize zones with weak trees.");
  if (env.temperature != null && env.temperature > 33) recs.push("Apply organic mulch around root zones to reduce heat stress and flower dropping.");
  if (env.precipitation != null && env.precipitation === 0) recs.push("Monitor rainfall closely; if dry spell persists beyond 7 days, schedule supplemental irrigation.");
  if (advisories.length > 0) recs.push(`Inspect ${new Set(advisories.map((a) => a.treeNumber)).size} trees flagged for action &mdash; see zone breakdown above.`);
  if (recs.length === 0) recs.push("No action needed &mdash; continue routine monitoring.");
  const recHTML = recs.map((r) => `<li>${r}</li>`).join("");

  const forecastHTML = weather && weather.daily && weather.daily.length > 0
    ? weather.daily.map((d) => {
        const wi = weatherInfo(d.weatherCode);
        return `<tr><td>${d.date}</td><td>${wi.label}</td><td>${Math.round(d.tempMax)} °C</td><td>${Math.round(d.tempMin)} °C</td><td>${d.rainSum} mm</td></tr>`;
      }).join("")
    : `<tr><td colspan="5" style="text-align:center;color:#94a3b8">No forecast data available</td></tr>`;

  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Report &mdash; ${farmName}</title>
<style>
  @page { margin: 16mm; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, sans-serif; color: #1e293b; margin: 0; padding: 24px; }
  .header { background: #1B4D3E; color: #fff; border-radius: 16px; padding: 24px 28px; margin-bottom: 24px; }
  .header h1 { margin: 0 0 4px; font-size: 22px; }
  .header .meta { font-size: 12px; opacity: 0.85; }
  .section { margin-bottom: 22px; }
  .section h2 { font-size: 14px; color: #1B4D3E; border-bottom: 2px solid #e2e8f0; padding-bottom: 6px; margin: 0 0 12px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th { text-align: left; background: #f1f5f9; padding: 8px 10px; color: #475569; font-size: 11px; text-transform: uppercase; }
  td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; }
  .dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
  .alert { padding: 10px 14px; border-radius: 10px; margin-bottom: 8px; font-size: 12px; font-weight: 600; }
  .alert-warn { background: #fef3c7; color: #92400e; border: 1px solid #fde68a; }
  .alert-ok { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
  .ok-msg { color: #16a34a; font-size: 12px; font-weight: 600; }
  .zone-block { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px 16px; margin-bottom: 8px; }
  .zone-block h4 { margin: 0 0 6px; font-size: 12px; color: #334155; }
  .zone-block ul { margin: 0; padding-left: 18px; font-size: 11px; color: #64748b; }
  .zone-block li { margin-bottom: 3px; }
  .feature-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; font-size: 12px; }
  .feature-bar .bar-bg { flex: 1; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden; }
  .feature-bar .bar-fill { height: 100%; border-radius: 4px; }
  .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 10px; font-weight: 700; }
  .badge-iot { background: #dcfce7; color: #166534; }
  .badge-api { background: #e0f2fe; color: #075985; }
  @media print { body { padding: 0; } }
</style></head><body>
  <div class="header"><h1>Telemetry &amp; Yield Report</h1><div class="meta">${farmName} &middot; ${dateStr} &middot; ${farm.locationName || "Location not set"}</div></div>
  <div class="section"><h2>1. Farm Metadata &amp; Coordinates</h2><table>
    <tr><td style="width:30%">Farm Name</td><td>${farmName}</td></tr>
    <tr><td>Location</td><td>${farm.locationName || "Not set"}</td></tr>
    <tr><td>Latitude</td><td>${farm.lat || "—"}</td></tr>
    <tr><td>Longitude</td><td>${farm.lng || "—"}</td></tr>
    <tr><td>Total Trees</td><td>${farm.totalTrees}</td></tr>
    <tr><td>Area (Perches)</td><td>${farm.perches}</td></tr>
    <tr><td>Device ID</td><td>${farm.deviceId}</td></tr>
  </table></div>
  <div class="section"><h2>2. Live Environmental Telemetry <span class="badge ${source === "iot" ? "badge-iot" : "badge-api"}" style="float:right">${dataSourceLabel}</span></h2>
    <table><thead><tr><th>Parameter</th><th>Value</th></tr></thead><tbody>${telemetryRows}</tbody></table>
  </div>
  <div class="section"><h2>3. Tree Health Distribution &amp; Attention Required</h2>
    <table><thead><tr><th>Health Status</th><th>Count</th><th>Percentage</th></tr></thead><tbody>${healthRows}</tbody></table>
    <p style="font-size:12px;margin:12px 0 6px"><strong>Overall Health: ${health} (${Math.round(pct)}%)</strong></p>
    <h3 style="font-size:13px;color:#334155;margin:16px 0 8px">Trees Needing Attention (by Zone)</h3>
    ${attentionHTML}
  </div>
  <div class="section"><h2>4. AI Yield Forecast &amp; Feature Importance</h2>
    <table><tr><td style="width:40%">Predicted Next Cycle Yield</td><td><strong>${predictedYield.toLocaleString()} nuts</strong></td></tr></table>
    <h3 style="font-size:13px;color:#334155;margin:16px 0 10px">Feature Importance Breakdown</h3>
    <div class="feature-bar"><span style="width:140px">Soil Moisture Impact</span><div class="bar-bg"><div class="bar-fill" style="width:${soilImpact}%;background:#0ea5e9"></div></div><span><strong>${soilImpact}%</strong></span></div>
    <div class="feature-bar"><span style="width:140px">Temperature Stress</span><div class="bar-bg"><div class="bar-fill" style="width:${tempImpact}%;background:#f97316"></div></div><span><strong>${tempImpact}%</strong></span></div>
    <div class="feature-bar"><span style="width:140px">Historical Lag</span><div class="bar-bg"><div class="bar-fill" style="width:${histLag}%;background:#8b5cf6"></div></div><span><strong>${histLag}%</strong></span></div>
  </div>
  <div class="section"><h2>5. Micro-Climate Stress Alerts</h2>${stressHTML}</div>
  <div class="section"><h2>6. Automated Action Recommendations</h2><ul style="font-size:12px;line-height:1.8;padding-left:20px">${recHTML}</ul></div>
  <div class="section"><h2>7-Day Weather Forecast</h2><table><thead><tr><th>Date</th><th>Condition</th><th>High</th><th>Low</th><th>Rain</th></tr></thead><tbody>${forecastHTML}</tbody></table></div>
  <p style="text-align:center;font-size:10px;color:#94a3b8;margin-top:24px">Generated by Coconut Farm Telemetry &middot; ${dateStr}</p>
</body></html>`;
}
