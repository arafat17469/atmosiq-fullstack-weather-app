import { afterEach, describe, expect, it, vi } from "vitest";
import * as openmeteo from "../lib/openmeteo";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("date-range weather", () => {
  it("requests and returns the inclusive last forecast day", async () => {
    const day = (offset: number) => new Date(Date.now() + offset * 86_400_000).toISOString().slice(0, 10);
    const fetchMock = vi.fn(async (url: string) => {
      const count = Number(new URL(url).searchParams.get("forecast_days"));
      return { ok: true, json: async () => ({ daily: {
        time: Array.from({ length: count }, (_, i) => day(i)),
        temperature_2m_min: Array(count).fill(20),
        temperature_2m_max: Array(count).fill(30),
      } }) };
    });
    vi.stubGlobal("fetch", fetchMock);
    const result = await openmeteo.getDateRangeWeather(23.81, 90.41, day(1), day(3));
    expect(result.map((d) => d.date)).toEqual([day(1), day(2), day(3)]);
  });
});

// NOTE: the guard helpers (asNumber, asRecord, asNumberArray, ...) and the
// parse helpers in lib/openmeteo.ts are module-private, so they cannot be unit
// tested directly. Only exported members are covered here. No network calls are
// made by these tests.

describe("OpenMeteoError", () => {
  it("carries a user-safe message and the error name", () => {
    const err = new openmeteo.OpenMeteoError("Could not reach the weather service.");
    expect(err).toBeInstanceOf(Error);
    expect(err.name).toBe("OpenMeteoError");
    expect(err.message).toBe("Could not reach the weather service.");
  });

  it("stores the HTTP status when provided", () => {
    const err = new openmeteo.OpenMeteoError("The weather service returned an error.", 502);
    expect(err.status).toBe(502);
  });

  it("leaves status undefined when not provided", () => {
    const err = new openmeteo.OpenMeteoError("Timed out.");
    expect(err.status).toBeUndefined();
  });
});

describe("openmeteo module surface", () => {
  it("exposes the data-fetching functions without calling the network", () => {
    expect(typeof openmeteo.searchLocations).toBe("function");
    expect(typeof openmeteo.getCurrentWeather).toBe("function");
    expect(typeof openmeteo.getForecast).toBe("function");
    expect(typeof openmeteo.getHourly).toBe("function");
    expect(typeof openmeteo.getDateRangeWeather).toBe("function");
  });

  it("does not export the private guard/transform helpers", () => {
    const keys = Object.keys(openmeteo);
    for (const name of ["asNumber", "asString", "asNumberArray", "asRecord", "valueAt", "parseDaily"]) {
      expect(keys).not.toContain(name);
    }
  });
});
