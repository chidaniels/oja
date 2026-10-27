import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { useNavigate, useSearchParams } from "react-router";
import { z } from "zod";
import { useTitle } from "@/components/hooks";
import { useAuth } from "@/stores/auth";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your name"),
  email: z.string().trim().toLowerCase().email("Enter a valid email"),
});
type Form = z.infer<typeof schema>;

/** Only same-site paths, so ?next= can't send people to another domain. */
const safeNext = (n: string | null) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/");

export default function Login() {
  useTitle("Sign in");
  const signIn = useAuth((s) => s.signIn);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = (v: Form) => {
    signIn(v);
    navigate(safeNext(params.get("next")), { replace: true });
  };

  return (
    <div className="page flex justify-center py-12">
      <form onSubmit={handleSubmit(onSubmit)} noValidate className="card w-full max-w-sm space-y-4 p-6">
        <div>
          <h1 className="text-2xl font-bold">Sign in</h1>
          <p className="mt-1 text-sm text-muted">This is a demo, so there&apos;s no password. Your orders are saved to this browser.</p>
        </div>
        <label className="block">
          <span className="label">Name</span>
          <input className="input" autoComplete="name" aria-invalid={!!errors.name} {...register("name")} />
          {errors.name && <span className="field-error block">{errors.name.message}</span>}
        </label>
        <label className="block">
          <span className="label">Email</span>
          <input className="input" type="email" inputMode="email" autoComplete="email" aria-invalid={!!errors.email} {...register("email")} />
          {errors.email && <span className="field-error block">{errors.email.message}</span>}
        </label>
        <button className="btn-primary w-full py-3">Continue</button>
        <button
          type="button"
          className="btn-ghost w-full"
          onClick={() => {
            setValue("name", "Tolu Demo", { shouldValidate: true });
            setValue("email", "tolu@oja.demo", { shouldValidate: true });
          }}
        >
          Use a demo account
        </button>
      </form>
    </div>
  );
}
