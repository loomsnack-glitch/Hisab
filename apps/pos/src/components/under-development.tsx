import { Construction, Hammer } from "lucide-react";

import { cn } from "@repo/ui/lib/utils";

type UnderDevelopmentProps = {
  title?: string;
  message?: string;
  className?: string;
};

const UnderDevelopment = ({
  title = "Under development",
  message = "This feature is still being finished and is not ready to use yet.",
  className,
}: UnderDevelopmentProps) => {
  return (
    <div
      data-testid="under-development"
      className={cn(
        "relative flex min-h-[60vh] w-full flex-col items-center justify-center overflow-hidden px-4 py-12",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.04] dark:opacity-[0.07]"
          style={{
            backgroundImage: `repeating-linear-gradient(
                            -45deg,
                            transparent,
                            transparent 16px,
                            currentColor 16px,
                            currentColor 18px
                        )`,
          }}
        />
        <div className="absolute -top-20 left-1/2 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-amber-500/10 blur-3xl dark:bg-amber-500/5" />
      </div>

      <div className="relative z-10 flex w-full max-w-xl flex-col items-center">
        <div className="relative mb-8">
          <div
            className="relative animate-bounce"
            style={{ animationDuration: "3.5s", animationTimingFunction: "ease-in-out" }}
          >
            <div className="flex size-24 items-center justify-center rounded-3xl bg-linear-to-br from-amber-400 via-orange-500 to-amber-700 shadow-2xl shadow-amber-500/30 ring-4 ring-amber-500/20 -rotate-3">
              <Construction className="size-12 text-white drop-shadow-lg" />
            </div>
            <div className="absolute -top-2 -right-2 flex size-10 items-center justify-center rounded-full border-2 border-amber-100 bg-white shadow-lg rotate-12 dark:border-amber-900 dark:bg-gray-800">
              <Hammer className="size-5 text-amber-600" />
            </div>
          </div>
          <div className="mx-auto mt-4 h-2 w-16 scale-x-125 rounded-full bg-black/10 blur-sm animate-pulse dark:bg-black/20" />
        </div>

        <div className="mb-4 flex items-center gap-2 text-sm font-medium tracking-widest text-amber-600 uppercase dark:text-amber-400">
          <Construction className="size-4" />
          <span>Coming soon</span>
        </div>

        <h1 className="mb-3 text-center text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {title}
        </h1>
        <p className="max-w-md text-center leading-relaxed text-muted-foreground">
          {message}
        </p>
      </div>
    </div>
  );
};

export default UnderDevelopment;
