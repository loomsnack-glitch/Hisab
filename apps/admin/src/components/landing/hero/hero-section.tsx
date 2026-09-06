import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { motion, useScroll, useTransform } from "motion/react";
import { useTheme } from "next-themes";
import Antigravity from "./Antigravity";
import type { PointerState } from "./Antigravity";
import FloatingPosElements from "./floating-pos-elements";
import PosProductPreview from "./pos-product-preview";
import CtaButton from "../navbar/cta-button";

export const HeroSection = () => {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const heroRef = useRef<HTMLElement>(null);
  const [particleCount, setParticleCount] = useState(240);

  // High-performance pointer tracking ref (zero React re-renders on pointer movement)
  const pointerRef = useRef<PointerState>({
    x: 0,
    y: 0,
    active: false,
  });

  useEffect(() => {
    setMounted(true);

    const updateCount = () => {
      const w = window.innerWidth;
      if (w < 640) setParticleCount(75);
      else if (w < 1024) setParticleCount(140);
      else setParticleCount(240);
    };

    updateCount();
    window.addEventListener("resize", updateCount);
    return () => window.removeEventListener("resize", updateCount);
  }, []);

  // Track normalized pointer coordinates at the hero container level
  const handlePointerMove = (e: React.PointerEvent<HTMLElement>) => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const hero = heroRef.current;
    if (!hero) return;

    const rect = hero.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    pointerRef.current.x = Math.max(-1, Math.min(1, x));
    pointerRef.current.y = Math.max(-1, Math.min(1, y));
    pointerRef.current.active = true;
  };

  const handlePointerEnter = (e: React.PointerEvent<HTMLElement>) => {
    if (window.matchMedia("(pointer: coarse)").matches) return;
    const hero = heroRef.current;
    if (!hero) return;

    const rect = hero.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    pointerRef.current.x = Math.max(-1, Math.min(1, x));
    pointerRef.current.y = Math.max(-1, Math.min(1, y));
    pointerRef.current.active = true;
  };

  const handlePointerLeave = () => {
    pointerRef.current.active = false;
  };

  // Gentle scroll depth transition without hijacking scroll
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const textOpacity = useTransform(scrollYProgress, [0, 0.45], [1, 0.6]);
  const textTranslateY = useTransform(scrollYProgress, [0, 0.45], [0, -28]);
  const previewTranslateY = useTransform(scrollYProgress, [0, 0.45], [0, -45]);

  const isDark = mounted && resolvedTheme === "dark";
  // Crisp brand sapphire blue in light mode for visible contrast; radiant sky blue in dark mode
  const particleColor = isDark ? "#60A5FA" : "#0C73FE";
  // Enhanced visibility in both light and dark modes
  const particleOpacity = isDark ? 0.54 : 0.60;

  return (
    <section
      id="product"
      ref={heroRef}
      onPointerMove={handlePointerMove}
      onPointerEnter={handlePointerEnter}
      onPointerLeave={handlePointerLeave}
      className="relative flex min-h-[100svh] w-full flex-col justify-between overflow-hidden bg-background pt-[135px] sm:pt-[150px] lg:pt-[160px] pb-12 scroll-mt-32"
    >
      {/* 1. HERO BACKGROUND LIGHTING */}
      <div className="pointer-events-none absolute inset-0 -z-20 overflow-hidden">
        <div
          className="absolute left-1/2 top-[38%] size-[480px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-[0.06] blur-[140px] dark:opacity-[0.08]"
          style={{
            background: isDark
              ? "radial-gradient(circle, rgba(96, 165, 250, 0.3) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(12, 115, 254, 0.25) 0%, transparent 70%)",
          }}
          aria-hidden="true"
        />

        {/* Top subtle fade gradient */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-background to-transparent" />
      </div>

      {/* 2. REACT BITS ANTIGRAVITY PARTICLE CANVAS */}
      {mounted && (
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-95 transition-opacity duration-500"
          style={{
            // Vertical edge fade: clear top 80px below navbar, smooth bottom fade
            maskImage:
              "linear-gradient(to bottom, transparent 0px, transparent 80px, black 160px, black 82%, transparent 100%)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0px, transparent 80px, black 160px, black 82%, transparent 100%)",
          }}
        >
          <Antigravity
            pointerRef={pointerRef}
            count={particleCount}
            magnetRadius={7}
            ringRadius={7.5}
            waveSpeed={0.35}
            waveAmplitude={0.75}
            particleSize={0.85}
            lerpSpeed={0.075}
            color={particleColor}
            particleOpacity={particleOpacity}
            autoAnimate={true}
            particleVariance={0.7}
            rotationSpeed={0}
            depthFactor={0.8}
            pulseSpeed={2.2}
            particleShape="capsule"
            fieldStrength={10}
          />
        </div>
      )}

      {/* 3. CENTRAL HEADLINE READABILITY GRADIENT (ABOVE CANVAS, BELOW CONTENT) */}
      <div
        className="pointer-events-none absolute inset-0 z-[5] overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse 48% 40% at 50% 38%, color-mix(in srgb, var(--background) 80%, transparent) 0%, color-mix(in srgb, var(--background) 48%, transparent) 30%, transparent 68%)",
        }}
        aria-hidden="true"
      />

      {/* 4. AMBIENT FLOATING POS MICRO-ELEMENTS */}
      <FloatingPosElements />

      {/* 5. MAIN EDITORIAL HERO CONTENT */}
      <motion.div
        style={{
          opacity: textOpacity,
          y: textTranslateY,
        }}
        className="pointer-events-auto relative z-10 mx-auto flex w-full max-w-5xl flex-col items-center px-4 text-center sm:px-6 lg:px-8"
      >
        {/* EYEBROW BADGE */}
        <motion.div
          initial={{ opacity: 0, y: 12, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="inline-flex items-center gap-2.5 rounded-full border border-black/[0.08] bg-white/70 px-3.5 py-1.5 shadow-xs backdrop-blur-md dark:border-white/[0.1] dark:bg-zinc-900/70"
        >
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#0C73FE] opacity-75 dark:bg-[#38BDF8]" />
            <span className="relative inline-flex size-2 rounded-full bg-[#0C73FE] dark:bg-[#38BDF8]" />
          </span>
          <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-zinc-700 dark:text-zinc-200">
            The Modern POS For Modern Business
          </span>
        </motion.div>

        {/* MASSIVE EDITORIAL HEADLINE WITH SEQUENTIAL REVEAL */}
        <h1 className="mt-6 font-display font-black tracking-[-0.035em] text-zinc-950 dark:text-white text-5xl sm:text-7xl lg:text-8xl xl:text-[100px] leading-[0.96] sm:leading-[0.98]">
          {/* Line 1 */}
          <motion.span
            initial={{ opacity: 0, y: 45, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{
              duration: 0.75,
              delay: 0.1,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="block"
          >
            Sell smarter.
          </motion.span>

          {/* Line 2 */}
          <motion.span
            initial={{ opacity: 0, y: 45, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{
              duration: 0.75,
              delay: 0.22,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="block mt-1"
          >
            Run everything.
          </motion.span>

          {/* Line 3: with Ganatri brand treatment */}
          <motion.span
            initial={{ opacity: 0, y: 45, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{
              duration: 0.75,
              delay: 0.34,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="block mt-1"
          >
            With{" "}
            <span className="bg-gradient-to-r from-[#0C73FE] via-[#2563EB] to-[#38BDF8] bg-clip-text text-transparent drop-shadow-xs">
              Ganatri.
            </span>
          </motion.span>
        </h1>

        {/* HERO SUPPORTING DESCRIPTION */}
        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.45, ease: "easeOut" }}
          className="mt-6 max-w-2xl text-base leading-relaxed text-zinc-600 sm:text-lg lg:text-xl dark:text-zinc-400"
        >
          From billing and inventory to customers and insights, Ganatri keeps your entire business
          moving from one powerful POS.
        </motion.p>

        {/* TWO CTA BUTTONS */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.58, ease: "easeOut" }}
          className="mt-8 flex flex-col items-center justify-center gap-3.5 sm:flex-row sm:gap-4"
        >
          {/* Primary CTA */}
          <CtaButton href="/register" size="lg">
            Get Started Free
          </CtaButton>

          {/* Secondary Watch Demo CTA */}
          <motion.a
            href="#demo"
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="group flex h-12 items-center justify-center gap-2.5 rounded-xl border border-black/10 bg-white/70 px-6 text-sm font-semibold tracking-tight text-zinc-800 shadow-sm backdrop-blur-md transition-all duration-200 hover:border-black/20 hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0C73FE] dark:border-white/10 dark:bg-zinc-900/70 dark:text-zinc-200 dark:hover:border-white/25 dark:hover:bg-zinc-800"
          >
            <div className="flex size-6 items-center justify-center rounded-full bg-black/5 text-zinc-700 transition-transform duration-200 group-hover:scale-110 dark:bg-white/10 dark:text-zinc-200">
              <Play className="size-3 fill-current ml-0.5" />
            </div>
            <span>Watch Demo</span>
          </motion.a>
        </motion.div>
      </motion.div>

      {/* 6. AUTHENTIC GANATRI POS PRODUCT PREVIEW */}
      <motion.div
        style={{
          y: previewTranslateY,
        }}
        className="pointer-events-auto relative z-10 mt-12 sm:mt-16 lg:mt-20"
      >
        <PosProductPreview />
      </motion.div>

      {/* 7. SUBTLE SCROLL EXPLORE INDICATOR */}
      <div className="relative z-10 mt-8 flex flex-col items-center justify-center text-center">
        <a
          href="#features"
          className="group inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-[#0C73FE] dark:text-zinc-500 dark:hover:text-[#38BDF8]"
        >
          <span>Scroll to explore</span>
          <motion.span
            animate={{ y: [0, 3, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
          >
            ↓
          </motion.span>
        </a>
      </div>
    </section>
  );
};

export default HeroSection;
