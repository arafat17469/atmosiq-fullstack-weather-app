import { describe, expect, it } from "vitest";
import {
  coordSchema,
  createRequestSchema,
  dateStringSchema,
  listQuerySchema,
  validateDateRange,
} from "../lib/validation";

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function daysFromToday(offset: number): string {
  return toDateString(new Date(Date.now() + offset * 86_400_000));
}

describe("coordSchema", () => {
  it("accepts valid coordinates", () => {
    expect(coordSchema.safeParse({ latitude: 23.8103, longitude: 90.4125 }).success).toBe(true);
    expect(coordSchema.safeParse({ latitude: -90, longitude: -180 }).success).toBe(true);
    expect(coordSchema.safeParse({ latitude: 90, longitude: 180 }).success).toBe(true);
  });

  it("rejects latitude outside [-90, 90]", () => {
    expect(coordSchema.safeParse({ latitude: 91, longitude: 0 }).success).toBe(false);
    expect(coordSchema.safeParse({ latitude: -90.1, longitude: 0 }).success).toBe(false);
  });

  it("rejects longitude outside [-180, 180]", () => {
    expect(coordSchema.safeParse({ latitude: 0, longitude: 181 }).success).toBe(false);
    expect(coordSchema.safeParse({ latitude: 0, longitude: -180.5 }).success).toBe(false);
  });

  it("rejects non-numeric coordinates", () => {
    expect(coordSchema.safeParse({ latitude: "23.8", longitude: 90 }).success).toBe(false);
  });
});

describe("dateStringSchema", () => {
  it("accepts a real calendar date", () => {
    expect(dateStringSchema.safeParse("2026-10-20").success).toBe(true);
    expect(dateStringSchema.safeParse("2024-02-29").success).toBe(true); // leap year
  });

  it("rejects impossible dates like 2026-02-30", () => {
    expect(dateStringSchema.safeParse("2026-02-30").success).toBe(false);
    expect(dateStringSchema.safeParse("2023-02-29").success).toBe(false); // not a leap year
    expect(dateStringSchema.safeParse("2026-13-01").success).toBe(false);
    expect(dateStringSchema.safeParse("2026-00-10").success).toBe(false);
  });

  it("rejects malformed strings", () => {
    expect(dateStringSchema.safeParse("20-10-2026").success).toBe(false);
    expect(dateStringSchema.safeParse("2026/10/20").success).toBe(false);
    expect(dateStringSchema.safeParse("not-a-date").success).toBe(false);
  });
});

describe("validateDateRange", () => {
  it("rejects a start date after the end date", () => {
    const check = validateDateRange(daysFromToday(1), daysFromToday(-1));
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.message).toMatch(/start date/i);
  });

  it("rejects a range extending beyond today + 16 days", () => {
    const check = validateDateRange(daysFromToday(0), daysFromToday(17));
    expect(check.ok).toBe(false);
    if (!check.ok) expect(check.message).toMatch(/16/);
  });

  it("rejects a range starting before today - 92 days", () => {
    const check = validateDateRange(daysFromToday(-93), daysFromToday(-90));
    expect(check.ok).toBe(false);
  });

  it("rejects non-calendar dates", () => {
    const check = validateDateRange("2026-02-30", "2026-03-01");
    expect(check.ok).toBe(false);
  });

  it("accepts a valid range inside the supported window", () => {
    expect(validateDateRange(daysFromToday(-90), daysFromToday(16))).toEqual({ ok: true });
    expect(validateDateRange(daysFromToday(-5), daysFromToday(5))).toEqual({ ok: true });
  });
});

describe("createRequestSchema", () => {
  const base = () => ({
    location: { latitude: 23.8103, longitude: 90.4125 },
    startDate: daysFromToday(-7),
    endDate: daysFromToday(7),
  });

  it("accepts a valid payload with a query location", () => {
    const result = createRequestSchema.safeParse({
      ...base(),
      location: { query: "Bogura" },
      label: "Trip to Bogura",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a label longer than 120 characters", () => {
    const result = createRequestSchema.safeParse({
      ...base(),
      label: "x".repeat(121),
    });
    expect(result.success).toBe(false);
  });

  it("accepts a label of exactly 120 characters", () => {
    const result = createRequestSchema.safeParse({
      ...base(),
      label: "x".repeat(120),
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid date ranges", () => {
    const result = createRequestSchema.safeParse({
      ...base(),
      startDate: daysFromToday(2),
      endDate: daysFromToday(1),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a query location shorter than 2 characters", () => {
    const result = createRequestSchema.safeParse({
      ...base(),
      location: { query: "B" },
    });
    expect(result.success).toBe(false);
  });
});

describe("listQuerySchema", () => {
  it("applies pagination defaults", () => {
    expect(listQuerySchema.parse({})).toMatchObject({ sort: "desc", page: 1, limit: 20 });
  });
});
