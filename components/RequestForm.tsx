"use client";

import { useState } from "react";
import SearchBar, { type LocationResult } from "@/components/SearchBar";
import ErrorBox from "@/components/ErrorBox";
import {
  ApiError,
  createRequest,
  type WeatherRequest,
} from "@/lib/api-client";

interface RequestFormProps {
  onCreated: (request: WeatherRequest) => void;
}

type LocationMode = "search" | "coords";

export default function RequestForm({ onCreated }: RequestFormProps) {
  const [mode, setMode] = useState<LocationMode>("search");
  const [location, setLocation] = useState<LocationResult | null>(null);
  const [lat, setLat] = useState("");
  const [lon, setLon] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const validate = (): string | null => {
    if (mode === "search" && !location) return "Please pick a location from the search results.";
    if (mode === "coords") {
      const la = Number(lat);
      const lo = Number(lon);
      if (!Number.isFinite(la) || la < -90 || la > 90) return "Latitude must be between -90 and 90.";
      if (!Number.isFinite(lo) || lo < -180 || lo > 180) return "Longitude must be between -180 and 180.";
    }
    if (!startDate || !endDate) return "Please choose both a start and an end date.";
    if (startDate > endDate) return "The start date must be on or before the end date.";
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const problem = validate();
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const loc =
        mode === "search" && location
          ? { latitude: location.latitude, longitude: location.longitude }
          : { latitude: Number(lat), longitude: Number(lon) };
      const { request } = await createRequest({
        location: loc,
        startDate,
        endDate,
        label: label.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onCreated(request);
      setLocation(null);
      setLat("");
      setLon("");
      setStartDate("");
      setEndDate("");
      setLabel("");
      setNotes("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not save the request. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="card space-y-4">
      <h2 className="text-base font-semibold text-slate-800">New weather request</h2>

      <div className="flex gap-2 text-sm">
        <label className="flex items-center gap-1">
          <input
            type="radio"
            checked={mode === "search"}
            onChange={() => setMode("search")}
          />
          Search place
        </label>
        <label className="flex items-center gap-1">
          <input
            type="radio"
            checked={mode === "coords"}
            onChange={() => setMode("coords")}
          />
          Lat / Lon
        </label>
      </div>

      {mode === "search" ? (
        <div>
          <span className="label">Location</span>
          <SearchBar onSelect={setLocation} />
          {location && (
            <p className="mt-1 text-xs text-slate-600">
              Selected: {location.name} ({location.latitude.toFixed(2)}, {location.longitude.toFixed(2)})
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <span className="label">Latitude</span>
            <input
              className="input"
              type="number"
              step="any"
              min={-90}
              max={90}
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="e.g. 23.81"
            />
          </div>
          <div>
            <span className="label">Longitude</span>
            <input
              className="input"
              type="number"
              step="any"
              min={-180}
              max={180}
              value={lon}
              onChange={(e) => setLon(e.target.value)}
              placeholder="e.g. 90.41"
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <span className="label">Start date</span>
          <input
            className="input"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div>
          <span className="label">End date</span>
          <input
            className="input"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Dates must fall between the past 92 days and the next 16 days.
      </p>

      <div>
        <span className="label">Label (optional)</span>
        <input
          className="input"
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="e.g. Dhaka trip"
          maxLength={120}
        />
      </div>

      <div>
        <span className="label">Notes (optional)</span>
        <textarea
          className="input"
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Anything worth remembering about this request"
        />
      </div>

      {error && <ErrorBox message={error} />}

      <button type="submit" className="btn" disabled={submitting}>
        {submitting ? "Saving..." : "Save request"}
      </button>
    </form>
  );
}
