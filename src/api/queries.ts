import { infiniteQueryOptions, queryOptions } from "@tanstack/react-query";
import type { CartLine, DeliverySpeed } from "@/lib/types";
import { getOrder, listOrders, quote } from "./orders";
import { getCatalogMeta, getHome, getProduct, getVendor, listProducts, type ProductQuery } from "./products";

export const q = {
  home: () => queryOptions({ queryKey: ["home"], queryFn: getHome }),
  meta: () => queryOptions({ queryKey: ["meta"], queryFn: getCatalogMeta, staleTime: Infinity }),
  products: (query: ProductQuery) =>
    infiniteQueryOptions({
      queryKey: ["products", query],
      queryFn: ({ pageParam }) => listProducts(query, pageParam),
      initialPageParam: 0,
      getNextPageParam: (last) => last.nextCursor,
    }),
  product: (id: string) => queryOptions({ queryKey: ["product", id], queryFn: () => getProduct(id) }),
  vendor: (slug: string) => queryOptions({ queryKey: ["vendor", slug], queryFn: () => getVendor(slug) }),
  quote: (lines: CartLine[], state: string, speed: DeliverySpeed) =>
    queryOptions({
      queryKey: ["quote", lines.map((l) => [l.productId, l.qty, l.unitPrice.amountMinor]), state, speed],
      queryFn: () => quote(lines, state, speed),
      staleTime: 0,
    }),
  orders: (email: string) => queryOptions({ queryKey: ["orders", email], queryFn: () => listOrders(email) }),
  order: (id: string, email: string) => queryOptions({ queryKey: ["order", id, email], queryFn: () => getOrder(id, email) }),
};
