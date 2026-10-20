"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

interface MapViewProps {
  latitude: number;
  longitude: number;
  name?: string;
}

function Recenter({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([latitude, longitude], map.getZoom());
  }, [latitude, longitude, map]);
  return null;
}

export default function MapView({ latitude, longitude, name }: MapViewProps) {
  // Emoji div icon avoids missing Leaflet image assets.
  const icon = useMemo(
    () =>
      L.divIcon({
        html: `<div style="font-size:28px;line-height:1;transform:translate(-14px,-26px)">📍</div>`,
        className: "",
        iconSize: [28, 28],
        iconAnchor: [14, 28],
      }),
    []
  );

  return (
    <div className="card overflow-hidden">
      <h3 className="mb-3 text-sm font-semibold text-slate-800">
        Map{name ? ` — ${name}` : ""}
      </h3>
      <MapContainer
        center={[latitude, longitude]}
        zoom={9}
        scrollWheelZoom={false}
        style={{ height: 280, width: "100%", borderRadius: 8 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker position={[latitude, longitude]} icon={icon} />
        <Recenter latitude={latitude} longitude={longitude} />
      </MapContainer>
    </div>
  );
}
