import { readJSON, writeJSON } from "@/lib/storage";
import type { Catalog, Product, Vendor } from "@/lib/types";

/**
 * A fake backend that behaves like a real one: every call is async, has network-like latency,
 * re-validates its inputs and throws typed errors. Swapping it for fetch() calls to a real API
 * doesn't change any component, because they only talk to TanStack Query.
 */

export class ApiError extends Error {
  code: string;
  details?: unknown;
  constructor(code: string, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export const wait = (ms = 200 + Math.random() * 400) => new Promise((r) => setTimeout(r, ms));

export const KEYS = {
  listings: "oja.listings",
  vendors: "oja.vendors",
  sold: "oja.sold",
  orders: "oja.orders",
} as const;

let base: Promise<Catalog> | null = null;

function fetchBase(): Promise<Catalog> {
  base ??= fetch("/data/catalog.json")
    .then((r) => {
      if (!r.ok) throw new ApiError("CATALOG_UNAVAILABLE", "We couldn't load products. Check your connection.");
      return r.json() as Promise<Catalog>;
    })
    .catch((e) => {
      base = null; // let the next call retry instead of caching the failure
      throw e instanceof ApiError ? e : new ApiError("NETWORK", "You seem to be offline. Check your connection.");
    });
  return base;
}

/** The shipped catalog merged with everything users did in this browser: listings, shops and sold stock. */
export async function catalog(): Promise<Catalog> {
  const c = await fetchBase();
  const listings = readJSON<Product[]>(KEYS.listings, []);
  const userVendors = readJSON<Vendor[]>(KEYS.vendors, []);
  const sold = readJSON<Record<string, number>>(KEYS.sold, {});

  const products = [...listings, ...c.products].map((p) =>
    sold[p.id] ? { ...p, stock: Math.max(0, p.stock - sold[p.id]) } : p,
  );
  const vendors = [...c.vendors, ...userVendors].map((v) => ({
    ...v,
    productCount: products.filter((p) => p.vendorId === v.id).length,
  }));
  return { categories: c.categories, vendors, products };
}

export function recordSale(productId: string, qty: number) {
  const sold = readJSON<Record<string, number>>(KEYS.sold, {});
  sold[productId] = (sold[productId] ?? 0) + qty;
  writeJSON(KEYS.sold, sold);
}
