import { Eye, EyeOff, type LucideIcon } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Pressable, TextInput, View, type TextInputProps } from "react-native";

import { Icon } from "./icon";

export type InputProps = TextInputProps & {
  icon?: LucideIcon;
  trailing?: ReactNode;
  /** Hides the text and adds a show/hide toggle */
  secure?: boolean;
  /** Layout only, applied to the field container */
  className?: string;
};

export function Input({ icon, trailing, secure, className, onFocus, onBlur, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  return (
    <View
      className={`h-14 flex-row items-center gap-3 rounded-md border px-4 ${focused ? "border-lavender-ring bg-lavender-soft" : "border-canvas bg-canvas"} ${className ?? ""}`}
    >
      {icon && <Icon icon={icon} size="lg" />}
      <TextInput
        className="h-full flex-1 font-regular text-body text-ink placeholder:text-placeholder selection:text-lavender-ink caret-lavender-ink"
        secureTextEntry={secure && hidden}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...props}
      />
      {secure && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={hidden ? "Show password" : "Hide password"}
          hitSlop={8}
          onPress={() => setHidden((h) => !h)}
          className="active:opacity-70"
        >
          <Icon icon={hidden ? EyeOff : Eye} size="lg" />
        </Pressable>
      )}
      {trailing}
    </View>
  );
}
