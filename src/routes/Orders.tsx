import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router";
import { ORDER_STEPS, orderStep } from "@/api/orders";
import { q } from "@/api/queries";
import { useTitle } from "@/components/hooks";
import { RequireAuth } from "@/components/RequireAuth";
import { ErrorBox, Img, Skeleton } from "@/components/ui";
import { formatNaira } from "@/lib/money";
import { useAuth } from "@/stores/auth";

export default function OrdersPage() {
  return (
    <RequireAuth>
      <Orders />
    </RequireAuth>
  );
}

function Orders() {
  useTitle("My orders");
  const email = useAuth((s) => s.user!.email);
  const { data, isPending, error, refetch } = useQuery(q.orders(email));

  return (
    <div className="page max-w-3xl py-6">
      <h1 className="text-2xl font-bold">My orders</h1>
      <div className="mt-6 space-y-3">
        {isPending ? (
          Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-28" />)
        ) : error ? (
          <ErrorBox message={error.message} onRetry={() => refetch()} />
        ) : data.length === 0 ? (
          <div className="card p-10 text-center">
            <p className="font-semibold">No orders yet</p>
            <p className="mt-1 text-sm text-muted">When you buy something, you can track it here.</p>
            <Link to="/products" className="btn-primary mt-4">
              Start shopping
            </Link>
          </div>
        ) : (
          data.map((o) => {
            const step = orderStep(o);
            const thumbs = o.shipments.flatMap((s) => s.lines).slice(0, 4);
            return (
              <Link key={o.id} to={`/orders/${o.id}`} className="card flex flex-col gap-3 p-4 hover:border-leaf-600 sm:flex-row sm:items-center">
                <div className="flex -space-x-3">
                  {thumbs.map((l) => (
                    <Img key={l.productId} src={l.thumbnail} alt="" className="h-14 w-14 rounded-xl border-2 border-white" />
                  ))}
                </div>
                <div className="flex-1">
                  <p className="font-semibold">Order {o.id}</p>
                  <p className="text-xs text-muted">
                    {new Date(o.createdAt).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })} ·{" "}
                    {o.shipments.length} {o.shipments.length === 1 ? "delivery" : "deliveries"}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-1">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${step === 3 ? "bg-leaf-50 text-leaf-700" : "bg-amber-50 text-amber-800"}`}>
                    {ORDER_STEPS[step]}
                  </span>
                  <span className="font-bold">{formatNaira(o.total)}</span>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
