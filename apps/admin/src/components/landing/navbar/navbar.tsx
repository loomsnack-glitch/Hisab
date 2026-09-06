import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import logo from "@repo/assets/logo.png";
import { NAV_ITEMS } from "./nav-data";
import NavItem from "./nav-item";
import ThemeToggle from "./theme-toggle";
import CtaButton from "./cta-button";
import MobileMenu from "./mobile-menu";

export const Navbar = () => {
  const { scrollY } = useScroll();
  const [isScrolled, setIsScrolled] = useState(false);
  const [activeHoverIndex, setActiveHoverIndex] = useState<number | null>(null);
  const [activeHash, setActiveHash] = useState<string>("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  // Efficient scroll detection ONLY for visual transformation threshold (no hide logic)
  useMotionValueEvent(scrollY, "change", (latest) => {
    setIsScrolled(latest > 40);
  });

  // Keep active hash synced
  useEffect(() => {
    setActiveHash(window.location.hash || "#product");

    const handleHashChange = () => {
      setActiveHash(window.location.hash);
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, [location]);

  // Keyboard accessibility: Escape key closes mobile menu
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
        setActiveHoverIndex(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <header
      className="fixed top-3 inset-x-0 z-[9999] px-3 sm:px-6 pointer-events-none"
      role="banner"
    >
      <div
        onMouseLeave={() => setActiveHoverIndex(null)}
        className={`pointer-events-auto relative mx-auto flex items-center justify-between transition-all duration-300 ${
          isScrolled
            ? "max-w-6xl rounded-2xl border border-black/[0.08] bg-white/85 py-2.5 px-4 sm:px-6 shadow-[0_12px_32px_-4px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.03)] backdrop-blur-xl dark:border-white/[0.09] dark:bg-zinc-950/85 dark:shadow-[0_16px_40px_-4px_rgba(0,0,0,0.6)]"
            : "max-w-7xl rounded-2xl border border-black/[0.04] bg-white/50 py-3.5 px-4 sm:px-8 shadow-none backdrop-blur-md dark:border-white/[0.05] dark:bg-zinc-950/40"
        }`}
      >
        {/* LEFT: Ganatri Logo & Brand */}
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="group flex items-center gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C73FE] rounded-xl"
            aria-label="Ganatri Home"
          >
            <motion.div
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="relative flex size-10 items-center justify-center overflow-hidden rounded-xl border border-black/[0.06] bg-white p-1.5 shadow-sm dark:border-white/10 dark:bg-zinc-900"
            >
              <img
                src={logo}
                alt="Ganatri Logo"
                className="relative size-7 object-contain drop-shadow-xs transition-transform duration-200 group-hover:scale-105"
              />
            </motion.div>

            <div className="flex flex-col">
              <span className="text-[9px] font-extrabold uppercase tracking-[0.26em] text-[#0C73FE] dark:text-[#38BDF8]">
                Loomsnack
              </span>
              <span className="font-display text-[19px] font-bold tracking-tight text-zinc-950 dark:text-white">
                Ganatri
              </span>
            </div>
          </Link>
        </div>

        {/* CENTER: Desktop Navigation Links (Clean links, normal hover color, no dropdowns) */}
        <nav
          className="hidden items-center gap-1 md:flex"
          aria-label="Main navigation"
        >
          {NAV_ITEMS.map((item, idx) => {
            const isActive = activeHash === item.href;

            return (
              <NavItem
                key={item.label}
                item={item}
                isActive={isActive}
                isHovered={activeHoverIndex === idx}
                onHover={() => setActiveHoverIndex(idx)}
                onLeave={() => {
                  if (activeHoverIndex === idx) {
                    setActiveHoverIndex(null);
                  }
                }}
                onClick={() => setActiveHash(item.href)}
              />
            );
          })}
        </nav>

        {/* RIGHT: Actions (Login, ThemeToggle, Get Started CTA, Mobile Trigger) */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Theme Toggle Button */}
          <ThemeToggle />

          {/* Desktop Get Started CTA */}
          <div className="hidden sm:inline-flex">
            <CtaButton href="/register" size="default">
              Get Started
            </CtaButton>
          </div>

          {/* Animated Hamburger Button for Mobile */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="relative flex size-10 items-center justify-center rounded-xl border border-black/8 bg-white/70 shadow-sm backdrop-blur-md transition-colors hover:border-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C73FE] md:hidden dark:border-white/10 dark:bg-zinc-900/80 dark:hover:border-white/30"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            <div className="relative flex size-5 flex-col items-center justify-center gap-1.2">
              <motion.span
                animate={
                  mobileMenuOpen
                    ? { rotate: 45, y: 6.5 }
                    : { rotate: 0, y: 0 }
                }
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="h-[2px] w-4.5 rounded-full bg-zinc-800 dark:bg-zinc-200 origin-center"
              />
              <motion.span
                animate={
                  mobileMenuOpen
                    ? { opacity: 0, x: -6 }
                    : { opacity: 1, x: 0 }
                }
                transition={{ duration: 0.15 }}
                className="h-[2px] w-4.5 rounded-full bg-zinc-800 dark:bg-zinc-200"
              />
              <motion.span
                animate={
                  mobileMenuOpen
                    ? { rotate: -45, y: -6.5 }
                    : { rotate: 0, y: 0 }
                }
                transition={{ type: "spring", stiffness: 400, damping: 25 }}
                className="h-[2px] w-4.5 rounded-full bg-zinc-800 dark:bg-zinc-200 origin-center"
              />
            </div>
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay & Drawer */}
      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        items={NAV_ITEMS}
        activeHref={activeHash}
      />
    </header>
  );
};

export default Navbar;
