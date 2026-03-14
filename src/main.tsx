import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

const CACHE_RESET_FLAG = "__dpanpro_cache_reset_done__";

const resetBrowserCache = async () => {
  try {
    let hadServiceWorkers = false;

    if ("serviceWorker" in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      hadServiceWorkers = registrations.length > 0;
      await Promise.all(registrations.map((registration) => registration.unregister()));
    }

    if ("caches" in window) {
      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((key) => caches.delete(key)));
    }

    if (hadServiceWorkers && !sessionStorage.getItem(CACHE_RESET_FLAG)) {
      sessionStorage.setItem(CACHE_RESET_FLAG, "1");
      window.location.reload();
      return;
    }

    sessionStorage.removeItem(CACHE_RESET_FLAG);
  } catch (error) {
    console.warn("Cache reset skipped:", error);
  }
};

void resetBrowserCache();

createRoot(document.getElementById("root")!).render(<App />);

