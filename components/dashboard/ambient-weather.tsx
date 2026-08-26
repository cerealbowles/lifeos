import { ambientMoodFromConditions } from "@/lib/weather/ambient";

const SNOWFLAKE_COUNT = 22;
const RAINDROP_COUNT = 20;

/**
 * A mood-setting backdrop behind the Today greeting — reads the day's weather through color,
 * shape, and (for rain/snow) motion, not a literal animated weather scene. DECISIONS.md's
 * Motion Principles doctrine (ADR-074) rules out "continuous background animation" and
 * "decorative floating objects" as a general rule — clouds mood still honors that and stays
 * fully static (a hazy blurred-cloud wash). Rain and snow are a deliberate, scoped exception
 * to that rule (DECISIONS.md ADR-104): individual falling streaks/flakes on top of a static
 * mood tint, both gated behind Tailwind's `motion-safe:` variant so prefers-reduced-motion
 * users get a static tint instead. Nothing renders at all for clear skies or no weather
 * connection — the same "suppress when there's nothing to say" instinct the rest of the app
 * applies to content, applied here to decoration. The one motion every mood still shares is
 * `animate-settle`, the existing one-shot fade-in already used for calm-state confirmations
 * elsewhere (globals.css) — plays once on mount, never loops.
 */
export function AmbientWeather({ conditions }: { conditions?: string | null }) {
  const mood = ambientMoodFromConditions(conditions);
  if (!mood) return null;

  return (
    <div aria-hidden="true" className="animate-settle pointer-events-none absolute inset-0 overflow-hidden">
      {mood === "clouds" ? <CloudsBackdrop /> : mood === "rain" ? <RainBackdrop /> : <SnowBackdrop />}
    </div>
  );
}

function CloudsBackdrop() {
  return (
    <>
      <div className="absolute -top-10 -left-8 h-40 w-40 rounded-full bg-neutral-300/40 blur-3xl dark:bg-neutral-600/20" />
      <div className="absolute top-2 -right-4 h-28 w-52 rounded-full bg-neutral-300/30 blur-3xl dark:bg-neutral-600/15" />
      <div className="absolute bottom-[-3rem] left-1/3 h-24 w-64 rounded-full bg-neutral-200/40 blur-3xl dark:bg-neutral-700/15" />
    </>
  );
}

/**
 * Two layers: a slow drifting-texture wash for ambient mood (unchanged from before), plus a
 * set of individual falling streaks on top for actually-legible rain motion — the texture
 * alone read as a faint static hatching, not rain. Streaks share the texture's 115deg angle.
 * Deterministic per-drop variation (index-derived, no Math.random()) — plain Server Component.
 */
function RainBackdrop() {
  return (
    <div className="absolute inset-0 dark:opacity-70">
      <div
        className="motion-safe:animate-rain-drift absolute inset-0"
        style={{
          backgroundImage: [
            "repeating-linear-gradient(115deg, rgba(56,132,190,0.14) 0px, rgba(56,132,190,0.14) 1px, transparent 1px, transparent 14px)",
            "linear-gradient(to bottom, rgba(186,230,253,0.35), transparent 70%)",
          ].join(", "),
        }}
      />
      {Array.from({ length: RAINDROP_COUNT }).map((_, i) => {
        const left = (i * 23) % 100;
        const delay = (i * 0.13) % 1.4;
        const duration = 0.6 + (i % 4) * 0.15;
        const height = 14 + (i % 3) * 6;
        return (
          <span
            key={i}
            className="motion-safe:animate-rain-fall absolute top-0 w-px bg-gradient-to-b from-transparent via-sky-400/80 to-transparent dark:via-sky-200/60"
            style={{
              left: `${left}%`,
              height,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
          />
        );
      })}
    </div>
  );
}

/**
 * A modest, fixed set of falling flakes with a gentle sway (not a straight drop) — see
 * @keyframes snow-fall. Deterministically placed (index-derived, no Math.random()) since this
 * stays a plain Server Component with no client-side re-render to keep in sync. Each flake's
 * left offset/delay/duration/size varies just enough to avoid a mechanical "marching in a
 * row" look, without needing real randomness.
 */
function SnowBackdrop() {
  return (
    <div className="absolute inset-0 dark:opacity-80">
      <div className="absolute inset-0 bg-gradient-to-b from-neutral-200/20 to-transparent dark:from-neutral-700/15" />
      {Array.from({ length: SNOWFLAKE_COUNT }).map((_, i) => {
        const left = (i * 31) % 100;
        const delay = (i * 0.35) % 5;
        const duration = 4 + (i % 4);
        const size = 2 + (i % 4);
        const opacity = 0.5 + ((i % 3) * 0.15);
        return (
          <span
            key={i}
            className="motion-safe:animate-snow-fall absolute top-0 rounded-full bg-white dark:bg-white/80"
            style={{
              left: `${left}%`,
              width: size,
              height: size,
              opacity,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
            }}
          />
        );
      })}
    </div>
  );
}
