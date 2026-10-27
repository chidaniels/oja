import { isRouteErrorResponse, Link, useRouteError } from "react-router";

export function RouteError() {
  const error = useRouteError();
  // A deploy can delete the old chunk a tab still points to; a reload fetches the new one.
  const chunkFailed = error instanceof TypeError && /dynamically imported module|Importing a module script/i.test(error.message);

  return (
    <div className="page py-20 text-center">
      <h1 className="text-2xl font-bold">{chunkFailed ? "Ọja was updated" : "Something went wrong"}</h1>
      <p className="mt-2 text-muted">
        {chunkFailed
          ? "Reload to get the latest version. Your cart is saved."
          : isRouteErrorResponse(error)
            ? error.statusText
            : "Please try again. Your cart is saved."}
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <button className="btn-primary" onClick={() => location.reload()}>
          Reload
        </button>
        <Link to="/" className="btn-ghost">
          Go home
        </Link>
      </div>
    </div>
  );
}
