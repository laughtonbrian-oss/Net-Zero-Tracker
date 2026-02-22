"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { WedgeDataPoint } from "@/lib/calculations/wedge";

type Props = {
  data: WedgeDataPoint[];
  interventionNames: Record<string, string>;
  baselineTotal: number;
};

const PALETTE = [
  "#1e3a5f","#2d7a4d","#8e4d2a","#5a1a5f","#1a4d4d",
  "#3d7ab5","#3da666","#b56b3d","#8a3db5","#2d8080",
  "#7ab8e8","#7dd8a0","#e8aa7d","#c07de8","#7dcfcf",
];

export function WedgeChart({ data, interventionNames, baselineTotal }: Props) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || data.length === 0) return;

    const el = ref.current;
    const width = el.clientWidth || 600;
    const height = 320;
    const margin = { top: 16, right: 24, bottom: 40, left: 56 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    d3.select(el).selectAll("*").remove();

    const keys = Object.keys(data[0]).filter((k) => k !== "year");
    const color = d3.scaleOrdinal<string>().domain(keys).range(PALETTE);

    const stackGen = d3.stack<WedgeDataPoint>().keys(keys);
    const series = stackGen(data);

    const xScale = d3
      .scaleLinear()
      .domain(d3.extent(data, (d) => d.year) as [number, number])
      .range([0, innerWidth]);

    const maxY = d3.max(series, (s) => d3.max(s, (d) => d[1])) ?? 0;
    const yMax = Math.max(baselineTotal * 0.5, maxY);

    const yScale = d3.scaleLinear().domain([0, yMax]).range([innerHeight, 0]).nice();

    const areaGen = d3
      .area<d3.SeriesPoint<WedgeDataPoint>>()
      .x((d) => xScale(d.data.year))
      .y0((d) => yScale(d[0]))
      .y1((d) => yScale(d[1]))
      .curve(d3.curveMonotoneX);

    const svg = d3
      .select(el)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Stacked areas
    svg
      .selectAll(".layer")
      .data(series)
      .join("path")
      .attr("class", "layer")
      .attr("d", areaGen)
      .attr("fill", (d) => color(d.key))
      .attr("opacity", 0.85);

    // Axes
    svg
      .append("g")
      .attr("transform", `translate(0,${innerHeight})`)
      .call(
        d3.axisBottom(xScale).tickFormat((v) => String(v)).ticks(Math.min(data.length, 8))
      )
      .call((g) => g.select(".domain").remove())
      .selectAll("text")
      .style("font-size", "11px")
      .style("fill", "#6b7280");

    svg
      .append("g")
      .call(
        d3.axisLeft(yScale)
          .tickFormat((v) => {
            const n = Number(v);
            return n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n);
          })
          .ticks(5)
      )
      .call((g) => g.select(".domain").remove())
      .selectAll("text")
      .style("font-size", "11px")
      .style("fill", "#6b7280");

    svg
      .append("text")
      .attr("x", -innerHeight / 2)
      .attr("y", -44)
      .attr("transform", "rotate(-90)")
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .style("fill", "#9ca3af")
      .text("tCO₂e/yr");

    // Tooltip
    const tooltip = d3
      .select("body")
      .append("div")
      .style("position", "fixed")
      .style("background", "white")
      .style("border", "1px solid #e5e7eb")
      .style("border-radius", "6px")
      .style("padding", "8px 12px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("opacity", "0")
      .style("z-index", "9999");

    svg
      .append("rect")
      .attr("width", innerWidth)
      .attr("height", innerHeight)
      .attr("fill", "none")
      .attr("pointer-events", "all")
      .on("mousemove", (event: MouseEvent) => {
        const [mx] = d3.pointer(event, svg.node()!);
        const year = Math.round(xScale.invert(mx));
        const d = data.find((p) => p.year === year);
        if (!d) return;
        const rows = keys
          .map((k) => `<div>${interventionNames[k] ?? k}: ${(d[k] as number).toLocaleString(undefined, { maximumFractionDigits: 0 })} tCO₂e</div>`)
          .filter((_, i) => (d[keys[i]] as number) > 0)
          .join("");
        tooltip
          .html(`<strong>${year}</strong>${rows}`)
          .style("opacity", "1")
          .style("left", `${event.clientX + 12}px`)
          .style("top", `${event.clientY - 28}px`);
      })
      .on("mouseleave", () => tooltip.style("opacity", "0"));

    return () => { tooltip.remove(); };
  }, [data, interventionNames, baselineTotal]);

  if (data.length === 0) {
    return (
      <div className="h-[320px] flex items-center justify-center">
        <p className="text-sm text-gray-400">Add interventions to see the wedge chart</p>
      </div>
    );
  }

  return <svg ref={ref} className="w-full" style={{ height: 320 }} />;
}
