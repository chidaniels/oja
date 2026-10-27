import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { ORDER_STEPS, orderStep } from "@/api/orders";
import { q } from "@/api/queries";
import { useTitle } from "@/components/hooks";
import { RequireAuth } from "@/components/RequireAuth";
import { ErrorBox, Img, Skeleton } from "@/components/ui";
import { etaLabel } from "@/lib/delivery";
import { formatNaira, times } from "@/lib/money";
import { useAuth } from "@/stores/auth";

const PAYMENT_LABEL = { card: "Card", transfer: "Bank transfer", pod: "Pay on delivery" } as const;

export default function OrderDetailPage() {
  return (
    <RequireAuth>
      <OrderDetail />
    </RequireAuth>
  );
}

function OrderDetail() {
  const { id = "" } = useParams();
  const placed = useSearchParams()[0].get("placed") === "1";
  const email = useAuth((s) => s.user!.email);
  const { data: o, isPending, error, refetch } = useQuery(q.order(id, email));
  useTitle(`Order ${id}`);

  // Re-render every 20s so the demo tracking timeline advances while the page is open.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 20_000);
    return () => clearInterval(t);
  }, []);

  if (isPending) {
    return (
      <div className="page max-w-3xl space-y-4 py-6">
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="page max-w-3xl py-12">
        <ErrorBox message={error.message} onRetry={() => refetch()} />
      </div>
    );
  }

  const step = orderStep(o, now);

  return (
    <div className="page max-w-3xl py-6">
      {placed && (
        <div className="mb-6 rounded-2xl bg-leaf-900 p-6 text-white">
          <p className="text-2xl font-bold">Thank you! Your order is in.</p>
          <p className="mt-1 text-white/80">
            {o.shipments.length > 1
              ? `${o.shipments.length} sellers are packing your items. They'll arrive separately.`
              : `${o.shipments[0].vendorName} is packing your items.`}
          </p>
          {o.payment === "transfer" && (
            <p className="mt-3 rounded-xl bg-white/10 p-3 text-sm">
              Transfer {formatNaira(o.total)} to <strong>Ọja Demo · 0123456789 · Demo Bank</strong> with reference{" "}
              <strong>{o.id}</strong>.
            </p>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <Link to="/orders" className="text-sm text-muted hover:text-ink">
            ← My orders
          </Link>
          <h1 className="text-2xl font-bold">Order {o.id}</h1>
        </div>
        <p className="text-sm text-muted">
          Placed {new Date(o.createdAt).toLocaleString("en-NG", { dateStyle: "medium", timeStyle: "short" })}
        </p>
      </div>

      <ol className="card mt-6 grid grid-cols-4 p-4 text-center text-xs" aria-label="Order progress">
        {ORDER_STEPS.map((s, i) => (
          <li key={s} className="relative flex flex-col items-center gap-2" aria-current={i === step ? "step" : undefined}>
            {i > 0 && <span className={`absolute right-1/2 top-3 h-0.5 w-full -translate-y-1/2 ${i <= step ? "bg-leaf-600" : "bg-line"}`} aria-hidden />}
            <span className={`relative z-10 grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold ${i <= step ? "bg-leaf-600 text-white" : "bg-line text-muted"}`}>
              {i < step ? "✓" : i + 1}
            </span>
            <span className={i <= step ? "font-semibold" : "text-muted"}>{s}</span>
          </li>
        ))}
      </ol>

      <div className="mt-6 space-y-4">
        {o.shipments.map((s, i) => (
          <section key={s.vendorId} className="card overflow-hidden">
            <header className="flex flex-wrap justify-between gap-2 border-b border-line bg-canvas px-4 py-3 text-sm">
              <span className="font-semibold">
                Delivery {i + 1} of {o.shipments.length} · {s.vendorName}
              </span>
              <span className="text-muted">Arrives in {etaLabel(s.etaDays)}</span>
            </header>
            <ul className="divide-y divide-line">
              {s.lines.map((l) => (
                <li key={l.productId} className="flex items-center gap-3 p-4 text-sm">
                  <Img src={l.thumbnail} alt="" className="h-14 w-14 shrink-0 rounded-xl" />
                  <Link to={`/products/${l.productId}`} className="line-clamp-2 flex-1 hover:text-leaf-700">
                    {l.title}
                  </Link>
                  <span className="text-muted">× {l.qty}</span>
                  <span className="w-24 text-right font-semibold">{formatNaira(times(l.unitPrice, l.qty))}</span>
                </li>
              ))}
            </ul>
            <footer className="flex justify-between border-t border-line px-4 py-2 text-xs text-muted">
              <span>Delivery fee</span>
              <span>{s.deliveryFee.amountMinor === 0 ? "Free" : formatNaira(s.deliveryFee)}</span>
            </footer>
          </section>
        ))}
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <section className="card p-4 text-sm">
          <h2 className="font-semibold">Delivering to</h2>
          <p className="mt-2">{o.address.fullName}</p>
          <p className="text-muted">
            {o.address.street}
            {o.address.landmark && ` (${o.address.landmark})`}
            <br />
            {o.address.city}, {o.address.state}
            <br />
            {o.address.phone}
          </p>
        </section>
        <section className="card p-4 text-sm">
          <h2 className="font-semibold">Payment · {PAYMENT_LABEL[o.payment]}</h2>
          <dl className="mt-2 space-y-1">
            <div className="flex justify-between">
              <dt className="text-muted">Items</dt>
              <dd>{formatNaira(o.itemsTotal)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted">Delivery</dt>
              <dd>{formatNaira(o.deliveryTotal)}</dd>
            </div>
            <div className="flex justify-between border-t border-line pt-2 font-bold">
              <dt>Total</dt>
              <dd>{formatNaira(o.total)}</dd>
            </div>
          </dl>
        </section>
      </div>
    </div>
  );
}
