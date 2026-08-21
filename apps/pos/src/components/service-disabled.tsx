import { Ban } from "lucide-react";

import { cn } from "@repo/ui/lib/utils";

type ServiceDisabledProps = {
  title?: string;
  message?: string;
  className?: string;
};

const ServiceDisabled = ({
  title = "Service disabled",
  message = "This service is turned off for this store.",
  className,
}: ServiceDisabledProps) => {
  return (
    <div
      data-testid="service-disabled"
      className={cn(
        "relative flex min-h-[60vh] w-full flex-col items-center justify-center overflow-hidden px-4 py-12",
        className,
      )}
    >
      <div className="relative z-10 flex w-full max-w-xl flex-col items-center">
        <div className="mb-8 flex size-24 items-center justify-center rounded-3xl bg-muted text-muted-foreground ring-4 ring-border/60">
          <Ban className="size-12" />
        </div>

        <p className="mb-4 text-sm font-medium tracking-widest text-muted-foreground uppercase">
          Service disabled
        </p>

        <h1 className="mb-3 text-center text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          {title}
        </h1>
        <p className="max-w-md text-center leading-relaxed text-muted-foreground">{message}</p>
      </div>
    </div>
  );
};

export default ServiceDisabled;
