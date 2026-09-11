import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, useMotionValueEvent, useScroll } from "motion/react";
import { Menu, X } from "lucide-react";
import logo from "@repo/assets/logo.png";
import { useAuthUser } from "@/store/auth.store";
import { NAV_ITEMS } from "./nav-data";
import NavItem from "./nav-item";
import ThemeToggle from "./theme-toggle";
import CtaButton from "./cta-button";
import MobileMenu from "./mobile-menu";

export const Navbar = () => {
  const authUser = useAuthUser();
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
      className="fixed inset-x-0 top-0 z-[9999] pointer-events-none transition-all duration-300 px-3 sm:px-6"
      style={{
        paddingTop: "max(0.625rem, calc(env(safe-area-inset-top, 0px) + 0.5rem))",
        paddingLeft: "max(0.75rem, env(safe-area-inset-left, 0px))",
        paddingRight: "max(0.75rem, env(safe-area-inset-right, 0px))",
      }}
      role="banner"
    >
      <div
        onMouseLeave={() => setActiveHoverIndex(null)}
        className={`pointer-events-auto relative mx-auto flex items-center justify-between transition-all duration-300 ${
          isScrolled
            ? "max-w-6xl rounded-2xl border border-black/[0.06] bg-white/90 py-1.5 px-2.5 sm:py-2.5 sm:px-6 shadow-[0_8px_24px_-4px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:border-white/[0.08] dark:bg-zinc-950/90 dark:shadow-[0_12px_32px_-4px_rgba(0,0,0,0.6)]"
            : "max-w-7xl rounded-2xl border border-black/[0.05] bg-white/80 py-1.5 px-2.5 sm:py-3 sm:px-8 shadow-xs backdrop-blur-md dark:border-white/[0.06] dark:bg-zinc-950/75"
        }`}
      >
        {/* LEFT: Ganatri Logo & Brand */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link
            to="/"
            className="group flex items-center gap-2.5 sm:gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C73FE] rounded-xl"
            aria-label="Ganatri Home"
          >
            <motion.div
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
              className="relative flex size-9 sm:size-10 items-center justify-center overflow-hidden rounded-xl border border-black/[0.06] bg-white p-1 shadow-2xs dark:border-white/10 dark:bg-zinc-900"
            >
              <img
                src={logo}
                alt="Ganatri Logo"
                className="relative size-6 sm:size-7 object-contain drop-shadow-xs transition-transform duration-200 group-hover:scale-105"
              />
            </motion.div>

            <div className="flex flex-col">
              <span className="text-[8px] sm:text-[9px] font-extrabold uppercase tracking-[0.24em] text-[#0C73FE] dark:text-[#38BDF8] leading-none">
                Loomsnack
              </span>
              <span className="font-display text-[17px] sm:text-[19px] font-bold tracking-tight text-zinc-950 dark:text-white leading-tight">
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

        {/* RIGHT: Actions (Dashboard/Login, ThemeToggle, Get Started CTA, Mobile Trigger) */}
        <div className="flex items-center gap-1.5 sm:gap-3">
          {/* Theme Toggle Button */}
          <ThemeToggle />

          {authUser ? (
            /* Logged in: Go to Dashboard */
            <div className="hidden sm:inline-flex">
              <CtaButton href="/organizations" size="default">
                Dashboard
              </CtaButton>
            </div>
          ) : (
            /* Logged out: Login + Get Started */
            <>
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center justify-center rounded-xl px-3.5 py-2 text-xs font-semibold text-zinc-700 hover:text-zinc-950 hover:bg-black/[0.04] dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/[0.06] transition-colors"
              >
                Login
              </Link>
              <div className="hidden sm:inline-flex">
                <CtaButton href="/register" size="default">
                  Get Started
                </CtaButton>
              </div>
            </>
          )}

          {/* Recognizable Menu / Close Button for Mobile */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="relative flex size-9 min-h-[44px] min-w-[44px] sm:size-10 items-center justify-center rounded-xl border border-black/[0.07] bg-white/80 shadow-2xs backdrop-blur-md transition-colors hover:border-black/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C73FE] md:hidden dark:border-white/10 dark:bg-zinc-900/80 dark:hover:border-white/25"
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
          >
            {mobileMenuOpen ? (
              <X className="size-4.5 text-zinc-800 dark:text-zinc-200" />
            ) : (
              <Menu className="size-4.5 text-zinc-800 dark:text-zinc-200" />
            )}
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

      {/* iOS Dynamic Island & Status Bar Scrim when scrolled (mobile only) */}
      <div
        className={`pointer-events-none fixed inset-x-0 top-0 transition-opacity duration-300 -z-10 sm:hidden ${
          isScrolled
            ? "opacity-100 bg-background/90 backdrop-blur-xl border-b border-border/20"
            : "opacity-0"
        }`}
        style={{
          height: "calc(env(safe-area-inset-top, 0px) + 0.625rem)",
        }}
        aria-hidden="true"
      />
    </header>
  );
};

export default Navbar;
