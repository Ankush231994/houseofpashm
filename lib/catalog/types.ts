export type StorefrontProduct = {
  id: string;
  sku: string;
  slug: string;
  name: string;
  category: string;
  subtitle: string;
  price: number;
  mrp: number;
  rating?: number;
  reviews?: number;
  badge?: string;
  image: string;
  colour?: string;
  size?: string;
  available: boolean;
};

export type StorefrontCategory = {
  name: string;
  image: string;
};

export type StorefrontCatalog = {
  source: "demo" | "database";
  products: StorefrontProduct[];
  categories: StorefrontCategory[];
};
