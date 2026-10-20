"use client";

import { useState } from "react";
import RequestForm from "@/components/RequestForm";
import RequestList from "@/components/RequestList";
import RequestDetail from "@/components/RequestDetail";
import type { WeatherRequest } from "@/lib/api-client";

export default function RequestsPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const handleCreated = (_request: WeatherRequest) => {
    setRefreshKey((k) => k + 1);
  };

  const handleChanged = () => {
    setRefreshKey((k) => k + 1);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold text-slate-900">Saved requests</h1>

      {selectedId ? (
        <RequestDetail
          id={selectedId}
          onBack={() => setSelectedId(null)}
          onChanged={handleChanged}
        />
      ) : (
        <>
          <RequestForm onCreated={handleCreated} />
          <RequestList onSelect={setSelectedId} refreshKey={refreshKey} />
        </>
      )}
    </div>
  );
}
