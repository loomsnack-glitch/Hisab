import type { KotDTO } from "@repo/types";
import { cn } from "@repo/ui/lib/utils";

type PosGenerateKotToggleProps = {
  available: boolean;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
};

export const PosGenerateKotToggle = ({
  available,
  checked,
  disabled,
  onChange,
}: PosGenerateKotToggleProps) => {
  if (!available) {
    return null;
  }

  return (
    <section
      className="space-y-2 rounded-2xl border border-border/60 bg-card/60 p-3"
      data-testid="generate-kot-toggle-section"
    >
      <label className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-foreground">
          Generate KOT
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          data-testid="generate-kot-toggle"
          className={cn(
            "relative h-6 w-11 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            checked ? "bg-primary" : "bg-muted",
            disabled && "opacity-50",
          )}
          onClick={() => onChange(!checked)}
        >
          <span
            className={cn(
              "absolute top-0.5 left-0.5 size-5 rounded-full bg-background shadow transition-transform",
              checked && "translate-x-5",
            )}
          />
        </button>
      </label>
      <p className="text-[11px] text-muted-foreground">
        Sends only newly added items to the kitchen using the selected order
        type.
      </p>
    </section>
  );
};

type PosStandaloneKotListProps = {
  kots: KotDTO[];
  selectedKotId: string | null;
  onSelect: (kotId: string) => void;
};

export const PosStandaloneKotList = ({
  kots,
  selectedKotId,
  onSelect,
}: PosStandaloneKotListProps) => {
  if (kots.length === 0) {
    return null;
  }

  return (
    <div className="mb-2 space-y-1.5" data-testid="standalone-kot-list">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        KOTs
      </p>
      <div className="flex flex-wrap gap-1.5">
        {kots.map((kot) => (
          <button
            key={kot.id}
            type="button"
            data-testid={`standalone-kot-${kot.kotNumber}`}
            className={cn(
              "rounded-md border px-2 py-1 text-[11px] font-semibold",
              selectedKotId === kot.id
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border/70 bg-background text-muted-foreground",
            )}
            onClick={() => onSelect(kot.id)}
          >
            {kot.kotNumber}
          </button>
        ))}
      </div>
    </div>
  );
};
