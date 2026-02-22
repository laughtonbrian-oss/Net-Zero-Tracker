"use client";

import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect } from "react";

// Fix Leaflet default marker icons in Next.js
function fixLeafletIcons() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "/leaflet/marker-icon-2x.png",
    iconUrl: "/leaflet/marker-icon.png",
    shadowUrl: "/leaflet/marker-shadow.png",
  });
}

type MappableSite = {
  id: string;
  name: string;
  address: string | null;
  region: string | null;
  country: string | null;
  latitude: number;
  longitude: number;
  interventions: { id: string; totalReductionTco2e: number; scopesAffected: string }[];
  assets: { id: string }[];
};

type Props = {
  sites: MappableSite[];
};

export function SiteMap({ sites }: Props) {
  useEffect(() => {
    fixLeafletIcons();
  }, []);

  // Compute center from average of all coordinates
  const avgLat = sites.reduce((s, site) => s + site.latitude, 0) / sites.length;
  const avgLng = sites.reduce((s, site) => s + site.longitude, 0) / sites.length;

  return (
    <MapContainer
      center={[avgLat, avgLng]}
      zoom={5}
      style={{ height: "420px", width: "100%", borderRadius: "0.5rem" }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {sites.map((site) => {
        const totalAbatement = site.interventions.reduce(
          (s, i) => s + i.totalReductionTco2e,
          0
        );
        return (
          <Marker key={site.id} position={[site.latitude, site.longitude]}>
            <Popup>
              <div className="min-w-[160px]">
                <p className="font-semibold text-sm">{site.name}</p>
                {(site.region || site.country) && (
                  <p className="text-xs text-gray-500">
                    {[site.region, site.country].filter(Boolean).join(", ")}
                  </p>
                )}
                <div className="mt-2 space-y-0.5 text-xs">
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Interventions</span>
                    <span className="font-medium">{site.interventions.length}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Assets</span>
                    <span className="font-medium">{site.assets.length}</span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">Abatement</span>
                    <span className="font-medium">
                      {totalAbatement.toLocaleString(undefined, { maximumFractionDigits: 0 })} tCO₂e
                    </span>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
