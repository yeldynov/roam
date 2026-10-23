import { useSession, useUser } from "@clerk/expo";
import { X } from "lucide-react-native";
import { useState } from "react";
import { Modal, View } from "react-native";

import { CODE_LENGTH, CodeInput } from "@/components/auth/code-input";
import { TextLink } from "@/components/auth/text-link";
import { Alert, Button, IconButton, Text } from "@/components/ui";
import { authMessage } from "@/lib/auth";

type Request = { complete: () => void; cancel: () => void; level?: "first_factor" | "second_factor" | "multi_factor" };

/**
 * Clerk asks for a fresh check before sensitive actions (revoke a session, delete the account).
 * Pass `reverify` as `useReverification`'s `onNeedsReverification` and render `sheet`.
 */
export function useReverifySheet() {
  const [request, setRequest] = useState<Request | null>(null);
  const close = (done: boolean) => {
    if (done) request?.complete();
    else request?.cancel();
    setRequest(null);
  };
  return {
    reverify: (r: Request) => setRequest(r),
    sheet: request && <ReverifySheet level={request.level} onDone={() => close(true)} onCancel={() => close(false)} />,
  };
}

function ReverifySheet({ level, onDone, onCancel }: { level: Request["level"]; onDone: () => void; onCancel: () => void }) {
  const { session } = useSession();
  const { user } = useUser();
  const email = user?.primaryEmailAddress;
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; message: string } | null>(null);

  // Email code is the one factor every guest has, including Google and Apple accounts without a password
  const send = async () => {
    if (!session || !email) return setNotice({ tone: "danger", message: "We couldn't confirm it's you. Contact Roam support." });
    setLoading(true);
    try {
      await session.startVerification({ level: level ?? "first_factor" });
      await session.prepareFirstFactorVerification({ strategy: "email_code", emailAddressId: email.id });
      setSent(true);
      setCode("");
      setNotice(null);
    } catch (e) {
      setNotice({ tone: "danger", message: authMessage(e) });
    } finally {
      setLoading(false);
    }
  };

  const submit = async (value = code) => {
    if (!session) return;
    if (value.length !== CODE_LENGTH) return setNotice({ tone: "danger", message: `Enter the ${CODE_LENGTH}-digit code.` });
    setLoading(true);
    try {
      const verification = await session.attemptFirstFactorVerification({ strategy: "email_code", code: value });
      if (verification.status !== "complete") throw new Error("We couldn't confirm it's you. Contact Roam support.");
      onDone();
    } catch (e) {
      setCode("");
      setNotice({ tone: "danger", message: authMessage(e) });
    } finally {
      setLoading(false);
    }
  };

  const change = (text: string) => {
    if (loading) return;
    const digits = text.replace(/\D/g, "").slice(0, CODE_LENGTH);
    setCode(digits);
    setNotice(null);
    if (digits.length === CODE_LENGTH) submit(digits);
  };

  return (
    <Modal visible presentationStyle="pageSheet" animationType="slide" onRequestClose={onCancel}>
      <View className="flex-1 gap-6 bg-surface px-5 pt-6">
        <View className="flex-row items-center justify-between gap-4">
          <Text variant="title" className="flex-1">
            Confirm it&apos;s you
          </Text>
          <IconButton icon={X} size="sm" accessibilityLabel="Close" onPress={onCancel} />
        </View>
        {sent ? (
          <>
            <Text tone="muted">We sent a code to {email?.emailAddress}. Enter it below.</Text>
            <CodeInput value={code} onChangeText={change} />
            {notice && <Alert tone={notice.tone} message={notice.message} />}
            <Button title="Confirm" loading={loading} onPress={() => submit()} />
            <TextLink prompt="Didn't get a code?" link="Resend" onPress={send} disabled={loading} />
          </>
        ) : (
          <>
            <Text tone="muted">For your security, we&apos;ll email a code to {email?.emailAddress}.</Text>
            {notice && <Alert tone={notice.tone} message={notice.message} />}
            <Button title="Send code" loading={loading} onPress={send} />
          </>
        )}
      </View>
    </Modal>
  );
}
