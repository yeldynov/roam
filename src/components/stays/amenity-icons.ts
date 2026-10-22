import {
  AirVent,
  Bath,
  Building2,
  Car,
  CookingPot,
  Flame,
  Laptop,
  Mountain,
  PawPrint,
  PlugZap,
  Sailboat,
  Sun,
  Sunset,
  Trees,
  Umbrella,
  Utensils,
  WashingMachine,
  Waves,
  Wheat,
  Wifi,
  type LucideIcon,
} from "lucide-react-native";

import type { SearchStay } from "@/lib/search";

/** Badge for each schema amenity value, plus `pets` for `petsAllowed` */
export const AMENITY_BADGES: Record<string, { label: string; icon: LucideIcon }> = {
  hotTub: { label: "Hot Tub", icon: Bath },
  pool: { label: "Pool", icon: Waves },
  fireplace: { label: "Fireplace", icon: Flame },
  wifi: { label: "Wi-Fi", icon: Wifi },
  kitchen: { label: "Kitchen", icon: CookingPot },
  workspace: { label: "Workspace", icon: Laptop },
  parking: { label: "Parking", icon: Car },
  washer: { label: "Washer", icon: WashingMachine },
  airConditioning: { label: "Air Conditioning", icon: AirVent },
  bbqGrill: { label: "BBQ Grill", icon: Utensils },
  evCharger: { label: "EV Charger", icon: PlugZap },
  oceanView: { label: "Ocean View", icon: Sunset },
  pets: { label: "Pet Friendly", icon: PawPrint },
};

/** Badge for each schema setting value */
export const SETTING_BADGES: Record<string, { label: string; icon: LucideIcon }> = {
  mountains: { label: "Mountains", icon: Mountain },
  forest: { label: "Forest", icon: Trees },
  lake: { label: "Lake", icon: Sailboat },
  beach: { label: "Beach", icon: Umbrella },
  desert: { label: "Desert", icon: Sun },
  city: { label: "City", icon: Building2 },
  countryside: { label: "Countryside", icon: Wheat },
};

const PRIORITY = ["hotTub", "pool", "pets", "oceanView", "fireplace"];

/** A stay's top `count` badges: what the guest filtered on first, then the headline amenities */
export function cardBadges(stay: Pick<SearchStay, "amenities" | "petsAllowed">, wanted: string[], count = 2) {
  const has = [...stay.amenities, ...(stay.petsAllowed ? ["pets"] : [])];
  const rank = (a: string) => (wanted.includes(a) ? -1 : PRIORITY.includes(a) ? PRIORITY.indexOf(a) : PRIORITY.length);
  return has
    .filter((a) => AMENITY_BADGES[a])
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, count)
    .map((a) => AMENITY_BADGES[a]);
}
