"use client";

import React from "react";
import { Link } from "react-router-dom";
import logo from "@repo/assets/logo.png";
import { CtaButton } from "../navbar/cta-button";

export const Footer: React.FC = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="relative w-full overflow-hidden border-t border-border/40 bg-gradient-to-b from-transparent via-slate-50/50 to-slate-100/80 dark:via-[#070e1b]/60 dark:to-[#050b16] transition-colors duration-300">
      {/* 1. SUBTLE AMBIENT BLUE GLOW BEHIND CTA (Pure CSS radial gradient, zero blur overhead) */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 flex justify-center overflow-hidden"
        aria-hidden="true"
      >
        <div
          className="h-[280px] w-[540px] -translate-y-1/2 rounded-full opacity-[0.08] dark:opacity-[0.12]"
          style={{
            background:
              "radial-gradient(circle, rgba(12, 115, 254, 0.45) 0%, rgba(56, 189, 248, 0.15) 50%, transparent 75%)",
          }}
        />
      </div>

      {/* 2. ILLUMINATED BENTO CTA CONTAINER */}
      <div className="mx-auto max-w-5xl px-4 pt-8 pb-10 sm:px-6 sm:pt-10 sm:pb-14 lg:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-black/[0.08] bg-gradient-to-b from-white/90 via-sky-50/20 to-white/70 p-8 sm:p-12 lg:p-14 text-center shadow-lg shadow-blue-500/[0.03] backdrop-blur-xl dark:border-white/[0.1] dark:bg-gradient-to-b dark:from-zinc-900/80 dark:via-blue-950/20 dark:to-zinc-900/80 dark:shadow-black/40">
          {/* Top subtle highlight shimmer */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[#0C73FE]/35 to-transparent" />

          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2 rounded-full border border-[#0C73FE]/20 bg-[#0C73FE]/5 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-[#0C73FE] dark:border-[#38BDF8]/20 dark:bg-[#38BDF8]/10 dark:text-[#38BDF8] mb-4">
            <span className="size-1.5 rounded-full bg-[#0C73FE] dark:bg-[#38BDF8] animate-pulse" />
            <span>GET STARTED TODAY</span>
          </div>

          {/* Editorial Heading */}
          <h2 className="font-display font-black tracking-[-0.03em] text-zinc-950 dark:text-white text-3xl sm:text-4xl lg:text-[42px] leading-[1.12]">
            {`Ready to simplify\nyour business?`}
          </h2>

          {/* Supporting description */}
          <p className="mx-auto mt-3.5 max-w-lg text-sm leading-relaxed text-zinc-600 sm:text-base dark:text-zinc-400">
            Start with Ganatri and keep your everyday business operations in one place.
          </p>

          {/* Action Buttons */}
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-3.5">
            {/* Primary CTA */}
            <CtaButton
              href="/register"
              size="default"
              className="!h-11 px-6 text-sm font-semibold shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
            >
              Get Started
            </CtaButton>

            {/* Secondary CTA: Book a Demo */}
            <a
              href="#support"
              className="group flex h-11 items-center justify-center gap-2 rounded-xl border border-black/10 bg-white/80 px-6 text-sm font-semibold tracking-tight text-zinc-800 shadow-2xs backdrop-blur-md transition-all duration-200 hover:border-black/20 hover:bg-white active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C73FE] dark:border-white/10 dark:bg-zinc-900/80 dark:text-zinc-200 dark:hover:border-white/25 dark:hover:bg-zinc-800 cursor-pointer whitespace-nowrap"
            >
              <span>Book a Demo</span>
            </a>
          </div>
        </div>
      </div>

      {/* 3. THIN SUBTLE DIVIDER (6-8% opacity) */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="h-px w-full bg-black/[0.07] dark:bg-white/[0.07]" />
      </div>

      {/* 4. MAIN COMPACT FOOTER NAVIGATION & BRAND BLOCK */}
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          {/* LEFT: Brand Block */}
          <div className="max-w-xs space-y-2.5">
            <Link
              to="/"
              className="group inline-flex items-center gap-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C73FE] rounded-lg"
              aria-label="Ganatri Home"
            >
              <div
                className="relative flex size-8 items-center justify-center overflow-hidden rounded-lg border border-black/[0.06] bg-white p-1 shadow-2xs transition-transform duration-200 group-hover:scale-105 dark:border-white/10 dark:bg-zinc-900"
              >
                <img
                  src={logo}
                  alt="Ganatri Logo"
                  className="size-5 object-contain"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="font-display text-base font-bold tracking-tight text-zinc-950 dark:text-white">
                  Ganatri
                </span>
                {/* Subtle cyan status dot */}
                <span
                  className="flex size-1.5 rounded-full bg-[#38BDF8] opacity-80"
                  title="System Active"
                  aria-hidden="true"
                />
              </div>
            </Link>

            <p className="text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
              Simple POS software for everyday business.
            </p>

            <div className="inline-flex items-center rounded-md border border-black/[0.06] bg-black/[0.02] px-2 py-0.5 text-[10px] font-medium tracking-wide text-zinc-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-zinc-400">
              POS Software
            </div>
          </div>

          {/* RIGHT / CENTER: Semantic Navigation Columns */}
          <nav
            className="grid grid-cols-2 gap-7 sm:grid-cols-3 sm:gap-10"
            aria-label="Footer navigation"
          >
            {/* Product Links */}
            <div className="space-y-2.5">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-950 dark:text-white">
                Product
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <a
                    href="#workspace"
                    className="text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C73FE] rounded-xs"
                  >
                    Features
                  </a>
                </li>
                <li>
                  <a
                    href="#pricing"
                    className="text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C73FE] rounded-xs"
                  >
                    Pricing
                  </a>
                </li>
              </ul>
            </div>

            {/* Company / Help Links */}
            <div className="space-y-2.5">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-950 dark:text-white">
                Company
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <a
                    href="#support"
                    className="text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C73FE] rounded-xs"
                  >
                    Need Help
                  </a>
                </li>
                <li>
                  <a
                    href="#support"
                    className="text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C73FE] rounded-xs"
                  >
                    Contact Team
                  </a>
                </li>
                <li>
                  <a
                    href="#support"
                    className="text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C73FE] rounded-xs"
                  >
                    Book a Demo
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal Links */}
            <div className="space-y-2.5 col-span-2 sm:col-span-1">
              <h4 className="text-[11px] font-bold uppercase tracking-[0.16em] text-zinc-950 dark:text-white">
                Legal
              </h4>
              <ul className="space-y-2 text-xs">
                <li>
                  <a
                    href="#support"
                    className="text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C73FE] rounded-xs"
                  >
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a
                    href="#support"
                    className="text-zinc-500 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-white transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C73FE] rounded-xs"
                  >
                    Terms & Conditions
                  </a>
                </li>
              </ul>
            </div>
          </nav>
        </div>
      </div>

      {/* 5. BOTTOM BAR DIVIDER */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="h-px w-full bg-black/[0.05] dark:bg-white/[0.05]" />
      </div>

      {/* 6. COMPACT BOTTOM COPYRIGHT BAR */}
      <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6 sm:py-4.5 lg:px-8">
        <div className="flex flex-col items-center justify-between gap-2 text-xs text-zinc-500 sm:flex-row dark:text-zinc-500">
          <p>© {currentYear} Ganatri. All rights reserved.</p>
          <p className="text-zinc-400 dark:text-zinc-500 tracking-tight font-medium">
            Built to keep business moving.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
