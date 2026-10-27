import { deliveryFor } from "@/lib/delivery";
import { sum, times } from "@/lib/money";
import { readJSON, writeJSON } from "@/lib/storage";
import type { Address, CartIssue, CartLine, DeliverySpeed, Order, PaymentMethod, Quote, Shipment } from "@/lib/types";
import { ApiError, catalog, KEYS, recordSale, wait } from "./client";

/**
 * Prices the cart from the catalog, never from what the cart remembers.
 * A cart saved last week (or edited in devtools) can't buy at an old price.
 */
export async function quote(lines: CartLine[], toState: string, speed: DeliverySpeed): Promise<Quote> {
  const c = await catalog();
  await wait(150);
  const issues: CartIssue[] = [];
  const byVendor = new Map<string, Shipment["lines"]>();

  for (const line of lines) {
    const p = c.products.find((x) => x.id === line.productId);
    if (!p) {
      issues.push({ kind: "removed", productId: line.productId, title: line.title });
      continue;
    }
    if (p.stock === 0) {
      issues.push({ kind: "out_of_stock", productId: p.id, title: p.title });
      continue;
    }
    if (p.stock < line.qty) issues.push({ kind: "low_stock", productId: p.id, title: p.title, available: p.stock });
    if (p.price.amountMinor !== line.unitPrice.amountMinor) {
      issues.push({ kind: "price_changed", productId: p.id, title: p.title, was: line.unitPrice, now: p.price });
    }
    const qty = Math.min(line.qty, p.stock);
    byVendor.set(p.vendorId, [
      ...(byVendor.get(p.vendorId) ?? []),
      { productId: p.id, title: p.title, thumbnail: p.thumbnail, unitPrice: p.price, qty },
    ]);
  }

  const shipments: Shipment[] = [...byVendor.entries()].map(([vendorId, vLines]) => {
    const vendor = c.vendors.find((v) => v.id === vendorId)!;
    const subtotal = sum(vLines.map((l) => times(l.unitPrice, l.qty)));
    const { fee, etaDays } = deliveryFor(vendor.state, toState, speed, subtotal);
    return { vendorId, vendorName: vendor.name, vendorState: vendor.state, lines: vLines, subtotal, deliveryFee: fee, etaDays };
  });

  const itemsTotal = sum(shipments.map((s) => s.subtotal));
  const deliveryTotal = sum(shipments.map((s) => s.deliveryFee));
  return { shipments, itemsTotal, deliveryTotal, total: sum([itemsTotal, deliveryTotal]), issues };
}

export interface PlaceOrderInput {
  idempotencyKey: string;
  email: string;
  lines: CartLine[];
  address: Address;
  speed: DeliverySpeed;
  payment: PaymentMethod;
  /** The total the customer saw on the button. If the server's total differs, nothing is charged. */
  expectedTotal: number;
}

export async function placeOrder(input: PlaceOrderInput): Promise<Order> {
  await wait(900);
  const orders = readJSON<Order[]>(KEYS.orders, []);
  const existing = orders.find((o) => o.idempotencyKey === input.idempotencyKey);
  if (existing) return existing;

  if (!navigator.onLine) throw new ApiError("OFFLINE", "You're offline. Your cart is saved; place the order when you're back online.");

  const q = await quote(input.lines, input.address.state, input.speed);
  if (q.issues.length) throw new ApiError("CART_CHANGED", "Some items changed since you started checkout.", q.issues);
  if (q.total.amountMinor !== input.expectedTotal) {
    throw new ApiError("TOTAL_CHANGED", "Your total changed. Please review it before paying.", q.total);
  }

  const order: Order = {
    id: `OJ-${Date.now().toString(36).toUpperCase().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`,
    idempotencyKey: input.idempotencyKey,
    email: input.email,
    createdAt: new Date().toISOString(),
    address: input.address,
    speed: input.speed,
    payment: input.payment,
    shipments: q.shipments,
    itemsTotal: q.itemsTotal,
    deliveryTotal: q.deliveryTotal,
    total: q.total,
  };
  writeJSON(KEYS.orders, [order, ...orders]);
  for (const s of q.shipments) for (const l of s.lines) recordSale(l.productId, l.qty);
  return order;
}

export async function listOrders(email: string) {
  await wait();
  return readJSON<Order[]>(KEYS.orders, []).filter((o) => o.email === email);
}

export async function getOrder(id: string, email: string) {
  await wait();
  const order = readJSON<Order[]>(KEYS.orders, []).find((o) => o.id === id && o.email === email);
  if (!order) throw new ApiError("NOT_FOUND", "We couldn't find that order on this account.");
  return order;
}

/** Orders move through statuses on a short demo clock so the tracking UI has something to show. */
export const ORDER_STEPS = ["Placed", "Packed", "Shipped", "Delivered"] as const;
export function orderStep(order: Order, now = Date.now()) {
  const mins = (now - new Date(order.createdAt).getTime()) / 60_000;
  return mins < 1 ? 0 : mins < 3 ? 1 : mins < 8 ? 2 : 3;
}
