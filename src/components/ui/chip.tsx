import type { LucideIcon } from "lucide-react-native";
import { Pressable, type PressableProps } from "react-native";

import { Icon } from "./icon";
import { Text } from "./text";

const sizes = {
  md: { base: "h-12 px-6", idle: "bg-surface border-line", text: "body", icon: "md" },
  sm: { base: "h-10 px-4", idle: "bg-canvas border-canvas", text: "caption", icon: "sm" },
} as const;

const selectedTones = {
  lavender: "bg-lavender border-lavender",
  primary: "bg-primary border-primary",
} as const;

export type ChipProps = Omit<PressableProps, "children"> & {
  label: string;
  icon?: LucideIcon;
  selected?: boolean;
  /** Background when selected */
  tone?: keyof typeof selectedTones;
  size?: keyof typeof sizes;
  /** Layout only */
  className?: string;
};

export function Chip({ label, icon, selected, tone = "lavender", size = "md", className, ...props }: ChipProps) {
  const s = sizes[size];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      // Idle and selected colors never coexist: with no class merging, stylesheet order would pick the winner
      className={`flex-row items-center gap-2 rounded-full border active:opacity-70 ${s.base} ${selected ? selectedTones[tone] : s.idle} ${className ?? ""}`}
      {...props}
    >
      {icon && <Icon icon={icon} size={s.icon} filled={selected} />}
      <Text variant={s.text} weight={selected ? "semibold" : "medium"}>
        {label}
      </Text>
    </Pressable>
  );
}
