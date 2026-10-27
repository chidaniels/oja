import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { q } from "@/api/queries";
import { useTitle } from "@/components/hooks";
import { Img, QtyStepper } from "@/components/ui";
import { FREE_DELIVERY_FROM } from "@/lib/delivery";
import { formatNaira, sum, times } from "@/lib/money";
import type { CartLine, Money } from "@/lib/types";
import { cartCount, cartSubtotalMinor, MAX_QTY, useCart } from "@/stores/cart";

export default function Cart() {
  useTitle("Cart");
  const lines = useCart((s) => s.lines);
  const count = useCart(cartCount);
  const subtotal: Money = { amountMinor: useCart(cartSubtotalMinor), currency: "NGN" };
  const setQty = useCart((s) => s.setQty);
  const remove = useCart((s) => s.remove);
  // Vendor names are nice-to-have: the cart still renders offline if this fails.
  const meta = useQuery(q.meta());

  if (lines.length === 0) {
    return (
      <div className="page py-20 text-center">
        <h1 className="text-2xl font-bold">Your cart is empty</h1>
        <p className="mt-2 text-muted">Find something you like and it will wait for you here, even if you close the app.</p>
        <Link to="/products" className="btn-primary mt-6">
          Start shopping
        </Link>
      </div>
    );
  }

  const groups = new Map<string, CartLine[]>();
  for (const l of lines) groups.set(l.vendorId, [...(groups.get(l.vendorId) ?? []), l]);
  const vendorName = (id: string) => meta.data?.vendors.find((v) => v.id === id)?.name ?? "Seller";

  return (
    <div className="page py-6">
      <h1 className="text-2xl font-bold">
        Cart <span className="text-base font-normal text-muted">({count} items)</span>
      </h1>
      {groups.size > 1 && (
        <p className="mt-1 text-sm text-muted">
          Your items come from {groups.size} sellers, so they&apos;ll arrive as {groups.size} separate deliveries.
        </p>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-4">
          {[...groups.entries()].map(([vendorId, vLines]) => {
            const vSubtotal = sum(vLines.map((l) => times(l.unitPrice, l.qty)));
            const toFree = FREE_DELIVERY_FROM.amountMinor - vSubtotal.amountMinor;
            return (
              <section key={vendorId} className="card overflow-hidden">
                <header className="flex items-center justify-between gap-3 border-b border-line bg-canvas px-4 py-3 text-sm">
                  <span className="font-semibold">{vendorName(vendorId)}</span>
                  <span className="text-muted">{formatNaira(vSubtotal)}</span>
                </header>
                <ul className="divide-y divide-line">
                  {vLines.map((l) => (
                    <li key={l.productId} className="flex gap-3 p-4">
                      <Link to={`/products/${l.productId}`} className="w-20 shrink-0 sm:w-24">
                        <Img src={l.thumbnail} alt={l.title} className="aspect-square rounded-xl" />
                      </Link>
                      <div className="flex min-w-0 flex-1 flex-col gap-2">
                        <div className="flex justify-between gap-3">
                          <Link to={`/products/${l.productId}`} className="line-clamp-2 text-sm font-medium hover:text-leaf-700">
                            {l.title}
                          </Link>
                          <span className="shrink-0 text-sm font-bold">{formatNaira(times(l.unitPrice, l.qty))}</span>
                        </div>
                        <span className="text-xs text-muted">{formatNaira(l.unitPrice)} each</span>
                        <div className="mt-auto flex items-center justify-between">
                          <QtyStepper value={l.qty} max={MAX_QTY} onChange={(n) => setQty(l.productId, n)} label={`Quantity of ${l.title}`} />
                          <button onClick={() => remove(l.productId)} className="text-xs font-semibold text-danger hover:underline">
                            Remove
                          </button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <footer className="border-t border-line px-4 py-3 text-xs">
                  {toFree > 0 ? (
                    <>
                      <p className="text-muted">
                        Add <strong className="text-ink">{formatNaira({ amountMinor: toFree, currency: "NGN" })}</strong> more from this
                        seller for free standard delivery.
                      </p>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
                        <div
                          className="h-full rounded-full bg-leaf-600"
                          style={{ width: `${(vSubtotal.amountMinor / FREE_DELIVERY_FROM.amountMinor) * 100}%` }}
                        />
                      </div>
                    </>
                  ) : (
                    <p className="font-semibold text-leaf-700">This seller&apos;s delivery is free ✓</p>
                  )}
                </footer>
              </section>
            );
          })}
        </div>

        <aside className="card h-fit p-5 lg:sticky lg:top-24">
          <h2 className="font-semibold">Summary</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted">Items ({count})</dt>
              <dd>{formatNaira(subtotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Delivery</dt>
              <dd className="text-muted">At checkout</dd>
            </div>
          </dl>
          <div className="mt-4 flex justify-between border-t border-line pt-4 font-bold">
            <span>Subtotal</span>
            <span>{formatNaira(subtotal)}</span>
          </div>
          <Link to="/checkout" className="btn-primary mt-4 w-full py-3">
            Checkout
          </Link>
          <p className="mt-3 text-center text-xs text-muted">Prices and stock are confirmed at checkout.</p>
        </aside>
      </div>
    </div>
  );
}
