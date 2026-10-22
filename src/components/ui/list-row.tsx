import { ChevronRight, type LucideIcon } from "lucide-react-native";
import { Pressable, View, type PressableProps } from "react-native";

import { Icon } from "./icon";
import { Text } from "./text";

export type ListRowProps = Omit<PressableProps, "children"> & {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  /** `policy`: lavender card with an icon tile. `plain`: bare row for grouped lists (parent draws dividers) */
  variant?: "policy" | "plain";
  /** Layout only */
  className?: string;
};

export function ListRow({ icon, title, subtitle, variant = "plain", className, ...props }: ListRowProps) {
  const policy = variant === "policy";
  return (
    <Pressable
      accessibilityRole="button"
      className={`flex-row items-center gap-4 active:opacity-70 ${policy ? "rounded-md bg-lavender-soft p-4" : "py-4"} ${className ?? ""}`}
      {...props}
    >
      {policy ? (
        <View className="size-11 items-center justify-center rounded-sm bg-white">
          <Icon icon={icon} size="lg" className="text-lavender-ink" />
        </View>
      ) : (
        <Icon icon={icon} size="lg" />
      )}
      <View className="flex-1 gap-1">
        <Text variant={policy ? "headline" : "caption"}>{title}</Text>
        {subtitle && (
          <Text variant={policy ? "caption" : "small"} tone="muted" weight="regular">
            {subtitle}
          </Text>
        )}
      </View>
      <Icon icon={ChevronRight} className={policy ? "text-lavender-ink" : "text-ink"} />
    </Pressable>
  );
}
