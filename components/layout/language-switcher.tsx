"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const LOCALES = [
  { code: "en", label: "English" },
  { code: "fr", label: "Français" },
];

export function LanguageSwitcher() {
  const router = useRouter();
  const [current, setCurrent] = useState("en");

  // Sync initial display with the stored cookie (avoids always showing "EN")
  useEffect(() => {
    const match = document.cookie.match(/(?:^|;\s*)locale=([^;]+)/);
    const stored = match?.[1];
    if (stored && ["en", "fr"].includes(stored)) setCurrent(stored);
  }, []);

  async function switchLocale(locale: string) {
    await fetch("/api/locale", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale }),
    });
    setCurrent(locale);
    router.refresh();
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 gap-1.5 text-gray-500 hover:text-gray-900">
          <Globe className="h-4 w-4" />
          <span className="text-xs font-medium uppercase">{current}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        {LOCALES.map(({ code, label }) => (
          <DropdownMenuItem
            key={code}
            onClick={() => switchLocale(code)}
            className={current === code ? "font-medium text-emerald-700" : ""}
          >
            {label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
