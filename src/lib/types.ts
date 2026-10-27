/** Integer kobo. The UI never does arithmetic on floats. */
export interface Money {
  amountMinor: number;
  currency: "NGN";
}

export interface Review {
  name: string;
  rating: number;
  comment: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  category: string;
  brand: string | null;
  price: Money;
  discountPercent: number;
  rating: number;
  reviewCount: number;
  stock: number;
  thumbnail: string;
  images: string[];
  vendorId: string;
  tags: string[];
  reviews: Review[];
  /** Listed by a user through /sell rather than shipped in the catalog. */
  userListed?: boolean;
  condition?: "new" | "used";
}

export interface Vendor {
  id: string;
  slug: string;
  name: string;
  city: string;
  state: string;
  accent: string;
  since: number;
  productCount: number;
  rating: number;
}

export interface Category {
  key: string;
  label: string;
}

export interface Catalog {
  categories: Category[];
  vendors: Vendor[];
  products: Product[];
}

export interface CartLine {
  productId: string;
  vendorId: string;
  title: string;
  thumbnail: string;
  /** Price when it was added. Checkout re-prices against the server and flags changes. */
  unitPrice: Money;
  qty: number;
}

export interface Address {
  fullName: string;
  phone: string;
  state: string;
  city: string;
  street: string;
  landmark?: string;
}

export type DeliverySpeed = "standard" | "express";
export type PaymentMethod = "card" | "transfer" | "pod";

export interface OrderLine {
  productId: string;
  title: string;
  thumbnail: string;
  unitPrice: Money;
  qty: number;
}

export interface Shipment {
  vendorId: string;
  vendorName: string;
  vendorState: string;
  lines: OrderLine[];
  subtotal: Money;
  deliveryFee: Money;
  etaDays: [number, number];
}

export type CartIssue =
  | { kind: "price_changed"; productId: string; title: string; was: Money; now: Money }
  | { kind: "out_of_stock"; productId: string; title: string }
  | { kind: "low_stock"; productId: string; title: string; available: number }
  | { kind: "removed"; productId: string; title: string };

export interface Quote {
  shipments: Shipment[];
  itemsTotal: Money;
  deliveryTotal: Money;
  total: Money;
  issues: CartIssue[];
}

export interface Order {
  id: string;
  idempotencyKey: string;
  email: string;
  createdAt: string;
  address: Address;
  speed: DeliverySpeed;
  payment: PaymentMethod;
  shipments: Shipment[];
  itemsTotal: Money;
  deliveryTotal: Money;
  total: Money;
}
