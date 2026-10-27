import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router";
import { Layout } from "@/components/Layout";
import { RouteError } from "@/routes/RouteError";
import Home from "@/routes/Home";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
  },
});

// Home is in the main bundle because it's the landing page; every other page is its own chunk,
// so a first visit on a slow phone downloads only what it shows.
const page = (load: () => Promise<{ default: React.ComponentType }>) => () =>
  load().then((m) => ({ Component: m.default }));

const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <RouteError />,
    children: [
      {
        errorElement: <RouteError />,
        children: [
          { index: true, element: <Home /> },
          { path: "products", lazy: page(() => import("@/routes/Products")) },
          { path: "products/:id", lazy: page(() => import("@/routes/ProductDetail")) },
          { path: "vendors/:slug", lazy: page(() => import("@/routes/Vendor")) },
          { path: "cart", lazy: page(() => import("@/routes/Cart")) },
          { path: "checkout", lazy: page(() => import("@/routes/Checkout")) },
          { path: "orders", lazy: page(() => import("@/routes/Orders")) },
          { path: "orders/:id", lazy: page(() => import("@/routes/OrderDetail")) },
          { path: "sell", lazy: page(() => import("@/routes/Sell")) },
          { path: "login", lazy: page(() => import("@/routes/Login")) },
          { path: "*", lazy: page(() => import("@/routes/NotFound")) },
        ],
      },
    ],
  },
]);

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
