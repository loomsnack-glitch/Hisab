import { useState, type ComponentType, type SVGProps } from "react";
import { ArrowRight, LockKeyhole, Package2, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";

import { Button, buttonVariants } from "@repo/ui/components/button";
import { Card } from "@repo/ui/components/card";
import { cn } from "@repo/ui/lib/utils";

type CatalogAccessPausedProps = {
  badge: string;
  title?: string;
  message: string;
  actionLabel: string;
  actionHref: string;
  onRetry: () => void;
  retrying?: boolean;
  className?: string;
  featureIcon?: ComponentType<SVGProps<SVGSVGElement>>;
};

const SPARKS = [
  { x: -22, y: -30, delay: "0ms" },
  { x: 26, y: -18, delay: "50ms" },
  { x: 18, y: 24, delay: "90ms" },
  { x: -28, y: 16, delay: "40ms" },
  { x: 4, y: -36, delay: "20ms" },
] as const;

const TICKS = Array.from({ length: 24 }, (_, index) => index);

const CatalogAccessPaused = ({
  badge,
  title = "Catalog access paused",
  message,
  actionLabel,
  actionHref,
  onRetry,
  retrying = false,
  className,
  featureIcon: FeatureIcon = Package2,
}: CatalogAccessPausedProps) => {
  const [taps, setTaps] = useState(0);
  const [unlocking, setUnlocking] = useState(false);
  const [pointer, setPointer] = useState({ x: 50, y: 38 });

  const handleUnlockAttempt = () => {
    setTaps((count) => count + 1);
    setUnlocking(true);
    window.setTimeout(() => setUnlocking(false), 720);
  };

  return (
    <Card
      data-testid="catalog-access-paused"
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden border-indigo-500/20 bg-card/90 shadow-md",
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
        @keyframes cap-orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes cap-orbit-rev {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        @keyframes cap-card {
          0%, 100% { transform: rotate(-9deg) translateY(0); }
          50% { transform: rotate(-6deg) translateY(-5px); }
        }
        @keyframes cap-seal {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.04); }
        }
        @keyframes cap-shake {
          0%, 100% { transform: rotate(-9deg) translateX(0); }
          20% { transform: rotate(-12deg) translateX(-4px); }
          40% { transform: rotate(-5deg) translateX(5px); }
          60% { transform: rotate(-11deg) translateX(-3px); }
          80% { transform: rotate(-7deg) translateX(2px); }
        }
        @keyframes cap-scan {
          0% { top: 12%; opacity: 0; }
          12% { opacity: 1; }
          88% { opacity: 1; }
          100% { top: 78%; opacity: 0; }
        }
        @keyframes cap-spark {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(var(--sx), var(--sy)) scale(0.15); opacity: 0; }
        }
        @keyframes cap-breathe {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes cap-beam {
          0%, 100% { opacity: 0.35; transform: scaleX(0.86); }
          50% { opacity: 0.8; transform: scaleX(1); }
        }
        .cap-orbit { animation: cap-orbit 18s linear infinite; }
        .cap-orbit-rev { animation: cap-orbit-rev 26s linear infinite; }
        .cap-card { animation: cap-card 4.4s ease-in-out infinite; }
        .cap-card-shake { animation: cap-shake 0.62s ease-in-out; }
        .cap-seal { animation: cap-seal 2.8s ease-in-out infinite; }
        .cap-scan { animation: cap-scan 0.72s ease-in-out; }
        .cap-breathe { animation: cap-breathe 1.8s ease-in-out infinite; }
        .cap-beam { animation: cap-beam 2.6s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .cap-orbit, .cap-orbit-rev, .cap-card, .cap-card-shake, .cap-seal, .cap-scan, .cap-breathe, .cap-beam {
            animation: none !important;
          }
        }
      `}</style>

      <div
        className="h-1.5 w-full shrink-0 bg-linear-to-r from-indigo-500 via-violet-400 to-sky-400"
        aria-hidden="true"
      />

      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-5 py-8 sm:px-8 sm:py-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-90 transition-[background] duration-200"
          style={{
            background: `radial-gradient(560px circle at ${pointer.x}% ${pointer.y}%, rgb(99 102 241 / 0.18), rgb(56 189 248 / 0.06) 38%, transparent 62%)`,
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.08] dark:opacity-[0.14]"
          style={{
            backgroundImage: `repeating-conic-gradient(from 0deg at 50% 42%, transparent 0 8deg, currentColor 8deg 8.6deg)`,
            maskImage: "radial-gradient(circle at 50% 42%, black 0 180px, transparent 280px)",
            WebkitMaskImage: "radial-gradient(circle at 50% 42%, black 0 180px, transparent 280px)",
          }}
        />

        <div className="relative z-10 flex max-w-md flex-col items-center text-center">
          <button
            type="button"
            onClick={handleUnlockAttempt}
            className="group relative mb-7 flex size-52 cursor-pointer items-center justify-center border-0 bg-transparent outline-none focus-visible:ring-2 focus-visible:ring-indigo-500/50 sm:size-56"
            aria-label="Plan access locked"
          >
            <span className="cap-orbit pointer-events-none absolute inset-0 rounded-full border border-dashed border-indigo-400/40" />
            <span className="cap-orbit-rev pointer-events-none absolute inset-5 rounded-full border border-dotted border-sky-400/30" />
            <span className="cap-orbit pointer-events-none absolute inset-0">
              {TICKS.map((tick) => (
                <span
                  key={tick}
                  className="absolute inset-0"
                  style={{ transform: `rotate(${tick * 15}deg)` }}
                >
                  <span
                    className={cn(
                      "absolute top-1 left-1/2 w-px -translate-x-1/2 rounded-full bg-indigo-400/50",
                      tick % 6 === 0 ? "h-2.5" : "h-1.5",
                    )}
                  />
                </span>
              ))}
            </span>
            <span className="cap-beam pointer-events-none absolute inset-12 rounded-full bg-indigo-500/15 blur-2xl" />

            <span
              className={cn(
                "relative flex h-[7.25rem] w-[11.5rem] flex-col justify-between overflow-hidden rounded-2xl border border-indigo-500/25 bg-card/95 p-3.5 text-left shadow-xl shadow-indigo-500/15 ring-1 ring-indigo-500/10 sm:w-[12.5rem]",
                unlocking ? "cap-card-shake" : "cap-card",
              )}
            >
              <span className="absolute inset-y-3 left-0 flex w-3 flex-col justify-between">
                {Array.from({ length: 6 }).map((_, index) => (
                  <span
                    key={index}
                    className="size-1.5 rounded-full bg-indigo-500/25 ring-1 ring-background"
                  />
                ))}
              </span>
              <span className="flex items-start justify-between gap-2 pl-3">
                <span className="flex size-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-300">
                  <FeatureIcon className="size-4.5" strokeWidth={2.2} />
                </span>
                <span className="rounded-full border border-indigo-500/20 bg-indigo-500/8 px-2 py-0.5 text-[9px] font-semibold tracking-[0.18em] text-indigo-700 uppercase dark:text-indigo-300">
                  Plan
                </span>
              </span>
              <span className="pl-3">
                <span className="block text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
                  Store access
                </span>
                <span className="mt-0.5 block h-2 w-24 rounded-full bg-indigo-500/15" />
                <span className="mt-1.5 block h-1.5 w-16 rounded-full bg-muted" />
              </span>
              {unlocking ? (
                <span className="cap-scan pointer-events-none absolute inset-x-0 h-8 bg-linear-to-b from-transparent via-sky-300/50 to-transparent" />
              ) : null}
            </span>

            <span className="cap-seal absolute right-6 bottom-6 flex size-[4.25rem] items-center justify-center rounded-full bg-linear-to-br from-indigo-400 via-indigo-600 to-violet-800 shadow-xl shadow-indigo-500/40 ring-4 ring-background transition-transform duration-300 group-hover:scale-105 group-active:scale-95 sm:right-8">
              <LockKeyhole className="size-7 text-white drop-shadow-sm" strokeWidth={2.3} />
            </span>

            {unlocking
              ? SPARKS.map((spark, index) => (
                  <span
                    key={`${taps}-${index}`}
                    className="absolute top-[62%] right-[22%] size-1.5 rounded-full bg-sky-300 shadow-[0_0_8px_rgb(125,211,252)]"
                    style={{
                      ["--sx" as string]: `${spark.x}px`,
                      ["--sy" as string]: `${spark.y}px`,
                      animation: `cap-spark 0.55s ease-out ${spark.delay} forwards`,
                    }}
                  />
                ))
              : null}
          </button>

          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-indigo-800 uppercase dark:text-indigo-300">
            <span className="cap-breathe size-1.5 rounded-full bg-indigo-500" />
            {badge}
          </div>

          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            {title}
          </h1>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {message}
          </p>

          <div className="mt-6 flex flex-col items-center justify-center gap-2 sm:flex-row">
            <Link to={actionHref} className={cn(buttonVariants(), "rounded-full")}>
              {actionLabel}
              <ArrowRight className="size-4" />
            </Link>
            <Button
              variant="outline"
              className="rounded-full"
              disabled={retrying}
              onClick={onRetry}
            >
              <RefreshCw className={cn("size-4", retrying && "animate-spin")} />
              Retry access check
            </Button>
          </div>
        </div>
      </div>

      <div
        className="flex h-3 w-full shrink-0 items-center justify-between bg-indigo-500/10 px-1"
        aria-hidden="true"
      >
        {Array.from({ length: 28 }).map((_, index) => (
          <span key={index} className="size-1.5 rounded-full bg-background shadow-xs" />
        ))}
      </div>
    </Card>
  );
};

export default CatalogAccessPaused;
