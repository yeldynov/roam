import { router } from "expo-router";
import { Lock, Mail } from "lucide-react-native";
import { useRef, useState } from "react";
import { View, type TextInput } from "react-native";

import { AuthScreen, enterApp } from "@/components/auth/auth-screen";
import { SocialButtons } from "@/components/auth/social-buttons";
import { TextLink } from "@/components/auth/text-link";
import { Alert, Button, Input } from "@/components/ui";
import * as mockAuth from "@/lib/mock-auth";
import { validate } from "@/lib/validate";

export default function SignIn() {
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
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
      await mockAuth.signIn(form);
      enterApp();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthScreen
      title="Welcome back"
      subtitle="Sign in to see your saved stays and pick up where you left off."
      footer={<TextLink prompt="New to roam?" link="Create account" onPress={() => router.replace("/sign-up")} />}
    >
      <View className="mt-6 gap-3">
        <Input
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
          placeholder="Your password"
          secure
          value={form.password}
          onChangeText={set("password")}
          textContentType="password"
          autoComplete="current-password"
          returnKeyType="go"
          onSubmitEditing={submit}
        />
      </View>
      {error && <Alert tone="danger" message={error} className="mt-6" />}
      <Button title="Sign in" loading={loading} onPress={submit} className="mt-6" />
      <SocialButtons onSuccess={enterApp} disabled={loading} />
    </AuthScreen>
  );
}
