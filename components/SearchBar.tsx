"use client";

import { useEffect, useRef, useState } from "react";
import {
  ApiError,
  searchLocations,
  type LocationResult,
} from "@/lib/api-client";

export type { LocationResult };

interface SearchBarProps {
  onSelect: (location: LocationResult) => void;
  placeholder?: string;
}

export default function SearchBar({ onSelect, placeholder }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlight, setHighlight] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  useEffect(() => {
    const onClickOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const runSearch = (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    searchLocations(q.trim())
      .then((locs) => {
        setResults(locs);
        setHighlight(0);
        setOpen(true);
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof ApiError ? err.message : "Search failed. Please try again.");
        setResults([]);
        setOpen(true);
        setLoading(false);
      });
  };

  const handleChange = (value: string) => {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => runSearch(value), 400);
  };

  const pick = (loc: LocationResult) => {
    setOpen(false);
    setQuery(loc.name);
    onSelect(loc);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || results.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % results.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + results.length) % results.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      pick(results[highlight] ?? results[0]);
    }
  };

  const locationLine = (loc: LocationResult) =>
    [loc.region, loc.country].filter(Boolean).join(", ");

  return (
    <div ref={boxRef} className="relative">
      <input
        type="text"
        className="input"
        placeholder={placeholder ?? "Search for a city or place..."}
        value={query}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          if (results.length > 0) setOpen(true);
        }}
        aria-label="Location search"
        autoComplete="off"
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg">
          {loading && (
            <div className="px-3 py-2 text-sm text-slate-500">Searching...</div>
          )}
          {!loading && error && (
            <div className="px-3 py-2 text-sm text-red-700">{error}</div>
          )}
          {!loading && !error && results.length === 0 && (
            <div className="px-3 py-2 text-sm text-slate-500">No matches</div>
          )}
          {!loading &&
            !error &&
            results.map((loc, i) => (
              <button
                key={`${loc.latitude}-${loc.longitude}-${i}`}
                type="button"
                className={`block w-full px-3 py-2 text-left text-sm hover:bg-slate-100 ${
                  i === highlight ? "bg-slate-100" : ""
                }`}
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pick(loc)}
              >
                <div className="font-medium text-slate-900">{loc.name}</div>
                <div className="text-xs text-slate-500">
                  {locationLine(loc) || "—"} · {loc.latitude.toFixed(2)},{" "}
                  {loc.longitude.toFixed(2)}
                </div>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
