import type { LucideIcon } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { Icon } from "./icon";
import { Text } from "./text";

export type SegmentedControlProps<T extends string> = {
  options: { value: T; label: string; icon?: LucideIcon }[];
  value: T;
  onChange: (value: T) => void;
  /** Layout only */
  className?: string;
};

export function SegmentedControl<T extends string>({ options, value, onChange, className }: SegmentedControlProps<T>) {
  return (
    <View accessibilityRole="tablist" className={`flex-row self-start rounded-full bg-surface p-1 shadow-card ${className ?? ""}`}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            className={`h-11 flex-row items-center gap-2 rounded-full px-8 active:opacity-70 ${selected ? "bg-ink-soft" : ""}`}
          >
            {o.icon && <Icon icon={o.icon} className={selected ? "text-white" : "text-ink"} />}
            <Text variant="caption" tone={selected ? "white" : "ink"}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
