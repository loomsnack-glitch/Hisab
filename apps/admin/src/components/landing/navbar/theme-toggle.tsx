import { useEffect, useState } from "react";
import { MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";

export const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";
  const toggleTheme = () => {
    setTheme(resolvedTheme === "dark" ? "light" : "dark");
  };

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="group relative flex size-9 min-h-[44px] min-w-[44px] sm:size-10 items-center justify-center rounded-xl border border-black/[0.07] bg-white/80 shadow-2xs backdrop-blur-md transition-all duration-100 active:scale-95 hover:border-black/20 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C73FE] dark:border-white/10 dark:bg-zinc-900/80 dark:hover:border-white/25 dark:hover:bg-zinc-800/90 cursor-pointer"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <div className="relative flex size-5 items-center justify-center overflow-hidden">
        {/* Sun icon (visible in light mode) */}
        <SunMedium
          className={`size-4.5 text-amber-500 transition-all duration-150 ease-out ${
            isDark
              ? "scale-0 rotate-90 opacity-0 absolute pointer-events-none"
              : "scale-100 rotate-0 opacity-100 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]"
          }`}
        />

        {/* Moon icon (visible in dark mode) */}
        <MoonStar
          className={`size-4.5 text-[#38BDF8] transition-all duration-150 ease-out ${
            isDark
              ? "scale-100 rotate-0 opacity-100 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]"
              : "scale-0 -rotate-90 opacity-0 absolute pointer-events-none"
          }`}
        />
      </div>
      <span className="sr-only">Toggle theme</span>
    </button>
  );
};

export default ThemeToggle;
