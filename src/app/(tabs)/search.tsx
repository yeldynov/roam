import { useLocalSearchParams } from "expo-router";
import { SearchX } from "lucide-react-native";
import { useState } from "react";
import { Keyboard, Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AMENITY_ICONS } from "@/components/stays/amenity-icons";
import { Reflow } from "@/components/stays/reflow";
import { SearchField } from "@/components/stays/search-field";
import { Icon, ListingCard, Text } from "@/components/ui";
import { PROPERTIES } from "@/data/properties";
import { posthog } from "@/lib/posthog";
import { searchStays } from "@/lib/search";

export default function Search() {
  const insets = useSafeAreaInsets();
  const { q = "" } = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(q);
  const [lastQ, setLastQ] = useState(q);
  const [saved, setSaved] = useState<Set<string>>(new Set());

  // A new sentence from Home replaces whatever was typed here
  if (q !== lastQ) {
    setLastQ(q);
    setQuery(q);
  }

  const trimmed = query.trim();
  const results = searchStays(trimmed, PROPERTIES);

  const submitSearch = () => {
    posthog?.capture("stay_search_refined", {
      query_length: trimmed.length,
      results_count: results.length,
    });
    Keyboard.dismiss();
  };

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerClassName="px-5 pb-6 pt-3"
      // iOS insets the first ScrollView under NativeTabs automatically; Android only gets the bottom inset
      contentContainerStyle={Platform.OS === "android" ? { paddingTop: insets.top + 12 } : undefined}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
    >
      <Text variant="title">Search</Text>
      <SearchField value={query} onChangeText={setQuery} onSubmit={submitSearch} className="mt-4" />

      <Text variant="headline" className="mb-4 mt-6">
        {!trimmed ? "All stays" : results.length === 1 ? "1 stay" : `${results.length} stays`}
      </Text>

      {results.length === 0 ? (
        <View className="items-center gap-2 py-12">
          <Icon icon={SearchX} size="lg" className="text-placeholder" />
          <Text variant="headline" className="text-center">
            No stays match “{trimmed}”
          </Text>
          <Text tone="muted" className="text-center">
            Try fewer words or a higher price.
          </Text>
        </View>
      ) : (
        <View className="gap-4">
          {results.map((s) => {
            const isSaved = saved.has(s.id);
            return (
              <Reflow key={s.id}>
                <ListingCard
                  image={s.image}
                  title={s.title}
                  location={s.location}
                  rating={s.rating}
                  reviews={s.reviews}
                  price={s.price}
                  amenities={s.amenities.slice(0, 2).map((a) => ({ label: a, icon: AMENITY_ICONS[a] }))}
                  saved={isSaved}
                  onToggleSave={() => {
                    posthog?.capture(isSaved ? "stay_unsaved" : "stay_saved", {
                      stay_id: s.id,
                      property_type: s.propertyType,
                      setting: s.setting,
                    });
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
    </ScrollView>
  );
}
