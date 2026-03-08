import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import App from "./App.tsx";
import "./index.css";

// Force immediate activation of new service worker versions
registerSW({
  immediate: true,
  onNeedRefresh() {
    // Auto-reload when a new version is available
    window.location.reload();
  },
  onOfflineReady() {
    console.log("App ready for offline use");
  },
});

createRoot(document.getElementById("root")!).render(<App />);
