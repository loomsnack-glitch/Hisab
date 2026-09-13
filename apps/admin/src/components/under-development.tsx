import { useState } from "react";
import { Construction, Hammer } from "lucide-react";

import { Card } from "@repo/ui/components/card";
import { cn } from "@repo/ui/lib/utils";

type UnderDevelopmentProps = {
  title?: string;
  message?: string;
  className?: string;
};

const SPARKS = [
  { x: -28, y: -36, delay: "0ms" },
  { x: 22, y: -40, delay: "40ms" },
  { x: 34, y: -8, delay: "80ms" },
  { x: -36, y: 6, delay: "60ms" },
  { x: 8, y: -48, delay: "20ms" },
] as const;

const UnderDevelopment = ({
  title = "Under development",
  message = "This page isn't ready yet. Check back soon.",
  className,
}: UnderDevelopmentProps) => {
  const [taps, setTaps] = useState(0);
  const [sparking, setSparking] = useState(false);
  const [pointer, setPointer] = useState({ x: 48, y: 42 });

  const handleNudge = () => {
    setTaps((count) => count + 1);
    setSparking(true);
    window.setTimeout(() => setSparking(false), 520);
  };

  return (
    <Card
      data-testid="under-development"
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden border-border/60 bg-card/90 shadow-md",
        className,
      )}
      onMouseMove={(event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        setPointer({
          x: ((event.clientX - bounds.left) / bounds.width) * 100,
          y: ((event.clientY - bounds.top) / bounds.height) * 100,
        });
      }}
    >
      <style>{`
        @keyframes ud-tape {
          from { background-position: 0 0; }
          to { background-position: 40px 0; }
        }
        @keyframes ud-float {
          0%, 100% { transform: translateY(0) rotate(-6deg); }
          50% { transform: translateY(-7px) rotate(-2deg); }
        }
        @keyframes ud-hammer {
          0%, 62%, 100% { transform: rotate(18deg); }
          72% { transform: rotate(-28deg); }
          82% { transform: rotate(10deg); }
        }
        @keyframes ud-hammer-hit {
          0% { transform: rotate(18deg); }
          35% { transform: rotate(-38deg); }
          55% { transform: rotate(14deg); }
          100% { transform: rotate(18deg); }
        }
        @keyframes ud-ring {
          0% { transform: scale(0.82); opacity: 0.45; }
          100% { transform: scale(1.28); opacity: 0; }
        }
        @keyframes ud-spark {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(var(--sx), var(--sy)) scale(0.15); opacity: 0; }
        }
        @keyframes ud-breathe {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 1; }
        }
        .ud-tape {
          background-image: repeating-linear-gradient(
            -55deg,
            #f59e0b 0 10px,
            #1c1917 10px 20px
          );
          background-size: 40px 100%;
          animation: ud-tape 0.9s linear infinite;
        }
        .ud-float { animation: ud-float 3.6s ease-in-out infinite; }
        .ud-hammer { animation: ud-hammer 2.8s ease-in-out infinite; }
        .ud-hammer-hit { animation: ud-hammer-hit 0.48s ease-in-out; }
        .ud-ring { animation: ud-ring 2.4s ease-out infinite; }
        .ud-breathe { animation: ud-breathe 1.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .ud-tape, .ud-float, .ud-hammer, .ud-hammer-hit, .ud-ring, .ud-breathe {
            animation: none !important;
          }
        }
      `}</style>

      <div className="ud-tape h-2 w-full shrink-0" aria-hidden="true" />

      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-5 py-8 sm:px-8 sm:py-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-80 transition-[background] duration-200"
          style={{
            background: `radial-gradient(520px circle at ${pointer.x}% ${pointer.y}%, rgb(245 158 11 / 0.14), transparent 55%)`,
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07] dark:opacity-[0.1]"
          style={{
            backgroundImage: `linear-gradient(to right, currentColor 1px, transparent 1px),
              linear-gradient(to bottom, currentColor 1px, transparent 1px)`,
            backgroundSize: "28px 28px",
          }}
        />

        <div className="relative z-10 flex flex-col items-center text-center">
          <button
            type="button"
            onClick={handleNudge}
            className="group relative mb-6 flex size-36 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 sm:size-40"
            aria-label="Under development"
          >
            <span className="ud-ring absolute inset-3 rounded-full border border-amber-500/30" />
            <span className="absolute inset-6 rounded-full bg-amber-500/10 blur-xl" />

            <span className="ud-float relative flex size-[5.25rem] items-center justify-center rounded-[1.6rem] bg-linear-to-br from-amber-400 via-amber-500 to-amber-700 shadow-xl shadow-amber-500/30 ring-4 ring-amber-500/20 transition-transform duration-300 group-hover:scale-[1.04] group-active:scale-95">
              <Construction className="size-10 text-white drop-shadow-sm" strokeWidth={2.2} />
            </span>

            <span
              className={cn(
                "absolute top-3 right-4 flex size-10 items-center justify-center rounded-full border-2 border-background bg-amber-50 shadow-lg dark:bg-amber-950",
                sparking ? "ud-hammer-hit" : "ud-hammer",
              )}
            >
              <Hammer className="size-4.5 text-amber-700 dark:text-amber-300" strokeWidth={2.4} />
            </span>

            {sparking
              ? SPARKS.map((spark, index) => (
                  <span
                    key={`${taps}-${index}`}
                    className="absolute top-1/2 left-1/2 size-1.5 rounded-full bg-amber-300 shadow-[0_0_8px_rgb(251,191,36)]"
                    style={{
                      ["--sx" as string]: `${spark.x}px`,
                      ["--sy" as string]: `${spark.y}px`,
                      animation: `ud-spark 0.5s ease-out ${spark.delay} forwards`,
                    }}
                  />
                ))
              : null}
          </button>

          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-500/35 bg-amber-500/12 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-amber-800 uppercase dark:text-amber-300">
            <span className="ud-breathe size-1.5 rounded-full bg-amber-500" />
            Coming soon
          </div>

          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {message}
          </p>
        </div>
      </div>

      <div
        className="ud-tape h-2 w-full shrink-0"
        aria-hidden="true"
        style={{ animationDirection: "reverse" }}
      />
    </Card>
  );
};

export default UnderDevelopment;
