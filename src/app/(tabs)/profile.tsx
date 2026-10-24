import { useOrganizationList, useUser } from "@clerk/expo";
import type { UserOrganizationInvitationResource } from "@clerk/expo/types";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Bell, Briefcase, Building2, CircleHelp, CreditCard, FileText, MapPin, Settings, User } from "lucide-react-native";
import { styled } from "nativewind";
import { useState } from "react";
import { ActivityIndicator, Linking, Alert as NativeAlert, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { InfoSheet, Paragraphs } from "@/components/stays/info-sheet";
import { Alert, Button, Icon, IconButton, ListGroup, ListRow, Text, Wordmark } from "@/components/ui";
import { homeCity } from "@/lib/account";
import { SUPPORT_EMAIL } from "@/lib/ask";
import { authMessage } from "@/lib/auth";
import { posthog } from "@/lib/posthog";
import { useCancellationPolicies } from "@/lib/stays";

const StyledImage = styled(Image, { className: "style" });

const comingSoon = (what: string) => NativeAlert.alert("Coming soon", `${what} aren't available yet.`);

export default function Profile() {
  const insets = useSafeAreaInsets();
  const { user, isLoaded } = useUser();
  const [policiesOpen, setPoliciesOpen] = useState(false);
  const city = homeCity(user);

  return (
    <>
      <ScrollView
        className="flex-1 bg-surface"
        contentContainerClassName="gap-4 px-5 pb-6 pt-3"
        // iOS insets the first ScrollView under NativeTabs automatically; Android only gets the bottom inset
        contentContainerStyle={Platform.OS === "android" ? { paddingTop: insets.top + 12 } : undefined}
        contentInsetAdjustmentBehavior="automatic"
      >
        <View className="flex-row items-center justify-between">
          <Wordmark size="hero" />
          <IconButton
            icon={Settings}
            size="sm"
            accessibilityLabel="Settings"
            onPress={() => router.push("/account/settings")}
          />
        </View>

        {!isLoaded || !user ? (
          <View className="h-34 rounded-xl bg-canvas" />
        ) : (
          <View className="flex-row items-center gap-4 rounded-xl bg-canvas p-4">
            <StyledImage
              source={user.imageUrl}
              contentFit="cover"
              accessibilityLabel="Your profile photo"
              className="size-26 rounded-full bg-primary-soft"
            />
            <View className="flex-1 gap-1">
              <Text variant="title" numberOfLines={2}>
                {user.fullName || "Your profile"}
              </Text>
              {city && (
                <View className="flex-row items-center gap-1">
                  <Icon icon={MapPin} className="text-muted" />
                  <Text tone="muted" numberOfLines={1} className="flex-1">
                    {city}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}

        <ListGroup title="Account">
          <ListRow variant="menu" icon={User} title="Personal info" onPress={() => router.push("/account/personal-info")} />
          <ListRow variant="menu" icon={CreditCard} title="Payment methods" onPress={() => comingSoon("Payment methods")} />
          <ListRow variant="menu" icon={Briefcase} title="Trips" onPress={() => router.navigate("/trips")} />
        </ListGroup>

        <HostingGroup />

        <ListGroup title="Preferences">
          <ListRow variant="menu" icon={Bell} title="Notifications" onPress={() => comingSoon("Notification settings")} />
          <ListRow
            variant="menu"
            icon={CircleHelp}
            title="Help & support"
            onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`).catch(() => NativeAlert.alert("Help & support", `Email us at ${SUPPORT_EMAIL}.`))}
          />
        </ListGroup>

        <ListRow
          variant="policy"
          iconTile={false}
          icon={FileText}
          title="Free cancellation"
          subtitle="See how cancellation works on Roam"
          onPress={() => setPoliciesOpen(true)}
        />
      </ScrollView>

      <InfoSheet visible={policiesOpen} title="Cancellation" onClose={() => setPoliciesOpen(false)}>
        <CancellationPolicies enabled={policiesOpen} />
      </InfoSheet>
    </>
  );
}

/** Shown only to members of a host company, or to someone with a pending invitation to one */
function HostingGroup() {
  const { isLoaded, userMemberships, userInvitations, setActive } = useOrganizationList({
    userMemberships: true,
    userInvitations: { status: "pending" },
  });
  if (!isLoaded || (!userMemberships.count && !userInvitations.count)) return null;

  const accept = (inv: UserOrganizationInvitationResource) => {
    const company = inv.publicOrganizationData;
    NativeAlert.alert(`Join ${company.name}?`, "You'll be able to edit its stays on Roam.", [
      { text: "Not now", style: "cancel" },
      {
        text: "Join",
        onPress: async () => {
          try {
            await inv.accept();
            posthog?.capture("host_invitation_accepted", { org_id: company.id });
            await Promise.all([userMemberships.revalidate?.(), userInvitations.revalidate?.()]);
            await setActive?.({ organization: company.id });
            router.push("/host");
          } catch (e) {
            NativeAlert.alert("Couldn't join", authMessage(e));
          }
        },
      },
    ]);
  };

  return (
    <ListGroup title="Hosting">
      {!!userMemberships.count && <ListRow variant="menu" icon={Building2} title="Hosting" onPress={() => router.push("/host")} />}
      {userInvitations.data?.map((inv) => (
        <ListRow
          key={inv.id}
          variant="menu"
          icon={Building2}
          title={`Join ${inv.publicOrganizationData.name}`}
          subtitle="You're invited to host on Roam"
          onPress={() => accept(inv)}
        />
      ))}
    </ListGroup>
  );
}

function CancellationPolicies({ enabled }: { enabled: boolean }) {
  const { policies, error, loading, retry } = useCancellationPolicies(enabled);
  if (error)
    return (
      <View className="gap-3">
        <Alert tone="danger" message="We couldn't load the cancellation policies." />
        <Button variant="secondary" title="Try again" onPress={retry} />
      </View>
    );
  if (loading) return <ActivityIndicator className="mt-6" />;
  if (!policies?.length) return <Text tone="muted">No cancellation policies yet. Contact Roam support for help.</Text>;
  return policies.map((p) => (
    <View key={p.title} className="gap-2">
      <Text variant="headline">{p.title}</Text>
      <Text tone="muted">{p.summary}</Text>
      <Paragraphs text={p.body} />
    </View>
  ));
}
