import { Link } from "react-router";
import { useTitle } from "@/components/hooks";

export default function NotFound() {
  useTitle("Page not found");
  return (
    <div className="page py-24 text-center">
      <p className="text-sm font-bold text-leaf-700">404</p>
      <h1 className="mt-2 text-3xl font-bold">This stall is empty</h1>
      <p className="mt-2 text-muted">The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <Link to="/products" className="btn-primary mt-6">
        Browse products
      </Link>
    </div>
  );
}
