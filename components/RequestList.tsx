"use client";

import { useCallback, useEffect, useState } from "react";
import ErrorBox from "@/components/ErrorBox";
import {
  ApiError,
  deleteRequest,
  listRequests,
  shortDate,
  type WeatherRequest,
} from "@/lib/api-client";

interface RequestListProps {
  onSelect: (id: number) => void;
  /** Bump this to force a reload after a new request is created. */
  refreshKey?: number;
}

const PAGE_SIZE = 10;

export default function RequestList({ onSelect, refreshKey }: RequestListProps) {
  const [items, setItems] = useState<WeatherRequest[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [locationFilter, setLocationFilter] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [sort, setSort] = useState("desc");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      setError(null);
      try {
        const res = await listRequests({
          location: locationFilter.trim() || undefined,
          from: from || undefined,
          to: to || undefined,
          favorite: favoritesOnly || undefined,
          sort,
          page: pageNum,
          limit: PAGE_SIZE,
        });
        setItems(res.items);
        setPage(res.page);
        setTotalPages(res.totalPages);
        setTotal(res.total);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Could not load requests.");
      } finally {
        setLoading(false);
      }
    },
    [locationFilter, from, to, favoritesOnly, sort]
  );

  useEffect(() => {
    load(1);
  }, [load, refreshKey]);

  const applyFilters = () => load(1);

  const handleDelete = async (id: number) => {
    if (!window.confirm("Delete this request? This cannot be undone.")) return;
    setDeletingId(id);
    try {
      await deleteRequest(id);
      load(page);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not delete the request.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <span className="label">Location</span>
            <input
              className="input"
              type="text"
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              placeholder="Filter by place"
            />
          </div>
          <div>
            <span className="label">From</span>
            <input className="input" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <span className="label">To</span>
            <input className="input" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <div>
            <span className="label">Sort</span>
            <select className="input" value={sort} onChange={(e) => setSort(e.target.value)}>
              <option value="desc">Newest first</option>
              <option value="asc">Oldest first</option>
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={favoritesOnly}
              onChange={(e) => setFavoritesOnly(e.target.checked)}
            />
            Favorites only
          </label>
          <button type="button" className="btn" onClick={applyFilters} disabled={loading}>
            Apply
          </button>
        </div>
      </div>

      {error && <ErrorBox message={error} onRetry={() => load(page)} />}

      {loading && (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="card animate-pulse">
              <div className="h-4 w-2/3 rounded bg-slate-200" />
            </div>
          ))}
        </div>
      )}

      {!loading && items.length === 0 && !error && (
        <div className="card">
          <p className="text-sm text-slate-500">No saved requests yet. Create one with the form above.</p>
        </div>
      )}

      {!loading && items.length > 0 && (
        <div className="space-y-2">
          {items.map((r) => (
            <div key={r.id} className="card flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
              <button type="button" className="min-w-0 flex-1 text-left" onClick={() => onSelect(r.id)}>
                <div className="font-medium text-slate-900">
                  {r.isFavorite ? "★ " : ""}
                  {r.label || "Untitled request"}
                </div>
                <div className="text-xs text-slate-500">
                  {r.location.name}
                  {r.location.country ? `, ${r.location.country}` : ""} · {shortDate(r.startDate)} to {shortDate(r.endDate)}
                </div>
              </button>
              <div className="flex flex-wrap shrink-0 items-center gap-2">
                <a
                  className="btn-secondary px-3 py-1 text-xs"
                  href={`/api/weather/requests/${encodeURIComponent(r.id)}/export?format=csv`}
                >
                  CSV
                </a>
                <a
                  className="btn-secondary px-3 py-1 text-xs"
                  href={`/api/weather/requests/${encodeURIComponent(r.id)}/export?format=json`}
                >
                  JSON
                </a>
                <button
                  type="button"
                  className="rounded-lg border border-red-200 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
                  disabled={deletingId === r.id}
                  onClick={() => handleDelete(r.id)}
                >
                  {deletingId === r.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-slate-500">
            Page {page} of {totalPages} ({total} requests)
          </span>
          <div className="flex gap-2">
            <button
              type="button"
              className="btn-secondary"
              disabled={page <= 1 || loading}
              onClick={() => load(page - 1)}
            >
              Previous
            </button>
            <button
              type="button"
              className="btn-secondary"
              disabled={page >= totalPages || loading}
              onClick={() => load(page + 1)}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
