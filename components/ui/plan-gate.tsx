"use client";

import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { isPremium, PREMIUM_FEATURES, type PremiumFeature } from "@/lib/plan-gate";

interface PlanGateProps {
  plan: string | undefined | null;
  feature: PremiumFeature;
  children: React.ReactNode;
}

export function PlanGate({ plan, feature, children }: PlanGateProps) {
  if (isPremium(plan)) return <>{children}</>;

  return (
    <Card className="border-amber-200 bg-amber-50 shadow-none">
      <CardContent className="py-10 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
          <Lock className="h-5 w-5 text-amber-600" />
        </div>
        <p className="text-sm font-medium text-amber-900">Pro feature</p>
        <p className="mt-1 text-sm text-amber-700">
          {PREMIUM_FEATURES[feature]} is available on the Pro plan.
        </p>
        <Button
          size="sm"
          className="mt-4 bg-amber-600 hover:bg-amber-700 text-white"
          onClick={() => alert("Contact sales to upgrade to Pro.")}
        >
          Upgrade to Pro
        </Button>
      </CardContent>
    </Card>
  );
}
