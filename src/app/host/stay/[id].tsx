import { useAuth } from "@clerk/expo";
import { Stack, useLocalSearchParams } from "expo-router";
import { Plus, X } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AMENITY_BADGES } from "@/components/stays/amenity-icons";
import { Alert, Button, Chip, IconButton, Input, Stepper, Text, Toggle } from "@/components/ui";
import { changedFields, MAX_HOUSE_RULES, validateStayPatch, type PatchErrors, type StayPatch } from "@/lib/host";
import { posthog } from "@/lib/posthog";
import { AMENITIES } from "@/lib/search";
import { saveStay, useHostStays, type HostStay } from "@/lib/stays";

type Form = Omit<Required<StayPatch>, "nightlyPrice"> & { price: string };

const toForm = (s: Required<StayPatch>): Form => ({ ...s, price: String(s.nightlyPrice) });
const toPatch = ({ price, ...f }: Form): Required<StayPatch> => ({ ...f, nightlyPrice: /^\d+$/.test(price.trim()) ? Number(price) : NaN });

const FAILURES: Record<number, string> = {
  409: "This stay just changed. Go back, reopen it, and try again.",
  403: "You no longer have permission to edit stays for this company.",
  404: "This stay isn't part of your company anymore.",
};

export default function EditStay() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { orgId, orgRole } = useAuth();
  const { stays, error, loading, retry } = useHostStays(orgId);
  const stay = stays?.find((s) => s.id === id);

  let body;
  if (error)
    body = (
      <View className="gap-3">
        <Alert tone="danger" message="We couldn't load this stay." />
        <Button variant="secondary" title="Try again" onPress={retry} />
      </View>
    );
  else if (loading) body = <ActivityIndicator className="mt-6" />;
  else if (!stay) body = <Text tone="muted">{"This stay isn't part of your company."}</Text>;
  else return <StayForm stay={stay} orgId={orgId!} orgRole={orgRole ?? null} />;

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: "Edit stay", headerBackTitle: "Hosting" }} />
      <View className="flex-1 bg-surface px-5 pt-6">{body}</View>
    </>
  );
}

function StayForm({ stay, orgId, orgRole }: { stay: HostStay; orgId: string; orgRole: string | null }) {
  const insets = useSafeAreaInsets();
  const { getToken } = useAuth();
  const [saved, setSaved] = useState<Required<StayPatch>>(stay);
  const [form, setForm] = useState(() => toForm(stay));
  const [errors, setErrors] = useState<PatchErrors>({});
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; message: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const edit = (patch: Partial<Form>) => {
    setForm((f) => ({ ...f, ...patch }));
    setNotice(null);
  };
  const changed = changedFields(saved, toPatch(form));

  const save = async () => {
    const draft = toPatch(form);
    const patch = Object.fromEntries(changed.map((k) => [k, draft[k]])) as StayPatch;
    const checked = validateStayPatch(patch);
    if ("errors" in checked) return setErrors(checked.errors);

    setErrors({});
    setSaving(true);
    const result = await saveStay(stay.id, checked.set, await getToken());
    setSaving(false);

    if (result.ok) {
      const next = { ...saved, ...result.stay };
      setSaved(next);
      setForm(toForm(next));
      setNotice({ tone: "success", message: "Saved. Guests see changes within a minute." });
      posthog?.capture("host_stay_updated", { stay_id: stay.id, fields_changed: changed, org_id: orgId, org_role: orgRole });
      return;
    }
    posthog?.capture("host_stay_update_failed", { status: result.status, org_id: orgId });
    if (result.errors) setErrors(result.errors);
    setNotice({
      tone: "danger",
      message: result.errors ? (result.errors.body ?? "Check the highlighted fields.") : (FAILURES[result.status] ?? "Couldn't save. Check your connection and try again."),
    });
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: stay.title, headerBackTitle: "Hosting" }} />
      <ScrollView
        className="flex-1 bg-surface"
        contentContainerClassName="gap-5 px-5 pt-6"
        contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
      >
        <Field error={errors.nightlyPrice}>
          <Input label="Nightly price (USD)" value={form.price} onChangeText={(price) => edit({ price })} keyboardType="number-pad" />
        </Field>

        <Field label="Max guests" error={errors.maxGuests}>
          <View className="flex-row items-center justify-between">
            <Text>
              {form.maxGuests} guest{form.maxGuests === 1 ? "" : "s"}
            </Text>
            <Stepper value={form.maxGuests} min={1} max={16} onChange={(maxGuests) => edit({ maxGuests })} />
          </View>
        </Field>

        <Field error={errors.petsAllowed}>
          <View className="flex-row items-center justify-between">
            <Text variant="headline">Pets allowed</Text>
            <Toggle value={form.petsAllowed} onValueChange={(petsAllowed) => edit({ petsAllowed })} accessibilityLabel="Pets allowed" />
          </View>
        </Field>

        <Field label="Amenities" error={errors.amenities}>
          <View className="flex-row flex-wrap gap-2">
            {AMENITIES.map((a) => {
              const on = form.amenities.includes(a);
              return (
                <Chip
                  key={a}
                  size="sm"
                  label={AMENITY_BADGES[a]?.label ?? a}
                  icon={AMENITY_BADGES[a]?.icon}
                  selected={on}
                  accessibilityState={{ selected: on }}
                  onPress={() => edit({ amenities: on ? form.amenities.filter((x) => x !== a) : [...form.amenities, a] })}
                />
              );
            })}
          </View>
        </Field>

        <View className="flex-row gap-3">
          <Field error={errors.checkInTime} className="flex-1">
            <Input label="Check-in" value={form.checkInTime} onChangeText={(checkInTime) => edit({ checkInTime })} placeholder="15:00" keyboardType="numbers-and-punctuation" />
          </Field>
          <Field error={errors.checkOutTime} className="flex-1">
            <Input label="Check-out" value={form.checkOutTime} onChangeText={(checkOutTime) => edit({ checkOutTime })} placeholder="11:00" keyboardType="numbers-and-punctuation" />
          </Field>
        </View>

        <Field label="House rules" hint="Guests see these word for word." error={errors.houseRules}>
          {form.houseRules.map((rule, i) => (
            <Input
              key={i}
              value={rule}
              onChangeText={(text) => edit({ houseRules: form.houseRules.map((r, j) => (j === i ? text : r)) })}
              placeholder="No parties or events."
              multiline
              trailing={
                <IconButton
                  icon={X}
                  size="sm"
                  accessibilityLabel={`Remove rule ${i + 1}`}
                  onPress={() => edit({ houseRules: form.houseRules.filter((_, j) => j !== i) })}
                />
              }
            />
          ))}
          {form.houseRules.length < MAX_HOUSE_RULES && (
            <Button variant="secondary" title="Add rule" icon={Plus} onPress={() => edit({ houseRules: [...form.houseRules, ""] })} />
          )}
        </Field>

        {notice && <Alert tone={notice.tone} message={notice.message} onDismiss={() => setNotice(null)} />}
        <Button title="Save" icon={null} loading={saving} disabled={!changed.length} onPress={save} />
      </ScrollView>
    </>
  );
}

function Field({ label, hint, error, className, children }: { label?: string; hint?: string; error?: string; className?: string; children: ReactNode }) {
  return (
    <View className={`gap-2 ${className ?? ""}`}>
      {label && <Text variant="headline">{label}</Text>}
      {hint && (
        <Text variant="small" tone="muted">
          {hint}
        </Text>
      )}
      {children}
      {error && (
        <Text variant="small" tone="danger">
          {error}
        </Text>
      )}
    </View>
  );
}
