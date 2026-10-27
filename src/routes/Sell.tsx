import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";
import { useNavigate } from "react-router";
import { z } from "zod";
import { catalog } from "@/api/client";
import { createListing, openShop } from "@/api/listings";
import { q } from "@/api/queries";
import { useTitle } from "@/components/hooks";
import { RequireAuth } from "@/components/RequireAuth";
import { Img, Spinner } from "@/components/ui";
import { NIGERIAN_STATES } from "@/lib/delivery";
import { formatNaira, naira } from "@/lib/money";
import { useAuth } from "@/stores/auth";

export default function SellPage() {
  return (
    <RequireAuth>
      <Sell />
    </RequireAuth>
  );
}

function Sell() {
  useTitle("Sell on Ọja");
  const shop = useAuth((s) => s.user!.shop);
  return (
    <div className="page max-w-3xl py-6">
      <h1 className="text-2xl font-bold">{shop ? `List an item in ${shop.name}` : "Open your shop"}</h1>
      <p className="mt-1 text-sm text-muted">
        {shop ? "Your listing goes live straight away." : "It's free. Set up your shop, then list your first item."}
      </p>
      {shop ? <ListingForm vendorId={shop.id} /> : <ShopForm />}
    </div>
  );
}

const shopSchema = z.object({
  name: z.string().trim().min(3, "At least 3 characters").max(40, "Keep it under 40 characters"),
  state: z.enum(NIGERIAN_STATES, { errorMap: () => ({ message: "Choose a state" }) }),
  city: z.string().trim().min(2, "Enter your city or area"),
});

function ShopForm() {
  const setShop = useAuth((s) => s.setShop);
  const qc = useQueryClient();
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<z.infer<typeof shopSchema>>({ resolver: zodResolver(shopSchema), defaultValues: { state: "Lagos" } });
  const open = useMutation({
    mutationFn: openShop,
    onSuccess: (v) => {
      setShop({ id: v.id, slug: v.slug, name: v.name });
      qc.invalidateQueries({ queryKey: ["meta"] });
      qc.invalidateQueries({ queryKey: ["home"] });
    },
    // Server-side validation lands on the field it belongs to, not in a generic banner.
    onError: (e) => setError("name", { message: e.message }),
  });

  return (
    <form onSubmit={handleSubmit((v) => open.mutate(v))} noValidate className="card mt-6 space-y-4 p-5">
      <label className="block">
        <span className="label">Shop name</span>
        <input className="input" placeholder="e.g. Tolu's Thrift" aria-invalid={!!errors.name} {...register("name")} />
        {errors.name && <span className="field-error block">{errors.name.message}</span>}
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="label">State</span>
          <select className="input" {...register("state")}>
            {NIGERIAN_STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label">City / area</span>
          <input className="input" aria-invalid={!!errors.city} {...register("city")} />
          {errors.city && <span className="field-error block">{errors.city.message}</span>}
        </label>
      </div>
      <p className="text-xs text-muted">Your state sets delivery fees: buyers in the same state pay less.</p>
      <button className="btn-primary w-full py-3" disabled={open.isPending}>
        {open.isPending ? <Spinner /> : "Open my shop"}
      </button>
    </form>
  );
}

const listingSchema = z.object({
  title: z.string().trim().min(5, "Describe the item in at least 5 characters").max(80),
  category: z.string().min(1, "Choose a category"),
  priceNaira: z.coerce.number({ invalid_type_error: "Enter a price" }).int("Whole naira only").min(100, "Minimum ₦100").max(50_000_000, "That's above our limit"),
  stock: z.coerce.number({ invalid_type_error: "Enter a quantity" }).int().min(1, "At least 1").max(999),
  condition: z.enum(["new", "used"]),
  description: z.string().trim().min(20, "Buyers need at least 20 characters of detail").max(1000),
  imageUrl: z.string().trim().url("Paste a full image link starting with https://").startsWith("https://", "Use an https:// link"),
});
type ListingIn = z.input<typeof listingSchema>;
type ListingOut = z.output<typeof listingSchema>;

function ListingForm({ vendorId }: { vendorId: string }) {
  const meta = useQuery(q.meta());
  const qc = useQueryClient();
  const navigate = useNavigate();
  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<ListingIn, unknown, ListingOut>({
    resolver: zodResolver(listingSchema),
    defaultValues: { condition: "new", stock: 1, category: "" },
  });
  const [imageUrl, price, title] = useWatch({ control, name: ["imageUrl", "priceNaira", "title"] });
  const priceNum = Number(price);

  const create = useMutation({
    mutationFn: (v: ListingOut) => createListing(vendorId, v),
    onSuccess: (p) => {
      for (const key of ["home", "products", "meta", "vendor"]) qc.invalidateQueries({ queryKey: [key] });
      navigate(`/products/${p.id}`);
    },
  });

  const sampleImage = async () => {
    const c = await catalog();
    const cat = getValues("category");
    const pool = c.products.filter((p) => !cat || p.category === cat);
    setValue("imageUrl", pool[Math.floor(Math.random() * pool.length)].thumbnail, { shouldValidate: true });
  };

  return (
    <form onSubmit={handleSubmit((v) => create.mutate(v))} noValidate className="mt-6 grid gap-6 md:grid-cols-[1fr_16rem]">
      <fieldset disabled={create.isPending} className="card space-y-4 p-5">
        <label className="block">
          <span className="label">Title</span>
          <input className="input" placeholder="e.g. Ankara wrap dress, size 12" aria-invalid={!!errors.title} {...register("title")} />
          {errors.title && <span className="field-error block">{errors.title.message}</span>}
        </label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">Category</span>
            <select className="input" aria-invalid={!!errors.category} {...register("category")}>
              <option value="">Choose…</option>
              {meta.data?.categories.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
            {errors.category && <span className="field-error block">{errors.category.message}</span>}
          </label>
          <fieldset>
            <legend className="label">Condition</legend>
            <div className="flex gap-2">
              {(["new", "used"] as const).map((c) => (
                <label key={c} className="flex flex-1 cursor-pointer items-center gap-2 rounded-xl border border-line px-3 py-2.5 text-sm capitalize has-[:checked]:border-leaf-600 has-[:checked]:bg-leaf-50">
                  <input type="radio" value={c} className="accent-leaf-700" {...register("condition")} />
                  {c}
                </label>
              ))}
            </div>
          </fieldset>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="label">Price (₦)</span>
            <input className="input" type="number" inputMode="numeric" min={100} aria-invalid={!!errors.priceNaira} {...register("priceNaira")} />
            {errors.priceNaira && <span className="field-error block">{errors.priceNaira.message}</span>}
          </label>
          <label className="block">
            <span className="label">Quantity available</span>
            <input className="input" type="number" inputMode="numeric" min={1} aria-invalid={!!errors.stock} {...register("stock")} />
            {errors.stock && <span className="field-error block">{errors.stock.message}</span>}
          </label>
        </div>
        <label className="block">
          <span className="label">Description</span>
          <textarea rows={4} className="input" placeholder="Size, colour, what's included, any defects…" aria-invalid={!!errors.description} {...register("description")} />
          {errors.description && <span className="field-error block">{errors.description.message}</span>}
        </label>
        <label className="block">
          <span className="label">Image link</span>
          <input className="input" type="url" placeholder="https://…" aria-invalid={!!errors.imageUrl} {...register("imageUrl")} />
          {errors.imageUrl && <span className="field-error block">{errors.imageUrl.message}</span>}
          <button type="button" onClick={sampleImage} className="mt-1.5 text-xs font-semibold text-leaf-700 underline">
            No photo handy? Use a sample image
          </button>
        </label>
        {create.error && <p className="rounded-xl bg-red-50 p-3 text-sm text-danger">{create.error.message}</p>}
        <button className="btn-primary w-full py-3" disabled={create.isPending}>
          {create.isPending ? <Spinner /> : "Publish listing"}
        </button>
      </fieldset>

      <aside className="h-fit md:sticky md:top-24">
        <p className="label">Preview</p>
        <div className="card overflow-hidden">
          {imageUrl?.startsWith("https://") ? (
            <Img key={imageUrl} src={imageUrl} alt="" className="aspect-square" />
          ) : (
            <div className="grid aspect-square place-items-center bg-canvas text-xs text-muted">Image preview</div>
          )}
          <div className="p-3">
            <p className="line-clamp-2 text-sm font-medium">{title || "Your item title"}</p>
            <p className="mt-1 font-bold">{Number.isFinite(priceNum) && priceNum > 0 ? formatNaira(naira(priceNum)) : "₦—"}</p>
          </div>
        </div>
      </aside>
    </form>
  );
}
