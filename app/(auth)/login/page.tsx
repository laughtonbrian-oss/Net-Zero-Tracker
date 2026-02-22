import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import Link from "next/link";
import { Leaf } from "lucide-react";

export const metadata = { title: "Sign In — Net Zero Pathfinder" };

const benefits = [
  {
    emoji: "\u{1F4CA}",
    title: "Full-Scope Emissions Tracking",
    description: "Track Scope 1, 2 & 3 emissions across your entire portfolio",
  },
  {
    emoji: "\u{1F3AF}",
    title: "Science-Based Targets",
    description: "Set and monitor science-based targets aligned with SBTi",
  },
  {
    emoji: "\u{1F4A1}",
    title: "Scenario Modelling",
    description: "Model interventions and build net zero scenarios",
  },
  {
    emoji: "\u{1F5FA}\uFE0F",
    title: "Portfolio Visualisation",
    description: "Visualise your portfolio across sites and geographies",
  },
  {
    emoji: "\u26A1",
    title: "Cost-Saving Insights",
    description: "Identify cost-saving opportunities with MACC analysis",
  },
];

export default function LoginPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left panel — hero image (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="https://images.unsplash.com/photo-1532601224476-15c79f2f7a51?w=1920&q=80"
          alt="Wind farm over Scottish highlands"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/90 via-slate-900/40 to-slate-900/20" />
        {/* Tagline at bottom */}
        <div className="relative z-10 mt-auto p-10">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="h-8 w-8 rounded-md bg-emerald-500 flex items-center justify-center shadow-lg">
              <Leaf className="h-5 w-5 text-white" />
            </div>
            <span className="text-lg font-semibold text-white tracking-tight">
              Net Zero Pathfinder
            </span>
          </div>
          <p className="text-white/80 text-sm max-w-md leading-relaxed">
            The enterprise platform for planning, tracking and delivering your
            organisation&apos;s net zero pathway.
          </p>
        </div>
      </div>

      {/* Right panel — sign-in form */}
      <div className="w-full lg:w-1/2 flex flex-col overflow-y-auto bg-white">
        <div className="flex-1 flex items-center justify-center px-6 py-12">
          <div className="w-full max-w-md space-y-8">
            {/* Logo + heading */}
            <div className="text-center">
              <div className="flex items-center justify-center gap-2.5 mb-4">
                <div className="h-9 w-9 rounded-lg bg-emerald-500 flex items-center justify-center shadow-sm">
                  <Leaf className="h-5 w-5 text-white" />
                </div>
                <span className="text-xl font-bold text-gray-900 tracking-tight">
                  Net Zero Pathfinder
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Sign in to your account
              </p>
            </div>

            {/* Benefits */}
            <div className="space-y-3">
              {benefits.map((b) => (
                <div key={b.title} className="flex items-start gap-3">
                  <span className="text-lg leading-none mt-0.5">{b.emoji}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{b.title}</p>
                    <p className="text-xs text-gray-500">{b.description}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white px-3 text-gray-400 uppercase tracking-wider">
                  Sign in
                </span>
              </div>
            </div>

            {/* Login form */}
            <Suspense
              fallback={
                <div className="h-48 rounded-lg border border-gray-200 animate-pulse bg-gray-50" />
              }
            >
              <LoginForm />
            </Suspense>

            {/* Register link */}
            <p className="text-center text-sm text-gray-500">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="text-emerald-600 font-medium hover:underline"
              >
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
