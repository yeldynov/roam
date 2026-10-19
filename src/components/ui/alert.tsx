import { CircleAlert, CircleCheck, X } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { Icon } from "./icon";
import { Text } from "./text";

const tones = {
  success: { bg: "bg-success-soft", icon: CircleCheck, color: "text-success" },
  danger: { bg: "bg-danger-soft", icon: CircleAlert, color: "text-danger" },
} as const;

export type AlertProps = {
  tone: keyof typeof tones;
  message: string;
  onDismiss?: () => void;
  /** Layout only */
  className?: string;
};

export function Alert({ tone, message, onDismiss, className }: AlertProps) {
  const t = tones[tone];
  return (
    <View
      accessibilityRole="alert"
      className={`min-h-12 flex-row items-center gap-3 rounded-sm px-4 py-3 ${t.bg} ${className ?? ""}`}
    >
      <Icon icon={t.icon} size="lg" className={t.color} />
      <Text variant="caption" tone={tone} className="flex-1">
        {message}
      </Text>
      {onDismiss && (
        <Pressable accessibilityRole="button" accessibilityLabel="Dismiss" hitSlop={8} onPress={onDismiss} className="active:opacity-70">
          <Icon icon={X} className={t.color} />
        </Pressable>
      )}
    </View>
  );
}
