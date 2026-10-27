import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import { useForm, useWatch, type UseFormRegisterReturn } from "react-hook-form";
import { Link, Navigate, useNavigate } from "react-router";
import { z } from "zod";
import { ApiError } from "@/api/client";
import { placeOrder } from "@/api/orders";
import { q } from "@/api/queries";
import { useOnline, useTitle } from "@/components/hooks";
import { RequireAuth } from "@/components/RequireAuth";
import { Img, Skeleton, Spinner } from "@/components/ui";
import { etaLabel, NIGERIAN_STATES } from "@/lib/delivery";
import { formatNaira } from "@/lib/money";
import { readJSON, writeJSON } from "@/lib/storage";
import type { Address, CartIssue } from "@/lib/types";
import { useAuth } from "@/stores/auth";
import { useCart } from "@/stores/cart";

const schema = z.object({
  fullName: z.string().trim().min(3, "Enter the receiver's full name"),
  phone: z
    .string()
    .transform((v) => v.replace(/[\s-]/g, ""))
    .refine((v) => /^(?:\+?234|0)[789][01]\d{8}$/.test(v), "Enter a valid Nigerian mobile number"),
  state: z.enum(NIGERIAN_STATES, { errorMap: () => ({ message: "Choose a state" }) }),
  city: z.string().trim().min(2, "Enter a city or LGA"),
  street: z.string().trim().min(5, "Enter a street address the rider can find"),
  landmark: z.string().trim().max(80).optional(),
  speed: z.enum(["standard", "express"]),
  payment: z.enum(["card", "transfer", "pod"]),
});
type FormIn = z.input<typeof schema>;
type FormOut = z.output<typeof schema>;

const ADDRESS_KEY = "oja.address";
const newKey = () => crypto.randomUUID();

export default function CheckoutPage() {
  return (
    <RequireAuth>
      <Checkout />
    </RequireAuth>
  );
}

function Checkout() {
  useTitle("Checkout");
  const user = useAuth((s) => s.user)!;
  const lines = useCart((s) => s.lines);
  const clear = useCart((s) => s.clear);
  const reconcile = useCart((s) => s.reconcile);
  const navigate = useNavigate();
  const qc = useQueryClient();
  const online = useOnline();
  // One key per checkout attempt. A double tap or a retry after a network error reuses it,
  // so the server returns the same order instead of creating a second one.
  const key = useRef(newKey());
  // Set before the cart is cleared so the empty-cart redirect can't race the order page navigation.
  const placed = useRef(false);

  const saved = readJSON<Partial<Address>>(ADDRESS_KEY, {});
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormIn, unknown, FormOut>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: saved.fullName ?? user.name,
      phone: saved.phone ?? "",
      state: (saved.state as FormIn["state"]) ?? "Lagos",
      city: saved.city ?? "",
      street: saved.street ?? "",
      landmark: saved.landmark ?? "",
      speed: "standard",
      payment: "card",
    },
  });
  const [state, speed] = useWatch({ control, name: ["state", "speed"] });
  const quote = useQuery({ ...q.quote(lines, state, speed), enabled: lines.length > 0 });

  const order = useMutation({
    mutationFn: (v: FormOut) =>
      placeOrder({
        idempotencyKey: key.current,
        email: user.email,
        lines,
        address: { fullName: v.fullName, phone: v.phone, state: v.state, city: v.city, street: v.street, landmark: v.landmark },
        speed: v.speed,
        payment: v.payment,
        expectedTotal: quote.data!.total.amountMinor,
      }),
    onSuccess: (o, v) => {
      placed.current = true;
      writeJSON(ADDRESS_KEY, { fullName: v.fullName, phone: v.phone, state: v.state, city: v.city, street: v.street, landmark: v.landmark });
      clear();
      // Stock changed, so cached product data is stale.
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product"] });
      qc.invalidateQueries({ queryKey: ["home"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      navigate(`/orders/${o.id}?placed=1`, { replace: true });
    },
    onError: (e) => {
      if (e instanceof ApiError && (e.code === "CART_CHANGED" || e.code === "TOTAL_CHANGED")) quote.refetch();
    },
  });

  if (lines.length === 0) return placed.current ? null : <Navigate to="/cart" replace />;

  const issues = quote.data?.issues ?? [];
  const canPay = online && quote.isSuccess && !quote.isFetching && issues.length === 0 && !order.isPending;
  const err = order.error instanceof ApiError ? order.error : order.error ? new ApiError("UNKNOWN", "Something went wrong. You have not been charged.") : null;

  return (
    <div className="page py-6">
      <Link to="/cart" className="text-sm text-muted hover:text-ink">
        ← Back to cart
      </Link>
      <h1 className="mt-1 text-2xl font-bold">Checkout</h1>

      <form onSubmit={handleSubmit((v) => order.mutate(v))} noValidate className="mt-6 grid gap-6 lg:grid-cols-[1fr_24rem]">
        <fieldset disabled={order.isPending} className="space-y-6">
          <section className="card p-5">
            <h2 className="font-semibold">1. Delivery address</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Receiver's name" error={errors.fullName?.message}>
                <input className="input" autoComplete="name" aria-invalid={!!errors.fullName} {...register("fullName")} />
              </Field>
              <Field label="Phone number" error={errors.phone?.message}>
                <input className="input" type="tel" inputMode="tel" autoComplete="tel" placeholder="0803 123 4567" aria-invalid={!!errors.phone} {...register("phone")} />
              </Field>
              <Field label="State" error={errors.state?.message}>
                <select className="input" aria-invalid={!!errors.state} {...register("state")}>
                  {NIGERIAN_STATES.map((s) => (
                    <option key={s} value={s}>
                      {s === "FCT" ? "FCT (Abuja)" : s}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="City / LGA" error={errors.city?.message}>
                <input className="input" autoComplete="address-level2" aria-invalid={!!errors.city} {...register("city")} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Street address" error={errors.street?.message}>
                  <input className="input" autoComplete="street-address" aria-invalid={!!errors.street} {...register("street")} />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <Field label="Nearest landmark (optional)" error={errors.landmark?.message}>
                  <input className="input" placeholder="e.g. Opposite First Bank" {...register("landmark")} />
                </Field>
              </div>
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-semibold">2. Delivery speed</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Choice value="standard" register={register("speed")} title="Standard" note="Free per seller from ₦100,000" />
              <Choice value="express" register={register("speed")} title="Express" note="+₦2,500 per seller, faster" />
            </div>
          </section>

          <section className="card p-5">
            <h2 className="font-semibold">3. Payment</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Choice value="card" register={register("payment")} title="Card" note="Demo, no card needed" />
              <Choice value="transfer" register={register("payment")} title="Bank transfer" note="Account shown after order" />
              <Choice value="pod" register={register("payment")} title="Pay on delivery" note="Cash or POS to the rider" />
            </div>
          </section>
        </fieldset>

        <aside className="card h-fit p-5 lg:sticky lg:top-24">
          <h2 className="font-semibold">Order summary</h2>

          {issues.length > 0 && <IssuesBanner issues={issues} onFix={() => reconcile(issues)} />}

          {quote.isPending ? (
            <div className="mt-4 space-y-3">
              <Skeleton className="h-16" />
              <Skeleton className="h-16" />
            </div>
          ) : quote.error ? (
            <p className="mt-4 text-sm text-danger">
              {quote.error.message}{" "}
              <button type="button" className="font-semibold underline" onClick={() => quote.refetch()}>
                Retry
              </button>
            </p>
          ) : (
            <>
              <ul className="mt-4 space-y-4">
                {quote.data.shipments.map((s) => (
                  <li key={s.vendorId} className="text-sm">
                    <p className="font-semibold">{s.vendorName}</p>
                    <p className="text-xs text-muted">
                      Ships from {s.vendorState} · arrives in {etaLabel(s.etaDays)}
                    </p>
                    <ul className="mt-2 space-y-1.5">
                      {s.lines.map((l) => (
                        <li key={l.productId} className="flex items-center gap-2">
                          <Img src={l.thumbnail} alt="" className="h-9 w-9 shrink-0 rounded-lg" />
                          <span className="line-clamp-1 flex-1 text-xs">
                            {l.qty} × {l.title}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <div className="mt-2 flex justify-between text-xs text-muted">
                      <span>Delivery</span>
                      <span>{s.deliveryFee.amountMinor === 0 ? "Free" : formatNaira(s.deliveryFee)}</span>
                    </div>
                  </li>
                ))}
              </ul>
              <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted">Items</dt>
                  <dd>{formatNaira(quote.data.itemsTotal)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted">Delivery ({quote.data.shipments.length})</dt>
                  <dd>{formatNaira(quote.data.deliveryTotal)}</dd>
                </div>
                <div className="flex justify-between pt-2 text-lg font-bold">
                  <dt>Total</dt>
                  <dd>{formatNaira(quote.data.total)}</dd>
                </div>
              </dl>
            </>
          )}

          {err && (
            <p className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-danger" role="alert">
              {err.message}
              {err.code !== "CART_CHANGED" && err.code !== "TOTAL_CHANGED" && " You have not been charged."}
            </p>
          )}
          {!online && <p className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">You&apos;re offline. Your cart is saved.</p>}

          <button className="btn-primary mt-4 w-full py-3.5 text-base" disabled={!canPay}>
            {order.isPending ? (
              <>
                <Spinner /> Placing order…
              </>
            ) : quote.isFetching ? (
              "Updating total…"
            ) : quote.data ? (
              `Place order · ${formatNaira(quote.data.total)}`
            ) : (
              "Place order"
            )}
          </button>
          <p className="mt-2 text-center text-xs text-muted">Demo checkout. No money moves.</p>
        </aside>
      </form>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      {children}
      {error && <span className="field-error block">{error}</span>}
    </label>
  );
}

function Choice({
  value,
  register,
  title,
  note,
}: {
  value: string;
  register: UseFormRegisterReturn;
  title: string;
  note: string;
}) {
  return (
    <label className="flex cursor-pointer gap-3 rounded-xl border border-line p-3 text-sm has-[:checked]:border-leaf-600 has-[:checked]:bg-leaf-50">
      <input type="radio" value={value} className="mt-0.5 accent-leaf-700" {...register} />
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="text-xs text-muted">{note}</span>
      </span>
    </label>
  );
}

function IssuesBanner({ issues, onFix }: { issues: CartIssue[]; onFix: () => void }) {
  return (
    <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm" role="alert">
      <p className="font-semibold text-amber-900">Some items changed since you added them</p>
      <ul className="mt-2 list-disc space-y-1 pl-4 text-amber-900">
        {issues.map((i) => (
          <li key={i.productId + i.kind}>
            {i.kind === "price_changed" && (
              <>
                {i.title}: {formatNaira(i.was)} → <strong>{formatNaira(i.now)}</strong>
              </>
            )}
            {i.kind === "low_stock" && (
              <>
                {i.title}: only {i.available} left
              </>
            )}
            {i.kind === "out_of_stock" && <>{i.title} is sold out</>}
            {i.kind === "removed" && <>{i.title} is no longer listed</>}
          </li>
        ))}
      </ul>
      <button type="button" className="btn-sun mt-3 w-full py-2" onClick={onFix}>
        Update my cart
      </button>
    </div>
  );
}
