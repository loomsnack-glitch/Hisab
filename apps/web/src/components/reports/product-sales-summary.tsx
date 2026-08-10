import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getPosProductSalesSummary,
  getProductSalesSummary,
} from "@repo/services";
import type {
  ProductSalesSummaryAdminQuery,
  ProductSalesSummaryDTO,
  ProductSalesSummaryQuery,
} from "@repo/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@repo/ui/components/card";
import { Button } from "@repo/ui/components/button";
import { Calendar as DateCalendar } from "@repo/ui/components/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@repo/ui/components/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { Spinner } from "@repo/ui/components/spinner";
import {
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Package2,
} from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

import { billingKeys } from "@/lib/query-keys";

type ReportDateMode = "date" | "range";
type ReportDatePreset =
  | "today"
  | "yesterday"
  | "this-week"
  | "this-month"
  | "custom"
  | "all";

type ReportDateSelection = {
  mode: ReportDateMode;
  preset: ReportDatePreset;
  specificDate: Date;
  customFromDate: Date | null;
  customToDate: Date | null;
};

type ProductSalesSummaryProps =
  | {
      mode: "admin";
      organizationId: string;
      stores: Array<{ id: string; name: string }>;
    }
  | {
      mode: "pos";
    };

const startOfLocalDay = (date: Date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const nextLocalDay = (date: Date) => {
  const nextDate = startOfLocalDay(date);
  nextDate.setDate(nextDate.getDate() + 1);
  return nextDate;
};

const formatReportDate = (date: Date) =>
  date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const reportDatePresetOptions: Array<{
  value: ReportDatePreset;
  label: string;
}> = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "this-week", label: "This week" },
  { value: "this-month", label: "This month" },
  { value: "custom", label: "Custom" },
  { value: "all", label: "All dates" },
];

const getReportDatePresetOptions = (mode: ReportDateMode) =>
  reportDatePresetOptions.filter((preset) =>
    mode === "date"
      ? preset.value === "today" ||
        preset.value === "yesterday" ||
        preset.value === "custom"
      : preset.value === "this-week" ||
        preset.value === "this-month" ||
        preset.value === "custom" ||
        preset.value === "all",
  );

const getDateBounds = (
  selection: ReportDateSelection,
): ProductSalesSummaryQuery | null => {
  const { mode, preset, specificDate, customFromDate, customToDate } =
    selection;

  if (preset === "all") {
    return {};
  }

  const today = startOfLocalDay(new Date());

  if (preset === "today") {
    return {
      createdFrom: today.toISOString(),
      createdTo: nextLocalDay(today).toISOString(),
    };
  }

  if (preset === "yesterday") {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return {
      createdFrom: yesterday.toISOString(),
      createdTo: today.toISOString(),
    };
  }

  if (preset === "this-week") {
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
    return {
      createdFrom: weekStart.toISOString(),
      createdTo: nextLocalDay(today).toISOString(),
    };
  }

  if (preset === "this-month") {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    return {
      createdFrom: monthStart.toISOString(),
      createdTo: nextLocalDay(today).toISOString(),
    };
  }

  if (mode === "date") {
    const from = startOfLocalDay(specificDate);
    return {
      createdFrom: from.toISOString(),
      createdTo: nextLocalDay(from).toISOString(),
    };
  }

  if (!customFromDate || !customToDate) {
    return null;
  }

  return {
    createdFrom: startOfLocalDay(customFromDate).toISOString(),
    createdTo: nextLocalDay(customToDate).toISOString(),
  };
};

const ReportDateFilter = ({
  value,
  onChange,
}: {
  value: ReportDateSelection;
  onChange: (value: ReportDateSelection) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  const updatePreset = (preset: ReportDatePreset) => {
    const today = startOfLocalDay(new Date());
    const next = { ...draft, preset };

    if (preset === "today") {
      setDraft({ ...next, mode: "date", specificDate: today });
    } else if (preset === "yesterday") {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      setDraft({ ...next, mode: "date", specificDate: yesterday });
    } else if (preset === "this-week") {
      const weekStart = new Date(today);
      weekStart.setDate(weekStart.getDate() - ((weekStart.getDay() + 6) % 7));
      setDraft({
        ...next,
        mode: "range",
        customFromDate: weekStart,
        customToDate: today,
      });
    } else if (preset === "this-month") {
      setDraft({
        ...next,
        mode: "range",
        customFromDate: new Date(today.getFullYear(), today.getMonth(), 1),
        customToDate: today,
      });
    } else if (preset === "all") {
      setDraft({
        ...next,
        mode: "range",
        customFromDate: null,
        customToDate: null,
      });
    } else {
      setDraft(next);
    }
  };

  const updateMode = (mode: ReportDateMode) => {
    setDraft({
      ...draft,
      mode,
      preset: "custom",
      ...(mode === "range" && !draft.customFromDate && !draft.customToDate
        ? {
            customFromDate: draft.specificDate,
            customToDate: draft.specificDate,
          }
        : {}),
    });
  };

  const confirm = () => {
    if (
      draft.mode === "range" &&
      draft.preset === "custom" &&
      (!draft.customFromDate || !draft.customToDate)
    ) {
      return;
    }
    onChange(draft);
    setOpen(false);
  };

  const shiftDate = (days: number) => {
    const nextDate = new Date(
      (open ? draft.specificDate : value.specificDate).getTime(),
    );
    nextDate.setDate(nextDate.getDate() + days);
    const nextSelection = {
      ...value,
      mode: "date" as const,
      preset: "custom" as const,
      specificDate: startOfLocalDay(nextDate),
      customFromDate: null,
      customToDate: null,
    };
    setDraft(nextSelection);
    onChange(nextSelection);
    setOpen(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setDraft(value);
    setOpen(nextOpen);
  };

  const isDateMode = (open ? draft.mode : value.mode) === "date";
  const label =
    value.mode === "date"
      ? formatReportDate(value.specificDate)
      : value.preset === "all"
        ? "All dates"
        : value.customFromDate && value.customToDate
          ? `${formatReportDate(value.customFromDate)} — ${formatReportDate(value.customToDate)}`
          : "Select date range";

  return (
    <div className="flex w-full min-w-0 flex-wrap items-center gap-2.5 sm:w-auto">
      {isDateMode ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="size-9 shrink-0 rounded-lg bg-background/80 shadow-sm"
          aria-label="Previous date"
          onClick={() => shiftDate(-1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
      ) : null}
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className="h-9 min-w-0 flex-1 justify-start gap-2 rounded-lg bg-background/80 px-2.5 text-xs shadow-sm sm:max-w-[280px] sm:flex-none"
            >
              <Calendar className="size-3.5 shrink-0" />
              <span className="truncate">{label}</span>
            </Button>
          }
        />
        <PopoverContent
          align="start"
          className="w-[280px] max-w-[calc(100vw-1rem)] overflow-hidden p-3"
        >
          <div className="flex min-w-0 flex-col gap-2">
            <div className="flex min-w-0 rounded-md border border-border/50 bg-muted/30 p-px">
              {(["date", "range"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => updateMode(mode)}
                  className={cn(
                    "min-w-0 flex-1 rounded px-1.5 py-1 text-center text-[11px] font-semibold transition-colors",
                    draft.mode === mode
                      ? "bg-background text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {mode === "date" ? "Date" : "Date range"}
                </button>
              ))}
            </div>
            <div className="flex min-w-0 flex-wrap gap-1">
              {getReportDatePresetOptions(draft.mode).map((preset) => (
                <button
                  key={preset.value}
                  type="button"
                  onClick={() => updatePreset(preset.value)}
                  className={cn(
                    "min-w-0 max-w-full rounded-full border px-2.5 py-1 text-center text-xs font-medium whitespace-normal break-words transition-colors",
                    draft.preset === preset.value
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border/60 text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
            <div className="flex min-w-0 max-w-full justify-center overflow-hidden">
              <div className="flex min-w-0 justify-center">
                {draft.mode === "date" ? (
                  <DateCalendar
                    mode="single"
                    className="mx-auto w-fit p-2.5 [--cell-size:--spacing(8)]"
                    classNames={{
                      day_button:
                        "mx-auto size-(--cell-size) min-w-(--cell-size) w-(--cell-size) rounded-md p-1",
                    }}
                    selected={draft.specificDate}
                    onSelect={(date) =>
                      date &&
                      setDraft({
                        ...draft,
                        preset: "custom",
                        specificDate: date,
                      })
                    }
                    autoFocus
                  />
                ) : (
                  <DateCalendar
                    mode="range"
                    className="mx-auto w-fit p-2.5 [--cell-size:--spacing(8)]"
                    classNames={{
                      day_button:
                        "mx-auto size-(--cell-size) min-w-(--cell-size) w-(--cell-size) rounded-md p-1",
                    }}
                    selected={{
                      from: draft.customFromDate ?? undefined,
                      to: draft.customToDate ?? undefined,
                    }}
                    onSelect={(range) =>
                      setDraft({
                        ...draft,
                        preset: "custom",
                        customFromDate: range?.from ?? null,
                        customToDate: range?.to ?? null,
                      })
                    }
                    autoFocus
                  />
                )}
              </div>
            </div>
            <div className="flex justify-end border-t border-border/50 pt-3">
              <Button
                type="button"
                size="sm"
                className="rounded-lg"
                disabled={
                  draft.mode === "range" &&
                  draft.preset === "custom" &&
                  (!draft.customFromDate || !draft.customToDate)
                }
                onClick={confirm}
              >
                Confirm
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {isDateMode ? (
        <Button
          type="button"
          variant="outline"
          size="icon"
                    className="size-9 shrink-0 rounded-lg bg-background/80 shadow-sm"
          aria-label="Next date"
          onClick={() => shiftDate(1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      ) : null}
    </div>
  );
};

const ProductSalesSummary = (props: ProductSalesSummaryProps) => {
  const initialDate = useState(() => startOfLocalDay(new Date()))[0];
  const [dateSelection, setDateSelection] = useState<ReportDateSelection>(
    () => ({
      mode: "date",
      preset: "today",
      specificDate: initialDate,
      customFromDate: null,
      customToDate: null,
    }),
  );
  const [selectedStoreId, setSelectedStoreId] = useState("all");

  const dateBounds = useMemo(
    () => getDateBounds(dateSelection),
    [dateSelection],
  );
  const queryParams = useMemo(() => {
    if (!dateBounds) {
      return null;
    }

    if (props.mode === "admin") {
      return {
        ...dateBounds,
        ...(selectedStoreId !== "all" ? { storeId: selectedStoreId } : {}),
      } satisfies ProductSalesSummaryAdminQuery;
    }

    return dateBounds;
  }, [dateBounds, props.mode, selectedStoreId]);

  const productSalesQuery = useQuery({
    queryKey:
      props.mode === "admin"
        ? billingKeys.productSales(props.organizationId, queryParams ?? {})
        : billingKeys.posProductSales(queryParams ?? {}),
    queryFn: async (): Promise<ProductSalesSummaryDTO[]> => {
      if (!queryParams) {
        return [];
      }

      const response =
        props.mode === "admin"
          ? await getProductSalesSummary(props.organizationId, queryParams)
          : await getPosProductSalesSummary(queryParams);

      if (response.status !== "success") {
        throw new Error(
          response.message || "Product sales could not be loaded",
        );
      }

      return response.data?.summary.products ?? [];
    },
    enabled:
      Boolean(queryParams) &&
      (props.mode === "pos" || Boolean(props.organizationId)),
  });

  const products = productSalesQuery.data ?? [];
  const totalQuantitySold = products.reduce(
    (total, product) => total + product.quantitySold,
    0,
  );
  const selectedStoreName =
    props.mode === "admin"
      ? selectedStoreId === "all"
        ? "All stores"
        : props.stores.find((store) => store.id === selectedStoreId)?.name ??
          "Choose store"
      : null;

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-primary">
            <BarChart3 className="size-5" />
            <p className="text-xs font-bold uppercase tracking-[0.18em]">
              Reports
            </p>
          </div>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Product sales
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            See how many units of each product were sold for the selected date.
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2 sm:shrink-0">
          <ReportDateFilter value={dateSelection} onChange={setDateSelection} />
          {props.mode === "admin" ? (
            <label className="flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground">
              <span className="sr-only">Store filter</span>
              <Select
                value={selectedStoreId}
                onValueChange={setSelectedStoreId}
              >
                <SelectTrigger className="h-9 min-w-0 max-w-[180px] rounded-lg bg-background/80 px-2.5 text-xs shadow-sm sm:max-w-[220px]">
                  <SelectValue placeholder="All stores">
                    {selectedStoreName}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} align="end">
                  <SelectItem value="all">All stores</SelectItem>
                  {props.stores.map((store) => (
                    <SelectItem key={store.id} value={store.id}>
                      {store.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:gap-5">
        <Card className="min-w-0 rounded-2xl border-border/60 bg-card shadow-sm">
          <CardContent className="flex min-h-[76px] min-w-0 items-center gap-2 p-3.5 sm:gap-3 sm:p-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:size-10">
              <Package2 className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground sm:text-xs">
                Products sold
              </p>
              <p className="text-lg font-semibold text-foreground sm:text-xl">
                {products.length}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="min-w-0 rounded-2xl border-border/60 bg-card shadow-sm">
          <CardContent className="flex min-h-[76px] min-w-0 items-center gap-2 p-3.5 sm:gap-3 sm:p-4">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 sm:size-10">
              <BarChart3 className="size-5" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-[10px] uppercase tracking-wide text-muted-foreground sm:text-xs">
                Total units sold
              </p>
              <p className="text-lg font-semibold text-foreground sm:text-xl">
                {totalQuantitySold}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="overflow-hidden border-border/60 bg-card/80 shadow-sm">
        <CardHeader className="border-b border-border/60 px-4 py-3 sm:px-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">Products sold</CardTitle>
              <CardDescription className="mt-0.5">
                Sorted by quantity sold, highest first.
              </CardDescription>
            </div>
            {productSalesQuery.isFetching ? (
              <Spinner className="size-4 text-primary" />
            ) : null}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {productSalesQuery.isPending ? (
            <div className="flex min-h-40 items-center justify-center">
              <Spinner className="size-6 text-primary" />
            </div>
          ) : productSalesQuery.isError ? (
            <div className="p-5 text-sm text-destructive">
              {(productSalesQuery.error as Error).message ||
                "Product sales could not be loaded."}
            </div>
          ) : products.length === 0 ? (
            <div className="flex min-h-40 flex-col items-center justify-center gap-2 p-5 text-center">
              <Package2 className="size-8 text-muted-foreground/50" />
              <p className="font-medium text-foreground">
                No product sales found
              </p>
              <p className="text-sm text-muted-foreground">
                Try another date or date range.
              </p>
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto sm:block">
                <table className="w-full text-sm">
                  <thead className="bg-muted/30 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <tr>
                      <th className="w-16 px-5 py-3 font-medium">#</th>
                      <th className="px-5 py-3 font-medium">Product</th>
                      <th className="px-5 py-3 font-medium">Category</th>
                      <th className="px-5 py-3 text-right font-medium">
                        Quantity sold
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {products.map((product, index) => (
                      <tr key={product.productId} className="hover:bg-muted/20">
                        <td className="px-5 py-3 text-muted-foreground">
                          {index + 1}
                        </td>
                        <td className="px-5 py-3 font-medium text-foreground">
                          {product.productName}
                        </td>
                        <td className="px-5 py-3 text-muted-foreground">
                          {product.categoryName ?? "Uncategorized"}
                        </td>
                        <td className="px-5 py-3 text-right font-semibold text-foreground">
                          {product.quantitySold}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="grid gap-2 p-3 sm:hidden">
                {products.map((product, index) => (
                  <div
                    key={product.productId}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/60 p-3"
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      <span className="text-xs text-muted-foreground">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {product.productName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {product.categoryName ?? "Uncategorized"}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-base font-semibold text-foreground">
                        {product.quantitySold}
                      </p>
                      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        sold
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductSalesSummary;
