import { ImageResponse } from "next/og";

export const dynamic = "force-static";

// See app/pwa-icon-192/route.tsx for why this is a plain route rather than the app/icon.tsx
// convention.
export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#5b8fd6", // DECISIONS.md ADR-090 — matches app/icon.tsx's softened accent.
        }}
      >
        <div style={{ display: "flex", fontSize: 256, fontWeight: 700, color: "white", fontFamily: "sans-serif" }}>
          L
        </div>
      </div>
    ),
    { width: 512, height: 512 },
  );
}
