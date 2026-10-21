import type { LucideIcon } from "lucide-react-native";
import type { PressableProps } from "react-native";

import { Icon } from "./icon";
import { PressableScale } from "./pressable-scale";
import { Text } from "./text";

const sizes = {
  md: { base: "h-12 gap-2 px-6", idle: "bg-surface border-line", text: "body", icon: "md" },
  sm: { base: "h-10 gap-2 px-4", idle: "bg-canvas border-canvas", text: "caption", icon: "sm" },
  // Home categories: three fit across a 390pt screen
  soft: { base: "h-12 gap-1.5 px-3.5", idle: "bg-canvas border-canvas", text: "caption", icon: "md" },
} as const;

const selectedTones = {
  lavender: "bg-lavender border-lavender",
  primary: "bg-primary border-primary",
} as const;

export type ChipProps = Omit<PressableProps, "children" | "style"> & {
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
    <PressableScale
      accessibilityRole="button"
      accessibilityState={{ selected: !!selected }}
      // Idle and selected colors never coexist: with no class merging, stylesheet order would pick the winner
      className={`flex-row items-center rounded-full border transition-colors duration-200 ease-out ${s.base} ${selected ? selectedTones[tone] : s.idle} ${className ?? ""}`}
      {...props}
    >
      {icon && <Icon icon={icon} size={s.icon} filled={selected} />}
      <Text variant={s.text} weight={selected ? "semibold" : "medium"}>
        {label}
      </Text>
    </PressableScale>
  );
}
