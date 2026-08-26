import { ImageResponse } from "next/og";

export const dynamic = "force-static";

// Referenced directly by app/manifest.ts's icons array — a predictable, explicit URL rather
// than relying on wherever Next's app/icon.tsx convention happens to serve the favicon, since
// the manifest needs exact sizes (192/512) that convention doesn't produce on its own.
// Rendered with generous internal padding so it survives Android's adaptive-icon masking
// (purpose: "maskable" crops to a circle/squircle — content must stay within the safe zone).
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
        <div style={{ display: "flex", fontSize: 96, fontWeight: 700, color: "white", fontFamily: "sans-serif" }}>
          L
        </div>
      </div>
    ),
    { width: 192, height: 192 },
  );
}
