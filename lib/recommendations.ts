// Rule-based travel and weather recommendations.
//
// These are deterministic threshold rules applied to observed weather values.
// They are NOT machine learning predictions, and they must never be presented
// as predictions or AI-generated insights. Each rule fires only when its
// threshold is met, and `triggeredBy` always names the exact value that fired it.

export interface Recommendation {
  id: string;
  title: string;
  detail: string;
  triggeredBy: string;
  severity: "info" | "warning";
}

export interface RecommendationInput {
  tempMax?: number | null; // °C
  tempMin?: number | null; // °C
  precipProbMax?: number | null; // %
  windSpeedMax?: number | null; // km/h
  uvIndexMax?: number | null;
}

export function getRecommendations(input: RecommendationInput): Recommendation[] {
  const out: Recommendation[] = [];

  if (input.precipProbMax != null && input.precipProbMax >= 60) {
    out.push({
      id: "carry-umbrella",
      title: "Carry an umbrella",
      detail: "Rain looks likely, so keep an umbrella or rain jacket with you.",
      triggeredBy: `precipitation probability ${input.precipProbMax}%`,
      severity: "info",
    });
  }

  if (input.uvIndexMax != null && input.uvIndexMax >= 6) {
    out.push({
      id: "sun-protection",
      title: "Use sun protection",
      detail: "UV levels are high. Wear sunscreen, sunglasses, and a hat around midday.",
      triggeredBy: `UV index ${input.uvIndexMax}`,
      severity: "warning",
    });
  }

  if (input.windSpeedMax != null && input.windSpeedMax >= 40) {
    out.push({
      id: "wind-caution",
      title: "Be cautious outdoors",
      detail: "Strong winds are expected. Secure loose items and allow extra travel time.",
      triggeredBy: `wind speed ${input.windSpeedMax} km/h`,
      severity: "warning",
    });
  }

  if (input.tempMax != null && input.tempMax >= 35) {
    out.push({
      id: "heat-hydration",
      title: "Stay cool and hydrated",
      detail: "High temperatures today. Drink water regularly and avoid heavy activity in the afternoon.",
      triggeredBy: `high temperature ${input.tempMax}°C`,
      severity: "warning",
    });
  }

  if (input.tempMin != null && input.tempMin <= 0) {
    out.push({
      id: "cold-precaution",
      title: "Dress for cold weather",
      detail: "Temperatures at or below freezing. Wear warm layers and watch for icy surfaces.",
      triggeredBy: `low temperature ${input.tempMin}°C`,
      severity: "warning",
    });
  }

  return out;
}
