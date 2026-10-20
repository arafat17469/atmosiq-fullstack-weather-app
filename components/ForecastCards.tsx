"use client";

import type { ForecastDay, Units } from "@/lib/api-client";
import { weatherCodeInfo } from "@/lib/units";

interface ForecastCardsProps {
  daily: ForecastDay[];
  units: Units;
}

export default function ForecastCards({ daily, units }: ForecastCardsProps) {
  const tempUnit = units === "c" ? "°C" : "°F";

  if (!daily || daily.length === 0) {
    return (
      <div className="card">
        <p className="text-sm text-slate-500">No forecast data available.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {daily.map((day) => {
        const info = weatherCodeInfo(day.weatherCode);
        const label = day.weatherLabel || info.label;
        const d = new Date(`${day.date}T12:00:00`);
        const dayName = Number.isNaN(d.getTime())
          ? day.date
          : d.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
        return (
          <div key={day.date} className="card text-center">
            <div className="text-xs font-medium text-slate-500">{dayName}</div>
            <div className="my-2 text-3xl" role="img" aria-label={label}>
              {info.emoji}
            </div>
            <div className="text-sm font-medium text-slate-900">
              {day.tempMax === null ? "—" : `${Math.round(day.tempMax)}${tempUnit}`}
              <span className="ml-1 text-slate-500">
                {day.tempMin === null ? "" : `${Math.round(day.tempMin)}${tempUnit}`}
              </span>
            </div>
            <div className="mt-1 text-xs text-slate-600">{label}</div>
            <div className="mt-1 text-xs text-blue-700">
              {day.precipProbMax === null ? "—" : `${Math.round(day.precipProbMax)}% rain`}
            </div>
          </div>
        );
      })}
    </div>
  );
}
