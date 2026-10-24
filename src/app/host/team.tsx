import { useOrganization, useUser } from "@clerk/expo";
import type { OrganizationInvitationResource, OrganizationMembershipResource } from "@clerk/expo/types";
import { Stack } from "expo-router";
import { Mail, ShieldCheck, User } from "lucide-react-native";
import { useState } from "react";
import { ActivityIndicator, Alert as NativeAlert, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Alert, Button, Chip, Input, ListGroup, ListRow, Text } from "@/components/ui";
import { authMessage } from "@/lib/auth";
import { posthog } from "@/lib/posthog";

const ROLES = [
  { key: "org:member", label: "Member" },
  { key: "org:admin", label: "Admin" },
] as const;
const roleLabel = (role: string) => ROLES.find((r) => r.key === role)?.label ?? role;

export default function Team() {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const { isLoaded, organization, membership, memberships, invitations } = useOrganization({
    memberships: { infinite: true },
    invitations: { infinite: true, status: ["pending"] },
  });
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<(typeof ROLES)[number]["key"]>("org:member");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; message: string } | null>(null);

  // Clerk enforces this server-side too; the UI only hides what would fail
  const isAdmin = !!membership?.permissions.includes("org:sys_memberships:manage");
  const fail = (e: unknown) => setNotice({ tone: "danger", message: authMessage(e) });

  const invite = async () => {
    if (!organization) return;
    setSending(true);
    setNotice(null);
    try {
      await organization.inviteMember({ emailAddress: email.trim(), role });
      posthog?.capture("host_member_invited", { role });
      setEmail("");
      setNotice({ tone: "success", message: "Invitation sent." });
      await invitations?.revalidate?.();
    } catch (e) {
      fail(e);
    } finally {
      setSending(false);
    }
  };

  const manageMember = (m: OrganizationMembershipResource) => {
    const name = m.publicUserData?.identifier ?? "this member";
    const otherRole = m.role === "org:admin" ? "org:member" : "org:admin";
    NativeAlert.alert(name, undefined, [
      {
        text: `Make ${roleLabel(otherRole).toLowerCase()}`,
        onPress: () => m.update({ role: otherRole }).then(() => memberships?.revalidate?.(), fail),
      },
      {
        text: "Remove from team",
        style: "destructive",
        onPress: () => m.destroy().then(() => memberships?.revalidate?.(), fail),
      },
      { text: "Cancel", style: "cancel" },
    ]);
  };

  const revoke = (inv: OrganizationInvitationResource) =>
    NativeAlert.alert("Revoke invitation?", inv.emailAddress, [
      { text: "Revoke", style: "destructive", onPress: () => inv.revoke().then(() => invitations?.revalidate?.(), fail) },
      { text: "Cancel", style: "cancel" },
    ]);

  if (!isLoaded || !organization)
    return (
      <>
        <Stack.Screen options={{ headerShown: true, title: "Team", headerBackTitle: "Hosting" }} />
        <View className="flex-1 bg-surface pt-6">{!isLoaded ? <ActivityIndicator /> : <Text tone="muted" className="px-5">Open Hosting to choose a company first.</Text>}</View>
      </>
    );

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "Team", headerBackTitle: "Hosting" }} />
      <ScrollView
        className="flex-1 bg-surface"
        contentContainerClassName="gap-4 px-5 pt-6"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        {memberships?.isLoading ? (
          <ActivityIndicator className="mt-6" />
        ) : memberships?.error ? (
          <View className="gap-3">
            <Alert tone="danger" message="We couldn't load your team." />
            <Button variant="secondary" title="Try again" onPress={() => memberships.revalidate()} />
          </View>
        ) : (
          <ListGroup title={organization.name}>
            {memberships?.data?.map((m) => {
              const self = m.publicUserData?.userId === user?.id;
              const name = [m.publicUserData?.firstName, m.publicUserData?.lastName].filter(Boolean).join(" ");
              return (
                <ListRow
                  key={m.id}
                  variant="menu"
                  icon={m.role === "org:admin" ? ShieldCheck : User}
                  title={(name || m.publicUserData?.identifier || "Member") + (self ? " (you)" : "")}
                  subtitle={`${roleLabel(m.role)} · ${m.publicUserData?.identifier ?? ""}`}
                  // Admins can't change themselves, so a company always keeps an admin
                  disabled={!isAdmin || self}
                  trailing={!isAdmin || self ? <View /> : undefined}
                  onPress={() => manageMember(m)}
                />
              );
            })}
          </ListGroup>
        )}

        {!!invitations?.data?.length && (
          <ListGroup title="Pending invitations">
            {invitations.data.map((inv) => (
              <ListRow
                key={inv.id}
                variant="menu"
                icon={Mail}
                title={inv.emailAddress}
                subtitle={roleLabel(inv.role)}
                disabled={!isAdmin}
                trailing={isAdmin ? undefined : <View />}
                onPress={() => revoke(inv)}
              />
            ))}
          </ListGroup>
        )}

        {isAdmin ? (
          <View className="gap-3">
            <Text variant="headline">Invite a teammate</Text>
            <Input label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" autoComplete="email" keyboardType="email-address" textContentType="emailAddress" />
            <View className="flex-row gap-2">
              {ROLES.map((r) => (
                <Chip key={r.key} size="sm" label={r.label} selected={role === r.key} accessibilityState={{ selected: role === r.key }} onPress={() => setRole(r.key)} />
              ))}
            </View>
            <Text variant="small" tone="muted">
              {"Admins manage the team. Everyone can edit the company's stays. They accept the invitation from Profile after signing in to Roam with this email."}
            </Text>
            <Button title="Send invitation" icon={null} loading={sending} disabled={!email.includes("@")} onPress={invite} />
          </View>
        ) : (
          <Text variant="small" tone="muted">
            Only admins can invite or remove teammates.
          </Text>
        )}

        {notice && <Alert tone={notice.tone} message={notice.message} onDismiss={() => setNotice(null)} />}
      </ScrollView>
    </>
  );
}
