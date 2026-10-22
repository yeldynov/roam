import { useUser } from "@clerk/expo";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Building, House, Search, TreePalm, TreePine, WavesHorizontal } from "lucide-react-native";
import { styled } from "nativewind";
import { useState } from "react";
import { Platform, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { Reflow } from "@/components/stays/reflow";
import { SearchField } from "@/components/stays/search-field";
import { StayCard } from "@/components/stays/stay-card";
import { Alert, Button, Chip, Icon, PressableScale, Text, Wordmark } from "@/components/ui";
import { posthog } from "@/lib/posthog";
import { useStays, type StaySummary } from "@/lib/stays";

const StyledImage = styled(Image, { className: "style" });

// Chips mix kinds of stay: Cabins and Villas are property types, Beach and City are settings
const CATEGORIES: { key: string; label: string; icon: typeof House; match: (s: StaySummary) => boolean }[] = [
  { key: "all", label: "All Stays", icon: House, match: () => true },
  { key: "cabin", label: "Cabins", icon: TreePine, match: (s) => s.propertyType === "cabin" },
  { key: "beach", label: "Beach", icon: WavesHorizontal, match: (s) => s.setting === "beach" },
  { key: "city", label: "City", icon: Building, match: (s) => s.setting === "city" },
  { key: "villa", label: "Villas", icon: TreePalm, match: (s) => s.propertyType === "villa" },
];

export default function Home() {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const [query, setQuery] = useState("");
  const [categoryKey, setCategoryKey] = useState("all");
  const category = CATEGORIES.find((c) => c.key === categoryKey) ?? CATEGORIES[0];
  const { stays: allStays, error, loading, retry } = useStays();
  const stays = allStays?.filter(category.match) ?? [];

  const submit = () => {
    const q = query.trim();
    if (!q) return;
    posthog?.capture("stay_search_submitted", { query_length: q.length });
    router.navigate({ pathname: "/search", params: { q } });
    setQuery("");
  };

  const selectCategory = (key: string) => {
    setCategoryKey(key);
    posthog?.capture("stay_category_selected", { category_key: key });
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
      <View className="flex-row items-start justify-between">
        <View className="pt-6">
          <Wordmark size="hero" />
        </View>
        <StyledImage
          source={user?.imageUrl}
          contentFit="cover"
          accessibilityLabel="Your profile photo"
          className="size-22 rounded-full bg-primary-soft"
        />
      </View>

      <Text tone="muted" weight="semibold" className="mt-2">
        Hey, {user?.firstName || "there"} 👋
      </Text>
      <View className="flex-row items-center gap-4">
        <Text variant="hero" className="flex-1">
          Find your{"\n"}next stay
        </Text>
        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Open search"
          onPress={() => router.navigate("/search")}
          className="h-22 w-16 items-center justify-center rounded-xl bg-canvas"
        >
          <Icon icon={Search} size="lg" />
        </PressableScale>
      </View>

      <SearchField value={query} onChangeText={setQuery} onSubmit={submit} className="mt-6" />

      <View className="mt-4 flex-row flex-wrap gap-2">
        {CATEGORIES.map((c) => (
          <Chip
            key={c.key}
            size="soft"
            tone="primary"
            label={c.label}
            icon={c.icon}
            selected={categoryKey === c.key}
            onPress={() => selectCategory(c.key)}
          />
        ))}
      </View>

      {loading && (
        <View accessible accessibilityLabel="Loading stays" className="mt-6 gap-5">
          {[0, 1, 2].map((i) => (
            <View key={i} className="h-67 rounded-xl bg-canvas" />
          ))}
        </View>
      )}

      {error && (
        <View className="mt-6 gap-4">
          <Alert tone="danger" message="Couldn't load stays. Check your connection and try again." />
          <Button variant="secondary" title="Try again" icon={null} onPress={retry} />
        </View>
      )}

      {allStays && stays.length === 0 && (
        <Text tone="muted" className="mt-12 text-center">
          No {category.label.toLowerCase()} yet
        </Text>
      )}

      <View className="mt-6 gap-5">
        {stays.map((s) => (
          <Reflow key={s.id}>
            {/* Press feedback only: cards open nothing until the stay detail plan. accessible={false} keeps the card's own label */}
            <PressableScale accessible={false} unstable_pressDelay={80}>
              <StayCard stay={s} />
            </PressableScale>
          </Reflow>
        ))}
      </View>
    </ScrollView>
  );
}
