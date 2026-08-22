import { View, Text, TouchableOpacity } from "react-native";
import { ArrowLeft } from "lucide-react-native";
import type { ReactNode } from "react";

interface YieldScreenHeaderProps {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  right?: ReactNode;
}

export function YieldScreenHeader({ title, subtitle, onBack, right }: YieldScreenHeaderProps) {
  return (
    <View className="bg-white px-3 pt-14 pb-3.5 shadow-sm flex-row items-center gap-2">
      {onBack && (
        <TouchableOpacity
          onPress={onBack}
          className="w-9 h-9 rounded-full items-center justify-center text-slate-600 active:scale-90 flex-shrink-0"
        >
          <ArrowLeft size={20} color="#475569" />
        </TouchableOpacity>
      )}
      <View className="flex-1 min-w-0">
        <Text className="text-lg font-bold text-slate-800 leading-tight" numberOfLines={1}>{title}</Text>
        {subtitle && <Text className="text-xs text-slate-400" numberOfLines={1}>{subtitle}</Text>}
      </View>
      {right && <View className="flex-shrink-0">{right}</View>}
    </View>
  );
}
