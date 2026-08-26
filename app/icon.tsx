import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// DECISIONS.md ADR-090 — the same desaturated accent color as the in-app logo/pulse dot
// (app/globals.css's --accent), not the old vivid #2563eb. Kept as a filled square here
// (unlike the in-app logo, which went fully monochrome/outline) — a favicon/app-grid tile
// needs a solid fill to stay legible at 16-32px, a different constraint than in-app chrome.
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#5b8fd6",
          borderRadius: "6px",
          color: "white",
          fontSize: 20,
          fontWeight: 700,
          fontFamily: "sans-serif",
        }}
      >
        L
      </div>
    ),
    { ...size },
  );
}
