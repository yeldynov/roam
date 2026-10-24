import { useAuth, useOrganizationList } from "@clerk/expo";
import { router, Stack, useFocusEffect } from "expo-router";
import { Building2, Home, Repeat, Users } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Alert, Button, ListGroup, ListRow, Text } from "@/components/ui";
import { posthog } from "@/lib/posthog";
import { useHostStays } from "@/lib/stays";

export default function Hosting() {
  const insets = useSafeAreaInsets();
  const { orgId, orgRole } = useAuth();
  const { isLoaded, userMemberships, setActive } = useOrganizationList({ userMemberships: { infinite: true } });
  const [picking, setPicking] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const memberships = useMemo(() => userMemberships.data ?? [], [userMemberships.data]);
  const active = memberships.find((m) => m.organization.id === orgId);
  const { stays, error, loading, retry } = useHostStays(active ? orgId : null, refreshKey);

  // One company: make it active without asking. Several: the picker below chooses.
  useEffect(() => {
    if (isLoaded && !userMemberships.isLoading && !active && memberships.length === 1) {
      setActive?.({ organization: memberships[0].organization.id });
    }
  }, [isLoaded, userMemberships.isLoading, active, memberships, setActive]);

  const entered = useRef<string | null>(null);
  useEffect(() => {
    if (!active || entered.current === active.organization.id) return;
    entered.current = active.organization.id;
    posthog?.capture("host_mode_entered", { org_id: active.organization.id, org_role: orgRole ?? null });
  }, [active, orgRole]);

  // Coming back from an edit shows the saved values (live read, no CDN lag)
  useFocusEffect(useCallback(() => setRefreshKey((n) => n + 1), []));

  const choose = async (id: string) => {
    await setActive?.({ organization: id });
    setPicking(false);
  };

  let body;
  if (!isLoaded || userMemberships.isLoading) body = <ActivityIndicator className="mt-6" />;
  else if (!memberships.length) body = <Text tone="muted">{"You're not part of a host company. Ask your company's admin for an invitation."}</Text>;
  else if (!active || picking)
    body = (
      <ListGroup title="Choose a company">
        {memberships.map((m) => (
          <ListRow key={m.id} variant="menu" icon={Building2} title={m.organization.name} subtitle={m.roleName} onPress={() => choose(m.organization.id)} />
        ))}
      </ListGroup>
    );
  else
    body = (
      <>
        <Text variant="title">{active.organization.name}</Text>
        <ListGroup>
          <ListRow
            variant="menu"
            icon={Users}
            title="Team"
            subtitle={`${active.organization.membersCount} member${active.organization.membersCount === 1 ? "" : "s"}`}
            onPress={() => router.push("/host/team")}
          />
          {memberships.length > 1 && <ListRow variant="menu" icon={Repeat} title="Switch company" onPress={() => setPicking(true)} />}
        </ListGroup>
        {error ? (
          <View className="gap-3">
            <Alert tone="danger" message="We couldn't load your stays." />
            <Button variant="secondary" title="Try again" onPress={retry} />
          </View>
        ) : loading ? (
          <ActivityIndicator className="mt-6" />
        ) : !stays?.length ? (
          <Text tone="muted">No stays are linked to {active.organization.name} yet. Contact Roam support to add them.</Text>
        ) : (
          <ListGroup title="Stays">
            {stays.map((s) => (
              <ListRow
                key={s.id}
                variant="menu"
                icon={Home}
                title={s.title}
                subtitle={`$${s.nightlyPrice} · ${s.location}`}
                onPress={() => router.push({ pathname: "/host/stay/[id]", params: { id: s.id } })}
              />
            ))}
          </ListGroup>
        )}
      </>
    );

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "Hosting", headerBackTitle: "Profile" }} />
      <ScrollView
        className="flex-1 bg-surface"
        contentContainerClassName="gap-4 px-5 pt-6"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        contentInsetAdjustmentBehavior="automatic"
      >
        {body}
      </ScrollView>
    </>
  );
}
