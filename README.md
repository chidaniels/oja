# Ọja

A multi-vendor marketplace for Nigerian sellers. Shoppers fill one cart from several shops (phones from Computer Village, fashion from Aba, beauty from Lekki) and check out once. Each seller ships separately, with its own delivery fee and arrival estimate. Anyone can open a shop and list an item.

**Role:** sole frontend engineer (design, frontend, mock API)

## Stack

| Area | Choice |
| --- | --- |
| Build | Vite 6 + React 19 + TypeScript (strict) |
| Routing | React Router 7 (data router, every page lazy-loaded except Home) |
| Server state | TanStack Query 5 (infinite lists, prefetch on hover, cache invalidation after orders) |
| Client state | Zustand 5 with `persist` (cart and session in localStorage) |
| Forms | react-hook-form + Zod (checkout, open a shop, list an item) |
| Styling | Tailwind CSS v4 |
| Data | 184 real products from [DummyJSON](https://dummyjson.com), priced in naira and split across 9 sellers |
| Hosting | Vercel (see `vercel.json`) |

## Pages (11)

| Route | What it does |
| --- | --- |
| `/` | Hero, categories, biggest discounts, sellers, top rated |
| `/products` | Search, category and price filters, sort, infinite scroll. Filters live in the URL |
| `/products/:id` | Gallery, stock, quantity, per-seller delivery estimate, reviews, related items |
| `/vendors/:slug` | Seller storefront with category tabs |
| `/cart` | Grouped by seller, progress bar to free delivery for each seller |
| `/checkout` | Address, delivery speed and payment; re-priced by the "server" before payment |
| `/orders` | Order history |
| `/orders/:id` | Tracking timeline, one delivery per seller, bank transfer instructions |
| `/sell` | Open a shop, then list an item with a live preview |
| `/login` | Demo sign-in (no password) |
| `*` | 404 |

## The hard problems

### 1. Fast on a mid-range Android with a weak network

- **Small first load.** Only Home ships in the main bundle; every other page is its own chunk (0.3–3.4 kB gzipped). Libraries are split by how often they change, so they stay cached between deploys. The form libraries (react-hook-form + Zod, 26 kB gzipped) only download on pages that have forms.
- **The catalog isn't bundled.** Product data is a static JSON file fetched once (about 30 kB gzipped). A `<link rel="preload">` in `index.html` starts it downloading alongside the JavaScript instead of after it, and the app reuses that request.
- **Images.** Product images load lazily inside fixed-ratio boxes, so nothing jumps around as they arrive. They fade in, and a broken image shows a placeholder instead of the browser's broken-image icon. The first two cards on a page load eagerly with high priority, because they're what the shopper sees first.
- **Prefetch on intent.** Hovering, touching or focusing a product card starts loading its detail data, so the product page usually opens instantly.
- **Stale chunks after a deploy** are handled: the error screen detects a failed dynamic import and offers a reload instead of a blank page.

Production build (gzipped): Home loads about **125 kB of JS** (React and React Router 102 kB, TanStack Query and Zustand 13 kB, app 10 kB) plus 6 kB of CSS.

### 2. A cart that's saved offline but can't buy at an old price

The cart is persisted, so it survives refreshes, closed tabs and dropped connections, and an offline banner tells the shopper it's safe. Because a saved cart can be days old, checkout never trusts it: `quote()` re-prices every line from the catalog and reports `price_changed`, `low_stock`, `out_of_stock` and `removed`. Payment stays disabled until the shopper taps **Update my cart**. On submit, the order API re-quotes again and rejects the order if the total differs from the one on the button.

### 3. One checkout, many sellers

Lines are grouped by seller into shipments. Each shipment's fee depends on the seller's state versus the delivery state (₦1,500 same state, ₦3,500 interstate, +₦2,500 express), with free standard delivery from ₦100,000 per seller. The cart shows how far each seller is from free delivery.

### 4. No double orders

Each checkout attempt has one idempotency key, held in a `useRef`. Repeated taps, or a retry after a network error, return the same order. In testing, three rapid taps created exactly one order.

## Run locally

```bash
npm install
npm run dev
```

To rebuild the product catalog from DummyJSON:

```bash
node scripts/build-catalog.mjs
```

## Deploy to Vercel

Import the repo on vercel.com. It detects Vite, so the build command is `npm run build` and the output folder is `dist`. `vercel.json` sends every route to `index.html` and sets long-term caching on hashed assets.

## Limitations (on purpose, for a demo)

There's no real backend. Orders, shops and listings are saved in this browser's localStorage behind an async API layer (`src/api`) with simulated latency and typed errors. Components only talk to TanStack Query, so replacing `src/api` with real `fetch` calls wouldn't change any page.
