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
  md: { base: "h-10 gap-2 px-5 rounded-full", text: "caption" },
  // Listing card amenities: two fit across the card's text column
  sm: { base: "h-7 gap-1 px-2 rounded-full", text: "tiny" },
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
    <View className={`flex-row items-center self-start ${sizes[size].base} ${t.bg} ${className ?? ""}`}>
      {icon && <Icon icon={icon} size="sm" className={t.icon} filled={tone === "primary"} />}
      <Text variant={sizes[size].text} tone={t.text}>
        {label}
      </Text>
    </View>
  );
}
