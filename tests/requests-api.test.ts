import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { GET as listRequests, POST as createRequest } from "../app/api/weather/requests/route";
import {
  DELETE as deleteRequest,
  GET as getRequest,
  PATCH as updateRequest,
} from "../app/api/weather/requests/[id]/route";
import { GET as exportRequest } from "../app/api/weather/requests/[id]/export/route";
import { prisma } from "../lib/prisma";

/**
 * DB-BACKED INTEGRATION TESTS for the saved weather-request CRUD API.
 *
 * These tests were NOT run in the development VM (2026-10-20): the VM has no
 * PostgreSQL and no Docker, so there was no live database to test against.
 * They run automatically in any environment where DATABASE_URL points at a
 * live PostgreSQL instance with the Prisma migrations applied, e.g.:
 *
 *   DATABASE_URL="postgresql://user:pass@host:5432/atmosiq" npm test
 *
 * To force-skip them even with a DATABASE_URL set, use SKIP_DB=1.
 */
const LIVE_DATABASE_URL =
  process.env.SKIP_DB === "1"
    ? undefined
    : process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost")
      ? process.env.DATABASE_URL
      : undefined;

describe.skipIf(!LIVE_DATABASE_URL)("weather requests API (DB integration)", () => {
  const createdIds: number[] = [];

  function toDateString(offsetDays: number): string {
    return new Date(Date.now() + offsetDays * 86_400_000).toISOString().slice(0, 10);
  }

  // Stub the global fetch so no real Open-Meteo call is made. The routes use
  // coordinate input (no geocoding call), so only the forecast endpoint is hit.
  beforeAll(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          daily: {
            time: [toDateString(-2), toDateString(-1), toDateString(0)],
            weather_code: [0, 2, 95],
            temperature_2m_min: [18.0, 19.5, 20.0],
            temperature_2m_max: [30.0, 31.0, 32.5],
            precipitation_probability_max: [10, 70, 90],
            precipitation_sum: [0, 2.5, 12.0],
            wind_speed_10m_max: [12, 45, 60],
            uv_index_max: [3, 7, 9],
            relative_humidity_2m_mean: [60, 65, 70],
          },
        }),
      })),
    );
  });

  afterAll(async () => {
    vi.unstubAllGlobals();
    // Clean up anything the tests created, in case an assertion failed early.
    for (const id of createdIds) {
      await prisma.weatherRequest.deleteMany({ where: { id } });
    }
    await prisma.$disconnect();
  });

  function postBody(overrides: Record<string, unknown> = {}) {
    return {
      location: { latitude: 23.8103, longitude: 90.4125 },
      startDate: toDateString(-2),
      endDate: toDateString(0),
      label: "integration test request",
      ...overrides,
    };
  }

  async function createOne(overrides: Record<string, unknown> = {}) {
    const res = await createRequest(
      new Request("http://localhost/api/weather/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postBody(overrides)),
      }),
    );
    const body = (await res.json()) as { data: { request: { id: number; status: string } } };
    createdIds.push(body.data.request.id);
    return { res, body };
  }

  it("POST creates a request with observations (201)", async () => {
    const { res, body } = await createOne();
    expect(res.status).toBe(201);
    expect(body.data.request.id).toBeTypeOf("number");
    expect(body.data.request.status).toBe("completed");
  });

  it("POST rejects invalid input (400)", async () => {
    const res = await createRequest(
      new Request("http://localhost/api/weather/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postBody({ location: { latitude: 91, longitude: 0 } })),
      }),
    );
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe("validation_error");
  });

  it("POST rejects a start date after the end date (400)", async () => {
    const res = await createRequest(
      new Request("http://localhost/api/weather/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(postBody({ startDate: toDateString(0), endDate: toDateString(-2) })),
      }),
    );
    expect(res.status).toBe(400);
  });

  it("GET list returns the created request with pagination metadata", async () => {
    await createOne({ label: "listed request" });
    const res = await listRequests(new Request("http://localhost/api/weather/requests?page=1&limit=10"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { items: Array<{ label: string | null }>; page: number; limit: number; total: number };
    };
    expect(body.data.page).toBe(1);
    expect(body.data.limit).toBe(10);
    expect(body.data.total).toBeGreaterThanOrEqual(1);
    expect(body.data.items.some((i) => i.label === "listed request")).toBe(true);
  });

  it("GET by id returns the request with location and observations", async () => {
    const { body } = await createOne();
    const id = body.data.request.id;
    const res = await getRequest(new Request(`http://localhost/api/weather/requests/${id}`), {
      params: { id: String(id) },
    });
    expect(res.status).toBe(200);
    const detail = (await res.json()) as {
      data: { observations: unknown[]; location: { name: string } };
    };
    expect(detail.data.observations.length).toBe(3);
    expect(detail.data.location.name).toBeTypeOf("string");
  });

  it("GET by unknown id returns 404", async () => {
    const res = await getRequest(new Request("http://localhost/api/weather/requests/2147483647"), {
      params: { id: "2147483647" },
    });
    expect(res.status).toBe(404);
  });

  it("GET by non-numeric id returns 400", async () => {
    const res = await getRequest(new Request("http://localhost/api/weather/requests/abc"), {
      params: { id: "abc" },
    });
    expect(res.status).toBe(400);
  });

  it("PATCH updates the label (200)", async () => {
    const { body } = await createOne();
    const id = body.data.request.id;
    const res = await updateRequest(
      new Request(`http://localhost/api/weather/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: "renamed request" }),
      }),
      { params: { id: String(id) } },
    );
    expect(res.status).toBe(200);
    const updated = (await res.json()) as { data: { label: string } };
    expect(updated.data.label).toBe("renamed request");
  });

  it("PATCH rejects a label over 120 characters (400)", async () => {
    const { body } = await createOne();
    const id = body.data.request.id;
    const res = await updateRequest(
      new Request(`http://localhost/api/weather/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: "x".repeat(121) }),
      }),
      { params: { id: String(id) } },
    );
    expect(res.status).toBe(400);
  });

  it("export endpoint serves JSON and CSV for a request", async () => {
    const { body } = await createOne();
    const id = body.data.request.id;

    const jsonRes = await exportRequest(
      new Request(`http://localhost/api/weather/requests/${id}/export?format=json`),
      { params: { id: String(id) } },
    );
    expect(jsonRes.status).toBe(200);
    expect(jsonRes.headers.get("content-type")).toContain("application/json");
    const payload = (await jsonRes.json()) as { request: { id: number } };
    expect(payload.request.id).toBe(id);

    const csvRes = await exportRequest(
      new Request(`http://localhost/api/weather/requests/${id}/export?format=csv`),
      { params: { id: String(id) } },
    );
    expect(csvRes.status).toBe(200);
    expect(csvRes.headers.get("content-type")).toContain("text/csv");
    const text = await csvRes.text();
    expect(text.split("\n")[0]).toContain("date,temp_min_c,temp_max_c");
    expect(text).toContain(toDateString(0));
  });

  it("export rejects an unknown format (400)", async () => {
    const { body } = await createOne();
    const id = body.data.request.id;
    const res = await exportRequest(
      new Request(`http://localhost/api/weather/requests/${id}/export?format=xml`),
      { params: { id: String(id) } },
    );
    expect(res.status).toBe(400);
  });

  it("DELETE removes the request; a later GET returns 404", async () => {
    const { body } = await createOne();
    const id = body.data.request.id;
    const delRes = await deleteRequest(
      new Request(`http://localhost/api/weather/requests/${id}`, { method: "DELETE" }),
      { params: { id: String(id) } },
    );
    expect(delRes.status).toBe(200);

    const getRes = await getRequest(new Request(`http://localhost/api/weather/requests/${id}`), {
      params: { id: String(id) },
    });
    expect(getRes.status).toBe(404);
  });
});
