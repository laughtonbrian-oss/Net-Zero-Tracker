"use client";

import dynamic from "next/dynamic";

const SiteMap = dynamic(() => import("./site-map").then((m) => m.SiteMap), {
  ssr: false,
  loading: () => (
    <div className="h-[600px] w-full rounded-lg bg-gray-100 flex items-center justify-center text-sm text-gray-400">
      Loading map…
    </div>
  ),
});

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

export function MapOverview({ sites }: Props) {
  if (sites.length === 0) {
    return (
      <div className="h-[600px] w-full rounded-lg border border-dashed border-gray-200 flex items-center justify-center">
        <p className="text-sm text-gray-400">No sites with location data to display.</p>
      </div>
    );
  }

  return <SiteMap sites={sites} />;
}
