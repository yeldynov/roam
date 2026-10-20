import { router } from "expo-router";
import { ChevronLeft } from "lucide-react-native";
import type { ReactNode } from "react";
import { ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { IconButton, Text, Wordmark } from "@/components/ui";

// Clears the auth screens off the stack so Back can't return into them
export function enterApp() {
  if (router.canDismiss()) router.dismissAll();
  router.replace("/home");
}

export type AuthScreenProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  /** Pinned to the bottom when the content is short */
  footer?: ReactNode;
};

export function AuthScreen({ title, subtitle, children, footer }: AuthScreenProps) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerClassName="flex-grow px-6"
      contentContainerStyle={{ paddingTop: insets.top + 8, paddingBottom: insets.bottom + 16 }}
      automaticallyAdjustKeyboardInsets
      keyboardShouldPersistTaps="handled"
    >
      <View className="flex-row items-center justify-between">
        <IconButton icon={ChevronLeft} variant="outline" size="sm" accessibilityLabel="Back" onPress={() => router.back()} />
        <Wordmark size="sm" />
      </View>
      <Text variant="display" className="mt-7">
        {title}
      </Text>
      <Text tone="muted" className="mt-3">
        {subtitle}
      </Text>
      {children}
      {footer && <View className="flex-grow justify-end pt-8">{footer}</View>}
    </ScrollView>
  );
}
