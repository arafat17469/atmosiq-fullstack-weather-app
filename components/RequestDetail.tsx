"use client";

import { useCallback, useEffect, useState } from "react";
import ErrorBox from "@/components/ErrorBox";
import {
  ApiError,
  deleteRequest,
  getRequest,
  shortDate,
  updateRequest,
  type Observation,
  type WeatherRequest,
} from "@/lib/api-client";
import { weatherCodeInfo } from "@/lib/units";

interface RequestDetailProps {
  id: number;
  onBack: () => void;
  onChanged: () => void;
}

function fmt(v: number | null, digits = 1): string {
  return v === null || v === undefined ? "—" : v.toFixed(digits);
}

export default function RequestDetail({ id, onBack, onChanged }: RequestDetailProps) {
  const [request, setRequest] = useState<WeatherRequest | null>(null);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [label, setLabel] = useState("");
  const [notes, setNotes] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { request: r, observations: obs } = await getRequest(id);
      setRequest(r);
      setObservations(obs);
      setLabel(r.label ?? "");
      setNotes(r.notes ?? "");
      setStartDate(shortDate(r.startDate));
      setEndDate(shortDate(r.endDate));
      setIsFavorite(r.isFavorite);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not load the request.");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (startDate && endDate && startDate > endDate) {
      setSaveError("The start date must be on or before the end date.");
      return;
    }
    setSaveError(null);
    setSaving(true);
    try {
      const updated = await updateRequest(id, {
        label: label.trim() || null,
        notes: notes.trim() || null,
        startDate,
        endDate,
        isFavorite,
      });
      setRequest(updated);
      await load();
      onChanged();
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : "Could not save changes.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this request? This cannot be undone.")) return;
    try {
      await deleteRequest(id);
      onChanged();
      onBack();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete the request.");
    }
  };

  if (loading) {
    return (
      <div className="card animate-pulse">
        <div className="h-5 w-1/3 rounded bg-slate-200" />
        <div className="mt-3 h-4 w-2/3 rounded bg-slate-200" />
      </div>
    );
  }

  if (error || !request) {
    return <ErrorBox message={error ?? "Request not found."} onRetry={load} />;
  }

  return (
    <div className="space-y-4">
      <button type="button" className="btn-secondary" onClick={onBack}>
        ← Back to requests
      </button>

      <div className="card">
        <h2 className="text-base font-semibold text-slate-800">
          {request.isFavorite ? "★ " : ""}
          {request.label || "Untitled request"}
        </h2>
        <div className="mt-2 grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
          <div>
            <div className="text-xs text-slate-500">Location</div>
            <div>
              {request.location.name}
              {request.location.country ? `, ${request.location.country}` : ""}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Coordinates</div>
            <div>
              {request.location.latitude.toFixed(2)}, {request.location.longitude.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="text-xs text-slate-500">Period</div>
            <div>
              {shortDate(request.startDate)} to {shortDate(request.endDate)}
            </div>
          </div>
        </div>
        {request.notes && <p className="mt-2 text-sm text-slate-600">{request.notes}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <a
            className="btn-secondary px-3 py-1 text-xs"
            href={`/api/weather/requests/${encodeURIComponent(id)}/export?format=csv`}
          >
            Export CSV
          </a>
          <a
            className="btn-secondary px-3 py-1 text-xs"
            href={`/api/weather/requests/${encodeURIComponent(id)}/export?format=json`}
          >
            Export JSON
          </a>
          <button
            type="button"
            className="rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
            onClick={handleDelete}
          >
            Delete
          </button>
        </div>
      </div>

      <div className="card">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">
          Observations ({observations.length})
        </h3>
        {observations.length === 0 ? (
          <p className="text-sm text-slate-500">No observations stored for this request.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-slate-500">
                  <th className="py-1 pr-2">Date</th>
                  <th className="py-1 pr-2">Min</th>
                  <th className="py-1 pr-2">Max</th>
                  <th className="py-1 pr-2">Mean</th>
                  <th className="py-1 pr-2">Precip (mm)</th>
                  <th className="py-1 pr-2">Humidity %</th>
                  <th className="py-1 pr-2">Wind km/h</th>
                  <th className="py-1 pr-2">Condition</th>
                </tr>
              </thead>
              <tbody>
                {observations.map((o) => {
                  const info = weatherCodeInfo(o.weatherCode);
                  return (
                    <tr key={o.observationDate} className="border-b last:border-0">
                      <td className="py-1 pr-2">{shortDate(o.observationDate)}</td>
                      <td className="py-1 pr-2">{fmt(o.temperatureMin, 0)}</td>
                      <td className="py-1 pr-2">{fmt(o.temperatureMax, 0)}</td>
                      <td className="py-1 pr-2">{fmt(o.temperatureMean)}</td>
                      <td className="py-1 pr-2">{fmt(o.precipitation)}</td>
                      <td className="py-1 pr-2">{o.humidity === null ? "—" : Math.round(o.humidity)}</td>
                      <td className="py-1 pr-2">{fmt(o.windSpeed)}</td>
                      <td className="py-1 pr-2">
                        {info.emoji} {info.label}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="card space-y-3">
        <h3 className="text-sm font-semibold text-slate-800">Edit request</h3>
        <div>
          <span className="label">Label</span>
          <input className="input" type="text" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={120} />
        </div>
        <div>
          <span className="label">Notes</span>
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <span className="label">Start date</span>
            <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <span className="label">End date</span>
            <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" checked={isFavorite} onChange={(e) => setIsFavorite(e.target.checked)} />
          Favorite
        </label>
        {saveError && <ErrorBox message={saveError} />}
        <button type="submit" className="btn" disabled={saving}>
          {saving ? "Saving..." : "Save changes"}
        </button>
      </form>
    </div>
  );
}
