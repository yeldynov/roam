import { useState } from "react";
import { View } from "react-native";

import { AppleLogo, Button, GoogleLogo, Text } from "@/components/ui";
import * as mockAuth from "@/lib/mock-auth";

type Provider = "google" | "apple";

export type SocialButtonsProps = {
  onSuccess: () => void;
  /** Disables both while the screen's own form is submitting */
  disabled?: boolean;
};

// The "or" divider plus Continue with Google and Apple
export function SocialButtons({ onSuccess, disabled }: SocialButtonsProps) {
  const [pending, setPending] = useState<Provider | null>(null);

  const go = async (provider: Provider) => {
    setPending(provider);
    try {
      await mockAuth.social(provider);
      onSuccess();
    } finally {
      setPending(null);
    }
  };

  return (
    <>
      <View className="mt-6 flex-row items-center gap-4">
        <View className="h-px flex-1 bg-line" />
        <Text variant="small" tone="muted">
          or
        </Text>
        <View className="h-px flex-1 bg-line" />
      </View>
      <View className="mt-5 gap-3">
        <Button
          variant="secondary"
          title="Continue with Google"
          leading={<GoogleLogo />}
          loading={pending === "google"}
          disabled={disabled || pending !== null}
          onPress={() => go("google")}
        />
        <Button
          variant="secondary"
          title="Continue with Apple"
          leading={<AppleLogo />}
          loading={pending === "apple"}
          disabled={disabled || pending !== null}
          onPress={() => go("apple")}
        />
      </View>
    </>
  );
}
