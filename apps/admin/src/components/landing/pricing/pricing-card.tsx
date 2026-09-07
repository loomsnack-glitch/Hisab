import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { Check, ArrowRight, ChevronDown } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import type { PricingPlan } from "./pricing-data";

interface PricingCardProps {
  plan: PricingPlan;
}

export const PricingCard: React.FC<PricingCardProps> = ({ plan }) => {
  const isPro = plan.popular;
  const isCustom = plan.id === "custom";

  // For Core plan, initially show top 6 features with expandable toggle for all 10
  const hasExpandableFeatures = plan.features.length > 6 && !isPro && !isCustom;
  const [isExpanded, setIsExpanded] = useState(false);

  // Responsive order: Pro first on mobile, Core second, Custom third; on desktop: Core, Pro, Custom
  const getOrderClasses = () => {
    switch (plan.id) {
      case "pro":
        return "order-1 lg:order-2";
      case "core":
        return "order-2 lg:order-1";
      case "custom":
        return "order-3 lg:order-3";
    }
  };

  // ENHANCED PRO CARD (CLEAN STATIC HIGHLIGHT)
  if (isPro) {
    return (
      <div
        className={`group relative flex flex-col ${getOrderClasses()} mt-5 lg:mt-4 transition-all duration-250 ease-out hover:-translate-y-[3px]`}
      >
        {/* BEST VALUE BADGE — sits above the card, fully visible */}
        {plan.badge && (
          <div className="absolute -top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#0C73FE] to-[#1D4ED8] px-3.5 py-1 text-[11px] font-bold uppercase tracking-wider text-white shadow-lg dark:from-[#38BDF8] dark:to-[#0C73FE] dark:text-zinc-950">
              <span className="size-1.5 rounded-full bg-white dark:bg-zinc-950 opacity-90" />
              {plan.badge}
            </span>
          </div>
        )}

        {/* Clean highlighted card — NO overflow-hidden so badge is never clipped */}
        <div className="relative flex flex-col h-full rounded-3xl border-2 border-[#0C73FE] dark:border-[#38BDF8] bg-card/95 shadow-[0_4px_32px_-4px_rgba(12,115,254,0.22)] dark:shadow-[0_4px_32px_-4px_rgba(56,189,248,0.18)] p-5 sm:p-7 md:p-8">

          {/* Subtle blue inner glow at top */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 rounded-t-3xl bg-gradient-to-b from-[#0C73FE]/[0.05] to-transparent dark:from-[#38BDF8]/[0.07]" />

          {/* PLAN NAME + SAVINGS */}
          <div className="flex items-center justify-between">
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
              {plan.name}
            </h3>
            {plan.savings && (
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                {plan.savings}
              </span>
            )}
          </div>

          <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
            {plan.description}
          </p>

          {/* PRICE */}
          <div className="mt-5">
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-4xl sm:text-5xl font-black text-foreground tracking-tight">
                {plan.price}
              </span>
              <span className="text-sm sm:text-base font-medium text-muted-foreground">
                {plan.period}
              </span>
            </div>
            {plan.valueLine && (
              <div className="mt-1 text-[11px] font-medium text-muted-foreground line-through">
                {plan.valueLine}
              </div>
            )}
          </div>

          {/* SEPARATOR */}
          <div className="my-5 h-px w-full bg-[#0C73FE]/20 dark:bg-[#38BDF8]/20" />

          {/* FEATURE LIST */}
          <ul className="space-y-2.5 text-xs sm:text-sm">
            {plan.features.map((feature, fIdx) => (
              <li key={fIdx} className="flex items-start gap-2.5">
                <div className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#0C73FE]/10 text-[#0C73FE] mt-0.5 dark:bg-[#38BDF8]/15 dark:text-[#38BDF8]">
                  <Check className="size-3 stroke-[2.5]" />
                </div>
                <span
                  className={`${
                    feature.includes("Everything in Core")
                      ? "font-bold text-foreground"
                      : "text-muted-foreground"
                  }`}
                >
                  {feature}
                </span>
              </li>
            ))}
          </ul>

          {/* CTA BUTTON */}
          <div className="mt-6">
            <Button
              className="group/btn relative w-full h-12 rounded-xl text-sm sm:text-base font-bold text-white bg-[#0C73FE] shadow-md hover:bg-[#0C73FE]/90 hover:brightness-105 active:scale-[0.99] transition-all group-hover:shadow-[0_8px_24px_rgba(12,115,254,0.35)] dark:bg-[#38BDF8] dark:text-zinc-950 dark:hover:bg-[#38BDF8]/90"
              render={<Link to={plan.ctaHref} />}
            >
              <span className="relative z-10 flex items-center justify-center gap-2">
                {plan.ctaLabel}
                <ArrowRight className="size-4 transition-transform duration-200 group-hover/btn:translate-x-[3px]" />
              </span>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // STANDARD CARD (CORE & CUSTOM - CLEAN & STATIC)
  return (
    <div
      className={`group relative flex flex-col justify-between rounded-3xl p-5 sm:p-7 md:p-8 transition-all duration-250 ease-out hover:-translate-y-1 hover:shadow-xl ${getOrderClasses()} border border-border/80 bg-card/85 shadow-sm hover:border-border dark:bg-card/70`}
    >
      {/* 1. CARD HEADER & PRICING */}
      <div>
        <div className="flex items-center justify-between">
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            {plan.name}
          </h3>
        </div>

        <p className="mt-2 text-xs sm:text-sm text-muted-foreground leading-relaxed">
          {plan.description}
        </p>

        {/* Price Display */}
        <div className="mt-6 flex flex-col justify-end min-h-[64px]">
          {isCustom ? (
            <div className="flex items-baseline">
              <span className="font-display text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight">
                {plan.price}
              </span>
            </div>
          ) : (
            <div className="flex items-baseline gap-1.5">
              <span className="font-display text-4xl sm:text-5xl font-black text-foreground tracking-tight">
                {plan.price}
              </span>
              <span className="text-sm sm:text-base font-medium text-muted-foreground">
                {plan.period}
              </span>
            </div>
          )}

          <div className="mt-1 text-[11px] opacity-0 select-none pointer-events-none" aria-hidden="true">
            placeholder
          </div>
        </div>

        {/* Separator */}
        <div className="my-5 h-px w-full bg-border/60" />

        {/* 2. FEATURE LIST */}
        <ul className="space-y-2.5 text-xs sm:text-sm">
          {plan.features.slice(0, 6).map((feature, fIdx) => (
            <li key={fIdx} className="flex items-start gap-2.5">
              <div className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#0C73FE]/10 text-[#0C73FE] mt-0.5 dark:bg-[#38BDF8]/15 dark:text-[#38BDF8]">
                <Check className="size-3 stroke-[2.5]" />
              </div>
              <span className="text-muted-foreground">
                {feature}
              </span>
            </li>
          ))}
        </ul>

        {/* Expandable additional features with super smooth drop down animation */}
        <AnimatePresence initial={false}>
          {hasExpandableFeatures && isExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="overflow-hidden"
            >
              <ul className="space-y-2.5 pt-2.5 text-xs sm:text-sm">
                {plan.features.slice(6).map((feature, fIdx) => (
                  <motion.li
                    key={fIdx}
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{
                      duration: 0.25,
                      delay: fIdx * 0.04,
                      ease: [0.16, 1, 0.3, 1],
                    }}
                    className="flex items-start gap-2.5"
                  >
                    <div className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#0C73FE]/10 text-[#0C73FE] mt-0.5 dark:bg-[#38BDF8]/15 dark:text-[#38BDF8]">
                      <Check className="size-3 stroke-[2.5]" />
                    </div>
                    <span className="text-muted-foreground">
                      {feature}
                    </span>
                  </motion.li>
                ))}
              </ul>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Expandable toggle button with smooth rotating chevron */}
        {hasExpandableFeatures && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="mt-3.5 inline-flex items-center gap-1.5 text-xs font-semibold text-[#0C73FE] transition-colors hover:text-[#0C73FE]/80 dark:text-[#38BDF8] dark:hover:text-[#38BDF8]/80 cursor-pointer"
          >
            <span>{isExpanded ? "Show fewer features" : `View all features (${plan.features.length})`}</span>
            <motion.span
              animate={{ rotate: isExpanded ? 180 : 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="inline-flex items-center justify-center"
            >
              <ChevronDown className="size-3.5" />
            </motion.span>
          </button>
        )}
      </div>

      {/* 3. CALL TO ACTION BUTTON */}
      <div className="mt-8 pt-2">
        {isCustom ? (
          <Button
            variant="outline"
            className="w-full h-11 rounded-xl text-sm font-semibold border-border hover:border-[#0C73FE]/50 hover:bg-[#0C73FE]/5 dark:hover:border-[#38BDF8]/50 dark:hover:bg-[#38BDF8]/5 transition-all"
            render={<a href={plan.ctaHref} />}
          >
            <span className="flex items-center justify-center gap-1.5">
              {plan.ctaLabel}
              <ArrowRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-1" />
            </span>
          </Button>
        ) : (
          <Button
            variant="outline"
            className="w-full h-11 rounded-xl text-sm font-semibold border-border hover:border-[#0C73FE]/50 hover:bg-[#0C73FE]/5 dark:hover:border-[#38BDF8]/50 dark:hover:bg-[#38BDF8]/5 transition-all"
            render={<Link to={plan.ctaHref} />}
          >
            {plan.ctaLabel}
          </Button>
        )}
      </div>
    </div>
  );
};

export default PricingCard;
