import { useState, useEffect, useMemo } from "react";
import { View, Text, TouchableOpacity, TextInput, ActivityIndicator, Image } from "react-native";
import { Info, Pencil, Zap, MapPin, X } from "lucide-react-native";
import { fetchLiveCdaRates, resolveDistrict, type CdaRateResponse } from "@/services/cdaMarketService";

interface MarketRevenueCardProps {
  locationName: string;
  predictedNuts: number;
}

export function MarketRevenueCard({ locationName, predictedNuts }: MarketRevenueCardProps) {
  const [cda, setCda] = useState<CdaRateResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCustom, setShowCustom] = useState(false);
  const [customRate, setCustomRate] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchLiveCdaRates()
      .then((res: any) => { if (active) { setCda(res); setLoading(false); } })
      .catch(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const district = useMemo(() => resolveDistrict(locationName), [locationName]);

  const districtRate = useMemo(() => {
    if (!cda) return 0;
    if (district && cda.rates[district] != null) return cda.rates[district];
    return cda.rates["Default"] ?? 85;
  }, [cda, district]);

  const usingNationalAvg = !district;

  const effectiveRate = useMemo(() => {
    const parsed = parseFloat(customRate);
    return !isNaN(parsed) && parsed > 0 ? parsed : districtRate;
  }, [customRate, districtRate]);

  const revenue = useMemo(() => predictedNuts * effectiveRate, [predictedNuts, effectiveRate]);

  const lastUpdatedLabel = cda
    ? new Date(cda.lastUpdated).toLocaleString("en-US", {
        month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
      })
    : "—";

  if (loading) return <SkeletonCard />;

  return (
    <View className="mx-4 my-3 bg-emerald-950 rounded-3xl p-5 border border-emerald-800/80 shadow-xl">
      {/* Section A: Header with pulse badge */}
      <View className="flex-row items-start justify-between">
        <View className="flex-row items-center gap-3 flex-1">
          <View className="w-10 h-10 bg-emerald-900 rounded-2xl items-center justify-center border border-emerald-700/50 flex-shrink-0 shadow-sm">
            <Image source={require('../../../../assets/icons/rupee.png')} style={{ width: 24, height: 24, resizeMode: 'contain' }} />
          </View>
          <Text className="text-white font-bold text-base leading-tight flex-1" numberOfLines={2}>
            Live CDA Market Intelligence
          </Text>
        </View>
        <View className="flex-row items-center gap-1 bg-emerald-900/80 px-2.5 py-1 rounded-full border border-emerald-700 flex-shrink-0">
          <Zap size={10} color="#6ee7b7" />
          <Text className="text-emerald-300 text-[10px] font-bold">Live Synced</Text>
        </View>
      </View>
      <Text className="text-emerald-300/80 text-xs mt-0.5">
        Updated: {lastUpdatedLabel} via Official CDA Feed
      </Text>

      {/* Section B: Educational farmer banner */}
      <View className="bg-emerald-900/40 p-3 rounded-xl border border-emerald-800/60 my-3 flex-row items-center gap-2.5">
        <Info size={20} color="#a7f3d0" />
        <Text className="text-emerald-200 text-xs leading-4 flex-1">
          Calculated using official Coconut Development Authority (CDA) farm-gate benchmark rates. Trader prices may vary locally.
        </Text>
      </View>

      {/* Section C: District location & editable price row */}
      <View className="bg-emerald-900/60 p-3.5 rounded-2xl border border-emerald-700/60 mb-3 flex-row items-center justify-between">
        <View className="flex-1 min-w-0">
          <View className="flex-row items-center gap-1">
            <MapPin size={10} color="#34d399" />
            <Text className="text-emerald-400 text-[10px] font-bold tracking-wider uppercase">Active Location Rate</Text>
          </View>
          <Text className="text-white font-extrabold text-sm mt-0.5" numberOfLines={1}>
            {district ?? "National Avg"}: LKR {districtRate.toFixed(2)} / nut
          </Text>
          {usingNationalAvg && (
            <View className="mt-1 self-start bg-emerald-800/60 px-2 py-0.5 rounded-full">
              <Text className="text-[9px] font-bold text-emerald-300">National Avg Applied</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          onPress={() => setShowCustom((o) => !o)}
          className="flex-shrink-0 bg-emerald-700 px-3 py-1.5 rounded-xl flex-row items-center gap-1.5"
        >
          {showCustom ? <X size={12} color="#fff" /> : <Pencil size={12} color="#fff" />}
          <Text className="text-white text-xs font-semibold">{showCustom ? "Close" : "Custom"}</Text>
        </TouchableOpacity>
      </View>

      {/* Section D: Custom price input drawer */}
      {showCustom && (
        <View className="bg-emerald-900/40 p-3.5 rounded-2xl border border-emerald-800/60 mb-3">
          <Text className="text-emerald-300 text-xs font-semibold mb-2">Trader Offered Rate (LKR):</Text>
          <View className="flex-row items-center gap-2">
            <Text className="text-emerald-400 font-bold text-sm">Rs.</Text>
            <TextInput
              value={customRate}
              onChangeText={setCustomRate}
              placeholder={districtRate.toFixed(2)}
              placeholderTextColor="#4b5563"
              keyboardType="decimal-pad"
              className="flex-1 bg-emerald-950 border border-emerald-700 rounded-xl px-3 py-2 text-white text-sm font-semibold"
            />
            <Text className="text-emerald-300 text-xs font-medium">/ nut</Text>
          </View>
          {customRate && !isNaN(parseFloat(customRate)) && (
            <Text className="text-emerald-400 text-[10px] mt-1.5 font-medium">
              Using your custom rate of LKR {parseFloat(customRate).toFixed(2)} / nut
            </Text>
          )}
        </View>
      )}

      {/* Section E: Revenue hero highlight box */}
      <View className="bg-emerald-950 p-4 rounded-2xl border border-emerald-800/90 items-center">
        <Text className="text-emerald-400 font-semibold text-[11px] uppercase tracking-widest">
          Estimated Gross Revenue
        </Text>
        <Text className="text-amber-400 font-black text-3xl my-1">
          LKR {revenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Text>
        <View className="h-px bg-emerald-800/80 w-full my-2.5" />
        <Text className="text-emerald-200 text-xs font-medium text-center">
          🌴 Based on AI Forecasted Yield: {predictedNuts.toLocaleString()} Nuts
        </Text>
      </View>
    </View>
  );
}

function SkeletonCard() {
  return (
    <View className="mx-4 my-3 bg-emerald-950 rounded-3xl p-5 border border-emerald-800/80 shadow-xl">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center gap-2">
          <View className="w-2.5 h-2.5 bg-emerald-700 rounded-full" />
          <View className="h-4 w-44 bg-emerald-800/60 rounded" />
        </View>
        <View className="h-5 w-20 bg-emerald-800/60 rounded-full" />
      </View>
      <View className="h-10 bg-emerald-900/40 rounded-xl mb-3" />
      <View className="h-14 bg-emerald-900/60 rounded-2xl mb-3" />
      <View className="h-28 bg-emerald-900/40 rounded-2xl items-center justify-center">
        <ActivityIndicator color="#10b981" size="small" />
      </View>
    </View>
  );
}
