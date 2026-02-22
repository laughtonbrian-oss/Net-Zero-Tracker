"use client";

import { signOut, useSession } from "next-auth/react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User, Moon, Sun } from "lucide-react";
import { LanguageSwitcher } from "@/components/layout/language-switcher";

export function Header() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const name = session?.user?.name ?? session?.user?.email ?? "User";
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <header className="h-14 border-b border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-end gap-2 px-6 shrink-0">
      <LanguageSwitcher />

      {/* Dark mode toggle */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-gray-400 hover:text-gray-700 dark:text-slate-400 dark:hover:text-white"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        title="Toggle dark mode"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      </Button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="text-xs bg-emerald-600 text-white font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <div className="px-2 py-1.5">
            <p className="text-sm font-medium truncate">{name}</p>
            <p className="text-xs text-gray-500 truncate">
              {session?.user?.role?.toLowerCase()}
            </p>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a href="/settings" className="flex items-center gap-2 cursor-pointer">
              <User className="h-4 w-4" />
              Settings
            </a>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="flex items-center gap-2 text-red-600 cursor-pointer"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
