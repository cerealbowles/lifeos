import "server-only";

export class WeatherProviderError extends Error {}
export class InvalidApiKeyError extends WeatherProviderError {
  constructor() {
    super("Weather provider rejected the API key — make sure One Call is enabled on your OpenWeatherMap account (Billing Plans → One Call by Call).");
  }
}
export class LocationNotFoundError extends WeatherProviderError {
  constructor(postalCode: string) {
    super(`Could not find a location for postal code "${postalCode}".`);
  }
}

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  name: string;
};

export type CurrentWeather = {
  temperature: number;
  feelsLike: number;
  conditions: string;
  humidity: number;
  windSpeed: number;
  highToday: number;
  lowToday: number;
  /** 0-100 */
  precipitationChance: number;
  /** inches (or cm for metric) — see IN_PER_MM below */
  precipitationAmount: number;
  observedAt: Date;
};

export type HourlyForecast = {
  time: Date;
  temperature: number;
  conditions: string;
  /** 0-100 */
  precipitationChance: number;
};

export type DailyForecast = {
  date: Date;
  high: number;
  low: number;
  conditions: string;
  /** 0-100 */
  precipitationChance: number;
  precipitationAmount: number;
};

export type Forecast = {
  current: CurrentWeather;
  hourly: HourlyForecast[];
  daily: DailyForecast[];
  raw: unknown;
};

export type Units = "imperial" | "metric";

export interface WeatherProvider {
  geocode(postalCode: string, countryCode: string): Promise<GeocodeResult>;
  getForecast(latitude: number, longitude: number, units: Units): Promise<Forecast>;
}

const BASE_URL = "https://api.openweathermap.org";

// One Call API 4.0 (announced mid-2026, https://openweathermap.org/api/one-call-4) — three
// separate endpoints under the "One Call by Call" subscription, replacing the old single
// `/data/3.0/onecall` request. Field shapes below are best-effort from OpenWeatherMap's docs,
// not yet confirmed against a live response — `rain` in particular is documented
// inconsistently (sometimes a bare mm number, sometimes `{ "1h": number }` depending on
// endpoint), so parsing below tolerates both. Flagged for a real fix once tested against an
// actual subscribed account — see ROADMAP.md.
type WeatherCondition = { main: string };
type RainField = number | { "1h"?: number } | undefined;

type OneCallEnvelope<T> = { data: T[] };

type CurrentEntry = {
  dt: number;
  temp: number;
  feels_like: number;
  humidity: number;
  wind_speed: number;
  weather: WeatherCondition[];
  rain?: RainField;
};

type HourlyEntry = {
  dt: number;
  temp: number;
  pop: number;
  weather: WeatherCondition[];
  rain?: RainField;
};

type DailyEntry = {
  dt: number;
  temp: { min: number; max: number };
  pop: number;
  weather: WeatherCondition[];
  rain?: RainField;
};

const IN_PER_MM = 1 / 25.4;

function rainMm(rain: RainField): number {
  if (rain === undefined) return 0;
  if (typeof rain === "number") return rain;
  return rain["1h"] ?? 0;
}

function toPrecipAmount(rain: RainField, units: Units): number {
  return rainMm(rain) * (units === "imperial" ? IN_PER_MM : 0.1);
}

/** Exported for tests — pure transform from OpenWeatherMap's One Call 4.0 shape to LifeOS's. */
export function parseOneCallResponse(
  data: { current: OneCallEnvelope<CurrentEntry>; hourly: OneCallEnvelope<HourlyEntry>; daily: OneCallEnvelope<DailyEntry> },
  units: Units,
): Forecast {
  const currentEntry = data.current.data[0];
  const today = data.daily.data[0];

  const current: CurrentWeather = {
    temperature: currentEntry.temp,
    feelsLike: currentEntry.feels_like,
    conditions: currentEntry.weather[0]?.main ?? "Unknown",
    humidity: currentEntry.humidity,
    windSpeed: currentEntry.wind_speed,
    highToday: today?.temp.max ?? currentEntry.temp,
    lowToday: today?.temp.min ?? currentEntry.temp,
    precipitationChance: Math.round((today?.pop ?? 0) * 100),
    precipitationAmount: today ? toPrecipAmount(today.rain, units) : 0,
    observedAt: new Date(currentEntry.dt * 1000),
  };

  const hourly: HourlyForecast[] = data.hourly.data.map((h) => ({
    time: new Date(h.dt * 1000),
    temperature: h.temp,
    conditions: h.weather[0]?.main ?? "Unknown",
    precipitationChance: Math.round(h.pop * 100),
  }));

  const daily: DailyForecast[] = data.daily.data.map((d) => ({
    date: new Date(d.dt * 1000),
    high: d.temp.max,
    low: d.temp.min,
    conditions: d.weather[0]?.main ?? "Unknown",
    precipitationChance: Math.round(d.pop * 100),
    precipitationAmount: toPrecipAmount(d.rain, units),
  }));

  return { current, hourly, daily, raw: data };
}

export class OpenWeatherMapProvider implements WeatherProvider {
  constructor(private readonly apiKey: string) {}

  async geocode(postalCode: string, countryCode = "US"): Promise<GeocodeResult> {
    const url = new URL("/geo/1.0/zip", BASE_URL);
    url.searchParams.set("zip", `${postalCode},${countryCode}`);
    url.searchParams.set("appid", this.apiKey);

    const res = await fetch(url);
    if (res.status === 401) throw new InvalidApiKeyError();
    if (res.status === 404) throw new LocationNotFoundError(postalCode);
    if (!res.ok) throw new WeatherProviderError(`Geocoding failed with status ${res.status}`);

    const data = (await res.json()) as { lat: number; lon: number; name: string };
    return { latitude: data.lat, longitude: data.lon, name: data.name };
  }

  /**
   * Three One Call 4.0 endpoints in parallel: current conditions, hourly timeline (up to 20
   * records), daily timeline (up to 10 records — comfortably covers a 7-day outlook). More
   * requests than the old single-call 3.0 approach, but still far under the 1,000/day free
   * cap at this app's refresh cadence (one location, refreshed every 30 min by the
   * background worker ≈ 144 calls/day).
   */
  async getForecast(latitude: number, longitude: number, units: Units): Promise<Forecast> {
    const [current, hourly, daily] = await Promise.all([
      this.fetchTimeline<CurrentEntry>("/data/4.0/onecall/current", latitude, longitude, units),
      this.fetchTimeline<HourlyEntry>("/data/4.0/onecall/timeline/1h", latitude, longitude, units),
      this.fetchTimeline<DailyEntry>("/data/4.0/onecall/timeline/1day", latitude, longitude, units),
    ]);

    return parseOneCallResponse({ current, hourly, daily }, units);
  }

  private async fetchTimeline<T>(
    path: string,
    latitude: number,
    longitude: number,
    units: Units,
  ): Promise<OneCallEnvelope<T>> {
    const url = new URL(path, BASE_URL);
    url.searchParams.set("lat", String(latitude));
    url.searchParams.set("lon", String(longitude));
    url.searchParams.set("units", units);
    url.searchParams.set("appid", this.apiKey);

    const res = await fetch(url);
    if (res.status === 401) throw new InvalidApiKeyError();
    if (!res.ok) throw new WeatherProviderError(`Weather request failed with status ${res.status} (${path})`);

    return (await res.json()) as OneCallEnvelope<T>;
  }
}
