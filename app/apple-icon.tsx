import { ImageResponse } from "next/og";

// iOS "Add to Home Screen" icon — no rounding (iOS applies its own mask), no transparency
// (iOS renders transparent pixels as black), generous internal padding is unnecessary since
// iOS doesn't crop as aggressively as Android's adaptive-icon masking. Color matches
// app/icon.tsx's softened accent (DECISIONS.md ADR-090), not the old vivid #2563eb.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
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
          color: "white",
          fontSize: 96,
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
