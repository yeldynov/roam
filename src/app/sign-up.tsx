import { useSignUp } from "@clerk/expo";
import { router } from "expo-router";
import { Lock, Mail, User } from "lucide-react-native";
import { useRef, useState } from "react";
import { View, type TextInput } from "react-native";

import { AuthScreen } from "@/components/auth/auth-screen";
import { SocialButtons } from "@/components/auth/social-buttons";
import { TextLink } from "@/components/auth/text-link";
import { Alert, Button, Input } from "@/components/ui";
import { authMessage } from "@/lib/auth";
import { validate } from "@/lib/validate";

export default function SignUp() {
  const { signUp } = useSignUp();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);

  const set = (key: keyof typeof form) => (value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    setError(null);
  };

  const submit = async () => {
    const problem = validate(form);
    if (problem) return setError(problem);
    setLoading(true);
    try {
      const email = form.email.trim();
      const [firstName, ...rest] = form.name.trim().split(/\s+/);
      const created = await signUp.password({
        emailAddress: email,
        password: form.password,
        firstName,
        lastName: rest.join(" ") || undefined,
      });
      if (created.error) return setError(authMessage(created.error));
      const sent = await signUp.verifications.sendEmailCode();
      if (sent.error) return setError(authMessage(sent.error));
      router.push({ pathname: "/verify", params: { email, flow: "sign-up" } });
    } catch (e) {
      setError(authMessage(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen
      title={"Create\nyour account"}
      subtitle="Join roam to save your stays, get personalized recommendations and access them across all your devices."
      footer={<TextLink prompt="Already have an account?" link="Sign in" onPress={() => router.replace("/sign-in")} />}
    >
      <View className="mt-6 gap-3">
        <Input
          icon={User}
          label="Full name"
          placeholder="e.g. Nikita Yeldynov"
          value={form.name}
          onChangeText={set("name")}
          textContentType="name"
          autoComplete="name"
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => emailRef.current?.focus()}
        />
        <Input
          ref={emailRef}
          icon={Mail}
          label="Email address"
          placeholder="you@example.com"
          value={form.email}
          onChangeText={set("email")}
          textContentType="emailAddress"
          autoComplete="email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="next"
          submitBehavior="submit"
          onSubmitEditing={() => passwordRef.current?.focus()}
        />
        <Input
          ref={passwordRef}
          icon={Lock}
          label="Password"
          placeholder="At least 8 characters"
          secure
          value={form.password}
          onChangeText={set("password")}
          textContentType="newPassword"
          autoComplete="new-password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
      </View>
      {error && <Alert tone="danger" message={error} className="mt-6" />}
      <Button title="Create account" loading={loading} onPress={submit} className="mt-6" />
      <SocialButtons onError={setError} disabled={loading} />
    </AuthScreen>
  );
}
