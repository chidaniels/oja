import type { Money } from "./types";

export const naira = (major: number): Money => ({ amountMinor: Math.round(major * 100), currency: "NGN" });
export const ZERO: Money = { amountMinor: 0, currency: "NGN" };

export const add = (a: Money, b: Money): Money => ({ amountMinor: a.amountMinor + b.amountMinor, currency: "NGN" });
export const times = (m: Money, n: number): Money => ({ amountMinor: m.amountMinor * n, currency: "NGN" });
export const sum = (list: Money[]) => list.reduce(add, ZERO);

const fmt = new Intl.NumberFormat("en-NG", { maximumFractionDigits: 0 });

/** ₦45,000. Kobo are dropped because marketplace prices are whole naira. */
export function formatNaira(m: Money): string {
  return `₦${fmt.format(Math.round(m.amountMinor / 100))}`;
}

/** Original price before a percentage discount, rounded to the nearest ₦100. */
export function beforeDiscount(m: Money, percent: number): Money {
  const major = m.amountMinor / 100 / (1 - percent / 100);
  return naira(Math.round(major / 100) * 100);
}
