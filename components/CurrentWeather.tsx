"use client";

import type { CurrentWeatherData, Units } from "@/lib/api-client";
import { weatherCodeInfo } from "@/lib/units";

function fmt(v: number | null | undefined, digits = 1): string {
  return v === null || v === undefined ? "—" : v.toFixed(digits);
}

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

interface CurrentWeatherProps {
  data: CurrentWeatherData;
  units: Units;
}

export default function CurrentWeather({ data, units }: CurrentWeatherProps) {
  const info = weatherCodeInfo(data.weatherCode);
  const tempUnit = units === "c" ? "°C" : "°F";
  const updated = fmtTime(data.time);

  const stats: Array<{ label: string; value: string }> = [
    { label: "Feels like", value: `${fmt(data.feelsLike)}${tempUnit}` },
    { label: "Humidity", value: data.humidity === null ? "—" : `${Math.round(data.humidity)}%` },
    {
      label: "Wind",
      value:
        data.windSpeed === null
          ? "—"
          : `${fmt(data.windSpeed)} km/h ${data.windDirectionLabel ?? ""}`.trim(),
    },
    { label: "Precipitation", value: `${fmt(data.precipitation)} mm` },
    { label: "Pressure", value: `${fmt(data.pressure, 0)} hPa` },
    { label: "Cloud cover", value: data.cloudCover === null ? "—" : `${Math.round(data.cloudCover)}%` },
    { label: "Visibility", value: data.visibility === null ? "—" : `${fmt(data.visibility / 1000)} km` },
    { label: "UV index", value: data.uvIndex === null ? "—" : fmt(data.uvIndex) },
    { label: "Sunrise", value: fmtTime(data.sunrise) },
    { label: "Sunset", value: fmtTime(data.sunset) },
    { label: "Local time", value: fmtTime(data.time) },
    { label: "Last updated", value: updated },
  ];

  return (
    <div className="card">
      <div className="mb-4 flex items-center gap-4">
        <span className="text-5xl" role="img" aria-label={info.label}>
          {info.emoji}
        </span>
        <div>
          <div className="text-4xl font-bold">
            {data.temperature === null ? "—" : `${fmt(data.temperature)}${tempUnit}`}
          </div>
          <div className="text-sm text-slate-600">{info.label}</div>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="rounded-lg bg-slate-50 p-3">
            <div className="text-xs text-slate-500">{s.label}</div>
            <div className="mt-1 text-sm font-medium text-slate-900">{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
