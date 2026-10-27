// Builds public/data/catalog.json from the DummyJSON product API.
// Run once with `node scripts/build-catalog.mjs`; the output is committed so the app has no runtime dependency on it.
import { mkdir, writeFile } from "node:fs/promises";

const USD_TO_NGN = 1550;

const VENDORS = [
  { id: "v_glow", slug: "lagos-glow-beauty", name: "Lagos Glow Beauty", city: "Lekki, Lagos", state: "Lagos", categories: ["beauty", "skin-care", "fragrances"], accent: "#db2777", since: 2019 },
  { id: "v_gadget", slug: "ikeja-gadget-hub", name: "Ikeja Gadget Hub", city: "Computer Village, Ikeja", state: "Lagos", categories: ["smartphones", "laptops", "tablets", "mobile-accessories"], accent: "#2563eb", since: 2016 },
  { id: "v_aba", slug: "aba-made-fashion", name: "Aba Made Fashion", city: "Aba, Abia", state: "Abia", categories: ["mens-shirts", "mens-shoes", "tops"], accent: "#16a34a", since: 2020 },
  { id: "v_ada", slug: "adas-closet", name: "Ada's Closet", city: "Wuse II, Abuja", state: "FCT", categories: ["womens-dresses", "womens-shoes", "womens-bags", "womens-jewellery"], accent: "#9333ea", since: 2021 },
  { id: "v_time", slug: "time-and-shade", name: "Time & Shade", city: "GRA, Port Harcourt", state: "Rivers", categories: ["mens-watches", "womens-watches", "sunglasses"], accent: "#0f766e", since: 2018 },
  { id: "v_home", slug: "homely-interiors", name: "Homely Interiors", city: "Bodija, Ibadan", state: "Oyo", categories: ["furniture", "home-decoration"], accent: "#b45309", since: 2017 },
  { id: "v_kitchen", slug: "mama-put-kitchenware", name: "Mama Put Kitchenware", city: "Surulere, Lagos", state: "Lagos", categories: ["kitchen-accessories"], accent: "#dc2626", since: 2022 },
  { id: "v_fresh", slug: "naija-fresh-mart", name: "Naija Fresh Mart", city: "Yaba, Lagos", state: "Lagos", categories: ["groceries"], accent: "#65a30d", since: 2023 },
  { id: "v_sport", slug: "sportify-ng", name: "Sportify NG", city: "Victoria Island, Lagos", state: "Lagos", categories: ["sports-accessories"], accent: "#ea580c", since: 2021 },
];

const CATEGORY_LABELS = {
  beauty: "Beauty", "skin-care": "Skin care", fragrances: "Fragrances",
  smartphones: "Phones", laptops: "Laptops", tablets: "Tablets", "mobile-accessories": "Phone accessories",
  "mens-shirts": "Men's shirts", "mens-shoes": "Men's shoes", tops: "Tops",
  "womens-dresses": "Dresses", "womens-shoes": "Women's shoes", "womens-bags": "Bags", "womens-jewellery": "Jewellery",
  "mens-watches": "Men's watches", "womens-watches": "Women's watches", sunglasses: "Sunglasses",
  furniture: "Furniture", "home-decoration": "Home decor", "kitchen-accessories": "Kitchen", groceries: "Groceries",
  "sports-accessories": "Sports",
};

const res = await fetch(
  "https://dummyjson.com/products?limit=0&select=title,description,category,price,discountPercentage,rating,stock,brand,thumbnail,images,reviews,tags",
);
const { products } = await res.json();

const vendorOf = (category) => VENDORS.find((v) => v.categories.includes(category));

const items = products
  .filter((p) => vendorOf(p.category))
  .map((p) => {
    const naira = Math.max(500, Math.round((p.price * USD_TO_NGN) / 100) * 100);
    return {
      id: String(p.id),
      title: p.title,
      description: p.description,
      category: p.category,
      brand: p.brand ?? null,
      price: { amountMinor: naira * 100, currency: "NGN" },
      discountPercent: p.discountPercentage >= 10 ? Math.round(p.discountPercentage) : 0,
      rating: Math.round(p.rating * 10) / 10,
      reviewCount: (p.reviews?.length ?? 0) * 7 + (p.id % 13),
      stock: p.stock,
      thumbnail: p.thumbnail,
      images: p.images.slice(0, 4),
      vendorId: vendorOf(p.category).id,
      tags: p.tags ?? [],
      reviews: (p.reviews ?? []).slice(0, 3).map((r) => ({ name: r.reviewerName, rating: r.rating, comment: r.comment })),
    };
  });

const catalog = {
  generatedAt: new Date().toISOString(),
  categories: Object.entries(CATEGORY_LABELS)
    .filter(([key]) => items.some((i) => i.category === key))
    .map(([key, label]) => ({ key, label })),
  vendors: VENDORS.map(({ categories, ...v }) => ({
    ...v,
    productCount: items.filter((i) => i.vendorId === v.id).length,
    rating: Math.round((items.filter((i) => i.vendorId === v.id).reduce((s, i) => s + i.rating, 0) / Math.max(1, items.filter((i) => i.vendorId === v.id).length)) * 10) / 10,
    categories,
  })),
  products: items,
};

await mkdir(new URL("../public/data/", import.meta.url), { recursive: true });
await writeFile(new URL("../public/data/catalog.json", import.meta.url), JSON.stringify(catalog));
console.log(`${items.length} products, ${VENDORS.length} vendors, ${catalog.categories.length} categories`);
