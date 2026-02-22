"use client";

import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, X } from "lucide-react";

type Props = {
  companyName: string;
  initialLogo: string | null;
};

export function BrandingView({ companyName, initialLogo }: Props) {
  const [logo, setLogo] = useState<string | null>(initialLogo);
  const [preview, setPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 200 * 1024) {
      toast.error("File must be under 200KB");
      return;
    }
    if (!file.type.match(/^image\/(png|jpeg|jpg)$/)) {
      toast.error("Only PNG and JPG files are supported");
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setPreview(result);
    };
    reader.readAsDataURL(file);
  }

  async function saveLogo() {
    if (!preview) return;
    setSaving(true);
    try {
      const res = await fetch("/api/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logo: preview }),
      });
      if (!res.ok) throw new Error("Failed");
      setLogo(preview);
      setPreview(null);
      toast.success("Logo saved");
    } catch {
      toast.error("Failed to save logo");
    } finally {
      setSaving(false);
    }
  }

  async function removeLogo() {
    setSaving(true);
    try {
      const res = await fetch("/api/company", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logo: null }),
      });
      if (!res.ok) throw new Error("Failed");
      setLogo(null);
      setPreview(null);
      toast.success("Logo removed");
    } catch {
      toast.error("Failed to remove logo");
    } finally {
      setSaving(false);
    }
  }

  const displayLogo = preview ?? logo;

  return (
    <Card className="border-gray-200 shadow-none">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium text-gray-700">Company Logo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-gray-500">
          Upload a PNG or JPG logo (max 200KB). It will appear in the sidebar and on exported reports.
        </p>

        {/* Current logo / preview */}
        <div className="flex items-center gap-4">
          <div className="h-20 w-40 border border-gray-200 rounded-lg flex items-center justify-center bg-gray-50 overflow-hidden">
            {displayLogo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={displayLogo} alt={companyName} className="max-h-full max-w-full object-contain p-2" />
            ) : (
              <span className="text-xs text-gray-400 text-center px-2">No logo uploaded</span>
            )}
          </div>
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-700">{companyName}</div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="h-3.5 w-3.5 mr-1" />
                Choose file
              </Button>
              {logo && !preview && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-gray-400 hover:text-red-500"
                  onClick={removeLogo}
                  disabled={saving}
                >
                  <X className="h-3.5 w-3.5 mr-1" />
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          className="hidden"
          onChange={handleFile}
        />

        {preview && (
          <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500 flex-1">New logo selected. Save to apply.</p>
            <Button size="sm" variant="ghost" onClick={() => setPreview(null)}>Cancel</Button>
            <Button size="sm" onClick={saveLogo} disabled={saving}>
              {saving ? "Saving…" : "Save logo"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
