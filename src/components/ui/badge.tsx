import type { LucideIcon } from "lucide-react-native";
import { View } from "react-native";

import { Icon } from "./icon";
import { Text, type TextProps } from "./text";

const tones = {
  primary: { bg: "bg-primary-soft", text: "ink", icon: "text-primary" },
  success: { bg: "bg-success-soft", text: "success", icon: "text-success" },
  danger: { bg: "bg-danger-soft", text: "danger", icon: "text-danger" },
  info: { bg: "bg-info-soft", text: "info", icon: "text-info" },
  neutral: { bg: "bg-canvas", text: "ink", icon: "text-ink" },
} as const satisfies Record<string, { bg: string; text: TextProps["tone"]; icon: string }>;

const sizes = {
  md: "h-10 px-5 rounded-full",
  sm: "h-8 px-3 rounded-sm",
} as const;

export type BadgeProps = {
  label: string;
  icon?: LucideIcon;
  tone?: keyof typeof tones;
  size?: keyof typeof sizes;
  /** Layout only */
  className?: string;
};

export function Badge({ label, icon, tone = "neutral", size = "md", className }: BadgeProps) {
  const t = tones[tone];
  return (
    <View className={`flex-row items-center gap-2 self-start ${sizes[size]} ${t.bg} ${className ?? ""}`}>
      {icon && <Icon icon={icon} size="sm" className={t.icon} filled={tone === "primary"} />}
      <Text variant="caption" tone={t.text}>
        {label}
      </Text>
    </View>
  );
}
