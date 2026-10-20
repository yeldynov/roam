import { useLocalSearchParams } from "expo-router";
import { useRef, useState } from "react";
import { Pressable, TextInput, View } from "react-native";

import { AuthScreen, enterApp } from "@/components/auth/auth-screen";
import { TextLink } from "@/components/auth/text-link";
import { Alert, Button, Text } from "@/components/ui";
import * as mockAuth from "@/lib/mock-auth";

const LENGTH = 6;

export default function Verify() {
  const { email = "" } = useLocalSearchParams<{ email?: string }>();
  const [code, setCode] = useState("");
  const [focused, setFocused] = useState(true);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const submit = async (value = code) => {
    if (value.length !== LENGTH) return setNotice({ tone: "danger", message: `Enter the ${LENGTH}-digit code.` });
    setLoading(true);
    try {
      await mockAuth.verify(value);
      enterApp();
    } catch (e) {
      setCode("");
      setNotice({ tone: "danger", message: e instanceof Error ? e.message : "Something went wrong. Try again." });
    } finally {
      setLoading(false);
    }
  };

  const change = (text: string) => {
    // Not `editable={false}`: that blurs the input and drops the keyboard after a wrong code
    if (loading) return;
    const digits = text.replace(/\D/g, "").slice(0, LENGTH);
    setCode(digits);
    setNotice(null);
    if (digits.length === LENGTH) submit(digits);
  };

  const resend = async () => {
    setResending(true);
    try {
      await mockAuth.resend(email);
      setCode("");
      setNotice({ tone: "success", message: "We sent a new code." });
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthScreen title="Check your email" subtitle={`We sent a ${LENGTH}-digit code to ${email}. Enter it below.`}>
      {/* One hidden input drives the boxes, so paste and iOS one-time-code autofill fill all six */}
      <Pressable accessible={false} onPress={() => inputRef.current?.focus()} className="mt-6 flex-row gap-2">
        {Array.from({ length: LENGTH }, (_, i) => {
          const active = focused && i === Math.min(code.length, LENGTH - 1);
          return (
            <View
              key={i}
              className={`h-14 flex-1 items-center justify-center rounded-md border ${active ? "border-lavender-ring bg-lavender-soft" : "border-canvas bg-canvas"}`}
            >
              <Text variant="title">{code[i] ?? ""}</Text>
            </View>
          );
        })}
      </Pressable>
      <TextInput
        ref={inputRef}
        value={code}
        onChangeText={change}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoFocus
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="one-time-code"
        maxLength={LENGTH}
        accessibilityLabel="Verification code"
        caretHidden
        className="absolute size-px opacity-0"
      />
      {notice && <Alert tone={notice.tone} message={notice.message} className="mt-6" />}
      <Button title="Verify" loading={loading} onPress={() => submit()} className="mt-6" />
      <TextLink prompt="Didn't get a code?" link="Resend" onPress={resend} disabled={resending} className="mt-6" />
    </AuthScreen>
  );
}
