"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export default function OnboardingPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [companyName, setCompanyName] = useState("");
  const [loading, setLoading] = useState(false);

  // Guard: if user already belongs to a company, send them to the dashboard
  useEffect(() => {
    if (status === "authenticated" && session?.user?.companyId) {
      router.replace("/dashboard");
    }
  }, [status, session, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyName: companyName.trim() }),
      });
      if (!res.ok) throw new Error("Failed to create company");
      toast.success("Welcome! Your account is set up.");
      router.push("/dashboard");
      router.refresh();
    } catch {
      toast.error("Failed to set up account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-2xl font-semibold text-gray-900">Welcome to Net Zero Pathfinder</h1>
          <p className="mt-1 text-sm text-gray-500">
            Set up your organisation to get started.
          </p>
        </div>
        <Card className="shadow-sm border-gray-200">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="company">Company Name</Label>
                <Input
                  id="company"
                  type="text"
                  required
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Acme Corp Ltd"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading || !companyName.trim()}>
                {loading ? "Setting up…" : "Create organisation"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
