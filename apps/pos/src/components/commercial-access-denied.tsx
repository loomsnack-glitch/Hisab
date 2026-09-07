import { ShieldAlert } from "lucide-react";

import { cn } from "@repo/ui/lib/utils";

import { commercialAccessDeniedMessage } from "@/lib/commercial-access";

type CommercialAccessDeniedProps = {
  featureName?: string;
  message?: string;
  className?: string;
};

const CommercialAccessDenied = ({
  featureName = "This workflow",
  message = `${featureName} is not available for this Store. ${commercialAccessDeniedMessage}`,
  className,
}: CommercialAccessDeniedProps) => {
  return (
    <div
      data-testid="commercial-access-denied"
      className={cn(
        "relative flex min-h-[60vh] w-full flex-col items-center justify-center overflow-hidden px-4 py-12",
        className,
      )}
    >
      <div className="relative z-10 flex w-full max-w-xl flex-col items-center">
        <div className="mb-8 flex size-24 items-center justify-center rounded-3xl bg-muted text-muted-foreground ring-4 ring-border/60">
          <ShieldAlert className="size-12" />
        </div>

        <p className="mb-4 text-sm font-medium tracking-widest text-muted-foreground uppercase">
          Commercial access required
        </p>

        <h1 className="mb-3 text-center text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {featureName} is unavailable
        </h1>
        <p className="max-w-md text-center leading-relaxed text-muted-foreground">{message}</p>
      </div>
    </div>
  );
};

export default CommercialAccessDenied;
