import { DollarSign, X } from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { Modal, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Button, Chip, IconButton, Input, Stepper, Text, Toggle } from "@/components/ui";
import { AMENITIES, clearFilters, PROPERTY_TYPES, SETTINGS, type Filters } from "@/lib/search";

import { AMENITY_BADGES } from "./amenity-icons";

const title = (s: string) => s[0].toUpperCase() + s.slice(1);
const COUNTS = [
  { key: "guests", label: "Guests" },
  { key: "bedrooms", label: "Bedrooms" },
  { key: "bathrooms", label: "Bathrooms" },
] as const;

export type FilterSheetProps = {
  visible: boolean;
  filters: Filters;
  onApply: (filters: Filters) => void;
  /** Swipe down or ×: edits are discarded */
  onClose: () => void;
};

// Every exact filter in one page sheet. Edits stay in a draft until "Show stays"
export function FilterSheet({ visible, filters, onApply, onClose }: FilterSheetProps) {
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState(filters);
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setDraft(filters);
  }
  const set = (patch: Partial<Filters>) => setDraft((d) => ({ ...d, ...patch }));
  const toggleIn = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  return (
    <Modal visible={visible} presentationStyle="pageSheet" animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-surface">
        <View className="flex-row items-center justify-between px-5 pb-2 pt-6">
          <Text variant="title">Filters</Text>
          <IconButton icon={X} size="sm" accessibilityLabel="Close filters" onPress={onClose} />
        </View>
        <ScrollView contentContainerClassName="gap-6 px-5 pb-6 pt-4" keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
          <Section title="Max price per night">
            <Input
              icon={DollarSign}
              className="flex-1"
              keyboardType="number-pad"
              placeholder="Any"
              accessibilityLabel="Max price per night"
              value={draft.maxPrice?.toString() ?? ""}
              onChangeText={(t) => set({ maxPrice: Number(t.replace(/\D/g, "")) || undefined })}
            />
          </Section>

          {COUNTS.map((c) => (
            <View key={c.key} className="flex-row items-center justify-between">
              <View>
                <Text variant="headline">{c.label}</Text>
                <Text variant="caption" tone="muted" weight="regular">
                  {draft[c.key] ? `${draft[c.key]}+` : "Any"}
                </Text>
              </View>
              <Stepper value={draft[c.key] ?? 0} min={0} max={16} onChange={(n) => set({ [c.key]: n || undefined })} />
            </View>
          ))}

          <Section title="Type">
            {PROPERTY_TYPES.map((t) => (
              <Chip key={t} size="sm" label={title(t)} selected={draft.types.includes(t)} onPress={() => set({ types: toggleIn(draft.types, t) })} />
            ))}
          </Section>
          <Section title="Setting">
            {SETTINGS.map((s) => (
              <Chip key={s} size="sm" label={title(s)} selected={draft.settings.includes(s)} onPress={() => set({ settings: toggleIn(draft.settings, s) })} />
            ))}
          </Section>
          <Section title="Amenities">
            {AMENITIES.map((a) => (
              <Chip
                key={a}
                size="sm"
                label={AMENITY_BADGES[a].label}
                icon={AMENITY_BADGES[a].icon}
                selected={draft.amenities.includes(a)}
                onPress={() => set({ amenities: toggleIn(draft.amenities, a) })}
              />
            ))}
          </Section>

          <ToggleRow label="Pets allowed" value={draft.pets} onChange={(pets) => set({ pets })} />
          <ToggleRow label="Free cancellation" value={draft.freeCancellation} onChange={(freeCancellation) => set({ freeCancellation })} />
        </ScrollView>
        <View className="flex-row gap-3 border-t border-line px-5 pt-4" style={{ paddingBottom: insets.bottom + 16 }}>
          <Button variant="secondary" title="Clear all" icon={null} className="flex-1" onPress={() => setDraft(clearFilters(draft))} />
          <Button title="Show stays" icon={null} className="flex-1" onPress={() => onApply(draft)} />
        </View>
      </View>
    </Modal>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View className="gap-3">
      <Text variant="headline">{title}</Text>
      <View className="flex-row flex-wrap gap-2">{children}</View>
    </View>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <View className="flex-row items-center justify-between">
      <Text variant="headline">{label}</Text>
      <Toggle value={value} onValueChange={onChange} accessibilityLabel={label} />
    </View>
  );
}
