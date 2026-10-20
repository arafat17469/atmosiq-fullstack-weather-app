import { describe, expect, it } from "vitest";
import { celsiusToFahrenheit, fahrenheitToCelsius, weatherCodeInfo, windDirection } from "../lib/units";

describe("celsiusToFahrenheit / fahrenheitToCelsius", () => {
  it("converts known reference points", () => {
    expect(celsiusToFahrenheit(0)).toBe(32);
    expect(celsiusToFahrenheit(100)).toBe(212);
    expect(fahrenheitToCelsius(32)).toBe(0);
    expect(fahrenheitToCelsius(212)).toBe(100);
    // -40 is the same in both scales.
    expect(celsiusToFahrenheit(-40)).toBe(-40);
    expect(fahrenheitToCelsius(-40)).toBe(-40);
  });

  it("round-trips through both directions", () => {
    for (const c of [-30, -12.5, 0, 21.7, 37, 100]) {
      expect(fahrenheitToCelsius(celsiusToFahrenheit(c))).toBeCloseTo(c, 10);
    }
    for (const f of [-40, 0, 32, 72, 98.6, 212]) {
      expect(celsiusToFahrenheit(fahrenheitToCelsius(f))).toBeCloseTo(f, 10);
    }
  });
});

describe("windDirection", () => {
  it("maps the four cardinal points", () => {
    expect(windDirection(0)).toBe("N");
    expect(windDirection(90)).toBe("E");
    expect(windDirection(180)).toBe("S");
    expect(windDirection(270)).toBe("W");
  });

  it("maps intercardinal points", () => {
    expect(windDirection(45)).toBe("NE");
    expect(windDirection(135)).toBe("SE");
    expect(windDirection(225)).toBe("SW");
    expect(windDirection(315)).toBe("NW");
  });

  it("normalizes out-of-range and negative degrees", () => {
    expect(windDirection(360)).toBe("N");
    expect(windDirection(720)).toBe("N");
    expect(windDirection(-90)).toBe("W");
  });
});

describe("weatherCodeInfo", () => {
  it("labels code 0 as Clear", () => {
    expect(weatherCodeInfo(0).label).toMatch(/clear/i);
  });

  it("labels code 95 as Thunderstorm", () => {
    expect(weatherCodeInfo(95).label).toMatch(/thunderstorm/i);
  });

  it("falls back to Unknown for unrecognized codes", () => {
    expect(weatherCodeInfo(999).label).toBe("Unknown");
    expect(weatherCodeInfo(null).label).toBe("Unknown");
    expect(weatherCodeInfo(undefined).label).toBe("Unknown");
  });
});
