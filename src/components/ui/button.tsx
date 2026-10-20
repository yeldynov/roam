import { ArrowRight, type LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { ActivityIndicator, Pressable, View, type PressableProps } from "react-native";

import { Icon } from "./icon";
import { Text } from "./text";

const variants = {
  primary: "bg-primary",
  secondary: "bg-surface border border-line",
} as const;

export type ButtonProps = Omit<PressableProps, "children"> & {
  variant?: keyof typeof variants;
  title: string;
  /** Trailing on primary (defaults to an arrow), leading on secondary */
  icon?: LucideIcon | null;
  /** A non-lucide leading element (e.g. GoogleLogo); replaces `icon` on secondary */
  leading?: ReactNode;
  loading?: boolean;
  /** Layout only */
  className?: string;
};

export function Button({ variant = "primary", title, icon, leading, loading, disabled, className, ...props }: ButtonProps) {
  const isDisabled = !!(disabled || loading);
  const glyph = icon === undefined && variant === "primary" ? ArrowRight : icon;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: !!loading }}
      disabled={isDisabled}
      className={`h-13 flex-row items-center justify-center gap-3 rounded-full px-6 active:opacity-70 ${variants[variant]} ${isDisabled ? "opacity-40" : ""} ${className ?? ""}`}
      {...props}
    >
      {loading ? (
        <ActivityIndicator />
      ) : (
        <>
          {variant === "secondary" && (leading ?? (glyph && <Icon icon={glyph} size="lg" />))}
          <Text variant="button">{title}</Text>
          {/* Absolute so the label stays centered, as in the design */}
          {variant === "primary" && glyph && (
            <View className="absolute right-6">
              <Icon icon={glyph} size="lg" />
            </View>
          )}
        </>
      )}
    </Pressable>
  );
}
