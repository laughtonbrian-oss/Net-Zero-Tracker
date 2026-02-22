"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, type LucideIcon } from "lucide-react";

export type KpiItem = {
  label: string;
  value: string;
  numericValue: number | null;
  suffix: string;
  sub: string;
  iconName: string;
  iconBg: string;
  iconColor: string;
  href: string;
};

function useCountUp(target: number, duration = 1400) {
  const [current, setCurrent] = useState(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (target === 0) { setCurrent(0); return; }
    const start = performance.now();
    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(Math.round(eased * target));
      if (progress < 1) rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [target, duration]);

  return current;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {};

// We receive icon components pre-rendered as strings and re-import lazily.
// Instead, parent passes an iconComponent prop. See KpiCard below.

type KpiCardProps = {
  item: KpiItem;
  icon: LucideIcon;
};

function KpiCard({ item, icon: Icon }: KpiCardProps) {
  const count = useCountUp(item.numericValue ?? 0);
  const displayValue =
    item.numericValue !== null
      ? count.toLocaleString() + (item.suffix ? " " + item.suffix : "")
      : item.value;

  return (
    <Link href={item.href} className="block group">
      <Card className="border-gray-200 dark:border-slate-700 shadow-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-gray-200/60 dark:hover:shadow-slate-900/60 hover:border-emerald-200 dark:hover:border-emerald-700 bg-white dark:bg-slate-800">
        <CardContent className="p-5">
          <div className="flex items-start justify-between mb-3">
            <div className={`h-9 w-9 rounded-lg ${item.iconBg} flex items-center justify-center`}>
              <Icon className={`h-4 w-4 ${item.iconColor}`} />
            </div>
            <ArrowRight className="h-4 w-4 text-gray-300 dark:text-slate-600 group-hover:text-emerald-500 transition-colors mt-1" />
          </div>
          <p className="text-2xl font-bold text-gray-900 dark:text-white leading-tight tabular-nums">
            {displayValue}
          </p>
          <p className="text-xs text-gray-400 dark:text-slate-500 mt-1 uppercase tracking-wide font-medium">
            {item.label}
          </p>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">{item.sub}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

type Props = {
  items: KpiItem[];
  icons: LucideIcon[];
};

export function KpiCards({ items, icons }: Props) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {items.map((item, i) => (
        <KpiCard key={item.label} item={item} icon={icons[i]} />
      ))}
    </div>
  );
}
