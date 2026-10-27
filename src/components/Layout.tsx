import { useState } from "react";
import { Form, Link, NavLink, Outlet, ScrollRestoration, useLocation, useNavigation, useSearchParams } from "react-router";
import { useAuth } from "@/stores/auth";
import { cartCount, useCart } from "@/stores/cart";
import { useOnline } from "./hooks";

export function Layout() {
  const online = useOnline();
  const navigation = useNavigation();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Thin progress bar while a lazy route chunk is loading. */}
      {navigation.state === "loading" && (
        <div className="fixed inset-x-0 top-0 z-50 h-0.5 animate-pulse bg-sun" role="progressbar" aria-label="Loading page" />
      )}
      {!online && (
        <div className="bg-ink px-4 py-2 text-center text-xs text-white" role="status">
          You&apos;re offline. You can still browse what&apos;s loaded and edit your cart.
        </div>
      )}
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="mt-16 border-t border-line bg-white">
        <div className="page grid gap-6 py-10 text-sm text-muted sm:grid-cols-3">
          <div>
            <p className="text-base font-bold text-ink">Ọja</p>
            <p className="mt-1">The market, online. Buy from independent Nigerian sellers.</p>
          </div>
          <div className="space-y-1">
            <Link to="/products" className="block hover:text-ink">
              All products
            </Link>
            <Link to="/sell" className="block hover:text-ink">
              Sell on Ọja
            </Link>
            <Link to="/orders" className="block hover:text-ink">
              Track an order
            </Link>
          </div>
          <p>
            Portfolio project by Elizabeth Daniel. Product data and images from DummyJSON. No real payments are taken.
          </p>
        </div>
      </footer>
      <ScrollRestoration />
    </div>
  );
}

function Header() {
  const count = useCart(cartCount);
  const user = useAuth((s) => s.user);
  const signOut = useAuth((s) => s.signOut);
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  const [menu, setMenu] = useState(false);

  const search = (
    <Form action="/products" role="search" className="flex flex-1">
      <label htmlFor={`q-${pathname}`} className="sr-only">
        Search products
      </label>
      <input
        key={params.get("q") ?? ""}
        id={`q-${pathname}`}
        name="q"
        type="search"
        defaultValue={params.get("q") ?? ""}
        placeholder="Search phones, shoes, perfume…"
        className="input rounded-r-none border-r-0"
      />
      <button className="btn-sun rounded-l-none px-4" aria-label="Search">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden>
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      </button>
    </Form>
  );

  return (
    <header className="sticky top-0 z-30 bg-leaf-900 text-white">
      <div className="page flex h-16 items-center gap-4">
        <Link to="/" className="flex shrink-0 items-center gap-2 text-xl font-extrabold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-sun text-leaf-900">Ọ</span>
          <span>Ọja</span>
        </Link>
        <div className="hidden flex-1 text-ink md:flex">{search}</div>
        <nav className="ml-auto flex items-center gap-1 text-sm font-medium">
          <NavLink to="/sell" className="hidden rounded-lg px-3 py-2 hover:bg-white/10 sm:block">
            Sell
          </NavLink>
          <div className="relative">
            <button className="rounded-lg px-3 py-2 hover:bg-white/10" onClick={() => setMenu((m) => !m)} aria-expanded={menu}>
              {user ? `Hi, ${user.name.split(" ")[0]}` : "Account"}
            </button>
            {menu && (
              <div className="card absolute right-0 mt-2 w-52 p-2 text-ink shadow-lg" onClick={() => setMenu(false)}>
                {user ? (
                  <>
                    <Link to="/orders" className="block rounded-lg px-3 py-2 hover:bg-leaf-50">
                      My orders
                    </Link>
                    {user.shop && (
                      <Link to={`/vendors/${user.shop.slug}`} className="block rounded-lg px-3 py-2 hover:bg-leaf-50">
                        My shop
                      </Link>
                    )}
                    <Link to="/sell" className="block rounded-lg px-3 py-2 hover:bg-leaf-50 sm:hidden">
                      Sell an item
                    </Link>
                    <button onClick={signOut} className="block w-full rounded-lg px-3 py-2 text-left hover:bg-leaf-50">
                      Sign out
                    </button>
                  </>
                ) : (
                  <>
                    <Link to={`/login?next=${encodeURIComponent(pathname)}`} className="block rounded-lg px-3 py-2 hover:bg-leaf-50">
                      Sign in
                    </Link>
                    <Link to="/sell" className="block rounded-lg px-3 py-2 hover:bg-leaf-50">
                      Sell on Ọja
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
          <NavLink to="/cart" className="relative flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-white/10" aria-label={`Cart, ${count} items`}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6" />
              <circle cx="10" cy="20" r="1.3" />
              <circle cx="18" cy="20" r="1.3" />
            </svg>
            <span className="hidden sm:inline">Cart</span>
            {count > 0 && (
              <span className="absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-sun px-1 text-[11px] font-bold text-ink sm:static">
                {count}
              </span>
            )}
          </NavLink>
        </nav>
      </div>
      <div className="page pb-3 text-ink md:hidden">{search}</div>
    </header>
  );
}
