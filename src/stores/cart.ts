import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { sum, times } from "@/lib/money";
import type { CartIssue, CartLine, Product } from "@/lib/types";

export const MAX_QTY = 10;

interface CartState {
  lines: CartLine[];
  add: (p: Product, qty?: number) => void;
  setQty: (productId: string, qty: number) => void;
  remove: (productId: string) => void;
  clear: () => void;
  /** Applies what checkout found on the server: new prices, capped quantities, removed items. */
  reconcile: (issues: CartIssue[]) => void;
}

/**
 * Persisted to localStorage, so the cart survives refreshes, closed tabs and being offline on a bad network.
 * It only keeps what the cart page needs to draw; prices are re-checked at checkout.
 */
export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (p, qty = 1) =>
        set((s) => {
          const existing = s.lines.find((l) => l.productId === p.id);
          const limit = Math.min(MAX_QTY, p.stock);
          if (existing) {
            return {
              lines: s.lines.map((l) =>
                l.productId === p.id ? { ...l, qty: Math.min(limit, l.qty + qty), unitPrice: p.price } : l,
              ),
            };
          }
          const line: CartLine = {
            productId: p.id,
            vendorId: p.vendorId,
            title: p.title,
            thumbnail: p.thumbnail,
            unitPrice: p.price,
            qty: Math.min(limit, qty),
          };
          return { lines: [...s.lines, line] };
        }),
      setQty: (productId, qty) =>
        set((s) => ({
          lines: s.lines.map((l) => (l.productId === productId ? { ...l, qty: Math.max(1, Math.min(MAX_QTY, qty)) } : l)),
        })),
      remove: (productId) => set((s) => ({ lines: s.lines.filter((l) => l.productId !== productId) })),
      clear: () => set({ lines: [] }),
      reconcile: (issues) =>
        set((s) => {
          let lines = s.lines;
          for (const i of issues) {
            if (i.kind === "removed" || i.kind === "out_of_stock") lines = lines.filter((l) => l.productId !== i.productId);
            if (i.kind === "low_stock") lines = lines.map((l) => (l.productId === i.productId ? { ...l, qty: i.available } : l));
            if (i.kind === "price_changed") lines = lines.map((l) => (l.productId === i.productId ? { ...l, unitPrice: i.now } : l));
          }
          return { lines };
        }),
    }),
    { name: "oja.cart", version: 1, storage: createJSONStorage(() => localStorage) },
  ),
);

export const cartCount = (s: CartState) => s.lines.reduce((n, l) => n + l.qty, 0);
/** Returns kobo as a number: selectors must return stable values, and a new Money object every call would loop. */
export const cartSubtotalMinor = (s: CartState) => sum(s.lines.map((l) => times(l.unitPrice, l.qty))).amountMinor;
