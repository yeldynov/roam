import { Stack } from "expo-router";
import {
  Bath,
  Bookmark,
  Briefcase,
  Building,
  Calendar,
  ChevronLeft,
  CreditCard,
  FileText,
  Heart,
  House,
  List,
  Mail,
  Lock,
  Map as MapIcon,
  MapPin,
  MessageSquareMore,
  PawPrint,
  Search,
  Settings,
  Share,
  SlidersHorizontal,
  Star,
  Tent,
  TreePalm,
  TreePine,
  User,
  WavesHorizontal,
} from "lucide-react-native";
import { useState, type ReactNode } from "react";
import { ScrollView, View } from "react-native";

import {
  Alert,
  Badge,
  Button,
  Chip,
  AppleLogo,
  GoogleLogo,
  Icon,
  IconButton,
  Input,
  ListingCard,
  ListRow,
  SegmentedControl,
  Stepper,
  TabBar,
  Text,
  Toggle,
  Wordmark,
} from "@/components/ui";

function Section({ n, title, children }: { n: string; title: string; children: ReactNode }) {
  return (
    <View className="gap-4 rounded-xl bg-surface p-5">
      <Text variant="headline" weight="semibold">
        {n}. {title}
      </Text>
      {children}
    </View>
  );
}

function Swatch({ name, value, className }: { name: string; value: string; className: string }) {
  return (
    <View className="w-24 gap-2">
      <View className={`h-16 rounded-sm border border-line ${className}`} />
      <Text variant="small">{name}</Text>
      <Text variant="small" tone="muted" weight="regular">
        {value}
      </Text>
    </View>
  );
}

const filters = ["Cabins", "Under $300", "Pet Friendly", "Quiet"];
const categories = [
  { label: "All Stays", icon: House },
  { label: "Cabins", icon: TreePine },
  { label: "Beach", icon: WavesHorizontal },
  { label: "City", icon: Building },
  { label: "Villas", icon: TreePalm },
];
const tabs = [
  { key: "home", label: "Home", icon: House },
  { key: "search", label: "Search", icon: Search },
  { key: "trips", label: "Trips", icon: Calendar },
  { key: "profile", label: "Profile", icon: User },
] as const;

export default function DesignSystem() {
  const [name, setName] = useState("Joanna Smith");
  const [filter, setFilter] = useState(new Set(["Cabins"]));
  const [category, setCategory] = useState("All Stays");
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<(typeof tabs)[number]["key"]>("home");
  const [view, setView] = useState<"list" | "map">("list");
  const [on, setOn] = useState(true);
  const [count, setCount] = useState(1);
  const [alerts, setAlerts] = useState({ success: true, danger: true });

  return (
    <>
      <Stack.Screen options={{ title: "Design system", headerShown: true }} />
      <ScrollView className="flex-1 bg-canvas" contentContainerClassName="gap-4 p-4 pb-16">
        <Section n="01" title="Brand">
          <Wordmark size="lg" />
          <Wordmark size="sm" />
          <Text variant="headline" tone="muted" weight="medium">
            Find unforgettable stays for every kind of trip.
          </Text>
        </Section>

        <Section n="02" title="Color palette">
          <View className="flex-row flex-wrap gap-4">
            <Swatch name="Primary Yellow" value="primary" className="bg-primary" />
            <Swatch name="Lavender" value="lavender" className="bg-lavender" />
            <Swatch name="Text Primary" value="ink" className="bg-ink" />
            <Swatch name="Text Secondary" value="muted" className="bg-muted" />
            <Swatch name="Surface White" value="surface" className="bg-surface" />
            <Swatch name="Surface Gray" value="canvas" className="bg-canvas" />
            <Swatch name="Border Gray" value="line" className="bg-line" />
            <Swatch name="Glass Blur" value="glass" className="bg-glass" />
          </View>
        </Section>

        <Section n="03" title="Typography">
          <Text variant="display">Find your next stay</Text>
          <Text variant="title">Modern Cabin with Hot Tub</Text>
          <Text variant="body" tone="muted">
            From mountain cabins to oceanfront villas, roam helps you find unforgettable stays for every kind of
            trip.
          </Text>
          <Text variant="lead" tone="muted">Lead: tight intro copy under a hero title.</Text>
          <Text variant="caption">Lake Arrowhead, CA</Text>
          <Text variant="button">Book this stay</Text>
          <Text variant="small" tone="muted">
            Small: tab labels, row subtitles
          </Text>
        </Section>

        <Section n="04" title="Buttons">
          <Button title="Book this stay" />
          <Button variant="secondary" title="Continue with Google" leading={<GoogleLogo />} />
          <Button variant="secondary" title="Continue with Apple" leading={<AppleLogo />} />
          <Button title="Booking…" loading />
          <Button title="Unavailable" disabled />
          <View className="flex-row gap-4">
            <IconButton icon={Heart} accessibilityLabel="Save" />
            <IconButton icon={Share} accessibilityLabel="Share" />
            <IconButton icon={Search} accessibilityLabel="Search" />
            <IconButton icon={Bookmark} accessibilityLabel="Bookmark" variant="surface" />
            <IconButton icon={ChevronLeft} accessibilityLabel="Back" variant="outline" size="sm" />
          </View>
        </Section>

        <Section n="05" title="Input fields">
          <Input
            icon={Search}
            placeholder="Cabins in California"
            trailing={<Icon icon={SlidersHorizontal} size="lg" />}
          />
          <Input icon={User} placeholder="Enter your name" />
          <Input icon={User} value={name} onChangeText={setName} placeholder="Enter your name" />
          <Input icon={Lock} secure defaultValue="password1" placeholder="Password" />
          <Input icon={Mail} label="Email address" placeholder="you@example.com" />
          <Text variant="caption" tone="muted">
            Link: <Text variant="caption" weight="semibold" underline>Sign in</Text>
          </Text>
        </Section>

        <Section n="06" title="Filter chips">
          <View className="flex-row flex-wrap gap-2">
            {filters.map((f) => (
              <Chip
                key={f}
                label={f}
                selected={filter.has(f)}
                onPress={() =>
                  setFilter((s) => {
                    const next = new Set(s);
                    if (!next.delete(f)) next.add(f);
                    return next;
                  })
                }
              />
            ))}
          </View>
          <View className="flex-row flex-wrap gap-2">
            {categories.map((c) => (
              <Chip
                key={c.label}
                size="sm"
                tone="primary"
                label={c.label}
                icon={c.icon}
                selected={category === c.label}
                onPress={() => setCategory(c.label)}
              />
            ))}
          </View>
        </Section>

        <Section n="07" title="Listing card">
          <ListingCard
            image="https://picsum.photos/seed/roam-cabin/400/400"
            title="Modern Cabin with Hot Tub"
            location="Lake Arrowhead, CA"
            rating={4.9}
            reviews={342}
            amenities={[
              { label: "Hot Tub", icon: Bath },
              { label: "Pet Friendly", icon: PawPrint },
            ]}
            price={280}
            saved={saved}
            onToggleSave={() => setSaved((s) => !s)}
          />
        </Section>

        <Section n="08" title="Policy card">
          <ListRow
            variant="policy"
            icon={MessageSquareMore}
            title="Ask about policies"
            subtitle="Cancellation, house rules, pets, check-in and more."
          />
          <ListRow
            variant="policy"
            icon={FileText}
            title="Free cancellation"
            subtitle="Full refund up to 7 days before check-in."
          />
        </Section>

        <Section n="09" title="Profile row">
          <View>
            <ListRow icon={User} title="Personal info" className="border-b border-line" />
            <ListRow icon={CreditCard} title="Payment methods" className="border-b border-line" />
            <ListRow icon={Briefcase} title="Trips" />
          </View>
        </Section>

        <Section n="10" title="Bottom navigation">
          <TabBar tabs={[...tabs]} active={tab} onChange={setTab} />
        </Section>

        <Section n="11" title="Iconography">
          <View className="flex-row flex-wrap gap-3">
            {[House, Search, Heart, Calendar, User, Settings, MapPin, SlidersHorizontal, Tent].map((I, i) => (
              <View key={i} className="size-12 items-center justify-center rounded-full border border-line">
                <Icon icon={I} />
              </View>
            ))}
          </View>
        </Section>

        <Section n="12" title="Segmented control">
          <SegmentedControl
            options={[
              { value: "list", label: "List", icon: List },
              { value: "map", label: "Map", icon: MapIcon },
            ]}
            value={view}
            onChange={setView}
          />
        </Section>

        <Section n="13" title="Toggles / Steppers">
          <View className="flex-row items-center gap-6">
            <Toggle value={on} onValueChange={setOn} accessibilityLabel="Example toggle" />
            <Stepper value={count} onChange={setCount} min={1} max={16} />
          </View>
        </Section>

        <Section n="14" title="Status / Alerts">
          {alerts.success && (
            <Alert
              tone="success"
              message="Account created successfully"
              onDismiss={() => setAlerts((a) => ({ ...a, success: false }))}
            />
          )}
          {alerts.danger && (
            <Alert
              tone="danger"
              message="Something went wrong. Please try again."
              onDismiss={() => setAlerts((a) => ({ ...a, danger: false }))}
            />
          )}
        </Section>

        <Section n="15" title="Tags / Badges">
          <View className="flex-row flex-wrap gap-2">
            <Badge tone="primary" icon={Star} label="Guest favorite" />
            <Badge tone="success" label="New" />
            <Badge tone="danger" label="20% off" />
            <Badge tone="info" label="Superhost" />
          </View>
        </Section>
      </ScrollView>
    </>
  );
}
