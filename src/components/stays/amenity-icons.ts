import {
  AirVent,
  Bath,
  Car,
  CookingPot,
  Flame,
  Laptop,
  PawPrint,
  PlugZap,
  Sunset,
  Utensils,
  WashingMachine,
  Waves,
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

const PRIORITY = ["hotTub", "pool", "pets", "oceanView", "fireplace"];

/** A card's two badges: what the guest filtered on first, then the headline amenities */
export function cardBadges(stay: SearchStay, wanted: string[]) {
  const has = [...stay.amenities, ...(stay.petsAllowed ? ["pets"] : [])];
  const rank = (a: string) => (wanted.includes(a) ? -1 : PRIORITY.includes(a) ? PRIORITY.indexOf(a) : PRIORITY.length);
  return has
    .filter((a) => AMENITY_BADGES[a])
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, 2)
    .map((a) => AMENITY_BADGES[a]);
}
