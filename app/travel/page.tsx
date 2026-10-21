"use client";

import { useState } from "react";
import SearchBar, { type LocationResult } from "@/components/SearchBar";
import ErrorBox from "@/components/ErrorBox";
import {
  ApiError,
  createRequest,
  shortDate,
  type Observation,
  type WeatherRequest,
} from "@/lib/api-client";
import { getRecommendations } from "@/lib/recommendations";

interface Result {
  request: WeatherRequest;
  observations: Observation[];
}

function fmt(v: number | null, digits = 1): string {
  return v === null || v === undefined ? "—" : v.toFixed(digits);
}

export default function TravelPage() {
  const [destination, setDestination] = useState<LocationResult | null>(null);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);
    if (!destination) {
      setError("Please pick a destination from the search results.");
      return;
    }
    if (!startDate || !endDate) {
      setError("Please choose both a start and an end date for your trip.");
      return;
    }
    if (startDate > endDate) {
      setError("The start date must be on or before the end date.");
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const res = await createRequest({
        location: { latitude: destination.latitude, longitude: destination.longitude },
        startDate,
        endDate,
        label: `travel-insight: ${destination.name}`,
        notes: `Travel insight request for ${destination.name} (${startDate} to ${endDate})`,
      });
      setResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not get travel insights. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const obs = result?.observations ?? [];
  const tempMaxes = obs.map((o) => o.temperatureMax).filter((v): v is number => v !== null);
  const tempMins = obs.map((o) => o.temperatureMin).filter((v): v is number => v !== null);
  const winds = obs.map((o) => o.windSpeed).filter((v): v is number => v !== null);
  const precips = obs.map((o) => o.precipitation).filter((v): v is number => v !== null);

  const tempMax = tempMaxes.length ? Math.max(...tempMaxes) : null;
  const tempMin = tempMins.length ? Math.min(...tempMins) : null;
  const windMax = winds.length ? Math.max(...winds) : null;
  const precipTotal = precips.length ? precips.reduce((a, b) => a + b, 0) : null;

  const recommendations = getRecommendations({
    tempMax,
    tempMin,
    precipProbMax: null,
    windSpeedMax: windMax,
    uvIndexMax: null,
  });

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Travel insights</h1>
      <p className="text-sm text-slate-500">
        Pick a destination and your travel dates. The trip is saved as a weather request so you can
        revisit it later from Saved Requests.
      </p>

      <form onSubmit={handleSubmit} className="card space-y-4">
        <div>
          <span className="label">Destination</span>
          <SearchBar onSelect={setDestination} placeholder="Search for your destination..." />
          {destination && (
            <p className="mt-1 text-xs text-slate-600">
              Selected: {destination.name} ({destination.latitude.toFixed(2)}, {destination.longitude.toFixed(2)})
            </p>
          )}
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <span className="label">Trip start</span>
            <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <span className="label">Trip end</span>
            <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <p className="text-xs text-slate-500">
          Choose dates within the past 92 days or the 16-day forecast including today.
        </p>
        {error && <ErrorBox message={error} />}
        <button type="submit" className="btn" disabled={loading}>
          {loading ? "Getting insights..." : "Get travel insights"}
        </button>
      </form>

      {result && (
        <div className="space-y-4">
          <div className="card">
            <h2 className="text-base font-semibold text-slate-800">
              {result.request.location.name} · {shortDate(result.request.startDate)} to {shortDate(result.request.endDate)}
            </h2>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Expected temp range</div>
                <div className="mt-1 text-sm font-medium">
                  {tempMin === null || tempMax === null ? "—" : `${Math.round(tempMin)}°C to ${Math.round(tempMax)}°C`}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Total precipitation</div>
                <div className="mt-1 text-sm font-medium">
                  {precipTotal === null ? "—" : `${fmt(precipTotal)} mm`}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Max wind</div>
                <div className="mt-1 text-sm font-medium">
                  {windMax === null ? "—" : `${fmt(windMax)} km/h`}
                </div>
              </div>
              <div className="rounded-lg bg-slate-50 p-3">
                <div className="text-xs text-slate-500">Days analyzed</div>
                <div className="mt-1 text-sm font-medium">{obs.length}</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h2 className="text-base font-semibold text-slate-800">What to pack and plan for</h2>
            <p className="mt-1 text-xs text-slate-500">
              Rule-based guidance, not an AI prediction. These notes come from fixed thresholds applied to the recorded weather data.
            </p>
            <ul className="mt-3 space-y-2">
              {recommendations.length === 0 && (
                <li className="rounded-lg border border-slate-200 p-3 text-sm text-slate-600">
                  No warnings for this trip. Conditions look typical, so standard outdoor
                  precautions are enough.
                </li>
              )}
              {recommendations.map((r) => (
                <li key={r.id} className="rounded-lg border border-slate-200 p-3">
                  <div className="text-sm font-medium text-slate-900">{r.title}</div>
                  <div className="mt-1 text-sm text-slate-600">{r.detail}</div>
                  <div className="mt-1 text-xs text-slate-400">Triggered by: {r.triggeredBy}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
