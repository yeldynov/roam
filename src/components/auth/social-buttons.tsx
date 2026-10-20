import { useSSO } from "@clerk/expo";
import { useState } from "react";
import { View } from "react-native";

import { AppleLogo, Button, GoogleLogo, Text } from "@/components/ui";
import { authMessage } from "@/lib/auth";

type Provider = "google" | "apple";

export type SocialButtonsProps = {
  /** Shows Clerk's message in the screen's alert */
  onError: (message: string) => void;
  /** Disables both while the screen's own form is submitting */
  disabled?: boolean;
};

// The "or" divider plus Continue with Google and Apple, through Clerk's browser SSO
export function SocialButtons({ onError, disabled }: SocialButtonsProps) {
  const { startSSOFlow } = useSSO();
  const [pending, setPending] = useState<Provider | null>(null);

  const go = async (provider: Provider) => {
    setPending(provider);
    try {
      const { createdSessionId, setActive, signUp } = await startSSOFlow({ strategy: `oauth_${provider}` });
      // The root layout's guard moves to home once the session is active
      if (createdSessionId) await setActive?.({ session: createdSessionId });
      else if (signUp?.status === "missing_requirements") onError("We couldn't finish creating your account. Contact support.");
      // Neither means the guest closed the browser: nothing to show
    } catch (e) {
      onError(authMessage(e));
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
