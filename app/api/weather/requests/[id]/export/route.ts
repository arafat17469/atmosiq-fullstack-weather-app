import { NextResponse } from "next/server";
import { jsonError, getClientIp, handleRouteError } from "@/lib/api";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatCell(value: number | string | null): string {
  if (value == null) return "";
  const text = String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const gate = checkRateLimit(getClientIp(req));
  if (!gate.allowed) {
    return jsonError("Too many requests. Please slow down.", 429, "rate_limited");
  }
  try {
    const id = parseId(params.id);
    if (id == null) return jsonError("Request id is not valid.", 400, "validation_error");

    const url = new URL(req.url);
    const format = url.searchParams.get("format") ?? "json";
    if (format !== "json" && format !== "csv") {
      return jsonError('Format must be "csv" or "json".', 400, "validation_error");
    }

    const request = await prisma.weatherRequest.findUnique({
      where: { id },
      include: {
        location: true,
        observations: { orderBy: { observationDate: "asc" } },
      },
    });
    if (!request) return jsonError("Request not found.", 404, "not_found");

    const stamp = new Date().toISOString().slice(0, 10).replaceAll("-", "");
    const filename = `atmosiq-request-${id}-${stamp}.${format}`;

    if (format === "json") {
      const payload = {
        meta: {
          source: "open-meteo",
          exportedAt: new Date().toISOString(),
          units: { temperature: "celsius", precipitation: "mm", windSpeed: "km/h", humidity: "percent" },
        },
        request,
      };
      return new NextResponse(JSON.stringify(payload, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    // CSV with metric units baked into the column headers.
    const headers = [
      "date",
      "temp_min_c",
      "temp_max_c",
      "temp_mean_c",
      "precipitation_mm",
      "humidity_pct",
      "wind_speed_kmh",
      "weather_code",
      "source",
    ];
    const lines = [headers.join(",")];
    for (const o of request.observations) {
      lines.push(
        [
          formatCell(formatDate(o.observationDate)),
          formatCell(o.temperatureMin),
          formatCell(o.temperatureMax),
          formatCell(o.temperatureMean),
          formatCell(o.precipitation),
          formatCell(o.humidity),
          formatCell(o.windSpeed),
          formatCell(o.weatherCode),
          formatCell(o.source),
        ].join(","),
      );
    }
    return new NextResponse(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    return handleRouteError(err);
  }
}
