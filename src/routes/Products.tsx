import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import type { ProductQuery, SortKey } from "@/api/products";
import { q } from "@/api/queries";
import { useTitle } from "@/components/hooks";
import { ProductCard, ProductGridSkeleton } from "@/components/ProductCard";
import { ErrorBox, Spinner } from "@/components/ui";

const SORTS: { key: SortKey; label: string }[] = [
  { key: "relevance", label: "Best match" },
  { key: "price_asc", label: "Price: low to high" },
  { key: "price_desc", label: "Price: high to low" },
  { key: "rating", label: "Top rated" },
  { key: "discount", label: "Biggest discount" },
];

const num = (v: string | null) => (v && !Number.isNaN(Number(v)) ? Number(v) : undefined);

export default function Products() {
  // The URL is the single source of truth for filters: shareable, back-button friendly, survives refresh.
  const [params, setParams] = useSearchParams();
  const query: ProductQuery = {
    q: params.get("q") ?? undefined,
    category: params.get("category") ?? undefined,
    sort: (params.get("sort") as SortKey) ?? undefined,
    minPrice: num(params.get("min")),
    maxPrice: num(params.get("max")),
  };
  const meta = useQuery(q.meta());
  const list = useInfiniteQuery(q.products(query));
  const [filtersOpen, setFiltersOpen] = useState(false);

  const categoryLabel = meta.data?.categories.find((c) => c.key === query.category)?.label;
  useTitle(query.q ? `“${query.q}”` : (categoryLabel ?? "All products"));

  const update = (patch: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(patch)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    setParams(next, { preventScrollReset: true });
  };

  // Load the next page when the sentinel scrolls into view; the button below is the fallback.
  const sentinel = useRef<HTMLDivElement>(null);
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = list;
  useEffect(() => {
    const el = sentinel.current;
    if (!el || !hasNextPage) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && !isFetchingNextPage && fetchNextPage(), {
      rootMargin: "600px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const items = list.data?.pages.flatMap((p) => p.items) ?? [];
  const total = list.data?.pages[0]?.total ?? 0;
  const activeChips = [
    query.q && { label: `“${query.q}”`, clear: { q: undefined } },
    categoryLabel && { label: categoryLabel, clear: { category: undefined } },
    (query.minPrice || query.maxPrice) && {
      label: `₦${query.minPrice?.toLocaleString() ?? "0"} – ${query.maxPrice ? `₦${query.maxPrice.toLocaleString()}` : "any"}`,
      clear: { min: undefined, max: undefined },
    },
  ].filter(Boolean) as { label: string; clear: Record<string, undefined> }[];

  const filters = (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-sm font-semibold">Category</p>
        <ul className="space-y-0.5 text-sm">
          <li>
            <button
              onClick={() => update({ category: undefined })}
              className={`w-full rounded-lg px-2 py-1.5 text-left ${!query.category ? "bg-leaf-50 font-semibold text-leaf-700" : "hover:bg-canvas"}`}
            >
              All categories
            </button>
          </li>
          {meta.data?.categories.map((c) => (
            <li key={c.key}>
              <button
                onClick={() => {
                  update({ category: c.key });
                  setFiltersOpen(false);
                }}
                className={`w-full rounded-lg px-2 py-1.5 text-left ${query.category === c.key ? "bg-leaf-50 font-semibold text-leaf-700" : "hover:bg-canvas"}`}
              >
                {c.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <form
        key={`${query.minPrice}-${query.maxPrice}`}
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          update({ min: String(f.get("min") || ""), max: String(f.get("max") || "") });
          setFiltersOpen(false);
        }}
      >
        <p className="mb-2 text-sm font-semibold">Price (₦)</p>
        <div className="flex items-center gap-2">
          <input name="min" type="number" min={0} inputMode="numeric" placeholder="Min" defaultValue={query.minPrice} className="input px-2" aria-label="Minimum price" />
          <span className="text-muted">–</span>
          <input name="max" type="number" min={0} inputMode="numeric" placeholder="Max" defaultValue={query.maxPrice} className="input px-2" aria-label="Maximum price" />
        </div>
        <button className="btn-ghost mt-2 w-full py-2">Apply</button>
      </form>
    </div>
  );

  return (
    <div className="page py-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">{query.q ? `Results for “${query.q}”` : (categoryLabel ?? "All products")}</h1>
          <p className="text-sm text-muted" aria-live="polite">
            {list.isPending ? "Searching…" : `${total} ${total === 1 ? "product" : "products"}`}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost lg:hidden" onClick={() => setFiltersOpen(true)}>
            Filters
          </button>
          <label className="sr-only" htmlFor="sort">
            Sort by
          </label>
          <select id="sort" className="input w-auto" value={query.sort ?? "relevance"} onChange={(e) => update({ sort: e.target.value === "relevance" ? undefined : e.target.value })}>
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {activeChips.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {activeChips.map((c) => (
            <button key={c.label} onClick={() => update(c.clear)} className="rounded-full bg-leaf-50 px-3 py-1 text-xs font-semibold text-leaf-700 hover:bg-leaf-100">
              {c.label} ✕
            </button>
          ))}
          <Link to="/products" className="px-2 py-1 text-xs font-semibold text-muted underline">
            Clear all
          </Link>
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[14rem_1fr]">
        <aside className="hidden lg:block">{filters}</aside>

        {filtersOpen && (
          <div className="fixed inset-0 z-40 bg-ink/40 lg:hidden" onClick={() => setFiltersOpen(false)}>
            <div
              className="absolute inset-y-0 left-0 w-[85%] max-w-xs overflow-y-auto bg-white p-5"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-label="Filters"
            >
              <div className="mb-4 flex items-center justify-between">
                <p className="text-lg font-bold">Filters</p>
                <button onClick={() => setFiltersOpen(false)} aria-label="Close filters">
                  ✕
                </button>
              </div>
              {filters}
            </div>
          </div>
        )}

        <div>
          {list.isPending ? (
            <ProductGridSkeleton />
          ) : list.error ? (
            <ErrorBox message={list.error.message} onRetry={() => list.refetch()} />
          ) : items.length === 0 ? (
            <div className="card p-10 text-center">
              <p className="font-semibold">No products match</p>
              <p className="mt-1 text-sm text-muted">Try a shorter search or remove a filter.</p>
              <Link to="/products" className="btn-ghost mt-4">
                See all products
              </Link>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4">
                {items.map((p, i) => (
                  <ProductCard key={p.id} product={p} eager={i < 2} />
                ))}
              </div>
              <div ref={sentinel} className="mt-6 flex justify-center">
                {hasNextPage ? (
                  <button className="btn-ghost" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
                    {isFetchingNextPage ? (
                      <>
                        <Spinner /> Loading more…
                      </>
                    ) : (
                      "Load more"
                    )}
                  </button>
                ) : (
                  <p className="text-sm text-muted">You&apos;ve seen all {total} products.</p>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
