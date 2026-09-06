import React, { useRef, useState } from "react";
import { motion } from "motion/react";
import {
  Barcode,
  CheckCircle2,
  Coffee,
  CreditCard,
  Minus,
  Plus,
  QrCode,
  Receipt,
  Search,
  Store,
  Wifi,
} from "lucide-react";

interface PosProductPreviewProps {
  className?: string;
}

export const PosProductPreview = ({ className = "" }: PosProductPreviewProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  const [selectedCategory, setSelectedCategory] = useState("All");

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (!cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Subconscious gentle tilt: rotateX ±1°, rotateY ±1.5°
    const rotateX = ((y - centerY) / centerY) * -1.0;
    const rotateY = ((x - centerX) / centerX) * 1.5;

    const glareX = (x / rect.width) * 100;
    const glareY = (y / rect.height) * 100;

    setTilt({ rotateX, rotateY, glareX, glareY });
  };

  const handleMouseLeave = () => {
    setTilt({ rotateX: 0, rotateY: 0, glareX: 50, glareY: 50 });
  };

  const categories = ["All", "Hot Drinks", "Bakery", "Quick Bites"];

  const products = [
    { id: 1, name: "Classic Cappuccino", category: "Hot Drinks", price: 220, count: "12 left", tag: "Popular" },
    { id: 2, name: "Grilled Sandwich", category: "Quick Bites", price: 240, count: "8 left" },
    { id: 3, name: "Choco Croissant", category: "Bakery", price: 180, count: "15 left", tag: "Fresh" },
    { id: 4, name: "Cold Brew Tonic", category: "Hot Drinks", price: 210, count: "19 left" },
    { id: 5, name: "Blueberry Muffin", category: "Bakery", price: 160, count: "6 left" },
    { id: 6, name: "Cardamom Chai", category: "Hot Drinks", price: 60, count: "In Stock" },
  ];

  const filteredProducts =
    selectedCategory === "All"
      ? products
      : products.filter((p) => p.category === selectedCategory);

  return (
    <div
      className={`relative mx-auto w-full max-w-5xl px-3 sm:px-6 ${className}`}
      style={{ perspective: 1200 }}
    >
      {/* Outer ambient glow behind the preview card */}
      <div
        className="pointer-events-none absolute -inset-4 rounded-[36px] bg-gradient-to-b from-[#0C73FE]/20 via-[#38BDF8]/10 to-transparent blur-2xl dark:from-[#0C73FE]/30 dark:via-[#0C73FE]/10"
        aria-hidden="true"
      />

      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        initial={{ opacity: 0, y: 70, scale: 0.96 }}
        whileInView={{ opacity: 1, y: 0, scale: 1 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{
          type: "spring",
          stiffness: 280,
          damping: 28,
          duration: 0.8,
        }}
        animate={{
          rotateX: tilt.rotateX,
          rotateY: tilt.rotateY,
        }}
        className="group relative overflow-hidden rounded-3xl border border-black/[0.08] bg-white/95 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.18),0_10px_20px_-5px_rgba(0,0,0,0.06)] backdrop-blur-2xl transition-shadow duration-300 dark:border-white/[0.12] dark:bg-zinc-950/95 dark:shadow-[0_30px_70px_-15px_rgba(0,0,0,0.8),0_0_40px_rgba(12,115,254,0.12)]"
      >
        {/* Top subtle reflection highlight */}
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/70 to-transparent dark:via-white/30"
          aria-hidden="true"
        />

        {/* Dynamic mouse reflection glare */}
        <div
          className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{
            background: `radial-gradient(400px circle at ${tilt.glareX}% ${tilt.glareY}%, rgba(255, 255, 255, 0.08), transparent 70%)`,
          }}
          aria-hidden="true"
        />

        {/* POS WINDOW HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] bg-slate-50/70 px-5 py-3.5 dark:border-white/[0.07] dark:bg-zinc-900/60">
          <div className="flex items-center gap-3">
            {/* Window control dots */}
            <div className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-rose-400/80" />
              <span className="size-2.5 rounded-full bg-amber-400/80" />
              <span className="size-2.5 rounded-full bg-emerald-400/80" />
            </div>

            <div className="h-4 w-px bg-black/10 dark:bg-white/10" />

            {/* Terminal info */}
            <div className="flex items-center gap-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              <Store className="size-3.5 text-[#0C73FE] dark:text-[#38BDF8]" />
              <span>Ganatri POS</span>
              <span className="text-zinc-400">— Counter Terminal #01</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 font-medium text-emerald-600 dark:text-emerald-400">
              <Wifi className="size-3" />
              Online (Instant Sync)
            </span>
            <span className="font-mono text-zinc-500 dark:text-zinc-400">10:42 AM</span>
          </div>
        </div>

        {/* POS MAIN INTERACTION BODY */}
        <div className="grid lg:grid-cols-[1.25fr_0.95fr]">
          {/* LEFT: Product Catalog Section */}
          <div className="border-b border-black/[0.06] p-4 sm:p-5 lg:border-b-0 lg:border-r dark:border-white/[0.07]">
            {/* Search and Barcode Bar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  readOnly
                  value=""
                  placeholder="Search products or scan barcode (F2)..."
                  className="h-9 w-full rounded-xl border border-black/[0.06] bg-slate-50/80 pl-9 pr-3 text-xs text-zinc-800 placeholder-zinc-400 focus:outline-none dark:border-white/[0.08] dark:bg-zinc-900/60 dark:text-zinc-200"
                />
              </div>
              <div className="flex items-center gap-1 rounded-xl border border-[#0C73FE]/30 bg-[#0C73FE]/10 px-2.5 py-2 text-xs font-semibold text-[#0C73FE] dark:border-[#38BDF8]/30 dark:bg-[#38BDF8]/15 dark:text-[#38BDF8]">
                <Barcode className="size-3.5" />
                <span className="hidden sm:inline">Scanner Active</span>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="mt-3.5 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-lg px-3 py-1.5 font-medium transition-all ${
                    selectedCategory === cat
                      ? "bg-[#0C73FE] text-white shadow-xs dark:bg-[#0C73FE]"
                      : "bg-slate-100 text-zinc-600 hover:bg-slate-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Product Cards Grid */}
            <div className="mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {filteredProducts.map((product) => (
                <div
                  key={product.id}
                  className="group/item relative flex flex-col justify-between rounded-xl border border-black/[0.06] bg-slate-50/60 p-3 transition-all duration-200 hover:border-[#0C73FE]/40 hover:bg-white hover:shadow-sm dark:border-white/[0.06] dark:bg-zinc-900/40 dark:hover:border-[#0C73FE]/50 dark:hover:bg-zinc-800/80"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex size-7 items-center justify-center rounded-lg bg-[#0C73FE]/10 text-[#0C73FE] dark:bg-[#38BDF8]/15 dark:text-[#38BDF8]">
                        <Coffee className="size-3.5" />
                      </div>
                      {product.tag && (
                        <span className="rounded-full bg-emerald-500/15 px-1.5 py-0.2 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">
                          {product.tag}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-xs font-semibold leading-tight text-zinc-900 dark:text-zinc-100">
                      {product.name}
                    </p>
                    <p className="text-[10px] text-zinc-400">{product.count}</p>
                  </div>
                  <div className="mt-2.5 flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-900 dark:text-white">
                      ₹{product.price}
                    </span>
                    <span className="flex size-5 items-center justify-center rounded-md bg-[#0C73FE] text-white text-[10px] font-bold shadow-2xs group-hover/item:scale-110 transition-transform">
                      +
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT: Current Order & Checkout Bill */}
          <div className="flex flex-col justify-between bg-slate-50/40 p-4 sm:p-5 dark:bg-zinc-900/30">
            <div>
              <div className="flex items-center justify-between border-b border-black/[0.06] pb-3 dark:border-white/[0.07]">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-900 dark:text-zinc-100">
                    Current Order #1042
                  </h4>
                  <p className="text-[11px] text-zinc-500">Dine-in (Table 04) • Cashier: Rahul</p>
                </div>
                <span className="flex items-center gap-1 rounded-md bg-[#0C73FE]/10 px-2 py-1 text-[11px] font-bold text-[#0C73FE] dark:bg-[#38BDF8]/15 dark:text-[#38BDF8]">
                  <Receipt className="size-3" /> 3 Items
                </span>
              </div>

              {/* Order Items List */}
              <div className="mt-3 space-y-2.5">
                {[
                  { name: "Classic Cappuccino", qty: 1, price: 220 },
                  { name: "Grilled Sandwich", qty: 1, price: 240 },
                  { name: "Choco Croissant", qty: 1, price: 180 },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-xl bg-white/90 p-2.5 text-xs shadow-2xs border border-black/[0.04] dark:bg-zinc-800/80 dark:border-white/[0.05]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-zinc-900 dark:text-zinc-100">{item.name}</p>
                      <p className="text-[10px] text-zinc-400">Standard • Qty: {item.qty}</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1 rounded-md border border-black/5 bg-slate-100 px-1 py-0.5 dark:border-white/5 dark:bg-zinc-700">
                        <Minus className="size-2.5 text-zinc-500" />
                        <span className="px-1 text-[11px] font-semibold">{item.qty}</span>
                        <Plus className="size-2.5 text-zinc-500" />
                      </div>
                      <span className="font-bold text-zinc-900 dark:text-white">₹{item.price}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Bill Summary & Payment Action */}
            <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.07]">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                  <span>Subtotal</span>
                  <span>₹640.00</span>
                </div>
                <div className="flex justify-between text-zinc-500 dark:text-zinc-400">
                  <span>CGST + SGST (5%)</span>
                  <span>₹32.00</span>
                </div>
                <div className="flex items-baseline justify-between pt-1 border-t border-black/[0.05] dark:border-white/[0.05]">
                  <span className="text-sm font-bold text-zinc-900 dark:text-white">Grand Total</span>
                  <span className="text-base font-extrabold text-[#0C73FE] dark:text-[#38BDF8]">
                    ₹672.00
                  </span>
                </div>
              </div>

              {/* Payment Mode Selector */}
              <div className="mt-3 grid grid-cols-3 gap-1.5 text-[11px]">
                <button
                  type="button"
                  className="flex items-center justify-center gap-1 rounded-lg border border-black/5 bg-white py-1.5 font-medium text-zinc-700 shadow-2xs hover:border-[#0C73FE] dark:border-white/5 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  <QrCode className="size-3 text-[#0C73FE]" />
                  UPI QR
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center gap-1 rounded-lg border border-black/5 bg-white py-1.5 font-medium text-zinc-700 shadow-2xs hover:border-[#0C73FE] dark:border-white/5 dark:bg-zinc-800 dark:text-zinc-300"
                >
                  <CreditCard className="size-3 text-[#0C73FE]" />
                  Card
                </button>
                <button
                  type="button"
                  className="flex items-center justify-center gap-1 rounded-lg border border-emerald-500/20 bg-emerald-500/10 py-1.5 font-medium text-emerald-600 shadow-2xs dark:text-emerald-400"
                >
                  Cash
                </button>
              </div>

              {/* Checkout Button */}
              <button
                type="button"
                className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0C73FE] to-[#1D4ED8] text-xs font-bold text-white shadow-md shadow-[#0C73FE]/20 transition-all hover:opacity-95 hover:shadow-lg active:scale-[0.99]"
              >
                <span>Charge ₹672.00</span>
                <CheckCircle2 className="size-3.5" />
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default PosProductPreview;
