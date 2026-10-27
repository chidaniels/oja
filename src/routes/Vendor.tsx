import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { q } from "@/api/queries";
import { useTitle } from "@/components/hooks";
import { ProductCard, ProductGridSkeleton } from "@/components/ProductCard";
import { ErrorBox, Skeleton, Spinner } from "@/components/ui";
import { useAuth } from "@/stores/auth";

export default function Vendor() {
  const { slug = "" } = useParams();
  const vendorQ = useQuery(q.vendor(slug));
  const meta = useQuery(q.meta());
  const [category, setCategory] = useState<string | undefined>();
  const vendor = vendorQ.data?.vendor;
  const products = useInfiniteQuery({ ...q.products({ vendor: vendor?.id, category, sort: "rating" }), enabled: !!vendor });
  const isOwner = useAuth((s) => s.user?.shop?.slug === slug);
  useTitle(vendor?.name);

  if (vendorQ.error) {
    return (
      <div className="page py-12">
        <ErrorBox message={vendorQ.error.message} onRetry={() => vendorQ.refetch()} />
      </div>
    );
  }

  const label = (key: string) => meta.data?.categories.find((c) => c.key === key)?.label ?? key;
  const items = products.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <>
      <section className="border-b border-line bg-white">
        <div className="page flex flex-col gap-4 py-8 sm:flex-row sm:items-center">
          {vendor ? (
            <>
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl text-2xl font-bold text-white" style={{ background: vendor.accent }} aria-hidden>
                {vendor.name.charAt(0)}
              </span>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">{vendor.name}</h1>
                <p className="text-sm text-muted">
                  {vendor.city} · On Ọja since {vendor.since} · {vendor.productCount} products
                  {vendor.rating > 0 && ` · ★ ${vendor.rating.toFixed(1)} average`}
                </p>
              </div>
              {isOwner && (
                <Link to="/sell" className="btn-primary">
                  + List an item
                </Link>
              )}
            </>
          ) : (
            <Skeleton className="h-16 w-full max-w-md" />
          )}
        </div>
      </section>

      <div className="page py-6">
        {vendorQ.data && vendorQ.data.categories.length > 1 && (
          <div className="mb-5 flex flex-wrap gap-2">
            {[undefined, ...vendorQ.data.categories].map((c) => (
              <button
                key={c ?? "all"}
                onClick={() => setCategory(c)}
                className={`rounded-full border px-3 py-1.5 text-sm ${category === c ? "border-leaf-700 bg-leaf-700 text-white" : "border-line bg-white"}`}
              >
                {c ? label(c) : "Everything"}
              </button>
            ))}
          </div>
        )}

        {!vendor || products.isPending ? (
          <ProductGridSkeleton />
        ) : items.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="font-semibold">No products yet</p>
            {isOwner && (
              <Link to="/sell" className="btn-primary mt-4">
                List your first item
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
              {items.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
            {products.hasNextPage && (
              <div className="mt-6 flex justify-center">
                <button className="btn-ghost" onClick={() => products.fetchNextPage()} disabled={products.isFetchingNextPage}>
                  {products.isFetchingNextPage ? <Spinner /> : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
