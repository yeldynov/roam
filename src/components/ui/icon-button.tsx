import type { LucideIcon } from "lucide-react-native";
import { Pressable, type PressableProps } from "react-native";

import { Icon } from "./icon";

const variants = {
  soft: "bg-canvas",
  surface: "bg-surface shadow-card",
  outline: "bg-surface border border-line",
} as const;

const sizes = { md: "size-14", sm: "size-11" } as const;

export type IconButtonProps = Omit<PressableProps, "children"> & {
  icon: LucideIcon;
  accessibilityLabel: string;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  /** Layout only */
  className?: string;
};

export function IconButton({ icon, variant = "soft", size = "md", className, ...props }: IconButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      className={`${sizes[size]} items-center justify-center rounded-full active:opacity-70 ${variants[variant]} ${className ?? ""}`}
      {...props}
    >
      <Icon icon={icon} size="lg" />
    </Pressable>
  );
}
