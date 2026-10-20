import { describe, expect, it } from "vitest";
import { checkRateLimit } from "../lib/rate-limit";

describe("checkRateLimit", () => {
  it("allows requests under the limit", () => {
    const ip = "test-ip-allows-1";
    for (let i = 0; i < 5; i += 1) {
      expect(checkRateLimit(ip, 5, 60_000).allowed).toBe(true);
    }
  });

  it("blocks requests once the limit is reached", () => {
    const ip = "test-ip-blocks-1";
    expect(checkRateLimit(ip, 2, 60_000).allowed).toBe(true);
    expect(checkRateLimit(ip, 2, 60_000).allowed).toBe(true);
    const blocked = checkRateLimit(ip, 2, 60_000);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeTypeOf("number");
  });

  it("tracks buckets per IP independently", () => {
    expect(checkRateLimit("test-ip-a-1", 1, 60_000).allowed).toBe(true);
    expect(checkRateLimit("test-ip-a-1", 1, 60_000).allowed).toBe(false);
    // A different IP still has a fresh bucket.
    expect(checkRateLimit("test-ip-b-1", 1, 60_000).allowed).toBe(true);
  });

  it("resets the bucket after the window expires", async () => {
    const ip = "test-ip-reset-1";
    expect(checkRateLimit(ip, 1, 20).allowed).toBe(true);
    expect(checkRateLimit(ip, 1, 20).allowed).toBe(false);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(checkRateLimit(ip, 1, 20).allowed).toBe(true);
  });
});
