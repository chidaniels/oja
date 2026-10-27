import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { q } from "@/api/queries";
import { useTitle } from "@/components/hooks";
import { ProductCard, ProductGridSkeleton } from "@/components/ProductCard";
import { ErrorBox, Img, Skeleton } from "@/components/ui";
import { FREE_DELIVERY_FROM } from "@/lib/delivery";
import { formatNaira } from "@/lib/money";

export default function Home() {
  useTitle("Shop Nigerian sellers");
  const { data, isPending, error, refetch } = useQuery(q.home());

  return (
    <>
      <section className="bg-leaf-900 text-white">
        <div className="page grid items-center gap-8 py-10 md:grid-cols-[1.3fr_1fr] md:py-14">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-balance sm:text-5xl">
              The whole market, <span className="text-sun">one cart.</span>
            </h1>
            <p className="mt-4 max-w-lg text-white/80 sm:text-lg">
              Phones from Computer Village, fashion from Aba, skincare from Lekki. Buy from many sellers and check out once.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/products" className="btn-sun px-6 py-3">
                Start shopping
              </Link>
              <Link to="/sell" className="btn border border-white/30 px-6 py-3 hover:bg-white/10">
                Sell on Ọja
              </Link>
            </div>
          </div>
          <ul className="grid grid-cols-2 gap-3 text-sm">
            {[
              ["9 sellers", "across 5 states"],
              [`Free delivery`, `from ${formatNaira(FREE_DELIVERY_FROM)} per seller`],
              ["Pay on delivery", "or by card or transfer"],
              ["Cart saved", "even when you're offline"],
            ].map(([a, b]) => (
              <li key={a} className="rounded-2xl bg-white/10 p-4">
                <p className="font-bold text-sun">{a}</p>
                <p className="text-white/75">{b}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <div className="page space-y-12 py-10">
        {error ? (
          <ErrorBox message={error.message} onRetry={() => refetch()} />
        ) : (
          <>
            <section>
              <h2 className="mb-4 text-xl font-bold">Shop by category</h2>
              <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-6 sm:px-0 lg:grid-cols-11">
                {isPending
                  ? Array.from({ length: 11 }, (_, i) => <Skeleton key={i} className="h-28 w-24 shrink-0 sm:w-auto" />)
                  : data.categories.map((c) => (
                      <Link
                        key={c.key}
                        to={`/products?category=${c.key}`}
                        className="card flex w-24 shrink-0 flex-col items-center gap-2 p-2 text-center text-xs font-medium hover:border-leaf-600 sm:w-auto"
                      >
                        <Img src={c.image} alt="" className="aspect-square w-full rounded-xl" />
                        {c.label}
                      </Link>
                    ))}
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-end justify-between">
                <h2 className="text-xl font-bold">Today&apos;s biggest discounts</h2>
                <Link to="/products?sort=discount" className="text-sm font-semibold text-leaf-700 hover:underline">
                  See all →
                </Link>
              </div>
              {isPending ? (
                <ProductGridSkeleton count={4} />
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                  {data.deals.map((p, i) => (
                    <ProductCard key={p.id} product={p} eager={i < 2} />
                  ))}
                </div>
              )}
            </section>

            {data && data.fresh.length > 0 && (
              <section>
                <h2 className="mb-4 text-xl font-bold">Just listed by sellers like you</h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                  {data.fresh.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </section>
            )}

            <section>
              <h2 className="mb-4 text-xl font-bold">Sellers on Ọja</h2>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {isPending
                  ? Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-20" />)
                  : data.vendors.slice(0, 9).map((v) => (
                      <Link key={v.id} to={`/vendors/${v.slug}`} className="card flex items-center gap-3 p-4 hover:border-leaf-600">
                        <span
                          className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-lg font-bold text-white"
                          style={{ background: v.accent }}
                          aria-hidden
                        >
                          {v.name.charAt(0)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-semibold">{v.name}</span>
                          <span className="block truncate text-xs text-muted">
                            {v.city} · {v.productCount} products
                          </span>
                        </span>
                      </Link>
                    ))}
              </div>
            </section>

            <section>
              <div className="mb-4 flex items-end justify-between">
                <h2 className="text-xl font-bold">Top rated</h2>
                <Link to="/products?sort=rating" className="text-sm font-semibold text-leaf-700 hover:underline">
                  See all →
                </Link>
              </div>
              {isPending ? (
                <ProductGridSkeleton count={4} />
              ) : (
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
                  {data.topRated.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </>
  );
}
