import { useState } from "react";
import { beforeDiscount, formatNaira } from "@/lib/money";
import type { Money } from "@/lib/types";

/**
 * Product images come from a CDN and can be slow on 3G. The box reserves its space up front
 * (no layout shift), the image loads lazily, and a failed load shows a neutral placeholder.
 */
export function Img({
  src,
  alt,
  className = "",
  eager = false,
  sizes,
}: {
  src: string;
  alt: string;
  className?: string;
  eager?: boolean;
  sizes?: string;
}) {
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  return (
    <div className={`relative overflow-hidden bg-canvas ${className}`}>
      {state !== "error" ? (
        <img
          src={src}
          alt={alt}
          sizes={sizes}
          loading={eager ? "eager" : "lazy"}
          fetchPriority={eager ? "high" : "auto"}
          decoding="async"
          onLoad={() => setState("ok")}
          onError={() => setState("error")}
          className={`h-full w-full object-contain transition-opacity duration-300 ${state === "ok" ? "opacity-100" : "opacity-0"}`}
        />
      ) : (
        <div className="grid h-full w-full place-items-center text-xs text-muted">No image</div>
      )}
      {state === "loading" && <div className="absolute inset-0 animate-pulse bg-line/60" aria-hidden />}
    </div>
  );
}

export function Price({ price, discount = 0, size = "md" }: { price: Money; discount?: number; size?: "md" | "lg" }) {
  return (
    <span className="inline-flex flex-wrap items-baseline gap-x-2">
      <span className={`font-bold ${size === "lg" ? "text-3xl" : "text-base"}`}>{formatNaira(price)}</span>
      {discount > 0 && (
        <span className={`text-muted line-through ${size === "lg" ? "text-base" : "text-xs"}`}>
          {formatNaira(beforeDiscount(price, discount))}
        </span>
      )}
    </span>
  );
}

export function Stars({ rating, count }: { rating: number; count?: number }) {
  if (!rating) return <span className="text-xs text-muted">No reviews yet</span>;
  return (
    <span className="inline-flex items-center gap-1 text-xs" aria-label={`Rated ${rating} out of 5`}>
      <span className="text-amber-500" aria-hidden>
        ★
      </span>
      <span className="font-semibold">{rating.toFixed(1)}</span>
      {count != null && <span className="text-muted">({count})</span>}
    </span>
  );
}

export function Skeleton({ className }: { className: string }) {
  return <div className={`animate-pulse rounded-xl bg-line ${className}`} />;
}

export function Spinner() {
  return <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-label="Loading" />;
}

export function QtyStepper({
  value,
  max,
  onChange,
  label,
}: {
  value: number;
  max: number;
  onChange: (n: number) => void;
  label: string;
}) {
  return (
    <div className="inline-flex items-center rounded-xl border border-line bg-white" role="group" aria-label={label}>
      <button
        className="h-9 w-9 text-lg disabled:opacity-30"
        onClick={() => onChange(value - 1)}
        disabled={value <= 1}
        aria-label="Decrease quantity"
      >
        −
      </button>
      <span className="w-8 text-center text-sm font-semibold" aria-live="polite">
        {value}
      </span>
      <button
        className="h-9 w-9 text-lg disabled:opacity-30"
        onClick={() => onChange(value + 1)}
        disabled={value >= max}
        aria-label="Increase quantity"
      >
        +
      </button>
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card p-8 text-center" role="alert">
      <p className="font-semibold">Something went wrong</p>
      <p className="mt-1 text-sm text-muted">{message}</p>
      {onRetry && (
        <button className="btn-ghost mt-4" onClick={onRetry}>
          Try again
        </button>
      )}
    </div>
  );
}
