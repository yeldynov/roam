import { useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";

import { Text } from "@/components/ui";

export const CODE_LENGTH = 6;

export type CodeInputProps = {
  value: string;
  onChangeText: (text: string) => void;
  /** Layout only */
  className?: string;
};

export function CodeInput({ value, onChangeText, className }: CodeInputProps) {
  const [focused, setFocused] = useState(true);
  const inputRef = useRef<TextInput>(null);
  return (
    <>
      {/* One hidden input drives the boxes, so paste and iOS one-time-code autofill fill all six */}
      <Pressable accessible={false} onPress={() => inputRef.current?.focus()} className={`flex-row gap-2 ${className ?? ""}`}>
        {Array.from({ length: CODE_LENGTH }, (_, i) => {
          const active = focused && i === Math.min(value.length, CODE_LENGTH - 1);
          return (
            <View
              key={i}
              className={`h-14 flex-1 items-center justify-center rounded-md border ${active ? "border-lavender-ring bg-lavender-soft" : "border-canvas bg-canvas"}`}
            >
              <Text variant="title">{value[i] ?? ""}</Text>
            </View>
          );
        })}
      </Pressable>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoFocus
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={CODE_LENGTH}
        accessibilityLabel="Verification code"
        caretHidden
        className="absolute size-px opacity-0"
      />
    </>
  );
}
