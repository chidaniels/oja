import { naira, ZERO } from "./money";
import type { DeliverySpeed, Money } from "./types";

export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno", "Cross River", "Delta",
  "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi",
  "Kogi", "Kwara", "Lagos", "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara",
] as const;

export const FREE_DELIVERY_FROM = naira(100_000);

/**
 * Each vendor ships separately, so each shipment has its own fee:
 * same state ₦1,500, interstate ₦3,500, express adds ₦2,500.
 * Standard delivery is free when one vendor's items reach ₦100,000.
 */
export function deliveryFor(vendorState: string, toState: string, speed: DeliverySpeed, subtotal: Money) {
  const sameState = vendorState === toState;
  const base = sameState ? 1_500 : 3_500;
  const etaDays: [number, number] = sameState ? [1, 2] : [3, 5];
  if (speed === "express") {
    return { fee: naira(base + 2_500), etaDays: [Math.max(1, etaDays[0] - 1), Math.ceil(etaDays[1] / 2)] as [number, number] };
  }
  const free = subtotal.amountMinor >= FREE_DELIVERY_FROM.amountMinor;
  return { fee: free ? ZERO : naira(base), etaDays };
}

export function etaLabel([min, max]: [number, number]) {
  return min === max ? `${min} day${min > 1 ? "s" : ""}` : `${min}–${max} days`;
}
