import type { Product, Vendor } from "@/lib/types";
import { ApiError, catalog, wait } from "./client";

export type SortKey = "relevance" | "price_asc" | "price_desc" | "rating" | "discount";

export interface ProductQuery {
  q?: string;
  category?: string;
  vendor?: string;
  sort?: SortKey;
  minPrice?: number;
  maxPrice?: number;
}

export const PAGE_SIZE = 12;

function score(p: Product, terms: string[]) {
  const hay = `${p.title} ${p.brand ?? ""} ${p.category} ${p.tags.join(" ")}`.toLowerCase();
  return terms.reduce((s, t) => s + (p.title.toLowerCase().includes(t) ? 3 : hay.includes(t) ? 1 : -100), 0);
}

export async function listProducts(query: ProductQuery, cursor = 0) {
  const c = await catalog();
  await wait();
  const terms = (query.q ?? "").toLowerCase().split(/\s+/).filter(Boolean);
  let items = c.products.filter((p) => {
    if (query.category && p.category !== query.category) return false;
    if (query.vendor && p.vendorId !== query.vendor) return false;
    const naira = p.price.amountMinor / 100;
    if (query.minPrice != null && naira < query.minPrice) return false;
    if (query.maxPrice != null && naira > query.maxPrice) return false;
    return true;
  });

  if (terms.length) {
    items = items
      .map((p) => ({ p, s: score(p, terms) }))
      .filter((x) => x.s > 0)
      .sort((a, b) => b.s - a.s)
      .map((x) => x.p);
  }

  const sorters: Record<SortKey, ((a: Product, b: Product) => number) | null> = {
    relevance: null,
    price_asc: (a, b) => a.price.amountMinor - b.price.amountMinor,
    price_desc: (a, b) => b.price.amountMinor - a.price.amountMinor,
    rating: (a, b) => b.rating - a.rating,
    discount: (a, b) => b.discountPercent - a.discountPercent,
  };
  const sorter = sorters[query.sort ?? "relevance"];
  if (sorter) items = [...items].sort(sorter);

  return {
    items: items.slice(cursor, cursor + PAGE_SIZE),
    total: items.length,
    nextCursor: cursor + PAGE_SIZE < items.length ? cursor + PAGE_SIZE : null,
  };
}

export async function getProduct(id: string) {
  const c = await catalog();
  await wait();
  const product = c.products.find((p) => p.id === id);
  if (!product) throw new ApiError("NOT_FOUND", "This product is no longer available.");
  const vendor = c.vendors.find((v) => v.id === product.vendorId)!;
  const related = c.products
    .filter((p) => p.id !== id && (p.category === product.category || p.vendorId === product.vendorId))
    .sort((a, b) => Number(b.category === product.category) - Number(a.category === product.category) || b.rating - a.rating)
    .slice(0, 6);
  return { product, vendor, related };
}

export async function getVendor(slug: string): Promise<{ vendor: Vendor; categories: string[] }> {
  const c = await catalog();
  await wait();
  const vendor = c.vendors.find((v) => v.slug === slug);
  if (!vendor) throw new ApiError("NOT_FOUND", "We couldn't find that shop.");
  const categories = [...new Set(c.products.filter((p) => p.vendorId === vendor.id).map((p) => p.category))];
  return { vendor, categories };
}

export async function getHome() {
  const c = await catalog();
  const deals = [...c.products].sort((a, b) => b.discountPercent - a.discountPercent).slice(0, 8);
  const topRated = [...c.products].filter((p) => p.reviewCount > 10).sort((a, b) => b.rating - a.rating).slice(0, 8);
  const fresh = c.products.filter((p) => p.userListed).slice(0, 4);
  const categories = c.categories.map((cat) => ({
    ...cat,
    image: c.products.find((p) => p.category === cat.key)!.thumbnail,
  }));
  return { deals, topRated, fresh, categories, vendors: c.vendors };
}

export async function getCatalogMeta() {
  const c = await catalog();
  return { categories: c.categories, vendors: c.vendors };
}
