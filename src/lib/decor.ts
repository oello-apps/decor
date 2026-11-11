export const STYLES = [
  "Modern",
  "Scandinavian",
  "Minimalist",
  "Bohemian",
  "Industrial",
  "Japandi",
  "Luxury",
  "Coastal",
  "Mid-Century Modern",
] as const;

export const ROOM_TYPES = [
  "Living Room",
  "Bedroom",
  "Kitchen",
  "Bathroom",
  "Home Office",
  "Dining Room",
] as const;

export const BUDGETS = [
  "Under $500",
  "$500–$1,500",
  "$1,500–$5,000",
  "$5,000+",
] as const;

export type Style = (typeof STYLES)[number];
export type RoomType = (typeof ROOM_TYPES)[number];
export type Budget = (typeof BUDGETS)[number];

export interface PaletteColor {
  name: string;
  hex: string;
  role: string;
}

export interface FurnitureItem {
  item: string;
  why: string;
  estPrice: number | null;
}

export interface DesignAnalysis {
  summary: string;
  palette: PaletteColor[];
  furniture: FurnitureItem[];
  tips: string[];
  estimatedCostMin: number | null;
  estimatedCostMax: number | null;
  estimatedCostCurrency: string;
}

export type ImageEngine = "gemini" | "pollinations" | null;

export interface GenerateResult {
  generatedImage: string | null;
  analysis: DesignAnalysis;
  imageEngine?: ImageEngine;
  imageNote?: string;
  error?: string;
}

export interface SavedDesign {
  id: string;
  createdAt: string;
  style: string;
  roomType: string;
  budget: string;
  colorPreference: string;
  notes: string;
  originalImage: string;
  generatedImage: string;
  analysis: DesignAnalysis;
}

export const GALLERY_KEY = "decorai-designs";

export interface SampleRoom {
  id: string;
  label: string;
  roomType: RoomType;
  image: string;
  alt: string;
}

export const SAMPLE_ROOMS: SampleRoom[] = [
  {
    id: "living-room",
    label: "Bright living room",
    roomType: "Living Room",
    image:
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&q=80&auto=format&fit=crop",
    alt: "A bright living room with a sofa, armchair and coffee table",
  },
  {
    id: "bedroom",
    label: "Calm bedroom",
    roomType: "Bedroom",
    image:
      "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=1200&q=80&auto=format&fit=crop",
    alt: "A calm bedroom with a made bed, bedside tables and soft lighting",
  },
  {
    id: "kitchen",
    label: "Modern kitchen",
    roomType: "Kitchen",
    image:
      "https://images.unsplash.com/photo-1556911220-bff31c812dba?w=1200&q=80&auto=format&fit=crop",
    alt: "A modern kitchen with white cabinets and a wooden worktop",
  },
];

export const STYLE_SHOWCASE = [
  {
    style: "Scandinavian",
    description:
      "Light woods, soft whites and cosy textiles — calm, airy and easy to live with.",
    image:
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200&q=80&auto=format&fit=crop",
    alt: "Scandinavian-style living room with light wood and neutral furniture",
  },
  {
    style: "Japandi",
    description:
      "Japanese calm meets Scandinavian warmth: low furniture, natural materials, quiet colour.",
    image:
      "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&q=80&auto=format&fit=crop",
    alt: "Japandi-style living room with low furniture and warm neutral tones",
  },
  {
    style: "Luxury",
    description:
      "Rich materials, statement lighting and layered textures for a polished, hotel-like feel.",
    image:
      "https://images.unsplash.com/photo-1615873968403-89e068629265?w=1200&q=80&auto=format&fit=crop",
    alt: "Luxury living room with elegant furniture and warm lighting",
  },
];

export const HERO_BEFORE =
  "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=1200&q=80&auto=format&fit=crop";
export const HERO_AFTER =
  "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?w=1200&q=80&auto=format&fit=crop";
