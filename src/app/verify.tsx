import { useSignIn, useSignUp } from "@clerk/expo";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";

import { AuthScreen } from "@/components/auth/auth-screen";
import { CODE_LENGTH as LENGTH, CodeInput } from "@/components/auth/code-input";
import { TextLink } from "@/components/auth/text-link";
import { Alert, Button } from "@/components/ui";
import { authMessage } from "@/lib/auth";

export default function Verify() {
  const { email = "", flow = "sign-up" } = useLocalSearchParams<{ email?: string; flow?: "sign-up" | "sign-in" }>();
  const { signUp } = useSignUp();
  const { signIn } = useSignIn();
  const [code, setCode] = useState("");
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; message: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const submit = async (value = code) => {
    if (value.length !== LENGTH) return setNotice({ tone: "danger", message: `Enter the ${LENGTH}-digit code.` });
    setLoading(true);
    try {
      // Sign-up verifies the new email; sign-in uses the same code step for Clerk's new-device check
      const attempt = flow === "sign-in" ? signIn : signUp;
      const { error } =
        flow === "sign-in" ? await signIn.mfa.verifyEmailCode({ code: value }) : await signUp.verifications.verifyEmailCode({ code: value });
      if (error) throw error;
      if (attempt.status !== "complete") throw new Error("We couldn't finish signing you in. Contact support.");
      // The root layout's guard moves to home once the session is active
      const finalized = await attempt.finalize();
      if (finalized.error) throw finalized.error;
    } catch (e) {
      setCode("");
      setNotice({ tone: "danger", message: authMessage(e) });
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
      const { error } = flow === "sign-in" ? await signIn.mfa.sendEmailCode() : await signUp.verifications.sendEmailCode();
      if (error) throw error;
      setCode("");
      setNotice({ tone: "success", message: "We sent a new code." });
    } catch (e) {
      setNotice({ tone: "danger", message: authMessage(e) });
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthScreen title="Check your email" subtitle={`We sent a ${LENGTH}-digit code to ${email}. Enter it below.`}>
      <CodeInput value={code} onChangeText={change} className="mt-6" />
      {notice && <Alert tone={notice.tone} message={notice.message} className="mt-6" />}
      <Button title="Verify" loading={loading} onPress={() => submit()} className="mt-6" />
      <TextLink prompt="Didn't get a code?" link="Resend" onPress={resend} disabled={resending} className="mt-6" />
    </AuthScreen>
  );
}
