import { useEffect, useState } from "react";
import { Check, Receipt, Store, Zap } from "lucide-react";
import { useTheme } from "next-themes";
import FloatingPosElements from "./floating-pos-elements";
import CtaButton from "../navbar/cta-button";

export const HeroSection = () => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <section
      id="product"
      className="relative flex w-full min-h-[100dvh] flex-col justify-center overflow-hidden bg-background pt-[calc(env(safe-area-inset-top,0px)+5rem)] pb-8 sm:min-h-[100svh] sm:pt-28 lg:pt-32 sm:pb-10 lg:justify-between scroll-mt-[calc(env(safe-area-inset-top,0px)+5rem)] sm:scroll-mt-32"
    >
      {/* 1. HERO BACKGROUND LIGHTING (Pure CSS radial gradient - zero blur rasterization) */}
      <div className="pointer-events-none absolute inset-0 -z-20 overflow-hidden" aria-hidden="true">
        <div
          className="absolute left-1/2 top-[30%] size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.18] dark:opacity-[0.22]"
          style={{
            background: isDark
              ? "radial-gradient(circle, rgba(96, 165, 250, 0.4) 0%, rgba(12, 115, 254, 0.15) 45%, transparent 70%)"
              : "radial-gradient(circle, rgba(12, 115, 254, 0.28) 0%, rgba(56, 189, 248, 0.10) 45%, transparent 70%)",
          }}
        />

        {/* Top subtle fade gradient */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-background to-transparent" />
      </div>

      {/* 2. AMBIENT FLOATING POS MICRO-ELEMENTS (Pure CSS keyframes, hidden on mobile) */}
      <FloatingPosElements />

      {/* 3. MAIN EDITORIAL HERO CONTENT */}
      <div className="pointer-events-auto relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-5 text-center my-auto sm:px-6 lg:px-8 lg:my-0">
        {/* PRODUCT BADGE */}
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-50/70 px-3 py-1 shadow-2xs backdrop-blur-sm dark:border-blue-400/20 dark:bg-blue-950/40">
          <span className="relative flex size-2 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#0C73FE] opacity-75 dark:bg-[#38BDF8]" />
            <span className="relative inline-flex size-2 rounded-full bg-[#0C73FE] dark:bg-[#38BDF8]" />
          </span>
          <span className="text-[10px] xs:text-[11px] font-bold uppercase tracking-[0.14em] text-[#0C73FE] dark:text-[#38BDF8]">
            THE MODERN POS FOR MODERN BUSINESS
          </span>
        </div>

        {/* STRONG HERO HEADLINE */}
        <h1 className="mt-3.5 sm:mt-5 font-display font-extrabold tracking-[-0.03em] text-zinc-950 dark:text-white text-[40px] xs:text-[46px] sm:text-6xl md:text-7xl lg:text-8xl leading-[1.06] sm:leading-[1.02]">
          <span className="block">Sell smarter.</span>
          <span className="block mt-0.5 sm:mt-1">Run everything.</span>
          <span className="block mt-0.5 sm:mt-1">
            With{" "}
            <span className="bg-gradient-to-r from-[#0C73FE] to-[#2563EB] bg-clip-text text-transparent">
              Ganatri.
            </span>
          </span>
        </h1>

        {/* SHORT SUPPORTING COPY */}
        <p className="mt-3 sm:mt-4 max-w-[340px] xs:max-w-[390px] sm:max-w-xl text-[13px] xs:text-sm sm:text-base leading-relaxed text-zinc-700 dark:text-zinc-300 px-1">
          From billing and inventory to customers and insights, Ganatri keeps your entire business
          moving from one powerful POS.
        </p>

        {/* CALL TO ACTION BUTTON */}
        <div className="mt-6 sm:mt-7 w-full max-w-[280px] sm:max-w-sm px-1">
          {/* PRIMARY CTA */}
          <CtaButton
            href="/register"
            size="lg"
            className="h-12 w-full justify-center rounded-2xl bg-gradient-to-r from-[#0C73FE] to-[#1D4ED8] text-[15px] font-bold text-white shadow-[0_8px_20px_-4px_rgba(12,115,254,0.35)] hover:opacity-95 active:scale-[0.98] transition-all"
          >
            Get Started Free →
          </CtaButton>
        </div>

        {/* 3 CORE FEATURE BENEFITS: Wrap items cleanly for perfect visibility */}
        <div className="mt-6 sm:mt-8 flex w-full max-w-[360px] sm:max-w-xl flex-wrap items-center justify-center gap-2">
          <div className="flex h-9 items-center gap-1.5 rounded-xl border border-black/[0.06] bg-white/90 px-3 text-[13px] font-semibold text-zinc-700 shadow-2xs backdrop-blur-sm dark:border-white/[0.08] dark:bg-zinc-900/90 dark:text-zinc-200">
            <Zap className="size-3.5 text-[#0C73FE] dark:text-[#38BDF8]" />
            <span>Offline-Ready POS</span>
          </div>
          <div className="flex h-9 items-center gap-1.5 rounded-xl border border-black/[0.06] bg-white/90 px-3 text-[13px] font-semibold text-zinc-700 shadow-2xs backdrop-blur-sm dark:border-white/[0.08] dark:bg-zinc-900/90 dark:text-zinc-200">
            <Receipt className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>GST & WhatsApp Bills</span>
          </div>
          <div className="flex h-9 items-center gap-1.5 rounded-xl border border-black/[0.06] bg-white/90 px-3 text-[13px] font-semibold text-zinc-700 shadow-2xs backdrop-blur-sm dark:border-white/[0.08] dark:bg-zinc-900/90 dark:text-zinc-200">
            <Store className="size-3.5 text-purple-600 dark:text-purple-400" />
            <span>Multi-Store Sync</span>
          </div>
        </div>

        {/* TRIAL / TRUST INDICATORS */}
        <div className="mt-3.5 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300">
          <span className="inline-flex items-center gap-1.5">
            <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
            Free 14-day trial
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
            No card needed
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Check className="size-3.5 text-emerald-600 dark:text-emerald-400 stroke-[2.5]" />
            2-min setup
          </span>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
