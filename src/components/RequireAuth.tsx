import { Navigate, useLocation } from "react-router";
import { useAuth } from "@/stores/auth";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = useAuth((s) => s.user);
  const { pathname, search } = useLocation();
  if (!user) return <Navigate to={`/login?next=${encodeURIComponent(pathname + search)}`} replace />;
  return children;
}
