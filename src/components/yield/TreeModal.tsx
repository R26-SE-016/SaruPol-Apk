import { View, Text, TouchableOpacity, Modal, ScrollView, TouchableWithoutFeedback } from "react-native";
import { X, Calendar, Hash, HeartPulse, Sprout, TrendingUp } from "lucide-react-native";
import type { Tree } from "@/types/yield";
import { statusColor, healthColor, statusLabel } from "@/utils/yieldTreeFactory";
import { lastHarvest } from "@/utils/yieldAnalytics";
import { LineChart } from "./YieldCharts";

interface TreeModalProps {
  tree: Tree;
  farmId: string;
  onClose: () => void;
  onSaveTree?: (tree: Tree) => Promise<void>; // Keep as optional to prevent prop errors in mapper
}

export function TreeModal({ tree, onClose }: TreeModalProps) {
  const num = String(tree.number).padStart(2, "0");
  const zoneColor = (tree as Tree & { zoneColor?: string | null }).zoneColor;
  const latest = lastHarvest(tree);
  const yieldHistory = tree.yieldHistory ?? [];

  const chartData = [...yieldHistory]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-12)
    .map((y) => ({ label: y.date.slice(5), value: y.nuts }));

  const status = tree.status || "Bearing";
  const health = tree.health || "Good";

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

              {/* body */}
              <ScrollView className="px-5 py-4 flex-shrink">
                <View className="space-y-4">
                  
                  {/* Basic Details */}
                  <Row icon={<Hash size={14} color="#94a3b8" />} label="Tag Number">
                    <Text className="font-bold text-slate-800">#{num}</Text>
                  </Row>

                  <Row icon={<Sprout size={14} color="#1e7550" />} label="Tree Status">
                    <View className="py-1 px-2.5 rounded-lg items-center" style={{ backgroundColor: statusColor(status) }}>
                      <Text className="text-white text-xs font-bold">{statusLabel(status)}</Text>
                    </View>
                  </Row>
                  
                  <Row icon={<HeartPulse size={14} color="#e11d48" />} label="Health Rating">
                    <View className="py-1 px-2.5 rounded-lg items-center" style={{ backgroundColor: healthColor(health) }}>
                      <Text className="text-white text-xs font-bold">{health}</Text>
                    </View>
                  </Row>

                  <Row icon={<TrendingUp size={14} color="#94a3b8" />} label="Last Harvest Yield">
                    {latest ? (
                      <Text className="font-bold text-slate-800">{latest.nuts} nuts <Text className="text-slate-400 font-normal text-[10px]">({latest.date})</Text></Text>
                    ) : (
                      <Text className="text-slate-400 text-xs">No records yet</Text>
                    )}
                  </Row>

                  {/* Notes */}
                  {tree.notes ? (
                    <View>
                      <Text className="text-xs font-medium text-slate-600 mb-1.5">Special Notes</Text>
                      <View className="w-full rounded-lg bg-slate-50 border border-slate-100 px-3 py-2 min-h-[60px]">
                        <Text className="text-xs text-slate-700">{tree.notes}</Text>
                      </View>
                    </View>
                  ) : null}

                  {/* Chart */}
                  {yieldHistory.length > 0 && (
                    <View className="bg-slate-50 rounded-xl p-3 mt-4">
                      <Text className="text-xs font-semibold text-slate-600 mb-2">Individual Yield Progress</Text>
                      <LineChart data={chartData} color="#15803d" unit="" />
                    </View>
                  )}

                </View>
              </ScrollView>

              {/* actions */}
              <View className="px-5 py-4 border-t border-slate-100 pb-8">
                <TouchableOpacity
                  onPress={onClose}
                  className="w-full py-3 rounded-xl items-center bg-slate-100"
                >
                  <Text className="text-sm font-bold text-slate-600">Close</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
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
