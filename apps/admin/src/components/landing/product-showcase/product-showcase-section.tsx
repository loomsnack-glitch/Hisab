import React from "react";
import {
  Boxes,
  Ruler,
  Receipt,
  Utensils,
  Truck,
  ShoppingBag,
  Wallet,
  TrendingUp,
  Landmark,
  MessageCircle,
  Users,
} from "lucide-react";


const ROW_1_ITEMS = [
  {
    name: "Products",
    icon: Boxes,
    color: "text-[#0C73FE] bg-[#0C73FE]/10 dark:text-[#38BDF8] dark:bg-[#38BDF8]/15",
  },
  {
    name: "Units",
    icon: Ruler,
    color: "text-sky-500 bg-sky-500/10 dark:text-sky-400 dark:bg-sky-400/15",
  },
  {
    name: "Billing POS",
    icon: Receipt,
    color: "text-emerald-500 bg-emerald-500/10 dark:text-emerald-400 dark:bg-emerald-400/15",
  },
  {
    name: "Tables & KOT",
    icon: Utensils,
    color: "text-amber-500 bg-amber-500/10 dark:text-amber-400 dark:bg-amber-400/15",
  },
  {
    name: "Vendors",
    icon: Truck,
    color: "text-purple-500 bg-purple-500/10 dark:text-purple-400 dark:bg-purple-400/15",
  },
  {
    name: "Purchases",
    icon: ShoppingBag,
    color: "text-blue-600 bg-blue-600/10 dark:text-blue-400 dark:bg-blue-400/15",
  },
];

const ROW_2_ITEMS = [
  {
    name: "Expenses",
    icon: Wallet,
    color: "text-rose-500 bg-rose-500/10 dark:text-rose-400 dark:bg-rose-400/15",
  },
  {
    name: "Reports & Sales",
    icon: TrendingUp,
    color: "text-cyan-500 bg-cyan-500/10 dark:text-cyan-400 dark:bg-cyan-400/15",
  },
  {
    name: "Money Accounts",
    icon: Landmark,
    color: "text-emerald-600 bg-emerald-600/10 dark:text-emerald-400 dark:bg-emerald-400/15",
  },
  {
    name: "WhatsApp Invoices",
    icon: MessageCircle,
    color: "text-green-500 bg-green-500/10 dark:text-green-400 dark:bg-green-400/15",
  },
  {
    name: "Google Contacts",
    icon: Users,
    color: "text-blue-500 bg-blue-500/10 dark:text-blue-400 dark:bg-blue-400/15",
  },
];

export const ProductShowcaseSection: React.FC = () => {
  return (
    <section
      id="workspace"
      className="relative w-full overflow-hidden bg-background pt-10 pb-20 sm:pt-16 sm:pb-28 lg:pt-20 lg:pb-32 scroll-mt-[calc(env(safe-area-inset-top,0px)+5rem)] sm:scroll-mt-28"
    >
      {/* Embedded CSS animation for high-performance mobile GPU marquee */}
      <style>{`
        @keyframes workspace-marquee-left {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        @keyframes workspace-marquee-right {
          0% { transform: translate3d(-50%, 0, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
        .animate-workspace-left {
          animation: workspace-marquee-left 24s linear infinite;
          will-change: transform;
        }
        .animate-workspace-right {
          animation: workspace-marquee-right 24s linear infinite;
          will-change: transform;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-workspace-left,
          .animate-workspace-right {
            animation-play-state: paused;
          }
        }
      `}</style>

      {/* 1. EXTREMELY SUBTLE AMBIENT BACKGROUND GLOW (Pure radial gradient, zero blur overhead) */}
      <div
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="absolute left-1/2 top-1/2 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.10] dark:opacity-[0.15]"
          style={{
            background:
              "radial-gradient(circle, rgba(12, 115, 254, 0.4) 0%, rgba(56, 189, 248, 0.15) 50%, transparent 70%)",
          }}
        />
      </div>

      <div className="mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* 2. SECTION HEADING */}
        <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/90 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-700 shadow-2xs dark:border-white/[0.1] dark:bg-zinc-900/90 dark:text-zinc-300">
            <span className="size-1.5 rounded-full bg-[#0C73FE] dark:bg-[#38BDF8]" />
            <span>THE GANATRI WORKSPACE</span>
          </div>

          {/* Headline */}
          <div className="mt-4">
            <h2 className="font-display font-black tracking-[-0.03em] text-zinc-950 dark:text-white text-3xl sm:text-5xl lg:text-6xl leading-[1.08] sm:leading-[1.05]">
              {`Everything flows\nthrough Ganatri.`}
            </h2>
          </div>

          {/* Description */}
          <div className="mt-3.5 max-w-xl">
              <p className="text-sm leading-relaxed text-zinc-600 sm:text-base lg:text-lg dark:text-zinc-400">
                All your everyday business tools, moving together in one workspace.
              </p>
          </div>
        </div>

        {/* UNIFIED DUAL-ROW MARQUEE — ultra-smooth 60fps GPU acceleration */}
        <div
          className="relative mt-10 sm:mt-14 lg:mt-16 flex flex-col gap-3 sm:gap-4 w-full overflow-hidden py-1.5"
          style={{
            maskImage:
              "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to right, transparent 0%, black 8%, black 92%, transparent 100%)",
          }}
        >
          {/* Track 1: Moving Left */}
          <div className="flex w-max animate-workspace-left gap-3">
            {[...ROW_1_ITEMS, ...ROW_1_ITEMS].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={`track1-${item.name}-${idx}`}
                  className="inline-flex items-center gap-2.5 rounded-2xl border border-black/[0.08] bg-white/95 px-4 py-2.5 sm:px-5 sm:py-3 shadow-2xs dark:border-white/[0.1] dark:bg-zinc-900/95 shrink-0 select-none"
                >
                  <div
                    className={`flex size-7 sm:size-8 items-center justify-center rounded-xl ${item.color}`}
                  >
                    <Icon className="size-4 sm:size-4.5" />
                  </div>
                  <span className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                    {item.name}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Track 2: Moving Right */}
          <div className="flex w-max animate-workspace-right gap-3">
            {[...ROW_2_ITEMS, ...ROW_2_ITEMS].map((item, idx) => {
              const Icon = item.icon;
              return (
                <div
                  key={`track2-${item.name}-${idx}`}
                  className="inline-flex items-center gap-2.5 rounded-2xl border border-black/[0.08] bg-white/95 px-4 py-2.5 sm:px-5 sm:py-3 shadow-2xs dark:border-white/[0.1] dark:bg-zinc-900/95 shrink-0 select-none"
                >
                  <div
                    className={`flex size-7 sm:size-8 items-center justify-center rounded-xl ${item.color}`}
                  >
                    <Icon className="size-4 sm:size-4.5" />
                  </div>
                  <span className="text-sm sm:text-base font-semibold text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                    {item.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

      </div>
    </section>
  );
};

export default ProductShowcaseSection;
