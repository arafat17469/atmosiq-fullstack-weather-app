import { describe, expect, it } from "vitest";
import { getRecommendations } from "../lib/recommendations";

describe("getRecommendations", () => {
  it("returns an empty array for empty input", () => {
    expect(getRecommendations({})).toEqual([]);
  });

  it("returns an empty array when nothing meets a threshold", () => {
    expect(
      getRecommendations({
        tempMax: 20,
        tempMin: 10,
        precipProbMax: 10,
        windSpeedMax: 10,
        uvIndexMax: 3,
      }),
    ).toEqual([]);
  });

  it("suggests an umbrella when precipitation probability is >= 60", () => {
    const recs = getRecommendations({ precipProbMax: 75 });
    expect(recs.map((r) => r.id)).toContain("carry-umbrella");
    const umbrella = recs.find((r) => r.id === "carry-umbrella");
    expect(umbrella?.triggeredBy).toContain("75");
  });

  it("warns about sun protection when UV index is >= 6", () => {
    const recs = getRecommendations({ uvIndexMax: 8 });
    expect(recs.map((r) => r.id)).toContain("sun-protection");
    const sun = recs.find((r) => r.id === "sun-protection");
    expect(sun?.severity).toBe("warning");
    expect(sun?.triggeredBy).toContain("8");
  });

  it("warns about wind when wind speed is >= 40 km/h", () => {
    const recs = getRecommendations({ windSpeedMax: 55 });
    expect(recs.map((r) => r.id)).toContain("wind-caution");
    const wind = recs.find((r) => r.id === "wind-caution");
    expect(wind?.triggeredBy).toContain("55");
  });

  it("warns about heat when the max temperature is >= 35 C", () => {
    const recs = getRecommendations({ tempMax: 39 });
    expect(recs.map((r) => r.id)).toContain("heat-hydration");
    const heat = recs.find((r) => r.id === "heat-hydration");
    expect(heat?.triggeredBy).toContain("39");
  });

  it("warns about cold when the min temperature is <= 0 C", () => {
    const recs = getRecommendations({ tempMin: -3 });
    expect(recs.map((r) => r.id)).toContain("cold-precaution");
    const cold = recs.find((r) => r.id === "cold-precaution");
    expect(cold?.triggeredBy).toContain("-3");
  });

  it("fires only the rules whose thresholds are met", () => {
    const recs = getRecommendations({ precipProbMax: 80, tempMax: 20 });
    expect(recs.map((r) => r.id)).toEqual(["carry-umbrella"]);
  });

  it("treats exact boundary values as triggered", () => {
    expect(getRecommendations({ precipProbMax: 60 }).map((r) => r.id)).toContain("carry-umbrella");
    expect(getRecommendations({ tempMax: 35 }).map((r) => r.id)).toContain("heat-hydration");
    expect(getRecommendations({ tempMin: 0 }).map((r) => r.id)).toContain("cold-precaution");
    expect(getRecommendations({ uvIndexMax: 6 }).map((r) => r.id)).toContain("sun-protection");
    expect(getRecommendations({ windSpeedMax: 40 }).map((r) => r.id)).toContain("wind-caution");
  });
});
