"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import {
  BarChart2,
  Target,
  Lightbulb,
  GitBranch,
  LayoutDashboard,
  Users,
  Building2,
  Map,
  Bell,
  Leaf,
  Settings,
  Zap,
  FileText,
  FlaskConical,
  Palette,
  ClipboardList,
  MapPin,
} from "lucide-react";

const mainNavHrefs = [
  { href: "/dashboard", key: "dashboard", icon: LayoutDashboard },
  { href: "/baseline", key: "baseline", icon: BarChart2 },
  { href: "/targets", key: "targets", icon: Target },
  { href: "/interventions", key: "interventions", icon: Lightbulb },
  { href: "/scenarios", key: "scenarios", icon: GitBranch },
  { href: "/assets", key: "assets", icon: Building2 },
  { href: "/portfolio", key: "portfolio", icon: Map },
  { href: "/sites", key: "sites", icon: MapPin },
  { href: "/alerts", key: "alerts", icon: Bell },
  { href: "/energy", key: "energy", icon: Zap },
  { href: "/reports", key: "reports", icon: FileText },
] as const;

const adminNavHrefs = [
  { href: "/settings/users", key: "team", icon: Users },
  { href: "/settings", key: "settings", icon: Settings },
  { href: "/settings/emission-factors", key: "emissionFactors", icon: FlaskConical },
  { href: "/settings/branding", key: "branding", icon: Palette },
  { href: "/audit", key: "auditLog", icon: ClipboardList },
] as const;

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";
  const t = useTranslations("nav");

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === href;
    if (href === "/settings") return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <aside className="w-56 shrink-0 border-r border-slate-700/50 bg-slate-900 min-h-screen flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-700/50">
        <div className="flex items-center gap-2.5">
          <div className="h-7 w-7 rounded-md bg-emerald-500 flex items-center justify-center shrink-0 shadow-sm shadow-emerald-900/40">
            <Leaf className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-white tracking-tight leading-tight">
            Net Zero<br />Tracker
          </span>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {mainNavHrefs.map(({ href, key, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
              isActive(href)
                ? "bg-emerald-600/20 text-emerald-400 font-medium"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0",
                isActive(href) ? "text-emerald-400" : "text-slate-500"
              )}
            />
            {t(key)}
          </Link>
        ))}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wide">{t("admin")}</p>
            </div>
            {adminNavHrefs.map(({ href, key, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive(href)
                    ? "bg-emerald-600/20 text-emerald-400 font-medium"
                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isActive(href) ? "text-emerald-400" : "text-slate-500"
                  )}
                />
                {t(key)}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-700/50">
        <p className="text-xs text-slate-500">© {new Date().getFullYear()} Net Zero Tracker</p>
      </div>
    </aside>
  );
}
