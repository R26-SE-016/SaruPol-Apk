import { useState } from "react";
import { View, Text, TouchableOpacity, Modal, ScrollView, TextInput, TouchableWithoutFeedback } from "react-native";
import { X, Plus, Trash2, Calendar, Hash, HeartPulse, FileText, Save, Loader2, TrendingUp, Sprout } from "lucide-react-native";
import type { Tree, TreeStatus, TreeHealth, YieldRecord } from "@/types/yield";
import { statusColor, healthColor, statusLabel } from "@/utils/yieldTreeFactory";
import { lastHarvest } from "@/utils/yieldAnalytics";
import { LineChart } from "./YieldCharts";

interface TreeModalProps {
  tree: Tree;
  farmId: string;
  onClose: () => void;
  onSaveTree: (tree: Tree) => Promise<void>;
}

const STATUS_OPTIONS: TreeStatus[] = ["Young", "Bearing", "Diseased", "NonBearing"];

export function TreeModal({ tree, onClose, onSaveTree }: TreeModalProps) {
  const [status, setStatus] = useState<TreeStatus>(tree.status);
  const [health, setHealth] = useState<TreeHealth>(tree.health ?? "Good");
  const [notes, setNotes] = useState(tree.notes ?? "");
  const [yieldHistory, setYieldHistory] = useState<YieldRecord[]>(tree.yieldHistory ?? []);
  const [newMonth, setNewMonth] = useState("");
  const [newNuts, setNewNuts] = useState("");
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<"details" | "history">("details");

  const num = String(tree.number).padStart(2, "0");
  const zoneColor = (tree as Tree & { zoneColor?: string | null }).zoneColor;
  const latest = lastHarvest(tree);

  const chartData = [...yieldHistory]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-12)
    .map((y) => ({ label: y.date.slice(5), value: y.nuts }));

  const addYield = () => {
    const n = parseInt(newNuts, 10);
    if (!newMonth || !Number.isFinite(n) || n < 0) return;
    const rec: YieldRecord = {
      id: `y-${Date.now()}`,
      date: newMonth,
      nuts: n,
      createdAt: Date.now(),
    };
    setYieldHistory((prev) => [...prev, rec]);
    setNewMonth("");
    setNewNuts("");
  };

  const removeYield = (id: string) =>
    setYieldHistory((prev) => prev.filter((y) => y.id !== id));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSaveTree({
        ...tree,
        status,
        health,
        notes,
        yieldHistory,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View className="flex-1 justify-end bg-black/55">
          <TouchableWithoutFeedback>
            <View className="bg-white rounded-t-3xl max-h-[90%] flex-shrink">
              {/* header */}
              <View
                className="relative flex-row items-center justify-center py-3 border-b border-slate-200"
                style={{ backgroundColor: zoneColor ? `${zoneColor}15` : "#f8fafc" }}
              >
                <Text className="font-bold text-slate-800 text-base">Tree #{num}</Text>
                {zoneColor && <View className="ml-2 w-3 h-3 rounded-full" style={{ backgroundColor: zoneColor }} />}
                <TouchableOpacity
                  onPress={onClose}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1"
                >
                  <X size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {/* tabs */}
              <View className="flex-row border-b border-slate-100">
                {(["details", "history"] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    onPress={() => setTab(t)}
                    className={`flex-1 py-2.5 items-center ${tab === t ? "border-b-2 border-forest-600" : ""}`}
                  >
                    <Text className={`text-xs font-semibold ${tab === t ? "text-forest-700" : "text-slate-400"}`}>
                      {t === "details" ? "Details & Health" : "Yield History"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* body */}
              <ScrollView className="px-5 py-4 flex-shrink">
                {tab === "details" ? (
                  <View className="space-y-3.5">
                    <Row icon={<Hash size={14} color="#94a3b8" />} label="Tag Number">
                      <Text className="font-bold text-slate-800">#{num}</Text>
                    </Row>

                    <View>
                      <Text className="flex-row items-center gap-2 text-xs font-medium text-slate-600 mb-1.5">
                        <Sprout size={14} color="#1e7550" /> Tree Status
                      </Text>
                      <View className="flex-row flex-wrap gap-2">
                        {STATUS_OPTIONS.map((s) => {
                          const active = status === s;
                          return (
                            <TouchableOpacity
                              key={s}
                              onPress={() => { setStatus(s); setHealth(statusToHealth(s)); }}
                              className={`py-2 px-3 rounded-lg text-xs font-bold border ${active ? "text-white border-transparent" : "bg-white text-slate-500 border-slate-200"}`}
                              style={active ? { backgroundColor: statusColor(s) } : undefined}
                            >
                              <Text style={active ? { color: "#fff" } : { color: "#64748b" }}>{statusLabel(s)}</Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    </View>

                    <Row icon={<TrendingUp size={14} color="#94a3b8" />} label="Last Harvest Yield">
                      {latest ? (
                        <Text className="font-bold text-slate-800">{latest.nuts} nuts <Text className="text-slate-400 font-normal text-[10px]">({latest.date})</Text></Text>
                      ) : (
                        <Text className="text-slate-400 text-xs">No records yet</Text>
                      )}
                    </Row>

                    <View>
                      <Text className="text-xs font-medium text-slate-600 mb-1.5">Health Rating</Text>
                      <View className="flex-row gap-2">
                        {(["Good", "Average", "Weak"] as TreeHealth[]).map((h) => (
                          <TouchableOpacity
                            key={h}
                            onPress={() => setHealth(h)}
                            className={`flex-1 py-2 rounded-lg items-center ${health === h ? "" : "bg-slate-100"}`}
                            style={health === h ? { backgroundColor: healthColor(h) } : undefined}
                          >
                            <Text style={health === h ? { color: "#fff" } : { color: "#64748b" }} className="text-xs font-bold">{h}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    <View className="bg-slate-50 rounded-xl p-3 space-y-2">
                      <Text className="text-xs font-semibold text-slate-600">Add New Harvest Yield (Nuts)</Text>
                      <View className="flex-row gap-2">
                        <TextInput
                          value={newMonth}
                          onChangeText={setNewMonth}
                          placeholder="YYYY-MM"
                          placeholderTextColor="#cbd5e1"
                          className="flex-1 rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-slate-800"
                        />
                        <TextInput
                          value={newNuts}
                          onChangeText={setNewNuts}
                          placeholder="Nuts"
                          placeholderTextColor="#cbd5e1"
                          keyboardType="numeric"
                          className="w-20 rounded-lg border border-slate-200 px-2.5 py-2 text-xs text-slate-800"
                        />
                        <TouchableOpacity
                          onPress={addYield}
                          className="w-9 h-9 rounded-lg bg-forest-600 items-center justify-center flex-shrink-0"
                        >
                          <Plus size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View>
                      <Text className="text-xs font-medium text-slate-600 mb-1.5">Special Notes</Text>
                      <TextInput
                        value={notes}
                        onChangeText={setNotes}
                        placeholder="Fertilizer date, observed anomalies…"
                        placeholderTextColor="#cbd5e1"
                        multiline
                        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs text-slate-800 min-h-[60px]"
                      />
                    </View>
                  </View>
                ) : (
                  <View className="space-y-3">
                    <View className="bg-slate-50 rounded-xl p-3">
                      <Text className="text-xs font-semibold text-slate-600 mb-1">Individual Yield Progress</Text>
                      <LineChart data={chartData} color="#15803d" unit="" />
                    </View>

                    {yieldHistory.length === 0 ? (
                      <View className="items-center py-8">
                        <Calendar size={24} color="#cbd5e1" />
                        <Text className="text-xs text-slate-400 mt-2">No harvest records yet.</Text>
                      </View>
                    ) : (
                      <View className="space-y-2">
                        {[...yieldHistory].sort((a, b) => b.date.localeCompare(a.date)).map((y) => (
                          <View key={y.id} className="flex-row items-center gap-3 p-2.5 rounded-lg bg-slate-50">
                            <View className="w-9 h-9 rounded-lg bg-forest-100 items-center justify-center flex-shrink-0">
                              <Calendar size={14} color="#1e7550" />
                            </View>
                            <View className="flex-1 min-w-0">
                              <Text className="text-xs font-bold text-slate-800">{y.nuts} nuts</Text>
                              <Text className="text-[10px] text-slate-400">{y.date}</Text>
                            </View>
                            <TouchableOpacity onPress={() => removeYield(y.id)}>
                              <Trash2 size={14} color="#cbd5e1" />
                            </TouchableOpacity>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </ScrollView>

              {/* actions */}
              <View className="flex-row gap-3 px-5 py-4 border-t border-slate-100">
                <TouchableOpacity
                  onPress={onClose}
                  className="flex-1 py-2.5 rounded-xl items-center bg-slate-100"
                >
                  <Text className="text-sm font-bold text-slate-600">Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl items-center bg-forest-600 flex-row justify-center gap-2"
                >
                  {saving ? <Loader2 size={16} color="#fff" /> : <Save size={15} color="#fff" />}
                  <Text className="text-sm font-bold text-white">{saving ? "Saving…" : "Save"}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

function statusToHealth(s: TreeStatus): TreeHealth {
  if (s === "Bearing") return "Good";
  if (s === "Young") return "Average";
  return "Weak";
}

function Row({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <View className="flex-row items-center gap-2">
      {icon}
      <Text className="text-slate-500 font-medium text-sm">{label}</Text>
      <View className="ml-auto flex-row items-center">{children}</View>
    </View>
  );
}
