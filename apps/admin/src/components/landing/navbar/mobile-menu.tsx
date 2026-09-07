import React from "react";
import { AnimatePresence, motion } from "motion/react";
import { Link } from "react-router-dom";
import { useAuthUser } from "@/store/auth.store";
import type { NavItemConfig } from "./nav-data";
import CtaButton from "./cta-button";

interface MobileMenuProps {
  isOpen: boolean;
  onClose: () => void;
  items: NavItemConfig[];
  activeHref?: string;
}

export const MobileMenu = ({
  isOpen,
  onClose,
  items,
  activeHref,
}: MobileMenuProps) => {
  const authUser = useAuthUser();

  // Prevent background scrolling when mobile menu is open
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-md md:hidden pointer-events-auto cursor-pointer"
            style={{
              top: "calc(env(safe-area-inset-top, 0px) + 64px)",
            }}
            aria-hidden="true"
          />

          {/* Navigation Drawer Panel */}
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{
              type: "spring",
              stiffness: 380,
              damping: 30,
            }}
            className="fixed inset-x-4 z-50 overflow-y-auto rounded-3xl border border-black/[0.08] bg-white/95 p-6 shadow-[0_25px_60px_rgba(0,0,0,0.18)] backdrop-blur-2xl md:hidden pointer-events-auto dark:border-white/[0.12] dark:bg-zinc-950/95 dark:shadow-[0_25px_60px_rgba(0,0,0,0.7)]"
            style={{
              top: "calc(env(safe-area-inset-top, 0px) + 68px)",
              maxHeight: "calc(100dvh - env(safe-area-inset-top, 0px) - 84px)",
              paddingBottom: "max(1.5rem, calc(env(safe-area-inset-bottom, 0px) + 1.25rem))",
            }}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile Navigation Menu"
          >
            {/* Top decorative accent line */}
            <div
              className="pointer-events-none absolute inset-x-8 top-0 h-[2px] bg-gradient-to-r from-transparent via-[#0C73FE] to-transparent opacity-80"
              aria-hidden="true"
            />

            <div className="flex flex-col gap-1 pt-2">
              {items.map((item, index) => {
                const isActive = activeHref === item.href;

                return (
                  <motion.div
                    key={item.label}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{
                      delay: index * 0.04,
                      duration: 0.22,
                      ease: "easeOut",
                    }}
                    className="border-b border-black/[0.04] pb-1 last:border-0 dark:border-white/[0.05]"
                  >
                    <a
                      href={item.href}
                      onClick={onClose}
                      className={`flex min-h-[46px] items-center rounded-xl px-3 py-2.5 text-lg font-semibold tracking-tight transition-colors ${
                        isActive
                          ? "text-zinc-950 font-bold dark:text-white"
                          : "text-zinc-700 hover:text-zinc-950 hover:bg-black/[0.04] dark:text-zinc-300 dark:hover:text-white dark:hover:bg-white/[0.06]"
                      }`}
                    >
                      {item.label}
                    </a>
                  </motion.div>
                );
              })}
            </div>

            {/* Mobile CTAs */}
            <div className="mt-6 flex flex-col gap-3 pt-4 border-t border-black/[0.06] dark:border-white/[0.08]">
              {authUser ? (
                <CtaButton size="mobile" href="/organizations">
                  Dashboard
                </CtaButton>
              ) : (
                <>
                  <CtaButton size="mobile" href="/register">
                    Get Started
                  </CtaButton>
                  <Link
                    to="/login"
                    onClick={onClose}
                    className="flex min-h-[46px] items-center justify-center rounded-xl border border-black/10 dark:border-white/10 text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
                  >
                    Login
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default MobileMenu;
