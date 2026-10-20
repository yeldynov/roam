import { Pressable, View } from "react-native";

import { Text } from "@/components/ui";

export type TextLinkProps = {
  prompt: string;
  link: string;
  onPress: () => void;
  disabled?: boolean;
  /** Layout only */
  className?: string;
};

// "Already have an account? Sign in": muted prompt, underlined action
export function TextLink({ prompt, link, onPress, disabled, className }: TextLinkProps) {
  return (
    <View className={`flex-row items-center justify-center gap-2 ${className ?? ""}`}>
      <Text variant="caption" tone="muted">
        {prompt}
      </Text>
      <Pressable accessibilityRole="link" hitSlop={8} disabled={disabled} onPress={onPress} className="active:opacity-70">
        <Text variant="caption" weight="semibold" underline>
          {link}
        </Text>
      </Pressable>
    </View>
  );
}
