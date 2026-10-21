// Local stand-in until stays come from Sanity. Field names follow the planned schema; replace the source, don't extend it.
export const AMENITIES = ["Hot tub", "Wi-Fi", "Fireplace", "Pool", "Ocean view", "Pet friendly", "Parking", "Kitchen", "Workspace"] as const;
export type Amenity = (typeof AMENITIES)[number];
export type Category = "cabin" | "beach" | "city" | "villa";

export type Property = {
  id: string;
  title: string;
  location: string;
  category: Category;
  /** Nightly price in whole dollars */
  price: number;
  rating: number;
  reviews: number;
  guests: number;
  petsAllowed: boolean;
  amenities: Amenity[];
  /** Soft intent words the stay fits (quiet, cozy, secluded) */
  tags: string[];
  image: string;
};

const unsplash = (id: string) => `https://images.unsplash.com/${id}?w=1200&q=80&auto=format&fit=crop`;

export const PROPERTIES: Property[] = [
  {
    id: "lake-arrowhead-cabin",
    title: "Modern Cabin with Hot Tub",
    location: "Lake Arrowhead, CA",
    category: "cabin",
    price: 245,
    rating: 4.9,
    reviews: 128,
    guests: 4,
    petsAllowed: true,
    amenities: ["Hot tub", "Fireplace", "Pet friendly", "Wi-Fi", "Parking"],
    tags: ["quiet", "cozy", "forest", "secluded", "mountain"],
    image: unsplash("photo-1510798831971-661eb04b3739"),
  },
  {
    id: "big-bear-aframe",
    title: "Pine A-Frame Retreat",
    location: "Big Bear Lake, CA",
    category: "cabin",
    price: 189,
    rating: 4.8,
    reviews: 214,
    guests: 6,
    petsAllowed: true,
    amenities: ["Fireplace", "Pet friendly", "Kitchen", "Wi-Fi"],
    tags: ["cozy", "rustic", "forest", "family", "mountain"],
    image: unsplash("photo-1449158743715-0a90ebb6d2d8"),
  },
  {
    id: "smoky-mountain-hideaway",
    title: "Secluded Ridge Hideaway",
    location: "Gatlinburg, TN",
    category: "cabin",
    price: 320,
    rating: 4.7,
    reviews: 96,
    guests: 8,
    petsAllowed: false,
    amenities: ["Hot tub", "Fireplace", "Parking", "Kitchen"],
    tags: ["quiet", "secluded", "views", "mountain", "romantic"],
    image: unsplash("photo-1542718610-a1d656d1884c"),
  },
  {
    id: "malibu-beach-house",
    title: "Oceanfront Beach House",
    location: "Malibu, CA",
    category: "beach",
    price: 650,
    rating: 4.9,
    reviews: 87,
    guests: 6,
    petsAllowed: false,
    amenities: ["Ocean view", "Hot tub", "Kitchen", "Wi-Fi"],
    tags: ["luxury", "sunset", "waterfront", "sea"],
    image: unsplash("photo-1499793983690-e29da59ef1c2"),
  },
  {
    id: "cannon-beach-cottage",
    title: "Dog-Friendly Coastal Cottage",
    location: "Cannon Beach, OR",
    category: "beach",
    price: 210,
    rating: 4.8,
    reviews: 152,
    guests: 4,
    petsAllowed: true,
    amenities: ["Ocean view", "Pet friendly", "Fireplace", "Wi-Fi"],
    tags: ["quiet", "cozy", "sea", "walkable"],
    image: unsplash("photo-1505691938895-1758d7feb511"),
  },
  {
    id: "brooklyn-loft",
    title: "Sunny Brooklyn Loft",
    location: "Brooklyn, NY",
    category: "city",
    price: 175,
    rating: 4.6,
    reviews: 341,
    guests: 2,
    petsAllowed: false,
    amenities: ["Wi-Fi", "Workspace", "Kitchen"],
    tags: ["bright", "walkable", "nightlife", "urban"],
    image: unsplash("photo-1502672260266-1c1ef2d93688"),
  },
  {
    id: "austin-bungalow",
    title: "East Austin Bungalow",
    location: "Austin, TX",
    category: "city",
    price: 140,
    rating: 4.7,
    reviews: 203,
    guests: 3,
    petsAllowed: true,
    amenities: ["Pet friendly", "Wi-Fi", "Workspace", "Parking"],
    tags: ["cozy", "walkable", "music", "urban"],
    image: unsplash("photo-1522708323590-d24dbb6b0267"),
  },
  {
    id: "scottsdale-villa",
    title: "Desert Villa with Pool",
    location: "Scottsdale, AZ",
    category: "villa",
    price: 480,
    rating: 4.8,
    reviews: 64,
    guests: 10,
    petsAllowed: false,
    amenities: ["Pool", "Hot tub", "Kitchen", "Parking"],
    tags: ["luxury", "sunny", "family", "group"],
    image: unsplash("photo-1613490493576-7fde63acd811"),
  },
  {
    id: "kauai-villa",
    title: "Tropical Garden Villa",
    location: "Kauai, HI",
    category: "villa",
    price: 590,
    rating: 5.0,
    reviews: 41,
    guests: 8,
    petsAllowed: false,
    amenities: ["Pool", "Ocean view", "Kitchen", "Wi-Fi"],
    tags: ["quiet", "secluded", "tropical", "romantic", "luxury"],
    image: unsplash("photo-1512917774080-9991f1c4c750"),
  },
  {
    id: "palm-springs-modern",
    title: "Mid-Century Pool House",
    location: "Palm Springs, CA",
    category: "villa",
    price: 295,
    rating: 4.6,
    reviews: 118,
    guests: 6,
    petsAllowed: true,
    amenities: ["Pool", "Pet friendly", "Wi-Fi", "Parking"],
    tags: ["sunny", "retro", "group"],
    image: unsplash("photo-1580587771525-78b9dba3b914"),
  },
];
