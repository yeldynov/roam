import { ChevronRight, type LucideIcon } from "lucide-react-native";
import type { ReactNode } from "react";
import { Pressable, View, type PressableProps } from "react-native";

import { Icon } from "./icon";
import { Text } from "./text";

export type ListRowProps = Omit<PressableProps, "children"> & {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  /**
   * `policy`: lavender card with an icon tile. `plain`: bare row for grouped lists (parent draws dividers).
   * `menu`: icon in a canvas tile, body title (inside a `ListGroup`)
   */
  variant?: "policy" | "plain" | "menu";
  /** Policy only: false draws the icon bare on the card */
  iconTile?: boolean;
  tone?: "ink" | "danger";
  /** Replaces the chevron (e.g. a button) */
  trailing?: ReactNode;
  /** Layout only */
  className?: string;
};

export function ListRow({
  icon,
  title,
  subtitle,
  variant = "plain",
  iconTile = true,
  tone = "ink",
  trailing,
  className,
  ...props
}: ListRowProps) {
  const policy = variant === "policy";
  const menu = variant === "menu";
  const color = policy ? "text-lavender-ink" : tone === "danger" ? "text-danger" : "text-ink";
  return (
    <Pressable
      accessibilityRole="button"
      className={`flex-row items-center active:opacity-70 ${policy ? "gap-4 rounded-md bg-lavender-soft p-4" : menu ? "gap-4 py-2" : "gap-4 py-4"} ${className ?? ""}`}
      {...props}
    >
      {policy && iconTile ? (
        <View className="size-11 items-center justify-center rounded-sm bg-white">
          <Icon icon={icon} size="lg" className={color} />
        </View>
      ) : menu ? (
        <View className="size-10 items-center justify-center rounded-md bg-canvas">
          <Icon icon={icon} size="lg" className={color} />
        </View>
      ) : (
        <Icon icon={icon} size="lg" className={color} />
      )}
      <View className={`flex-1 gap-1 ${menu ? "min-h-12 justify-center" : ""}`}>
        <Text variant={policy ? "headline" : menu ? "body" : "caption"} tone={tone}>
          {title}
        </Text>
        {subtitle && (
          <Text variant={policy ? "caption" : "small"} tone="muted" weight="regular">
            {subtitle}
          </Text>
        )}
      </View>
      {trailing ?? (tone === "danger" ? null : <Icon icon={ChevronRight} className={color} />)}
    </Pressable>
  );
}
