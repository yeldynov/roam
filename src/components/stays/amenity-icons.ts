import { Bath, Car, CookingPot, Flame, Laptop, PawPrint, Sunset, Waves, Wifi, type LucideIcon } from "lucide-react-native";

import type { Amenity } from "@/data/properties";

export const AMENITY_ICONS: Record<Amenity, LucideIcon> = {
  "Hot tub": Bath,
  "Wi-Fi": Wifi,
  Fireplace: Flame,
  Pool: Waves,
  "Ocean view": Sunset,
  "Pet friendly": PawPrint,
  Parking: Car,
  Kitchen: CookingPot,
  Workspace: Laptop,
};
