"use client";

import { useCallback, useState } from "react";
import dynamic from "next/dynamic";
import SearchBar, { type LocationResult } from "@/components/SearchBar";
import CurrentWeather from "@/components/CurrentWeather";
import ForecastCards from "@/components/ForecastCards";
import HourlyChart from "@/components/HourlyChart";
import UnitToggle from "@/components/UnitToggle";
import ErrorBox from "@/components/ErrorBox";
import {
  ApiError,
  getCurrentWeather,
  getForecast,
  getHourly,
  type CurrentWeatherData,
  type ForecastDay,
  type HourlyPoint,
  type Units,
} from "@/lib/api-client";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

interface Selected {
  name: string;
  latitude: number;
  longitude: number;
}

function Skeleton() {
  return (
    <div className="card animate-pulse space-y-3">
      <div className="h-6 w-1/4 rounded bg-slate-200" />
      <div className="h-4 w-2/3 rounded bg-slate-200" />
      <div className="grid grid-cols-3 gap-2">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-16 rounded bg-slate-200" />
        ))}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [selected, setSelected] = useState<Selected | null>(null);
  const [units, setUnits] = useState<Units>("c");
  const [current, setCurrent] = useState<CurrentWeatherData | null>(null);
  const [daily, setDaily] = useState<ForecastDay[]>([]);
  const [hourly, setHourly] = useState<HourlyPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);

  const loadWeather = useCallback(
    async (loc: Selected, u: Units) => {
      setLoading(true);
      setError(null);
      try {
        const [cur, fc, hr] = await Promise.all([
          getCurrentWeather(loc.latitude, loc.longitude, u),
          getForecast(loc.latitude, loc.longitude, 5, u),
          getHourly(loc.latitude, loc.longitude, 24, u),
        ]);
        setCurrent(cur);
        setDaily(fc.daily);
        setHourly(hr.hourly);
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Could not load weather data. Please try again."
        );
      } finally {
        setLoading(false);
      }
    },
    []
  );

  const handleSelect = (loc: LocationResult) => {
    const sel = { name: loc.name, latitude: loc.latitude, longitude: loc.longitude };
    setSelected(sel);
    loadWeather(sel, units);
  };

  const handleUnitsChange = (u: Units) => {
    setUnits(u);
    if (selected) loadWeather(selected, u);
  };

  const handleRetry = () => {
    if (selected) loadWeather(selected, units);
  };

  const useMyLocation = () => {
    setGeoMessage(null);
    if (!("geolocation" in navigator)) {
      setGeoMessage("Geolocation is not supported by this browser. Please search for a place instead.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const sel = {
          name: "My location",
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        setSelected(sel);
        loadWeather(sel, units);
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          setGeoMessage("Location permission was denied. Allow location access in your browser or search for a place instead.");
        } else if (err.code === err.TIMEOUT) {
          setGeoMessage("Timed out while getting your location. Please try again or search for a place instead.");
        } else {
          setGeoMessage("Could not determine your location. Please try again or search for a place instead.");
        }
      },
      { timeout: 10000 }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex-1">
          <SearchBar onSelect={handleSelect} />
          <button type="button" className="btn-secondary mt-2" onClick={useMyLocation}>
            Use my location
          </button>
          {geoMessage && <p className="mt-1 text-sm text-amber-700">{geoMessage}</p>}
        </div>
        <UnitToggle units={units} onChange={handleUnitsChange} />
      </div>

      {error && <ErrorBox message={error} onRetry={selected ? handleRetry : undefined} />}

      {loading && (
        <>
          <Skeleton />
          <Skeleton />
        </>
      )}

      {!loading && !current && !error && (
        <div className="card">
          <p className="text-sm text-slate-500">
            Search for a place or use your location to see current conditions, a 5-day forecast, and the next 24 hours.
          </p>
        </div>
      )}

      {!loading && current && selected && (
        <>
          <h1 className="text-xl font-bold text-slate-900">{selected.name}</h1>
          <CurrentWeather data={current} units={units} />
          <ForecastCards daily={daily} units={units} />
          <HourlyChart hourly={hourly} units={units} />
          <MapView latitude={selected.latitude} longitude={selected.longitude} name={selected.name} />
        </>
      )}
    </div>
  );
}
