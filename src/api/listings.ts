import { naira } from "@/lib/money";
import { readJSON, writeJSON } from "@/lib/storage";
import type { Product, Vendor } from "@/lib/types";
import { ApiError, catalog, KEYS, wait } from "./client";

export interface NewShop {
  name: string;
  state: string;
  city: string;
}

export interface NewListing {
  title: string;
  category: string;
  priceNaira: number;
  stock: number;
  condition: "new" | "used";
  description: string;
  imageUrl: string;
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export async function openShop(shop: NewShop): Promise<Vendor> {
  await wait(500);
  const c = await catalog();
  const slug = slugify(shop.name);
  if (c.vendors.some((v) => v.slug === slug)) {
    throw new ApiError("SHOP_NAME_TAKEN", "A shop with that name already exists. Try another name.");
  }
  const vendor: Vendor = {
    id: `v_${slug}`,
    slug,
    name: shop.name.trim(),
    city: `${shop.city.trim()}, ${shop.state}`,
    state: shop.state,
    accent: "#166534",
    since: new Date().getFullYear(),
    productCount: 0,
    rating: 0,
  };
  writeJSON(KEYS.vendors, [...readJSON<Vendor[]>(KEYS.vendors, []), vendor]);
  return vendor;
}

export async function createListing(vendorId: string, input: NewListing): Promise<Product> {
  await wait(700);
  const product: Product = {
    id: `u${Date.now().toString(36)}`,
    title: input.title.trim(),
    description: input.description.trim(),
    category: input.category,
    brand: null,
    price: naira(input.priceNaira),
    discountPercent: 0,
    rating: 0,
    reviewCount: 0,
    stock: input.stock,
    thumbnail: input.imageUrl,
    images: [input.imageUrl],
    vendorId,
    tags: [],
    reviews: [],
    userListed: true,
    condition: input.condition,
  };
  writeJSON(KEYS.listings, [product, ...readJSON<Product[]>(KEYS.listings, [])]);
  return product;
}
