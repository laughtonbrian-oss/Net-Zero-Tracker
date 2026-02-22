"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
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
} from "lucide-react";

const mainNavItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/baseline", label: "Baseline", icon: BarChart2 },
  { href: "/targets", label: "Targets", icon: Target },
  { href: "/interventions", label: "Interventions", icon: Lightbulb },
  { href: "/scenarios", label: "Scenarios", icon: GitBranch },
  { href: "/assets", label: "Assets", icon: Building2 },
  { href: "/portfolio", label: "Portfolio", icon: Map },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/energy", label: "Energy", icon: Zap },
  { href: "/reports", label: "Reports", icon: FileText },
];

const adminNavItems = [
  { href: "/settings/users", label: "Team", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
  { href: "/settings/emission-factors", label: "Emission Factors", icon: FlaskConical },
  { href: "/settings/branding", label: "Branding", icon: Palette },
  { href: "/audit", label: "Audit Log", icon: ClipboardList },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const isAdmin = session?.user?.role === "ADMIN";

  function isActive(href: string) {
    if (href === "/dashboard") return pathname === href;
    if (href === "/settings") return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <aside className="w-56 shrink-0 border-r border-gray-200 bg-white min-h-screen flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-emerald-600 flex items-center justify-center shrink-0">
            <Leaf className="h-4 w-4 text-white" />
          </div>
          <span className="text-sm font-semibold text-gray-900 tracking-tight leading-tight">
            Net Zero<br />Tracker
          </span>
        </div>
      </div>

      {/* Main nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {mainNavItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
              isActive(href)
                ? "bg-emerald-50 text-emerald-700 font-medium"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <Icon
              className={cn(
                "h-4 w-4 shrink-0",
                isActive(href) ? "text-emerald-600" : "text-gray-400"
              )}
            />
            {label}
          </Link>
        ))}

        {isAdmin && (
          <>
            <div className="pt-4 pb-1 px-3">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Admin</p>
            </div>
            {adminNavItems.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                  isActive(href)
                    ? "bg-emerald-50 text-emerald-700 font-medium"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 shrink-0",
                    isActive(href) ? "text-emerald-600" : "text-gray-400"
                  )}
                />
                {label}
              </Link>
            ))}
          </>
        )}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-gray-100">
        <p className="text-xs text-gray-400">© {new Date().getFullYear()} Net Zero Tracker</p>
      </div>
    </aside>
  );
}
