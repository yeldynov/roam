import { useClerk, useReverification, useSession, useUser } from "@clerk/expo";
import type { SessionWithActivitiesResource } from "@clerk/expo/types";
import { Stack, useFocusEffect } from "expo-router";
import { LogOut, Monitor, Smartphone, Trash2 } from "lucide-react-native";
import { useCallback, useState } from "react";
import { ActivityIndicator, Alert as NativeAlert, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useReverifySheet } from "@/components/account/reverify-sheet";
import { Alert, Button, ListGroup, ListRow, Text } from "@/components/ui";
import { isReverificationCancelled } from "@/lib/account";
import { authMessage } from "@/lib/auth";
import { posthog } from "@/lib/posthog";

function deviceName({ latestActivity: a }: SessionWithActivitiesResource) {
  const device = a.deviceType || (a.isMobile ? "Phone" : "Computer");
  return a.browserName ? `${device} · ${a.browserName}` : device;
}

function lastSeen(s: SessionWithActivitiesResource) {
  const when = `Active ${s.lastActiveAt.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
  return s.latestActivity.city ? `${s.latestActivity.city} · ${when}` : when;
}

export default function Settings() {
  const insets = useSafeAreaInsets();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { session: current } = useSession();
  const { reverify, sheet } = useReverifySheet();
  const [sessions, setSessions] = useState<SessionWithActivitiesResource[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const revoke = useReverification((s: SessionWithActivitiesResource) => s.revoke(), { onNeedsReverification: reverify });
  const deleteAccount = useReverification(() => user!.delete(), { onNeedsReverification: reverify });

  const load = useCallback(() => {
    if (!user) return;
    setLoadError(false);
    user.getSessions().then(
      (all) => setSessions(all.filter((s) => s.status === "active").sort((a, b) => Number(b.id === current?.id) - Number(a.id === current?.id))),
      () => setLoadError(true),
    );
  }, [user, current?.id]);

  useFocusEffect(load);

  const signOutDevice = async (s: SessionWithActivitiesResource) => {
    setBusy(s.id);
    setError(null);
    try {
      await revoke(s);
      posthog?.capture("session_revoked");
      load();
    } catch (e) {
      if (!isReverificationCancelled(e)) setError(authMessage(e));
    } finally {
      setBusy(null);
    }
  };

  const handleSignOut = async () => {
    posthog?.capture("user_signed_out");
    await signOut();
  };

  const confirmDelete = () => {
    posthog?.capture("account_deletion_started");
    NativeAlert.alert("Delete your account?", "Your profile and sign-in are removed for good. This can't be undone.", [
      { text: "Cancel", style: "cancel", onPress: () => posthog?.capture("account_deletion_cancelled", { step: "confirm" }) },
      { text: "Delete account", style: "destructive", onPress: runDelete },
    ]);
  };

  const runDelete = async () => {
    setBusy("delete");
    setError(null);
    try {
      await deleteAccount();
      // Sent before the root layout's guard resets PostHog and moves to onboarding
      posthog?.capture("account_deleted");
      await posthog?.flush();
    } catch (e) {
      if (isReverificationCancelled(e)) posthog?.capture("account_deletion_cancelled", { step: "reverify" });
      else setError(authMessage(e));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "Settings", headerBackTitle: "Profile" }} />
      <ScrollView
        className="flex-1 bg-surface"
        contentContainerClassName="gap-4 px-5 pt-6"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        contentInsetAdjustmentBehavior="automatic"
      >
        {error && <Alert tone="danger" message={error} onDismiss={() => setError(null)} />}

        <ListGroup title="Devices">
          {loadError ? (
            <View className="gap-3 py-3">
              <Text tone="muted">We couldn&apos;t load your devices.</Text>
              <Button variant="secondary" title="Try again" onPress={load} />
            </View>
          ) : !sessions ? (
            <ActivityIndicator className="py-4" />
          ) : (
            sessions.map((s) => {
              const isCurrent = s.id === current?.id;
              return (
                <ListRow
                  key={s.id}
                  variant="menu"
                  icon={s.latestActivity.isMobile ? Smartphone : Monitor}
                  title={deviceName(s)}
                  subtitle={isCurrent ? "This device" : lastSeen(s)}
                  disabled
                  trailing={
                    isCurrent ? null : busy === s.id ? (
                      <ActivityIndicator />
                    ) : (
                      <Pressable accessibilityRole="button" hitSlop={8} onPress={() => signOutDevice(s)} className="active:opacity-70">
                        <Text variant="caption" weight="semibold" underline>
                          Sign out
                        </Text>
                      </Pressable>
                    )
                  }
                />
              );
            })
          )}
        </ListGroup>

        {/* The root layout's guard moves to onboarding once the session ends */}
        <Button variant="secondary" title="Sign out" icon={LogOut} onPress={handleSignOut} />

        {user?.deleteSelfEnabled && (
          <ListGroup>
            <ListRow
              variant="menu"
              icon={Trash2}
              tone="danger"
              title="Delete account"
              disabled={busy === "delete"}
              trailing={busy === "delete" ? <ActivityIndicator /> : undefined}
              onPress={confirmDelete}
            />
          </ListGroup>
        )}
      </ScrollView>
      {sheet}
    </>
  );
}
