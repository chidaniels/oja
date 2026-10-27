import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { q } from "@/api/queries";
import { useTitle } from "@/components/hooks";
import { ProductCard } from "@/components/ProductCard";
import { ErrorBox, Img, Price, QtyStepper, Skeleton, Stars } from "@/components/ui";
import { deliveryFor, etaLabel, FREE_DELIVERY_FROM } from "@/lib/delivery";
import { formatNaira } from "@/lib/money";
import { MAX_QTY, useCart } from "@/stores/cart";

export default function ProductDetail() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { data, isPending, error, refetch } = useQuery(q.product(id));
  const add = useCart((s) => s.add);
  const inCart = useCart((s) => s.lines.find((l) => l.productId === id)?.qty ?? 0);
  const [qty, setQty] = useState(1);
  const [image, setImage] = useState(0);
  useTitle(data?.product.title);

  if (isPending) {
    return (
      <div className="page grid gap-8 py-8 md:grid-cols-2">
        <Skeleton className="aspect-square" />
        <div className="space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-10 w-1/2" />
          <Skeleton className="h-32" />
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="page py-12">
        <ErrorBox message={error.message} onRetry={() => refetch()} />
      </div>
    );
  }

  const { product: p, vendor, related } = data;
  const maxQty = Math.max(0, Math.min(MAX_QTY, p.stock) - inCart);
  const local = deliveryFor(vendor.state, vendor.state, "standard", p.price);
  const far = deliveryFor(vendor.state, vendor.state === "Lagos" ? "FCT" : "Lagos", "standard", p.price);

  return (
    <div className="page py-6">
      <nav className="mb-4 text-xs text-muted" aria-label="Breadcrumb">
        <Link to="/products" className="hover:text-ink">
          Products
        </Link>{" "}
        /{" "}
        <Link to={`/products?category=${p.category}`} className="hover:text-ink">
          {p.category.replace(/-/g, " ")}
        </Link>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        <div>
          <Img src={p.images[image] ?? p.thumbnail} alt={p.title} eager className="card aspect-square" />
          {p.images.length > 1 && (
            <div className="mt-3 flex gap-2">
              {p.images.map((src, i) => (
                <button
                  key={src}
                  onClick={() => setImage(i)}
                  className={`w-16 overflow-hidden rounded-xl border-2 ${i === image ? "border-leaf-600" : "border-transparent"}`}
                  aria-label={`Show image ${i + 1}`}
                  aria-pressed={i === image}
                >
                  <Img src={src} alt="" className="aspect-square" />
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          {p.brand && <p className="text-sm font-semibold text-leaf-700">{p.brand}</p>}
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">{p.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <Stars rating={p.rating} count={p.reviewCount} />
            {p.condition === "used" && <span className="rounded-full bg-canvas px-2 py-0.5 text-xs font-semibold">Used</span>}
          </div>

          <div className="mt-5">
            <Price price={p.price} discount={p.discountPercent} size="lg" />
            {p.discountPercent > 0 && <p className="mt-1 text-sm font-semibold text-leaf-700">You save {p.discountPercent}%</p>}
          </div>

          <p className={`mt-4 text-sm font-semibold ${p.stock === 0 ? "text-danger" : p.stock <= 5 ? "text-amber-700" : "text-leaf-700"}`}>
            {p.stock === 0 ? "Sold out" : p.stock <= 5 ? `Only ${p.stock} left in stock` : "In stock"}
          </p>

          {p.stock > 0 && (
            <div className="mt-5 flex flex-wrap items-center gap-3">
              {maxQty > 0 ? (
                <>
                  <QtyStepper value={Math.min(qty, maxQty)} max={maxQty} onChange={setQty} label="Quantity" />
                  <button className="btn-primary flex-1 py-3" onClick={() => add(p, Math.min(qty, maxQty))}>
                    Add to cart
                  </button>
                  <button
                    className="btn-sun flex-1 py-3"
                    onClick={() => {
                      add(p, Math.min(qty, maxQty));
                      navigate("/cart");
                    }}
                  >
                    Buy now
                  </button>
                </>
              ) : (
                <p className="text-sm text-muted">You already have the most you can buy in your cart.</p>
              )}
            </div>
          )}
          {inCart > 0 && (
            <p className="mt-3 text-sm">
              {inCart} in your cart ·{" "}
              <Link to="/cart" className="font-semibold text-leaf-700 underline">
                View cart
              </Link>
            </p>
          )}

          <Link to={`/vendors/${vendor.slug}`} className="card mt-6 flex items-center gap-3 p-4 hover:border-leaf-600">
            <span className="grid h-11 w-11 place-items-center rounded-xl font-bold text-white" style={{ background: vendor.accent }} aria-hidden>
              {vendor.name.charAt(0)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs text-muted">Sold by</span>
              <span className="block truncate font-semibold">{vendor.name}</span>
            </span>
            <span className="text-xs text-muted">{vendor.city}</span>
          </Link>

          <div className="mt-3 rounded-2xl bg-leaf-50 p-4 text-sm">
            <p className="font-semibold">Delivery</p>
            <p className="mt-1 text-muted">
              Within {vendor.state}: {formatNaira(local.fee)}, {etaLabel(local.etaDays)}. Other states: {formatNaira(far.fee)},{" "}
              {etaLabel(far.etaDays)}. Free from {formatNaira(FREE_DELIVERY_FROM)} with this seller.
            </p>
          </div>

          <h2 className="mt-8 font-semibold">About this item</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">{p.description}</p>

          {p.reviews.length > 0 && (
            <>
              <h2 className="mt-8 font-semibold">Reviews</h2>
              <ul className="mt-3 space-y-3">
                {p.reviews.map((r, i) => (
                  <li key={i} className="card p-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{r.name}</span>
                      <Stars rating={r.rating} />
                    </div>
                    <p className="mt-1 text-muted">{r.comment}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 text-xl font-bold">You may also like</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-6">
            {related.map((r) => (
              <ProductCard key={r.id} product={r} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
