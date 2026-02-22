"use client";

import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { SlidersHorizontal, X } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import dynamic from "next/dynamic";
import type { Baseline, BaselineEntry } from "@prisma/client";

// Dynamically import the map to avoid SSR issues with Leaflet
const SiteMap = dynamic(() => import("./site-map").then((m) => m.SiteMap), {
  ssr: false,
  loading: () => (
    <div className="h-[420px] flex items-center justify-center bg-gray-50 rounded-lg">
      <p className="text-sm text-gray-400">Loading map…</p>
    </div>
  ),
});

type SiteData = {
  id: string;
  name: string;
  address: string | null;
  region: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  interventions: { id: string; totalReductionTco2e: number; scopesAffected: string }[];
  assets: { id: string; installationYear: number; expectedUsefulLife: number; alertThresholdYears: number; currentEnergyKwh: number | null }[];
};

type Props = {
  sites: SiteData[];
  baseline: (Baseline & { entries: BaselineEntry[] }) | null;
};

const currentYear = new Date().getFullYear();

function eolCount(assets: SiteData["assets"]) {
  return assets.filter((a) => {
    const eol = a.installationYear + a.expectedUsefulLife;
    return eol - currentYear <= a.alertThresholdYears;
  }).length;
}

export function PortfolioView({ sites, baseline }: Props) {
  const [filterCountry, setFilterCountry] = useState("");
  const [filterSite, setFilterSite] = useState("");

  const baselineTotal = baseline
    ? baseline.entries.reduce((s, e) => s + e.emissionsTco2e, 0)
    : 0;

  const availableCountries = useMemo(
    () => Array.from(new Set(sites.map((s) => s.country).filter((c): c is string => !!c))).sort(),
    [sites]
  );

  const availableSites = useMemo(
    () => sites.filter((s) => !filterCountry || s.country === filterCountry),
    [sites, filterCountry]
  );

  const filteredSites = useMemo(
    () =>
      sites.filter(
        (s) =>
          (!filterCountry || s.country === filterCountry) &&
          (!filterSite || s.id === filterSite)
      ),
    [sites, filterCountry, filterSite]
  );

  const hasFilters = !!filterCountry || !!filterSite;

  function clearFilters() {
    setFilterCountry("");
    setFilterSite("");
  }

  const rows = filteredSites.map((site) => {
    const totalAbatement = site.interventions.reduce((s, i) => s + i.totalReductionTco2e, 0);
    const eol = eolCount(site.assets);
    const totalKwh = site.assets.reduce((s, a) => s + (a.currentEnergyKwh ?? 0), 0);
    return { site, totalAbatement, eol, totalKwh };
  });

  // Sort by total abatement descending
  const sorted = [...rows].sort((a, b) => b.totalAbatement - a.totalAbatement);

  const mappableSites = filteredSites.filter(
    (s): s is SiteData & { latitude: number; longitude: number } =>
      s.latitude !== null && s.longitude !== null
  );

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-gray-400 shrink-0" />
        <Select
          value={filterCountry || "__all__"}
          onValueChange={(v) => {
            setFilterCountry(v === "__all__" ? "" : v);
            setFilterSite("");
          }}
        >
          <SelectTrigger className="h-8 w-40 text-xs">
            <SelectValue placeholder="All countries" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All countries</SelectItem>
            {availableCountries.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filterSite || "__all__"}
          onValueChange={(v) => setFilterSite(v === "__all__" ? "" : v)}
        >
          <SelectTrigger className="h-8 w-44 text-xs">
            <SelectValue placeholder="All sites" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">All sites</SelectItem>
            {availableSites.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" className="h-8 px-2 text-xs text-gray-400" onClick={clearFilters}>
            <X className="h-3.5 w-3.5 mr-1" />
            Clear
          </Button>
        )}
        {hasFilters && (
          <span className="text-xs text-gray-400">
            {filteredSites.length} of {sites.length} sites
          </span>
        )}
      </div>

      <Tabs defaultValue="table">
        <TabsList className="border-b w-full justify-start rounded-none bg-transparent p-0 h-auto mb-4">
          {["table", "map"].map((t) => (
            <TabsTrigger
              key={t}
              value={t}
              className="border-b-2 border-transparent data-[state=active]:border-gray-900 data-[state=active]:text-gray-900 rounded-none pb-2 text-sm capitalize"
            >
              {t === "table" ? "League table" : "Map"}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="table">
          {filteredSites.length === 0 ? (
            <Card className="border-gray-200 shadow-none">
              <CardContent className="py-10 text-center text-sm text-gray-500">
                {hasFilters ? "No sites match the selected filters." : "No sites yet. Add sites via the Sites page."}
              </CardContent>
            </Card>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Rank</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Potential abatement (tCO₂e)</TableHead>
                  <TableHead>Interventions</TableHead>
                  <TableHead>Assets</TableHead>
                  <TableHead>EOL alerts</TableHead>
                  <TableHead>Energy (kWh/yr)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sorted.map(({ site, totalAbatement, eol, totalKwh }, idx) => (
                  <TableRow key={site.id}>
                    <TableCell className="font-medium text-gray-400 w-10">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{site.name}</div>
                      {(site.region || site.country) && (
                        <div className="text-xs text-gray-400">
                          {[site.region, site.country].filter(Boolean).join(", ")}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {totalAbatement.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </div>
                      {baselineTotal > 0 && (
                        <div className="text-xs text-gray-400">
                          {((totalAbatement / baselineTotal) * 100).toFixed(1)}% of baseline
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{site.interventions.length}</TableCell>
                    <TableCell>{site.assets.length}</TableCell>
                    <TableCell>
                      {eol > 0 ? (
                        <span className="text-red-600 font-medium">{eol}</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {totalKwh > 0
                        ? totalKwh.toLocaleString(undefined, { maximumFractionDigits: 0 })
                        : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </TabsContent>

        <TabsContent value="map">
          {mappableSites.length === 0 ? (
            <Card className="border-gray-200 shadow-none">
              <CardContent className="py-10 text-center text-sm text-gray-500">
                Add latitude/longitude coordinates to sites to see them on the map.
              </CardContent>
            </Card>
          ) : (
            <SiteMap sites={mappableSites} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
