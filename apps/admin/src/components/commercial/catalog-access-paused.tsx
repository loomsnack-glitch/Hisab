import type { ComponentType, SVGProps } from "react";
import { ArrowRight, KeyRound, LockKeyhole, Package2, RefreshCw } from "lucide-react";
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
  return (
    <Card
      data-testid="catalog-access-paused"
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden border-border/60 bg-card/90 shadow-md",
        className,
      )}
    >
      <style>{`
        @keyframes cap-tape {
          from { background-position: 0 0; }
          to { background-position: 40px 0; }
        }
        @keyframes cap-float {
          0%, 100% { transform: translateY(0) rotate(-6deg); }
          50% { transform: translateY(-7px) rotate(-2deg); }
        }
        @keyframes cap-key {
          0%, 62%, 100% { transform: rotate(18deg); }
          72% { transform: rotate(-28deg); }
          82% { transform: rotate(10deg); }
        }
        @keyframes cap-key-hit {
          0% { transform: rotate(18deg); }
          35% { transform: rotate(-38deg); }
          55% { transform: rotate(14deg); }
          100% { transform: rotate(18deg); }
        }
        @keyframes cap-ring {
          0% { transform: scale(0.82); opacity: 0.45; }
          100% { transform: scale(1.28); opacity: 0; }
        }
        @keyframes cap-spark {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(var(--sx), var(--sy)) scale(0.15); opacity: 0; }
        }
        @keyframes cap-breathe {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 1; }
        }
        .cap-tape {
          background-image: repeating-linear-gradient(
            -55deg,
            #f59e0b 0 10px,
            #1c1917 10px 20px
          );
          background-size: 40px 100%;
          animation: cap-tape 0.9s linear infinite;
        }
        .cap-float { animation: cap-float 3.6s ease-in-out infinite; }
        .cap-key { animation: cap-key 2.8s ease-in-out infinite; }
        .cap-key-hit { animation: cap-key-hit 0.48s ease-in-out; }
        .cap-ring { animation: cap-ring 2.4s ease-out infinite; }
        .cap-breathe { animation: cap-breathe 1.8s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce) {
          .cap-tape, .cap-float, .cap-key, .cap-key-hit, .cap-ring, .cap-breathe {
            animation: none !important;
          }
        }
      `}</style>

      <div className="cap-tape h-2 w-full shrink-0" aria-hidden="true" />

      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden px-5 py-8 sm:px-8 sm:py-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-80 transition-[background] duration-200"
          style={{
            background: "radial-gradient(520px circle at 48% 42%, rgb(245 158 11 / 0.14), transparent 55%)",
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

        <div className="relative z-10 flex max-w-md flex-col items-center text-center">
          <div className="group relative mb-6 flex size-36 items-center justify-center sm:size-40" aria-hidden="true">
            <span className="cap-ring absolute inset-3 rounded-full border border-amber-500/30" />
            <span className="absolute inset-6 rounded-full bg-amber-500/10 blur-xl" />

            <span className="cap-float relative flex size-[5.25rem] items-center justify-center rounded-[1.6rem] bg-linear-to-br from-amber-400 via-amber-500 to-amber-700 shadow-xl shadow-amber-500/30 ring-4 ring-amber-500/20 transition-transform duration-300 group-hover:scale-[1.04] group-active:scale-95">
              <LockKeyhole className="size-10 text-white drop-shadow-sm" strokeWidth={2.2} />
            </span>

            <span
              className={cn(
                "absolute top-3 right-4 flex size-10 items-center justify-center rounded-full border-2 border-background bg-amber-50 shadow-lg dark:bg-amber-950",
                "cap-key",
              )}
            >
              <KeyRound className="size-4.5 text-amber-700 dark:text-amber-300" strokeWidth={2.4} />
            </span>

            <span className="absolute bottom-3 left-4 flex size-10 items-center justify-center rounded-full border-2 border-background bg-card shadow-lg transition-transform duration-300 group-hover:-translate-y-0.5">
              <FeatureIcon className="size-4.5 text-foreground/80" strokeWidth={2.25} />
            </span>

          </div>

          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-500/35 bg-amber-500/12 px-3 py-1 text-[11px] font-semibold tracking-[0.16em] text-amber-800 uppercase dark:text-amber-300">
            <span className="cap-breathe size-1.5 rounded-full bg-amber-500" />
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
        className="cap-tape h-2 w-full shrink-0"
        aria-hidden="true"
        style={{ animationDirection: "reverse" }}
      />
    </Card>
  );
};

export default CatalogAccessPaused;
