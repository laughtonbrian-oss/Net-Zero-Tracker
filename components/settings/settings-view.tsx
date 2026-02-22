"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type Company = { id: string; name: string; slug: string; plan: string } | null;
type User = { id: string; name: string | null; email: string | null; role: string } | null;

type Props = {
  company: Company;
  user: User;
  isAdmin: boolean;
};

export function SettingsView({ company, user, isAdmin }: Props) {
  const [companyName, setCompanyName] = useState(company?.name ?? "");
  const [saving, setSaving] = useState(false);

  async function saveCompanyName() {
    if (!companyName.trim()) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: companyName.trim() }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Company name updated");
    } catch {
      toast.error("Failed to update company name");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Company profile */}
      {isAdmin && company && (
        <Card className="border-gray-200 shadow-none">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-gray-700">Company Profile</CardTitle>
              <Badge variant={company.plan === "PAID" ? "default" : "outline"} className="text-xs">
                {company.plan}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Company Name</Label>
              <div className="flex gap-2">
                <Input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveCompanyName(); }}
                  placeholder="Company name"
                />
                <Button onClick={saveCompanyName} disabled={saving} size="sm">
                  {saving ? "Saving…" : "Save"}
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-gray-500">Slug</Label>
              <p className="text-sm text-gray-400 font-mono">{company.slug}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* User account */}
      {user && (
        <Card className="border-gray-200 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-700">Your Account</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-gray-500">Name</Label>
                <p className="text-sm text-gray-700">{user.name ?? "—"}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-500">Email</Label>
                <p className="text-sm text-gray-700">{user.email ?? "—"}</p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-gray-500">Role</Label>
                <Badge variant="outline" className="text-xs w-fit">{user.role}</Badge>
              </div>
            </div>
            <p className="text-xs text-gray-400">
              Contact your administrator to update your name or email.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
