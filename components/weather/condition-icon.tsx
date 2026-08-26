import { Sun, Cloud, CloudRain, CloudSnow, CloudLightning, CloudFog, type LucideIcon } from "lucide-react";

/**
 * Shared by the Today weather card and the full /weather page — one icon mapping for
 * OpenWeatherMap's `weather[0].main` categories, not duplicated per consumer. Exported as
 * the plain map (`CONDITION_ICON[x] ?? Cloud`), not wrapped in a lookup function — the
 * react-compiler eslint rule flags a function call whose result is used as a JSX tag
 * ("components created during render"), but not this same lookup done as a plain object
 * index expression (see components/command-palette/command-palette.tsx's identical pattern
 * for a ternary-chosen icon).
 */
export const CONDITION_ICON: Record<string, LucideIcon> = {
  Clear: Sun,
  Clouds: Cloud,
  Rain: CloudRain,
  Drizzle: CloudRain,
  Thunderstorm: CloudLightning,
  Snow: CloudSnow,
  Mist: CloudFog,
  Fog: CloudFog,
  Haze: CloudFog,
};
