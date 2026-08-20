import { LayoutGrid, Map } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { cn } from "@repo/ui/lib/utils";

import type { ServiceTableViewMode } from "@/lib/service-table-view";

type ServiceTableViewToggleProps = {
  value: ServiceTableViewMode;
  onChange: (mode: ServiceTableViewMode) => void;
};

const ServiceTableViewToggle = ({ value, onChange }: ServiceTableViewToggleProps) => (
  <div
    className="inline-flex rounded-xl border border-border/70 bg-muted/30 p-1"
    role="group"
    aria-label="Table view"
  >
    <Button
      type="button"
      size="sm"
      variant={value === "simple" ? "default" : "ghost"}
      className={cn("rounded-lg px-3", value === "simple" ? "shadow-xs" : "text-muted-foreground")}
      aria-pressed={value === "simple"}
      aria-label="Simple view"
      onClick={() => onChange("simple")}
    >
      <LayoutGrid className="size-3.5" />
      Simple
    </Button>
    <Button
      type="button"
      size="sm"
      variant={value === "floor" ? "default" : "ghost"}
      className={cn("rounded-lg px-3", value === "floor" ? "shadow-xs" : "text-muted-foreground")}
      aria-pressed={value === "floor"}
      aria-label="Floor layout"
      onClick={() => onChange("floor")}
    >
      <Map className="size-3.5" />
      Floor layout
    </Button>
  </div>
);

export default ServiceTableViewToggle;
