import { router, useLocalSearchParams } from "expo-router";
import { ChevronLeft, Search as SearchIcon, SearchX, SlidersHorizontal } from "lucide-react-native";
import { useState } from "react";
import { Keyboard, Platform, Pressable, ScrollView, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { cardBadges } from "@/components/stays/amenity-icons";
import { FilterSheet } from "@/components/stays/filter-sheet";
import { Reflow } from "@/components/stays/reflow";
import { SortMenu } from "@/components/stays/sort-menu";
import { Alert, Button, Chip, Icon, ListingCard, Text } from "@/components/ui";
import { posthog } from "@/lib/posthog";
import { imageUrl } from "@/lib/sanity";
import { clearFilters, emptyFilters, filterKinds, parseQuery, type Filters, type Sort } from "@/lib/search";
import { useSearchMeta, useStaySearch } from "@/lib/stays";

type Trigger = "open" | "home" | "submit" | "chip" | "filters" | "sort";

const without = (list: string[], value: string) => list.filter((v) => v !== value);

// Quick filters from the design. Each edits the parsed filters, never the text
const CHIPS: { label: string; on: (f: Filters) => boolean; toggle: (f: Filters, on: boolean) => Filters }[] = [
  { label: "Cabins", on: (f) => f.types.includes("cabin"), toggle: (f, on) => ({ ...f, types: on ? without(f.types, "cabin") : [...f.types, "cabin"] }) },
  { label: "Under $300", on: (f) => f.maxPrice !== undefined && f.maxPrice <= 300, toggle: (f, on) => ({ ...f, maxPrice: on ? undefined : 300 }) },
  { label: "Pet Friendly", on: (f) => f.pets, toggle: (f, on) => ({ ...f, pets: !on }) },
  { label: "Quiet", on: (f) => f.soft.includes("quiet"), toggle: (f, on) => ({ ...f, soft: on ? without(f.soft, "quiet") : [...f.soft, "quiet"] }) },
];

export default function Search() {
  const insets = useSafeAreaInsets();
  const { q = "" } = useLocalSearchParams<{ q?: string }>();
  const [text, setText] = useState(q);
  const [lastQ, setLastQ] = useState(q);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [saved, setSaved] = useState<Set<string>>(new Set());
  // `filters` is null until a chip or the sheet edits them; until then they're parsed from `submitted`.
  // `fromSheet` marks filters the chips and text don't show, which puts a dot on the sliders
  const [search, setSearch] = useState<{
    submitted: string;
    filters: Filters | null;
    fromSheet: boolean;
    sort: Sort;
    runId: number;
    trigger: Trigger;
  }>({
    submitted: q.trim(),
    filters: null,
    fromSheet: false,
    sort: "best",
    runId: 0,
    trigger: q ? "home" : "open",
  });
  const { meta, error: metaError, retry: retryMeta } = useSearchMeta();
  const filters = search.filters ?? (meta ? parseQuery(search.submitted, meta.places) : emptyFilters());

  const run = (trigger: Trigger, patch: Partial<typeof search>) =>
    setSearch((s) => ({ ...s, ...patch, trigger, runId: s.runId + 1 }));

  // A new sentence from Home replaces whatever was typed here
  if (q !== lastQ) {
    setLastQ(q);
    setText(q);
    run("home", { submitted: q.trim(), filters: null, fromSheet: false });
  }

  const result = useStaySearch(filters, search.sort, meta, search.runId, (count) => {
    const kinds = filterKinds(filters);
    // The unfiltered landing list isn't a search
    if (!search.submitted && kinds.length === 0 && filters.soft.length === 0) return;
    posthog?.capture(count > 0 ? "stay_search_results_shown" : "stay_search_no_results", {
      results_count: count,
      query_length: search.submitted.length,
      trigger: search.trigger,
      sort: search.sort,
      filter_kinds: kinds,
      property_types: filters.types,
      settings: filters.settings,
      amenities: filters.amenities,
      pets: filters.pets,
      free_cancellation: filters.freeCancellation,
      has_soft_intent: filters.soft.length > 0,
    });
  });
  const error = metaError ?? result.error;
  const stays = result.stays;

  const submit = () => {
    Keyboard.dismiss();
    run("submit", { submitted: text.trim(), filters: null, fromSheet: false });
  };

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerClassName="px-4 pb-6 pt-3"
      // iOS insets the first ScrollView under NativeTabs automatically; Android only gets the bottom inset
      contentContainerStyle={Platform.OS === "android" ? { paddingTop: insets.top + 12 } : undefined}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <View className="flex-row items-center gap-3">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to Home"
          onPress={() => router.navigate("/home")}
          className="size-13 items-center justify-center rounded-full bg-canvas active:opacity-70"
        >
          <Icon icon={ChevronLeft} size="lg" />
        </Pressable>
        <View className="h-13 min-w-0 flex-1 flex-row items-center rounded-full bg-canvas pl-4 pr-1.5">
          <Icon icon={SearchIcon} size="lg" />
          <TextInput
            className="h-full min-w-0 flex-1 pl-3 font-medium text-body text-ink placeholder:text-muted selection:text-lavender-ink caret-lavender-ink"
            placeholder="Search stays"
            accessibilityLabel="Describe your stay"
            returnKeyType="search"
            autoCorrect={false}
            value={text}
            onChangeText={setText}
            onSubmitEditing={submit}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={search.fromSheet ? "Filters, some active" : "Filters"}
            onPress={() => setSheetOpen(true)}
            className="size-10 items-center justify-center rounded-full active:opacity-70"
          >
            <Icon icon={SlidersHorizontal} size="lg" />
            {search.fromSheet && <View className="absolute right-1.5 top-1.5 size-2 rounded-full bg-lavender-ink" />}
          </Pressable>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="-mx-4 mt-3" contentContainerClassName="gap-2.5 px-4">
        {CHIPS.map((c) => {
          const on = c.on(filters);
          return <Chip key={c.label} size="sm" label={c.label} selected={on} onPress={() => run("chip", { filters: c.toggle(filters, on) })} />;
        })}
      </ScrollView>

      <View className="mt-4 flex-row items-center justify-between">
        <Text weight="medium">{stays ? (stays.length === 1 ? "1 stay" : `${stays.length} stays`) : " "}</Text>
        <SortMenu value={search.sort} onChange={(sort) => sort !== search.sort && run("sort", { sort, filters })} />
      </View>

      {error ? (
        <View className="mt-4 gap-4">
          <Alert tone="danger" message="Couldn't search stays. Check your connection and try again." />
          <Button variant="secondary" title="Try again" icon={null} onPress={metaError ? retryMeta : result.retry} />
        </View>
      ) : !stays ? (
        <View accessible accessibilityLabel="Loading stays" className="mt-3 gap-4">
          {[0, 1, 2].map((i) => (
            <View key={i} className="h-37 rounded-sm bg-canvas" />
          ))}
        </View>
      ) : stays.length === 0 ? (
        <View className="items-center gap-2 py-12">
          <Icon icon={SearchX} size="lg" className="text-placeholder" />
          <Text variant="headline" className="text-center">
            No stays match
          </Text>
          <Text tone="muted" className="text-center">
            Try removing a filter.
          </Text>
          <Button variant="secondary" title="Clear filters" icon={null} className="mt-2 self-stretch" onPress={() => run("filters", { filters: clearFilters(filters), fromSheet: false })} />
        </View>
      ) : (
        <View className="mt-3 gap-4">
          {stays.map((s) => {
            const isSaved = saved.has(s.id);
            return (
              <Reflow key={s.id}>
                <ListingCard
                  image={imageUrl(s.image, 400)}
                  title={s.title}
                  location={s.location}
                  rating={s.rating}
                  reviews={s.reviewCount}
                  price={s.nightlyPrice}
                  amenities={cardBadges(s, [...filters.amenities, ...(filters.pets ? ["pets"] : [])])}
                  saved={isSaved}
                  onToggleSave={() => {
                    posthog?.capture(isSaved ? "stay_unsaved" : "stay_saved", { stay_id: s.id });
                    setSaved((prev) => {
                      const next = new Set(prev);
                      if (!next.delete(s.id)) next.add(s.id);
                      return next;
                    });
                  }}
                />
              </Reflow>
            );
          })}
        </View>
      )}

      <FilterSheet
        visible={sheetOpen}
        filters={filters}
        onClose={() => setSheetOpen(false)}
        onApply={(f) => {
          setSheetOpen(false);
          run("filters", { filters: f, fromSheet: filterKinds(f).length > 0 });
        }}
      />
    </ScrollView>
  );
}
