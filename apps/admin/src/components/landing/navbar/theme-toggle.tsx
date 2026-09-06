import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";

export const ThemeToggle = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = resolvedTheme === "dark";
  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  if (!mounted) {
    return (
      <div
        className="relative flex size-10 items-center justify-center rounded-xl border border-black/5 bg-black/[0.02] dark:border-white/10 dark:bg-white/[0.04]"
        aria-hidden="true"
      >
        <span className="size-4 animate-pulse rounded-full bg-muted" />
      </div>
    );
  }

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="group relative flex size-10 items-center justify-center rounded-xl border border-black/8 bg-white/70 shadow-sm backdrop-blur-md transition-colors duration-200 hover:border-black/20 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C73FE] dark:border-white/10 dark:bg-zinc-900/80 dark:hover:border-white/25 dark:hover:bg-zinc-800/90"
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      <div className="relative flex size-5 items-center justify-center overflow-hidden">
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.div
              key="moon"
              initial={{ rotate: -90, scale: 0, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: 90, scale: 0, opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 350,
                damping: 25,
                duration: 0.3,
              }}
              className="flex items-center justify-center text-[#38BDF8] drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]"
            >
              <MoonStar className="size-4.5" />
            </motion.div>
          ) : (
            <motion.div
              key="sun"
              initial={{ rotate: 90, scale: 0, opacity: 0 }}
              animate={{ rotate: 0, scale: 1, opacity: 1 }}
              exit={{ rotate: -90, scale: 0, opacity: 0 }}
              transition={{
                type: "spring",
                stiffness: 350,
                damping: 25,
                duration: 0.3,
              }}
              className="flex items-center justify-center text-amber-500 group-hover:text-amber-600 drop-shadow-[0_0_8px_rgba(245,158,11,0.4)]"
            >
              <SunMedium className="size-4.5" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <span className="sr-only">Toggle theme</span>
    </motion.button>
  );
};

export default ThemeToggle;
