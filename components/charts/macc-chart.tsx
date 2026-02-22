"use client";

import { useEffect, useRef } from "react";
import * as d3 from "d3";
import type { MACCDataPoint } from "@/lib/calculations/macc";

type Props = { data: MACCDataPoint[] };

export function MACCChart({ data }: Props) {
  const ref = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!ref.current || data.length === 0) return;

    const el = ref.current;
    const width = el.clientWidth || 640;
    const height = 320;
    const margin = { top: 24, right: 24, bottom: 80, left: 64 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    d3.select(el).selectAll("*").remove();

    const svg = d3
      .select(el)
      .attr("width", width)
      .attr("height", height)
      .append("g")
      .attr("transform", `translate(${margin.left},${margin.top})`);

    // Cumulative abatement for x positions
    let cum = 0;
    const bars = data.map((d) => {
      const bar = { ...d, x0: cum, x1: cum + d.annualAbatement };
      cum = bar.x1;
      return bar;
    });

    const totalAbatement = cum;
    const macExtent = d3.extent(data, (d) => d.mac) as [number, number];
    const yPad = (macExtent[1] - macExtent[0]) * 0.1 || 10;

    const xScale = d3.scaleLinear().domain([0, totalAbatement]).range([0, innerWidth]);
    const yScale = d3
      .scaleLinear()
      .domain([Math.min(0, macExtent[0] - yPad), macExtent[1] + yPad])
      .range([innerHeight, 0])
      .nice();

    const colorScale = d3
      .scaleSequential()
      .domain([macExtent[0], macExtent[1]])
      .interpolator(d3.interpolateRdYlGn);

    // Zero line
    svg
      .append("line")
      .attr("x1", 0)
      .attr("x2", innerWidth)
      .attr("y1", yScale(0))
      .attr("y2", yScale(0))
      .attr("stroke", "#9ca3af")
      .attr("stroke-dasharray", "4 2");

    // Bars
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
      .selectAll(".bar")
      .data(bars)
      .join("rect")
      .attr("class", "bar")
      .attr("x", (d) => xScale(d.x0) + 1)
      .attr("width", (d) => Math.max(1, xScale(d.x1) - xScale(d.x0) - 2))
      .attr("y", (d) => (d.mac >= 0 ? yScale(d.mac) : yScale(0)))
      .attr("height", (d) => Math.abs(yScale(d.mac) - yScale(0)))
      .attr("fill", (d) => colorScale(d.mac))
      .attr("rx", 2)
      .on("mouseover", (event: MouseEvent, d) => {
        tooltip
          .html(
            `<strong>${d.name}</strong><br/>` +
            `MAC: $${d.mac.toLocaleString(undefined, { maximumFractionDigits: 0 })}/tCO₂e<br/>` +
            `Annual abatement: ${d.annualAbatement.toLocaleString(undefined, { maximumFractionDigits: 0 })} tCO₂e/yr<br/>` +
            `Total cost: $${d.totalCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}`
          )
          .style("opacity", "1")
          .style("left", `${event.clientX + 12}px`)
          .style("top", `${event.clientY - 28}px`);
      })
      .on("mousemove", (event: MouseEvent) => {
        tooltip
          .style("left", `${event.clientX + 12}px`)
          .style("top", `${event.clientY - 28}px`);
      })
      .on("mouseleave", () => tooltip.style("opacity", "0"));

    // Axes
    svg
      .append("g")
      .attr("transform", `translate(0,${yScale(0)})`)
      .call(
        d3.axisBottom(xScale)
          .tickFormat((v) => {
            const n = Number(v);
            return n >= 1000 ? `${(n / 1000).toFixed(0)}k` : String(n);
          })
          .ticks(6)
      )
      .call((g) => g.select(".domain").remove())
      .selectAll("text")
      .style("font-size", "10px")
      .style("fill", "#6b7280");

    svg
      .append("g")
      .call(
        d3.axisLeft(yScale)
          .tickFormat((v) => `$${Number(v).toLocaleString()}`)
          .ticks(6)
      )
      .call((g) => g.select(".domain").remove())
      .selectAll("text")
      .style("font-size", "10px")
      .style("fill", "#6b7280");

    // Axis labels
    svg
      .append("text")
      .attr("x", innerWidth / 2)
      .attr("y", innerHeight + 60)
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .style("fill", "#9ca3af")
      .text("Annual abatement (tCO₂e/yr)");

    svg
      .append("text")
      .attr("x", -innerHeight / 2)
      .attr("y", -52)
      .attr("transform", "rotate(-90)")
      .attr("text-anchor", "middle")
      .style("font-size", "11px")
      .style("fill", "#9ca3af")
      .text("Marginal abatement cost ($/tCO₂e)");

    return () => { tooltip.remove(); };
  }, [data]);

  if (data.length === 0) {
    return (
      <div className="h-[320px] flex items-center justify-center">
        <p className="text-sm text-gray-400">
          Add financial data to interventions in a scenario to see the MACC
        </p>
      </div>
    );
  }

  return <svg ref={ref} className="w-full" style={{ height: 320 }} />;
}
