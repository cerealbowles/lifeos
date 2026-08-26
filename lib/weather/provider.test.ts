import { describe, expect, it } from "vitest";
import { parseOneCallResponse } from "./provider";

function fakeOneCallResponse() {
  return {
    current: {
      data: [
        {
          dt: 1_700_000_000,
          temp: 68,
          feels_like: 66,
          humidity: 40,
          wind_speed: 5,
          weather: [{ main: "Clouds" }],
        },
      ],
    },
    hourly: {
      data: [
        { dt: 1_700_000_000, temp: 68, pop: 0.2, weather: [{ main: "Clouds" }] },
        { dt: 1_700_003_600, temp: 70, pop: 0.5, weather: [{ main: "Rain" }] },
      ],
    },
    daily: {
      data: [
        { dt: 1_700_000_000, temp: { min: 60, max: 75 }, pop: 0.3, rain: 2.54, weather: [{ main: "Clouds" }] },
        { dt: 1_700_086_400, temp: { min: 58, max: 72 }, pop: 0.1, weather: [{ main: "Clear" }] },
      ],
    },
  };
}

describe("parseOneCallResponse", () => {
  it("derives current-conditions fields from `current.data[0]` + today's `daily.data[0]`", () => {
    const forecast = parseOneCallResponse(fakeOneCallResponse(), "imperial");
    expect(forecast.current.temperature).toBe(68);
    expect(forecast.current.conditions).toBe("Clouds");
    expect(forecast.current.highToday).toBe(75);
    expect(forecast.current.lowToday).toBe(60);
    expect(forecast.current.precipitationChance).toBe(30);
  });

  it("converts today's rain (mm) to inches for imperial units", () => {
    const forecast = parseOneCallResponse(fakeOneCallResponse(), "imperial");
    expect(forecast.current.precipitationAmount).toBeCloseTo(0.1, 2);
  });

  it("keeps rain in metric units (cm) as-is when units is metric", () => {
    const forecast = parseOneCallResponse(fakeOneCallResponse(), "metric");
    expect(forecast.current.precipitationAmount).toBeCloseTo(0.254, 2);
  });

  it("also accepts rain as a `{ '1h': number }` object, not just a bare number", () => {
    const data = fakeOneCallResponse();
    data.daily.data[0] = { ...data.daily.data[0], rain: { "1h": 2.54 } as unknown as number };
    const forecast = parseOneCallResponse(data, "imperial");
    expect(forecast.current.precipitationAmount).toBeCloseTo(0.1, 2);
  });

  it("passes through every hourly and daily entry", () => {
    const forecast = parseOneCallResponse(fakeOneCallResponse(), "imperial");
    expect(forecast.hourly).toHaveLength(2);
    expect(forecast.hourly[1].conditions).toBe("Rain");
    expect(forecast.hourly[1].precipitationChance).toBe(50);
    expect(forecast.daily).toHaveLength(2);
    expect(forecast.daily[1].conditions).toBe("Clear");
    expect(forecast.daily[1].precipitationAmount).toBe(0);
  });

  it("defaults today's high/low/precip to current conditions when `daily` is empty", () => {
    const data = fakeOneCallResponse();
    data.daily.data = [];
    const forecast = parseOneCallResponse(data, "imperial");
    expect(forecast.current.highToday).toBe(68);
    expect(forecast.current.lowToday).toBe(68);
    expect(forecast.current.precipitationChance).toBe(0);
  });
});
