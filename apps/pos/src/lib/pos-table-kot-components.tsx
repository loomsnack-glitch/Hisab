import type { TableOrderDTO } from "@repo/types";
import { cn } from "@repo/ui/lib/utils";

type PosTableKotListProps = {
  tableOrder: TableOrderDTO | null;
  selectedKotId: string | null;
  onSelect: (kotId: string) => void;
};

export const PosTableKotList = ({
  tableOrder,
  selectedKotId,
  onSelect,
}: PosTableKotListProps) => {
  const kots = tableOrder?.kots ?? [];
  if (kots.length === 0) {
    return null;
  }

  return (
    <div className="mb-2 space-y-1.5" data-testid="table-kot-list">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Table KOTs
      </p>
      <div className="flex flex-wrap gap-1.5">
        {kots.map((kot) => (
          <button
            key={kot.id}
            type="button"
            data-testid={`table-kot-${kot.kotNumber}`}
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
