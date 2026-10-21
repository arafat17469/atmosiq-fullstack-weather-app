"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HourlyPoint, Units } from "@/lib/api-client";

interface HourlyChartProps {
  hourly: HourlyPoint[];
  units: Units;
}

interface ChartPoint {
  label: string;
  temperature: number | null;
  rain: number | null;
}

function hourLabel(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export default function HourlyChart({ hourly, units }: HourlyChartProps) {
  if (!hourly || hourly.length === 0) {
    return (
      <div className="card">
        <p className="text-sm text-slate-500">No hourly data available.</p>
      </div>
    );
  }

  const data: ChartPoint[] = hourly.map((h) => ({
    label: hourLabel(h.time),
    temperature: h.temperature,
    rain: h.precipProb,
  }));

  const tempUnit = units === "c" ? "°C" : "°F";

  return (
    <div className="card">
      <h3 className="mb-3 text-sm font-semibold text-slate-800">
        Hourly temperature and rain probability
      </h3>
      <div style={{ width: "100%", height: 280 }}>
        <ResponsiveContainer>
          <LineChart data={data} margin={{ top: 8, right: 8, left: -8, bottom: 0 }}>
            <CartesianGrid stroke="var(--chart-grid)" strokeDasharray="3 3" />
            <XAxis stroke="var(--chart-text)" dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
            <YAxis stroke="var(--chart-text)" yAxisId="temp" tick={{ fontSize: 11 }} unit={tempUnit} />
            <YAxis stroke="var(--chart-text)" yAxisId="rain" orientation="right" tick={{ fontSize: 11 }} unit="%" domain={[0, 100]} />
            <Tooltip
              contentStyle={{ backgroundColor: "var(--chart-tooltip)", borderColor: "var(--chart-grid)", color: "var(--chart-text)" }}
              formatter={(value: unknown, name: string) => {
                const v = typeof value === "number" ? value : Number(value);
                if (name === "temperature") return [`${v.toFixed(1)}${tempUnit}`, "Temperature"];
                return [`${Math.round(v)}%`, "Rain probability"];
              }}
            />
            <Legend />
            <Line
              yAxisId="temp"
              type="monotone"
              dataKey="temperature"
              name="temperature"
              stroke="#2563eb"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
            <Line
              yAxisId="rain"
              type="monotone"
              dataKey="rain"
              name="rain"
              stroke="#0ea5e9"
              strokeWidth={1.5}
              strokeDasharray="5 3"
              dot={false}
              connectNulls
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
