import { View, Text, TouchableOpacity } from "react-native";
import { LayoutDashboard } from "lucide-react-native";
import type { Tab } from "@/types/yield";

interface YieldBottomNavProps {
  active: Tab;
  onChange: (tab: Tab) => void;
}

const TAB_IDS: { id: Tab; icon: React.ReactNode; label: string }[] = [
  { id: "home", icon: <LayoutDashboard size={20} color="#94a3b8" />, label: "Yield Predictor" },
];

export function YieldBottomNav({ active, onChange }: YieldBottomNavProps) {
  return (
    <View className="absolute bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 flex-row items-stretch justify-around px-1">
      {TAB_IDS.map((tab) => {
        const isActive = active === tab.id;
        const iconColor = isActive ? "#1B4D3E" : "#94a3b8";
        
        return (
          <TouchableOpacity
            key={tab.id}
            onPress={() => onChange(tab.id)}
            className="flex-1 items-center py-2.5 relative"
          >
            {isActive && (
              <View className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full bg-forest-600" />
            )}
            <LayoutDashboard size={20} color={iconColor} />
            <Text
              className={`text-[10px] font-medium tracking-wide mt-0.5 ${isActive ? "text-forest-700" : "text-slate-400"}`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
