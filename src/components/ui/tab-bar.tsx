import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import type { LucideIcon } from "lucide-react-native";
import { styled } from "nativewind";
import { Pressable, View } from "react-native";

import { Icon } from "./icon";
import { Text } from "./text";

const StyledGlass = styled(GlassView, { className: "style" });
// Without liquid glass (older iOS, Android, web, Expo Go), GlassView is a plain view
const fallback = isLiquidGlassAvailable() ? "" : "bg-glass border border-white shadow-raised";

export type TabBarProps<T extends string> = {
  tabs: { key: T; label: string; icon: LucideIcon }[];
  active: T;
  onChange: (key: T) => void;
  /** Layout only */
  className?: string;
};

export function TabBar<T extends string>({ tabs, active, onChange, className }: TabBarProps<T>) {
  return (
    <StyledGlass
      accessibilityRole="tablist"
      className={`h-18 flex-row items-center rounded-full px-2 ${fallback} ${className ?? ""}`}
    >
      {tabs.map((t) => {
        const selected = t.key === active;
        return (
          <Pressable
            key={t.key}
            accessibilityRole="tab"
            accessibilityLabel={t.label}
            accessibilityState={{ selected }}
            onPress={() => onChange(t.key)}
            className="h-16 flex-1 items-center justify-center active:opacity-70"
          >
            <View className={`size-16 items-center justify-center gap-1 rounded-full ${selected ? "bg-primary" : ""}`}>
              <Icon icon={t.icon} size="lg" filled={selected} />
              <Text variant="small">{t.label}</Text>
            </View>
          </Pressable>
        );
      })}
    </StyledGlass>
  );
}
