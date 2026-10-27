import { useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { q } from "@/api/queries";
import type { Product } from "@/lib/types";
import { useCart } from "@/stores/cart";
import { Img, Price, Skeleton, Stars } from "./ui";

export function ProductCard({ product, eager = false }: { product: Product; eager?: boolean }) {
  const qc = useQueryClient();
  const add = useCart((s) => s.add);
  const inCart = useCart((s) => s.lines.some((l) => l.productId === product.id));
  // Start loading the detail page's data as soon as intent is clear (hover / touch / focus).
  const prefetch = () => qc.prefetchQuery(q.product(product.id));

  return (
    <article className="card group flex flex-col overflow-hidden transition hover:shadow-md">
      <Link to={`/products/${product.id}`} onPointerEnter={prefetch} onFocus={prefetch} className="flex flex-1 flex-col">
        <div className="relative">
          <Img src={product.thumbnail} alt={product.title} eager={eager} className="aspect-square" />
          {product.discountPercent > 0 && (
            <span className="absolute left-2 top-2 rounded-lg bg-sun px-2 py-0.5 text-xs font-bold">
              -{product.discountPercent}%
            </span>
          )}
          {product.stock > 0 && product.stock <= 5 && (
            <span className="absolute bottom-2 left-2 rounded-lg bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-danger">
              Only {product.stock} left
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-3">
          <h3 className="line-clamp-2 text-sm font-medium leading-snug group-hover:text-leaf-700">{product.title}</h3>
          <Stars rating={product.rating} count={product.reviewCount} />
          <div className="mt-auto pt-1">
            <Price price={product.price} discount={product.discountPercent} />
          </div>
        </div>
      </Link>
      <div className="px-3 pb-3">
        <button
          className={`btn w-full py-2 ${inCart ? "border border-leaf-600 bg-leaf-50 text-leaf-700" : "bg-leaf-700 text-white hover:bg-leaf-900"}`}
          disabled={product.stock === 0}
          onClick={() => add(product)}
        >
          {product.stock === 0 ? "Sold out" : inCart ? "Added ✓ Add another" : "Add to cart"}
        </button>
      </div>
    </article>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card overflow-hidden">
          <Skeleton className="aspect-square rounded-none" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-4 w-4/5" />
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-9" />
          </div>
        </div>
      ))}
    </div>
  );
}
