import React from "react";
import {
  Barcode,
  Boxes,
  CreditCard,
  IndianRupee,
  Receipt,
  ShoppingBag,
} from "lucide-react";

export const FloatingPosElements: React.FC = () => {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-10 overflow-hidden hidden sm:block"
      aria-hidden="true"
    >
      <style>{`
        @keyframes float-subtle-1 {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(-1deg); }
          50% { transform: translate3d(0, -8px, 0) rotate(2deg); }
        }
        @keyframes float-subtle-2 {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(2deg); }
          50% { transform: translate3d(0, 9px, 0) rotate(-2deg); }
        }
        @keyframes float-subtle-3 {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(-2deg); }
          50% { transform: translate3d(0, -10px, 0) rotate(1deg); }
        }
        .anim-float-1 { animation: float-subtle-1 6.5s ease-in-out infinite; will-change: transform; }
        .anim-float-2 { animation: float-subtle-2 7.2s ease-in-out infinite; will-change: transform; }
        .anim-float-3 { animation: float-subtle-3 8.0s ease-in-out infinite; will-change: transform; }
        @media (prefers-reduced-motion: reduce) {
          .anim-float-1, .anim-float-2, .anim-float-3 { animation: none; }
        }
      `}</style>

      {/* 1. Receipt Icon */}
      <div className="absolute left-[8%] top-[22%] hidden sm:flex anim-float-1 opacity-30 hover:opacity-75 dark:opacity-25 transition-opacity">
        <div className="flex size-10 items-center justify-center rounded-2xl border border-black/[0.06] bg-white/70 text-zinc-600 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/70 dark:text-zinc-300">
          <Receipt className="size-5" />
        </div>
      </div>

      {/* 2. Rupee Badge */}
      <div className="absolute right-[9%] top-[20%] hidden sm:flex anim-float-2 opacity-30 hover:opacity-75 dark:opacity-25 transition-opacity">
        <div className="flex size-11 items-center justify-center rounded-2xl border border-[#0C73FE]/25 bg-white/75 shadow-sm backdrop-blur-sm dark:border-[#38BDF8]/20 dark:bg-zinc-900/75">
          <IndianRupee className="size-5.5 text-[#0C73FE] dark:text-[#38BDF8]" />
        </div>
      </div>

      {/* 3. Barcode */}
      <div className="absolute left-[5%] top-[55%] hidden md:flex anim-float-3 opacity-30 hover:opacity-75 dark:opacity-25 transition-opacity">
        <div className="flex size-10 items-center justify-center rounded-2xl border border-black/[0.06] bg-white/70 text-zinc-600 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/70 dark:text-zinc-300">
          <Barcode className="size-5" />
        </div>
      </div>

      {/* 4. Inventory */}
      <div className="absolute right-[6%] top-[52%] hidden md:flex anim-float-1 opacity-30 hover:opacity-75 dark:opacity-25 transition-opacity">
        <div className="flex size-10 items-center justify-center rounded-2xl border border-black/[0.06] bg-white/70 text-zinc-600 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/70 dark:text-zinc-300">
          <Boxes className="size-5" />
        </div>
      </div>

      {/* 5. Card */}
      <div className="absolute left-[14%] top-[78%] hidden lg:flex anim-float-2 opacity-30 hover:opacity-75 dark:opacity-25 transition-opacity">
        <div className="flex size-9 items-center justify-center rounded-2xl border border-black/[0.06] bg-white/70 text-zinc-600 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/70 dark:text-zinc-300">
          <CreditCard className="size-4.5" />
        </div>
      </div>

      {/* 6. Shopping Bag */}
      <div className="absolute right-[13%] top-[76%] hidden lg:flex anim-float-3 opacity-30 hover:opacity-75 dark:opacity-25 transition-opacity">
        <div className="flex size-9 items-center justify-center rounded-2xl border border-black/[0.06] bg-white/70 text-zinc-600 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-zinc-900/70 dark:text-zinc-300">
          <ShoppingBag className="size-4.5" />
        </div>
      </div>
    </div>
  );
};

export default FloatingPosElements;
