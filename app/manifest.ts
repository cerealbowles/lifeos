import type { MetadataRoute } from "next";

// Next.js serves this automatically at /manifest.webmanifest and injects the
// <link rel="manifest"> tag — no manual wiring needed in layout.tsx.
export default function manifest(): MetadataRoute.Manifest {
  return {
    // Lets the browser recognize re-installs/updates as the *same* app across deploys
    // instead of risking a duplicate home-screen entry if start_url ever changes —
    // recommended by the manifest spec, cheap to set now while there's only ever been one.
    id: "/",
    name: "LifeOS",
    short_name: "LifeOS",
    description: "Your personal life operating system.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    categories: ["productivity", "lifestyle", "utilities"],
    icons: [
      { src: "/pwa-icon-192", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa-icon-192", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/pwa-icon-512", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa-icon-512", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    // DECISIONS.md ADR-089 — long-press/right-click the home-screen icon for direct jumps.
    // Deliberately only real navigable URLs, not client-side-only affordances like the
    // command palette (nothing to deep-link a shortcut into). "Start stretching" reuses
    // app/activity/start/page.tsx, which already resumes-or-starts and redirects on its
    // own — a shortcut straight to it is a legitimate, useful standalone entry point.
    shortcuts: [
      { name: "Today", url: "/", description: "Open the Today dashboard" },
      { name: "Start stretching", url: "/activity/start", description: "Start or resume a stretch session" },
      { name: "Ask LifeOS", url: "/ask", description: "Ask a question or give an instruction" },
    ],
  };
}
