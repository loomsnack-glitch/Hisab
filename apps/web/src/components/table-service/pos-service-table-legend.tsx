import { posServiceTableLegendItems } from "@/lib/pos-service-table";
import { cn } from "@repo/ui/lib/utils";

const PosServiceTableLegend = () => (
  <div
    data-testid="pos-table-state-legend"
    className="rounded-lg border border-border/60 bg-background/80 px-2.5 py-2"
  >
    <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      Status colors
    </p>
    <ul aria-label="Table status colors" className="flex flex-wrap gap-1.5">
      {posServiceTableLegendItems.map((item) => (
        <li
          key={item.key}
          className="inline-flex items-center gap-1.5 rounded-md bg-muted/50 px-2 py-1"
        >
          <span
            aria-hidden="true"
            className={cn("size-2 shrink-0 rounded-full ring-2", item.swatchClassName)}
          />
          <span className="text-[11px] leading-none">
            <span className="font-semibold text-foreground">{item.label}</span>
            <span className="px-1 text-muted-foreground/40">·</span>
            <span className="text-muted-foreground">{item.meaning}</span>
          </span>
        </li>
      ))}
    </ul>
  </div>
);

export default PosServiceTableLegend;
