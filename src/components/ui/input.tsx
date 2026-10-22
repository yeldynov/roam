import { Eye, EyeOff, type LucideIcon } from "lucide-react-native";
import { useState, type ReactNode, type Ref } from "react";
import { Pressable, TextInput, View, type TextInputProps } from "react-native";

import { Icon } from "./icon";
import { Text } from "./text";

export type InputProps = TextInputProps & {
  ref?: Ref<TextInput>;
  icon?: LucideIcon;
  /** Stacks a label over the value (the two-line auth field) */
  label?: string;
  trailing?: ReactNode;
  /** Hides the text and adds a show/hide toggle */
  secure?: boolean;
  /** Layout only, applied to the field container */
  className?: string;
};

export function Input({ icon, label, trailing, secure, className, onFocus, onBlur, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);
  const field = (
    <TextInput
      className={`font-regular text-ink placeholder:text-placeholder selection:text-lavender-ink caret-lavender-ink ${label ? "h-5 p-0 text-caption" : "h-full flex-1 text-body"}`}
      // iOS draws a single-line input's text low when it has a lineHeight, clipping descenders
      // in the 20pt labeled field, so drop the size token's line height and let iOS center it
      style={{ lineHeight: undefined }}
      accessibilityLabel={label}
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
  );
  return (
    <View
      className={`flex-row items-center rounded-md border ${label ? "h-15 gap-5 px-5" : "h-14 gap-3 px-4"} ${focused ? "border-lavender-ring bg-lavender-soft" : "border-canvas bg-canvas"} ${className ?? ""}`}
    >
      {icon && <Icon icon={icon} size="lg" />}
      {label ? (
        <View className="flex-1">
          <Text variant="caption" importantForAccessibility="no" accessibilityElementsHidden>
            {label}
          </Text>
          {field}
        </View>
      ) : (
        // The lineHeight style drops the TextInput's flex-1, so a wrapper takes the width
        <View className="flex-1">{field}</View>
      )}
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
