"use client";

import { useState } from "react";
import SearchBar, { type LocationResult } from "@/components/SearchBar";
import UnitToggle from "@/components/UnitToggle";
import ErrorBox from "@/components/ErrorBox";
import {
  ApiError,
  getCurrentWeather,
  type CurrentWeatherData,
  type Units,
} from "@/lib/api-client";
import { weatherCodeInfo } from "@/lib/units";

interface Side {
  name: string;
  data: CurrentWeatherData | null;
  error: string | null;
  loading: boolean;
}

const emptySide = (): Side => ({ name: "", data: null, error: null, loading: false });

function fmt(v: number | null, digits = 1): string {
  return v === null || v === undefined ? "—" : v.toFixed(digits);
}

export default function ComparePage() {
  const [units, setUnits] = useState<Units>("c");
  const [a, setA] = useState<Side>(emptySide());
  const [b, setB] = useState<Side>(emptySide());

  const loadSide = async (setter: (s: Side) => void, loc: LocationResult) => {
    setter({ name: loc.name, data: null, error: null, loading: true });
    try {
      const data = await getCurrentWeather(loc.latitude, loc.longitude, units);
      setter({ name: loc.name, data, error: null, loading: false });
    } catch (err) {
      setter({
        name: loc.name,
        data: null,
        error: err instanceof ApiError ? err.message : "Could not load weather data.",
        loading: false,
      });
    }
  };

  const handleUnitsChange = (u: Units) => {
    setUnits(u);
  };

  const rows: Array<{ label: string; get: (d: CurrentWeatherData) => string }> = [
    {
      label: "Temperature",
      get: (d) => (d.temperature === null ? "—" : `${fmt(d.temperature)}${units === "c" ? "°C" : "°F"}`),
    },
    {
      label: "Feels like",
      get: (d) => (d.feelsLike === null ? "—" : `${fmt(d.feelsLike)}${units === "c" ? "°C" : "°F"}`),
    },
    {
      label: "Condition",
      get: (d) => weatherCodeInfo(d.weatherCode).label,
    },
    { label: "Humidity", get: (d) => (d.humidity === null ? "—" : `${Math.round(d.humidity)}%`) },
    {
      label: "Wind",
      get: (d) =>
        d.windSpeed === null ? "—" : `${fmt(d.windSpeed)} km/h ${d.windDirectionLabel ?? ""}`.trim(),
    },
    { label: "Precipitation", get: (d) => `${fmt(d.precipitation)} mm` },
  ];

  const warmer =
    a.data?.temperature !== null && a.data?.temperature !== undefined &&
    b.data?.temperature !== null && b.data?.temperature !== undefined
      ? a.data.temperature > b.data.temperature
        ? `${a.name} is warmer than ${b.name}.`
        : b.data.temperature > a.data.temperature
          ? `${b.name} is warmer than ${a.name}.`
          : `${a.name} and ${b.name} are about the same temperature.`
      : null;

  const wetter =
    a.data?.precipitation !== null && a.data?.precipitation !== undefined &&
    b.data?.precipitation !== null && b.data?.precipitation !== undefined
      ? a.data.precipitation > b.data.precipitation
        ? `${a.name} has more precipitation than ${b.name}.`
        : b.data.precipitation > a.data.precipitation
          ? `${b.name} has more precipitation than ${a.name}.`
          : `Precipitation is about the same in both places.`
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold text-slate-900">Compare two places</h1>
        <UnitToggle units={units} onChange={handleUnitsChange} />
      </div>
      <p className="text-sm text-slate-500">
        Changing units refetches the data on the next search. Pick a place in each box to compare current conditions side by side.
      </p>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="card">
          <h2 className="mb-2 text-sm font-semibold">Place A</h2>
          <SearchBar onSelect={(loc) => loadSide(setA, loc)} placeholder="Search place A..." />
          {a.loading && <p className="mt-2 text-sm text-slate-500">Loading...</p>}
          {a.error && <div className="mt-2"><ErrorBox message={a.error} /></div>}
          {a.data && <p className="mt-2 text-sm font-medium">{a.name}</p>}
        </div>
        <div className="card">
          <h2 className="mb-2 text-sm font-semibold">Place B</h2>
          <SearchBar onSelect={(loc) => loadSide(setB, loc)} placeholder="Search place B..." />
          {b.loading && <p className="mt-2 text-sm text-slate-500">Loading...</p>}
          {b.error && <div className="mt-2"><ErrorBox message={b.error} /></div>}
          {b.data && <p className="mt-2 text-sm font-medium">{b.name}</p>}
        </div>
      </div>

      {a.data && b.data && (
        <div className="card">
          <div className="overflow-x-auto" role="region" aria-label="Weather comparison" tabIndex={0}>
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-slate-500">
                <th className="py-2 pr-2">Metric</th>
                <th className="py-2 pr-2">{a.name}</th>
                <th className="py-2">{b.name}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.label} className="border-b last:border-0">
                  <td className="py-2 pr-2 text-slate-500">{r.label}</td>
                  <td className="py-2 pr-2 font-medium">{r.get(a.data as CurrentWeatherData)}</td>
                  <td className="py-2 font-medium">{r.get(b.data as CurrentWeatherData)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          <div className="mt-3 space-y-1 text-sm text-slate-700">
            {warmer && <p>{warmer}</p>}
            {wetter && <p>{wetter}</p>}
          </div>
        </div>
      )}

      {(!a.data || !b.data) && (
        <div className="card">
          <p className="text-sm text-slate-500">Pick both places to see the comparison.</p>
        </div>
      )}
    </div>
  );
}
