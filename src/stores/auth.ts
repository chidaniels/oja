import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Vendor } from "@/lib/types";

type Shop = Pick<Vendor, "id" | "slug" | "name">;

export interface User {
  name: string;
  email: string;
  shop: Shop | null;
}

interface AuthState {
  user: User | null;
  /** Shops remembered per email, so signing out and back in keeps your shop. */
  shops: Record<string, Shop>;
  signIn: (u: Omit<User, "shop">) => void;
  signOut: () => void;
  setShop: (shop: Shop) => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      shops: {},
      signIn: ({ name, email }) => set((s) => ({ user: { name, email, shop: s.shops[email] ?? null } })),
      signOut: () => set({ user: null }),
      setShop: (shop) =>
        set((s) => (s.user ? { user: { ...s.user, shop }, shops: { ...s.shops, [s.user.email]: shop } } : s)),
    }),
    { name: "oja.auth" },
  ),
);
