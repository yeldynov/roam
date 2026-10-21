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
import { Chip, Icon, PressableScale, Text, Wordmark } from "@/components/ui";
import { PROPERTIES, type Category } from "@/data/properties";

const StyledImage = styled(Image, { className: "style" });

const CATEGORIES: { key: Category | "all"; label: string; icon: typeof House }[] = [
  { key: "all", label: "All Stays", icon: House },
  { key: "cabin", label: "Cabins", icon: TreePine },
  { key: "beach", label: "Beach", icon: WavesHorizontal },
  { key: "city", label: "City", icon: Building },
  { key: "villa", label: "Villas", icon: TreePalm },
];

export default function Home() {
  const insets = useSafeAreaInsets();
  const { user } = useUser();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category | "all">("all");
  const stays = category === "all" ? PROPERTIES : PROPERTIES.filter((s) => s.category === category);

  const submit = () => {
    const q = query.trim();
    if (!q) return;
    router.navigate({ pathname: "/search", params: { q } });
    setQuery("");
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
            selected={category === c.key}
            onPress={() => setCategory(c.key)}
          />
        ))}
      </View>

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
