import { Minus, Plus } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { Icon } from "./icon";
import { Text } from "./text";

export type StepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  /** Layout only */
  className?: string;
};

export function Stepper({ value, onChange, min = 0, max = Infinity, className }: StepperProps) {
  const step = (label: string, icon: typeof Plus, next: number, disabled: boolean) => (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => onChange(next)}
      className={`size-10 items-center justify-center active:opacity-70 ${disabled ? "opacity-40" : ""}`}
    >
      <Icon icon={icon} />
    </Pressable>
  );
  return (
    <View
      accessibilityRole="adjustable"
      accessibilityValue={{ now: value, min, max: Number.isFinite(max) ? max : undefined }}
      className={`h-12 flex-row items-center gap-4 self-start rounded-full border border-line bg-surface px-2 ${className ?? ""}`}
    >
      {step("Decrease", Minus, value - 1, value <= min)}
      <Text variant="headline" className="min-w-6 text-center">
        {value}
      </Text>
      {step("Increase", Plus, value + 1, value >= max)}
    </View>
  );
}
