"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import Tooltip from "../tremor-tooltip";

// Helper to get initial theme without causing hydration mismatch
const getInitialTheme = (): "light" | "dark" => {
  if (typeof window === "undefined") return "light";
  const stored = localStorage.getItem("theme");
  if (stored === "light" || stored === "dark") return stored;
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  return mql.matches ? "dark" : "light";
};

export default function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<"light" | "dark">(getInitialTheme);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme, mounted]);

  const toggle = () => setTheme(t => (t === "dark" ? "light" : "dark"));

  return (
    <Tooltip content="Toggle theme" triggerAsChild>
      <button
        type="button"
        onClick={toggle}
        aria-label="Toggle theme"
        className={cn(
          "h-8 w-8 inline-flex items-center justify-center rounded-full hover:bg-accent hover:text-accent-foreground transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 cursor-pointer",
          className
        )}
      >
        {/* Avoid rendering mismatch: show placeholder until mounted */}
        {!mounted ? (
          <div className="animate-pulse h-4 w-4 rounded bg-muted" />
        ) : theme === "dark" ? (
          <Sun className="size-4" />
        ) : (
          <Moon className="size-4" />
        )}
      </button>
    </Tooltip>
  );
}
