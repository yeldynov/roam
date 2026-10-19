import type { LucideIcon } from "lucide-react-native";
import { Pressable, type PressableProps } from "react-native";

import { Icon } from "./icon";

const variants = {
  soft: "bg-canvas",
  surface: "bg-surface shadow-card",
} as const;

export type IconButtonProps = Omit<PressableProps, "children"> & {
  icon: LucideIcon;
  accessibilityLabel: string;
  variant?: keyof typeof variants;
  /** Layout only */
  className?: string;
};

export function IconButton({ icon, variant = "soft", className, ...props }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      className={`size-14 items-center justify-center rounded-full active:opacity-70 ${variants[variant]} ${className ?? ""}`}
      {...props}
    >
      <Icon icon={icon} size="lg" />
    </Pressable>
  );
}
