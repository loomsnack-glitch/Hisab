import React, { useRef, useCallback, useState, useEffect } from "react";

interface HSL {
  h: number;
  s: number;
  l: number;
}

function parseHSL(hslStr: string): HSL {
  const match = hslStr.match(/([\d.]+)\s*([\d.]+)%?\s*([\d.]+)%?/);
  if (!match) return { h: 199, s: 90, l: 55 };
  return {
    h: parseFloat(match[1]),
    s: parseFloat(match[2]),
    l: parseFloat(match[3]),
  };
}

function buildBoxShadow(glowColor: string, intensity: number): string {
  const { h, s, l } = parseHSL(glowColor);
  const base = `${h}deg ${s}% ${l}%`;
  const layers: [number, number, number, number, number, boolean][] = [
    [0, 0, 0, 1, 100, true],
    [0, 0, 1, 0, 60, true],
    [0, 0, 3, 0, 50, true],
    [0, 0, 6, 0, 40, true],
    [0, 0, 15, 0, 30, true],
    [0, 0, 25, 2, 20, true],
    [0, 0, 50, 2, 10, true],
    [0, 0, 1, 0, 60, false],
    [0, 0, 3, 0, 50, false],
    [0, 0, 6, 0, 40, false],
    [0, 0, 15, 0, 30, false],
    [0, 0, 25, 2, 20, false],
    [0, 0, 50, 2, 10, false],
  ];
  return layers
    .map(([x, y, blur, spread, alpha, inset]) => {
      const a = Math.min(alpha * intensity, 100);
      return `${inset ? "inset " : ""}${x}px ${y}px ${blur}px ${spread}px hsl(${base} / ${a}%)`;
    })
    .join(", ");
}

function easeOutCubic(x: number): number {
  return 1 - Math.pow(1 - x, 3);
}

function easeInCubic(x: number): number {
  return x * x * x;
}

const GRADIENT_POSITIONS = [
  "80% 55%",
  "69% 34%",
  "8% 6%",
  "41% 38%",
  "86% 85%",
  "82% 18%",
  "51% 4%",
];
const COLOR_MAP = [0, 1, 2, 0, 1, 2, 1];

function buildMeshGradients(colors: string[]): string[] {
  const gradients: string[] = [];
  for (let i = 0; i < 7; i++) {
    const c = colors[Math.min(COLOR_MAP[i], colors.length - 1)];
    gradients.push(`radial-gradient(at ${GRADIENT_POSITIONS[i]}, ${c} 0px, transparent 50%)`);
  }
  gradients.push(`linear-gradient(${colors[0]} 0 100%)`);
  return gradients;
}

function isLightColor(color: string): boolean {
  if (!color) return false;
  const value = color.trim().replace("#", "");
  if (!/^[\da-f]{3}([\da-f]{3})?$/i.test(value)) return false;
  const hex =
    value.length === 3
      ? value
          .split("")
          .map((char) => char + char)
          .join("")
      : value;
  const red = parseInt(hex.slice(0, 2), 16);
  const green = parseInt(hex.slice(2, 4), 16);
  const blue = parseInt(hex.slice(4, 6), 16);
  return red * 0.2126 + green * 0.7152 + blue * 0.0722 > 180;
}

export interface BorderGlowProps {
  children?: React.ReactNode;
  className?: string;
  edgeSensitivity?: number;
  glowColor?: string;
  backgroundColor?: string;
  borderColor?: string;
  borderRadius?: number;
  glowRadius?: number;
  glowIntensity?: number;
  coneSpread?: number;
  animated?: boolean;
  colors?: string[];
  fillOpacity?: number;
}

export const BorderGlow: React.FC<BorderGlowProps> = ({
  children,
  className = "",
  edgeSensitivity = 28,
  glowColor = "199 90 55",
  backgroundColor = "hsl(var(--card))",
  borderColor,
  borderRadius = 24,
  glowRadius = 18,
  glowIntensity = 0.75,
  coneSpread = 22,
  animated = true,
  colors = ["#0C73FE", "#38BDF8", "#60A5FA"],
  fillOpacity = 0.16,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [cursorAngle, setCursorAngle] = useState(110);
  const [edgeProximity, setEdgeProximity] = useState(0);
  const [sweepActive, setSweepActive] = useState(false);
  const [isDarkTheme, setIsDarkTheme] = useState(false);

  // Monitor dynamic dark/light theme changes
  useEffect(() => {
    const updateTheme = () => {
      setIsDarkTheme(document.documentElement.classList.contains("dark"));
    };
    updateTheme();
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  const getCenterOfElement = useCallback((el: HTMLElement) => {
    const { width, height } = el.getBoundingClientRect();
    return [width / 2, height / 2];
  }, []);

  const getEdgeProximity = useCallback(
    (el: HTMLElement, x: number, y: number) => {
      const [cx, cy] = getCenterOfElement(el);
      const dx = x - cx;
      const dy = y - cy;
      let kx = Infinity;
      let ky = Infinity;
      if (dx !== 0) kx = cx / Math.abs(dx);
      if (dy !== 0) ky = cy / Math.abs(dy);
      return Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
    },
    [getCenterOfElement]
  );

  const getCursorAngle = useCallback(
    (el: HTMLElement, x: number, y: number) => {
      const [cx, cy] = getCenterOfElement(el);
      const dx = x - cx;
      const dy = y - cy;
      if (dx === 0 && dy === 0) return 0;
      const radians = Math.atan2(dy, dx);
      let degrees = radians * (180 / Math.PI) + 90;
      if (degrees < 0) degrees += 360;
      return degrees;
    },
    [getCenterOfElement]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const card = cardRef.current;
      if (!card) return;
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      setEdgeProximity(getEdgeProximity(card, x, y));
      setCursorAngle(getCursorAngle(card, x, y));
    },
    [getEdgeProximity, getCursorAngle]
  );

  // RECURRING ANIMATED SWEEP: border sweep (~3.8s) -> pause (~3.0s) -> repeat (~6.8s total cycle)
  useEffect(() => {
    if (!animated) return;
    let isCancelled = false;
    let pauseTimer: ReturnType<typeof setTimeout> | null = null;
    const rafIds: number[] = [];

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) return;

    function runAnimation({
      start = 0,
      end = 100,
      duration = 1000,
      delay = 0,
      ease = easeOutCubic,
      onUpdate,
      onEnd,
    }: {
      start?: number;
      end?: number;
      duration?: number;
      delay?: number;
      ease?: (x: number) => number;
      onUpdate: (v: number) => void;
      onEnd?: () => void;
    }) {
      let t0: number | null = null;
      let delayTimer: ReturnType<typeof setTimeout> | null = null;

      function tick(now: number) {
        if (isCancelled) return;
        if (t0 === null) t0 = now;
        const elapsed = now - t0;
        const t = Math.min(elapsed / duration, 1);
        onUpdate(start + (end - start) * ease(t));
        if (t < 1) {
          const id = requestAnimationFrame(tick);
          rafIds.push(id);
        } else if (onEnd && !isCancelled) {
          onEnd();
        }
      }

      delayTimer = setTimeout(() => {
        if (isCancelled) return;
        const id = requestAnimationFrame(tick);
        rafIds.push(id);
      }, delay);

      return () => {
        if (delayTimer) clearTimeout(delayTimer);
      };
    }

    function startSweep() {
      if (isCancelled) return;
      const angleStart = 110;
      const angleEnd = 470;
      setSweepActive(true);
      setCursorAngle(angleStart);

      // 1. Initial fade-in of edge proximity
      runAnimation({
        duration: 500,
        onUpdate: (v) => setEdgeProximity(v / 100),
      });

      // 2. First phase of angle sweep
      runAnimation({
        ease: easeInCubic,
        duration: 1500,
        end: 50,
        onUpdate: (v) => {
          setCursorAngle((angleEnd - angleStart) * (v / 100) + angleStart);
        },
      });

      // 3. Second phase of angle sweep
      runAnimation({
        ease: easeOutCubic,
        delay: 1500,
        duration: 2300,
        start: 50,
        end: 100,
        onUpdate: (v) => {
          setCursorAngle((angleEnd - angleStart) * (v / 100) + angleStart);
        },
      });

      // 4. Fade-out of edge proximity at end of sweep, followed by 3.0s pause before next cycle
      runAnimation({
        ease: easeInCubic,
        delay: 2600,
        duration: 1400,
        start: 100,
        end: 0,
        onUpdate: (v) => setEdgeProximity(v / 100),
        onEnd: () => {
          if (isCancelled) return;
          setSweepActive(false);
          // Pause ~3.0s between sweeps for a gentle, non-aggressive loop
          pauseTimer = setTimeout(() => {
            if (!isCancelled) {
              startSweep();
            }
          }, 3000);
        },
      });
    }

    // Start initial sweep after component settles
    pauseTimer = setTimeout(() => {
      startSweep();
    }, 450);

    return () => {
      isCancelled = true;
      if (pauseTimer) clearTimeout(pauseTimer);
      rafIds.forEach((id) => cancelAnimationFrame(id));
    };
  }, [animated]);

  const colorSensitivity = edgeSensitivity + 20;
  const isVisible = isHovered || sweepActive;
  const borderOpacity = isVisible
    ? Math.max(0, (edgeProximity * 100 - colorSensitivity) / (100 - colorSensitivity))
    : 0;
  const glowOpacity = isVisible
    ? Math.max(0, (edgeProximity * 100 - edgeSensitivity) / (100 - edgeSensitivity))
    : 0;

  const meshGradients = buildMeshGradients(colors);
  const borderBg = meshGradients.map((g) => `${g} border-box`);
  const fillBg = meshGradients.map((g) => `${g} padding-box`);
  const angleDeg = `${cursorAngle.toFixed(3)}deg`;

  const lightSurface = isLightColor(backgroundColor) || (!isDarkTheme && backgroundColor.includes("var("));

  // 25% lower intensity and opacity in light mode for a clean, non-fluorescent aesthetic
  const activeGlowIntensity = lightSurface ? glowIntensity * 0.75 : glowIntensity;
  const activeFillOpacity = lightSurface ? fillOpacity * 0.75 : fillOpacity;

  // Subtle static border highlight when not hovering or between sweeps
  const staticBorder =
    borderColor ||
    (lightSurface ? "rgba(12, 115, 254, 0.30)" : "rgba(56, 189, 248, 0.35)");

  return (
    <div
      ref={cardRef}
      onPointerMove={handlePointerMove}
      onPointerEnter={() => setIsHovered(true)}
      onPointerLeave={() => setIsHovered(false)}
      className={`relative flex flex-col isolate border ${className}`}
      style={{
        background: backgroundColor,
        borderColor: staticBorder,
        borderRadius: `${borderRadius}px`,
        transform: "translate3d(0, 0, 0.01px)",
        boxShadow: lightSurface
          ? "0 4px 20px rgba(12, 115, 254, 0.08), 0 1px 3px rgba(0,0,0,0.05)"
          : "0 20px 50px rgba(12, 115, 254, 0.18), 0 4px 12px rgba(0,0,0,0.3)",
      }}
    >
      {/* 1. Mesh Gradient Border Highlight */}
      <div
        className="absolute inset-0 rounded-[inherit] -z-[1] pointer-events-none"
        style={{
          border: "1.5px solid transparent",
          background: [
            `linear-gradient(${backgroundColor} 0 100%) padding-box`,
            "linear-gradient(rgb(255 255 255 / 0%) 0% 100%) border-box",
            ...borderBg,
          ].join(", "),
          opacity: borderOpacity,
          maskImage: `conic-gradient(from ${angleDeg} at center, black ${coneSpread}%, transparent ${coneSpread + 15}%, transparent ${100 - coneSpread - 15}%, black ${100 - coneSpread}%)`,
          WebkitMaskImage: `conic-gradient(from ${angleDeg} at center, black ${coneSpread}%, transparent ${coneSpread + 15}%, transparent ${100 - coneSpread - 15}%, black ${100 - coneSpread}%)`,
          transition: isVisible ? "opacity 0.25s ease-out" : "opacity 0.75s ease-in-out",
        }}
      />

      {/* 2. Mesh Gradient Fill Near Edges (Soft Color Spill) */}
      <div
        className="absolute inset-0 rounded-[inherit] -z-[1] pointer-events-none"
        style={{
          border: "1.5px solid transparent",
          background: fillBg.join(", "),
          maskImage: [
            "linear-gradient(to bottom, black, black)",
            "radial-gradient(ellipse at 50% 50%, black 40%, transparent 65%)",
            "radial-gradient(ellipse at 66% 66%, black 5%, transparent 40%)",
            "radial-gradient(ellipse at 33% 33%, black 5%, transparent 40%)",
            "radial-gradient(ellipse at 66% 33%, black 5%, transparent 40%)",
            "radial-gradient(ellipse at 33% 66%, black 5%, transparent 40%)",
            `conic-gradient(from ${angleDeg} at center, transparent 5%, black 15%, black 85%, transparent 95%)`,
          ].join(", "),
          WebkitMaskImage: [
            "linear-gradient(to bottom, black, black)",
            "radial-gradient(ellipse at 50% 50%, black 40%, transparent 65%)",
            "radial-gradient(ellipse at 66% 66%, black 5%, transparent 40%)",
            "radial-gradient(ellipse at 33% 33%, black 5%, transparent 40%)",
            "radial-gradient(ellipse at 66% 33%, black 5%, transparent 40%)",
            "radial-gradient(ellipse at 33% 66%, black 5%, transparent 40%)",
            `conic-gradient(from ${angleDeg} at center, transparent 5%, black 15%, black 85%, transparent 95%)`,
          ].join(", "),
          maskComposite: "subtract, add, add, add, add, add",
          WebkitMaskComposite:
            "source-out, source-over, source-over, source-over, source-over, source-over",
          opacity: borderOpacity * activeFillOpacity,
          mixBlendMode: lightSurface ? "normal" : "soft-light",
          transition: isVisible ? "opacity 0.25s ease-out" : "opacity 0.75s ease-in-out",
        }}
      />

      {/* 3. Outer Interactive Glow */}
      <span
        className="absolute pointer-events-none z-[1] rounded-[inherit]"
        style={{
          inset: `${-glowRadius}px`,
          maskImage: `conic-gradient(from ${angleDeg} at center, black 2.5%, transparent 10%, transparent 90%, black 97.5%)`,
          WebkitMaskImage: `conic-gradient(from ${angleDeg} at center, black 2.5%, transparent 10%, transparent 90%, black 97.5%)`,
          opacity: glowOpacity,
          mixBlendMode: lightSurface ? "normal" : "plus-lighter",
          transition: isVisible ? "opacity 0.25s ease-out" : "opacity 0.75s ease-in-out",
        }}
      >
        <span
          className="absolute rounded-[inherit]"
          style={{
            inset: `${glowRadius}px`,
            boxShadow: buildBoxShadow(glowColor, activeGlowIntensity),
          }}
        />
      </span>

      {/* 4. Card Content Container */}
      <div className="relative z-[1] flex flex-col justify-between h-full overflow-visible">
        {children}
      </div>
    </div>
  );
};

export default BorderGlow;
