import React from "react";
import { PRICING_PLANS } from "./pricing-data";
import { PricingCard } from "./pricing-card";
import { PricingTrustStrip } from "./pricing-trust-strip";

export const PricingSection: React.FC = () => {
  return (
    <section
      id="pricing"
      className="relative mx-auto mt-10 w-full max-w-7xl px-4 sm:mt-16 sm:px-6 lg:px-8 scroll-mt-[calc(env(safe-area-inset-top,0px)+5rem)] sm:scroll-mt-28"
    >
      {/* 1. AMBIENT BACKGROUND GLOW (Pure CSS radial gradient, zero blur overhead) */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden" aria-hidden="true">
        <div
          className="absolute left-1/2 top-1/3 size-[650px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.10] dark:opacity-[0.14]"
          style={{
            background:
              "radial-gradient(circle, rgba(12, 115, 254, 0.35) 0%, rgba(56, 189, 248, 0.12) 50%, transparent 70%)",
          }}
        />
      </div>

      {/* 2. SECTION HEADER */}
      <div className="mx-auto flex max-w-3xl flex-col items-center text-center">
        {/* Eyebrow badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-black/[0.08] bg-white/80 px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-700 shadow-2xs backdrop-blur-md dark:border-white/[0.1] dark:bg-zinc-900/80 dark:text-zinc-300">
          <span className="size-1.5 rounded-full bg-[#0C73FE] dark:bg-[#38BDF8]" />
          <span>SIMPLE PRICING</span>
        </div>

        {/* Headline */}
        <div className="mt-4">
          <h2 className="font-display font-black tracking-[-0.03em] text-zinc-950 dark:text-white text-3xl sm:text-5xl lg:text-6xl leading-[1.08] sm:leading-[1.05]">
            {`Choose the Ganatri Plan.`}
          </h2>
        </div>



      </div>

      {/* 3. THREE PRICING CARDS ROW */}
      <div className="mx-auto mt-8 sm:mt-12 grid max-w-6xl grid-cols-1 gap-5 sm:gap-6 lg:grid-cols-3">
        {PRICING_PLANS.map((plan) => (
          <PricingCard
            key={plan.id}
            plan={plan}
          />
        ))}
      </div>

      {/* 4. INCLUDED IN EVERY PLAN TRUST STRIP */}
      <PricingTrustStrip />
    </section>
  );
};

export default PricingSection;
