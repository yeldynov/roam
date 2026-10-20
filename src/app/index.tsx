import { GlassView, isLiquidGlassAvailable } from "expo-glass-effect";
import { Image } from "expo-image";
import { router } from "expo-router";
import { MapPin } from "lucide-react-native";
import { styled } from "nativewind";
import { useRef, useState } from "react";
import { FlatList, Pressable, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, type SvgProps } from "react-native-svg";

import { Button, GoogleLogo, Icon, Text, Wordmark } from "@/components/ui";

const unsplash = (id: string) => `https://images.unsplash.com/${id}?w=1200&q=80&auto=format&fit=crop`;

const SLIDES = [
  {
    photo: unsplash("photo-1510798831971-661eb04b3739"),
    place: "Emerald Lake, BC",
    title: "Find a stay that fits your story",
    body: "From mountain cabins to oceanfront villas, roam helps you find unforgettable stays for every kind of trip.",
  },
  {
    photo: unsplash("photo-1601918774946-25832a4be0d6"),
    place: "Cascade Mountains, WA",
    title: "Describe it in one line",
    body: "Try “quiet pet friendly cabin with a hot tub under $300 a night” and get stays ranked for you.",
  },
  {
    photo: unsplash("photo-1520250497591-112f2f40a3f4"),
    place: "Krabi, Thailand",
    title: "Answers from the source",
    body: "Ask about check-in, pets, or cancellations and see the stay's own policy, word for word.",
  },
];

// Two h-13 buttons, the gap-3 between them, and 12 above them
const BUTTONS_HEIGHT = 52 + 12 + 52 + 12;

const StyledGlass = styled(GlassView, { className: "style" });
// Without liquid glass (older iOS, Android, web, Expo Go), GlassView is a plain view
const glassFallback = isLiquidGlassAvailable() ? "" : "bg-glass border border-white shadow-raised";

// Same color path as Wordmark: native resolves the class into `color`, web passes an RN-web style in `className`
function CurveBase({ color, className }: { color?: string; className?: unknown }) {
  return (
    <Svg width="100%" height={40} viewBox="0 0 390 40" preserveAspectRatio="none" style={className as SvgProps["style"]}>
      <Path d="M0 40 V24 Q0 2 24 2 C160 0 300 8 360 24 Q390 32 390 40 Z" fill={color ?? "currentColor"} />
    </Svg>
  );
}

const SheetCurve = styled(CurveBase, { className: { target: false, nativeStyleMapping: { color: true } } });

export default function Onboarding() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList<(typeof SLIDES)[number]>>(null);
  const [index, setIndex] = useState(0);

  const toSignUp = () => router.push("/sign-up");
  const next = () => {
    if (index < SLIDES.length - 1) listRef.current?.scrollToIndex({ index: index + 1 });
    else toSignUp();
  };

  return (
    <View className="flex-1 bg-surface">
      <FlatList
        ref={listRef}
        data={SLIDES}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        keyExtractor={(s) => s.photo}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item, index: i }) => (
          // bg-ink-soft shows if the photo fails, so the sheet and text stay readable
          <View style={{ width }} className="flex-1 bg-ink-soft">
            {/* Only the top shows above the sheet, so crop to that area and keep the subject in view */}
            <Image
              source={{ uri: item.photo }}
              style={{ position: "absolute", top: 0, left: 0, right: 0, height: height * 0.62 }}
              contentFit="cover"
              transition={200}
            />
            <View className="absolute inset-x-0 bottom-0">
              <View className="mb-3 ml-6 h-10 flex-row items-center gap-2 self-start rounded-full border border-glass-line bg-scrim px-4">
                <Icon icon={MapPin} size="sm" filled className="text-white" />
                <Text variant="caption" tone="white">
                  {item.place}
                </Text>
              </View>
              <SheetCurve className="text-surface" />
              <View className="bg-surface px-6 pt-4" style={{ paddingBottom: BUTTONS_HEIGHT + insets.bottom }}>
                <Text variant="display">{item.title}</Text>
                <Text variant="lead" tone="muted" className="mt-2">
                  {item.body}
                </Text>
              </View>
              <View
                accessible
                accessibilityLabel={`Slide ${i + 1} of ${SLIDES.length}`}
                className="absolute left-6 top-19 flex-row gap-2"
              >
                {SLIDES.map((s, j) => (
                  <View key={s.photo} className={`h-1 w-8 rounded-full ${j === i ? "bg-lavender-ring" : "bg-line"}`} />
                ))}
              </View>
            </View>
          </View>
        )}
      />

      <View className="absolute inset-x-0 flex-row items-center justify-between px-6" style={{ top: insets.top + 12 }}>
        <Wordmark />
        <Pressable accessibilityRole="button" accessibilityLabel="Skip" onPress={toSignUp} className="active:opacity-70">
          <StyledGlass className={`h-10 items-center justify-center rounded-full px-5 ${glassFallback}`}>
            <Text variant="caption" weight="semibold">
              Skip
            </Text>
          </StyledGlass>
        </Pressable>
      </View>

      <View className="absolute inset-x-0 bottom-0 gap-3 px-6" style={{ paddingBottom: insets.bottom }}>
        <Button title="Get started" onPress={next} />
        <Button variant="secondary" title="Continue with Google" leading={<GoogleLogo />} onPress={toSignUp} />
      </View>
    </View>
  );
}
