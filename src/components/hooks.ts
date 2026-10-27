import { useEffect, useSyncExternalStore } from "react";

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}

export function useOnline() {
  return useSyncExternalStore(subscribeOnline, () => navigator.onLine);
}

export function useTitle(title: string | undefined) {
  useEffect(() => {
    if (title) document.title = `${title} · Ọja`;
  }, [title]);
}
