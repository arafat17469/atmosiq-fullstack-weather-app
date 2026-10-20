import { describe, expect, it } from "vitest";
import { listQuerySchema } from "../lib/validation";

// No database needed: these cover the pure API input-shaping behavior used by
// the /api/weather/requests routes.

describe("listQuerySchema", () => {
  it("applies defaults for page, limit and sort", () => {
    expect(listQuerySchema.parse({})).toEqual({
      sort: "desc",
      page: 1,
      limit: 20,
    });
  });

  it("coerces string query params to numbers", () => {
    const parsed = listQuerySchema.parse({ page: "3", limit: "50", sort: "asc" });
    expect(parsed).toEqual({ sort: "asc", page: 3, limit: 50 });
  });

  it("rejects pages below 1", () => {
    expect(listQuerySchema.safeParse({ page: "0" }).success).toBe(false);
    expect(listQuerySchema.safeParse({ page: "-2" }).success).toBe(false);
  });

  it("rejects limits above 100", () => {
    expect(listQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
  });

  it("rejects invalid sort and favorite values", () => {
    expect(listQuerySchema.safeParse({ sort: "newest" }).success).toBe(false);
    expect(listQuerySchema.safeParse({ favorite: "yes" }).success).toBe(false);
  });

  it("accepts the favorite filter values", () => {
    expect(listQuerySchema.parse({ favorite: "true" }).favorite).toBe("true");
    expect(listQuerySchema.parse({ favorite: "false" }).favorite).toBe("false");
  });

  it("accepts from/to date filters", () => {
    const parsed = listQuerySchema.parse({ from: "2026-10-01", to: "2026-10-20" });
    expect(parsed.from).toBe("2026-10-01");
    expect(parsed.to).toBe("2026-10-20");
  });

  it("rejects impossible from/to dates", () => {
    expect(listQuerySchema.safeParse({ from: "2026-02-30" }).success).toBe(false);
  });
});
