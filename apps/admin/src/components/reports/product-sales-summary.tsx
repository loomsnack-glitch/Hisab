import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getPosProductSalesSummary,
  getProductSalesSummary,
  getStoreCommercialStatus,
} from "@repo/services";
import type {
  ProductSalesSummaryAdminQuery,
  ProductSalesSummaryDTO,
  ProductSalesSummaryQuery,
} from "@repo/types";
import {
  aggregateProductSalesByCategory,
  mergeProductSalesByProductId,
  UNCATEGORIZED_CATEGORY_NAME,
} from "@repo/types";
import {
  Card,
  CardContent,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import {
  BarChart3,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Package2,
  Tags,
} from "lucide-react";
import { cn } from "@repo/ui/lib/utils";

import CatalogAccessPaused from "@/components/commercial/catalog-access-paused";
import SalesDistributionChart from "@/components/reports/sales-distribution-chart";
import { isQueryCommercialAccessDenied } from "@/lib/commercial-access";
import { featureAccessPausedState } from "@/lib/commercial-access-paused-state";
import { billingKeys, commercialLicenseKeys } from "@/lib/query-keys";
import { getStoreLicensePath } from "@/lib/store-workspace-routes";
import { adminWorkspacePageHeightClass } from "@/lib/workspace-page-layout";

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

type ReportViewMode = "products" | "categories";

type ProductSalesSummaryProps =
  | {
      mode: "admin";
      organizationId: string;
      stores: Array<{ id: string; name: string }>;
      fixedStoreId?: string;
    }
  | {
      mode: "pos";
      storeName: string;
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
          ? `${formatReportDate(value.customFromDate)} - ${formatReportDate(value.customToDate)}`
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

type RankedSalesRow = {
  id: string;
  name: string;
  detail: string;
  quantitySold: number;
};

const productCountLabel = (count: number) =>
  `${count} ${count === 1 ? "product" : "products"}`;

const toRankedProductRows = (
  products: ProductSalesSummaryDTO[],
): RankedSalesRow[] =>
  products.map((product) => ({
    id: product.productId,
    name: product.productName,
    detail: product.categoryName ?? UNCATEGORIZED_CATEGORY_NAME,
    quantitySold: product.quantitySold,
  }));

const toRankedCategoryRows = (
  categories: ReturnType<typeof aggregateProductSalesByCategory>,
): RankedSalesRow[] =>
  categories.map((category) => ({
    id: `category:${category.categoryName}`,
    name: category.categoryName,
    detail: productCountLabel(category.productCount),
    quantitySold: category.quantitySold,
  }));

const SalesRankTable = ({
  viewMode,
  rows,
  isPending,
  isError,
  errorMessage,
}: {
  viewMode: ReportViewMode;
  rows: RankedSalesRow[];
  isPending: boolean;
  isError: boolean;
  errorMessage: string;
}) => {
  const isCategoryView = viewMode === "categories";

  if (isPending) {
    return (
      <div className="flex min-h-48 items-center justify-center">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-5 text-sm text-destructive">{errorMessage}</div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="flex min-h-48 flex-col items-center justify-center gap-2 p-6 text-center">
        {isCategoryView ? (
          <Tags className="size-8 text-muted-foreground/50" />
        ) : (
          <Package2 className="size-8 text-muted-foreground/50" />
        )}
        <p className="font-medium text-foreground">
          {isCategoryView ? "No category sales" : "No product sales"}
        </p>
        <p className="text-sm text-muted-foreground">
          Try another date or date range.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[28rem] text-sm" data-testid={`report-${viewMode}-table`}>
        <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
          <tr>
            <th className="w-16 px-4 py-3 font-medium sm:px-5">#</th>
            <th className="px-4 py-3 font-medium sm:px-5">
              {isCategoryView ? "Category" : "Product"}
            </th>
            <th className="px-4 py-3 font-medium sm:px-5">
              {isCategoryView ? "Products" : "Category"}
            </th>
            <th className="px-4 py-3 text-right font-medium sm:px-5">Sold</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/50">
          {rows.map((row, index) => (
            <tr key={row.id} className="hover:bg-muted/20">
              <td className="px-4 py-3 tabular-nums text-muted-foreground sm:px-5">
                {index + 1}
              </td>
              <td className="px-4 py-3 font-medium text-foreground sm:px-5">
                {row.name}
              </td>
              <td className="px-4 py-3 text-muted-foreground sm:px-5">
                {row.detail}
              </td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums text-foreground sm:px-5">
                {row.quantitySold}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
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
  const [viewMode, setViewMode] = useState<ReportViewMode>("products");
  const lockedStoreId = props.mode === "admin" ? props.fixedStoreId : undefined;
  const [selectedStoreId, setSelectedStoreId] = useState(
    lockedStoreId ?? "all",
  );

  const dateBounds = useMemo(
    () => getDateBounds(dateSelection),
    [dateSelection],
  );
  const queryParams = useMemo(() => {
    if (!dateBounds) {
      return null;
    }

    if (props.mode === "admin") {
      const storeId = lockedStoreId ?? selectedStoreId;
      return {
        ...dateBounds,
        ...(storeId !== "all" ? { storeId } : {}),
      } satisfies ProductSalesSummaryAdminQuery;
    }

    return dateBounds;
  }, [dateBounds, lockedStoreId, props.mode, selectedStoreId]);

  const scopedStoreId =
    props.mode === "admin"
      ? (lockedStoreId ?? (selectedStoreId !== "all" ? selectedStoreId : undefined))
      : undefined;
  const licenseStoreId =
    scopedStoreId ?? (props.mode === "admin" ? props.stores[0]?.id : undefined);

  const commercialStatusQuery = useQuery({
    queryKey: commercialLicenseKeys.status(
      props.mode === "admin" ? props.organizationId : "",
      licenseStoreId ?? "",
    ),
    queryFn: () =>
      getStoreCommercialStatus(
        props.mode === "admin" ? props.organizationId : "",
        licenseStoreId ?? "",
      ),
    enabled:
      props.mode === "admin" &&
      Boolean(props.organizationId && licenseStoreId),
  });
  const commercialStatus =
    commercialStatusQuery.data?.status === "success"
      ? commercialStatusQuery.data.data?.commercialStatus ?? null
      : null;
  const accessState = commercialStatus
    ? featureAccessPausedState(commercialStatus, "reports")
    : null;

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
        throw Object.assign(
          new Error(response.message || "Product sales could not be loaded"),
          { code: response.code },
        );
      }

      return response.data?.summary.products ?? [];
    },
    enabled:
      Boolean(queryParams) &&
      (props.mode === "pos" || Boolean(props.organizationId)) &&
      !(scopedStoreId && accessState),
  });

  const products = useMemo(
    () => mergeProductSalesByProductId(productSalesQuery.data ?? []),
    [productSalesQuery.data],
  );
  const categories = useMemo(
    () => aggregateProductSalesByCategory(products),
    [products],
  );
  const productRows = useMemo(() => toRankedProductRows(products), [products]);
  const categoryRows = useMemo(
    () => toRankedCategoryRows(categories),
    [categories],
  );
  const selectedStoreName =
    props.mode === "admin"
      ? lockedStoreId
        ? props.stores.find((store) => store.id === lockedStoreId)?.name ??
          "This store"
        : selectedStoreId === "all"
          ? "All stores"
          : props.stores.find((store) => store.id === selectedStoreId)?.name ??
            "Choose store"
      : props.storeName;
  const showStoreFilter = props.mode === "admin" && !lockedStoreId;
  const errorMessage =
    (productSalesQuery.error as Error | undefined)?.message ||
    "Sales could not be loaded.";
  const salesAccessDenied = isQueryCommercialAccessDenied(productSalesQuery);
  const pausedState =
    accessState ??
    (salesAccessDenied
      ? {
          badge: "Reports not included",
          title: "Reports access paused",
          description: scopedStoreId
            ? "This Store's current access does not include Reports."
            : "No Store in this Organization currently has Reports access.",
          actionLabel: "Add Reports access",
        }
      : null);
  const showReportsPaused =
    props.mode === "admin" &&
    Boolean(licenseStoreId) &&
    Boolean(pausedState) &&
    (Boolean(scopedStoreId) || salesAccessDenied);

  if (
    props.mode === "admin" &&
    scopedStoreId &&
    commercialStatusQuery.isPending
  ) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  if (showReportsPaused && pausedState && licenseStoreId) {
    return (
      <div className={adminWorkspacePageHeightClass}>
        <CatalogAccessPaused
          className="h-full min-h-0"
          badge={pausedState.badge}
          title={pausedState.title}
          message={pausedState.description}
          actionLabel={pausedState.actionLabel}
          actionHref={getStoreLicensePath(
            props.organizationId,
            licenseStoreId,
          )}
          featureIcon={BarChart3}
          retrying={
            productSalesQuery.isFetching || commercialStatusQuery.isFetching
          }
          onRetry={() => {
            void productSalesQuery.refetch();
            void commercialStatusQuery.refetch();
          }}
        />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Reports
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ranked by units sold for the selected dates.
          </p>
        </div>
        <div className="flex min-w-0 flex-wrap items-center justify-end gap-2">
          <ReportDateFilter value={dateSelection} onChange={setDateSelection} />
          {showStoreFilter ? (
            <label className="flex min-w-0 items-center gap-2 text-xs font-medium text-muted-foreground">
              <span className="sr-only">Store filter</span>
              <Select
                value={selectedStoreId}
                onValueChange={(value) => setSelectedStoreId(value ?? "all")}
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

      <Card className="overflow-hidden border-border/60 bg-card shadow-sm">
        <Tabs
          value={viewMode}
          onValueChange={(value) => {
            if (value === "products" || value === "categories") {
              setViewMode(value);
            }
          }}
          className="gap-0"
        >
          <CardHeader className="gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
            <div className="flex items-center justify-between gap-3">
              <TabsList
                className="grid h-9 w-full grid-cols-2 sm:w-auto"
                data-testid="report-view-mode"
              >
                <TabsTrigger
                  value="products"
                  data-testid="report-view-products"
                >
                  Products
                </TabsTrigger>
                <TabsTrigger
                  value="categories"
                  data-testid="report-view-categories"
                >
                  Categories
                </TabsTrigger>
              </TabsList>
              {productSalesQuery.isFetching ? (
                <Spinner className="size-4 text-primary" />
              ) : null}
            </div>
            <CardTitle className="text-base">
              {viewMode === "categories" ? "Category sales" : "Product sales"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {!productSalesQuery.isPending &&
            !productSalesQuery.isError &&
            (viewMode === "categories" ? categoryRows : productRows)
              .length > 0 ? (
              <SalesDistributionChart
                viewMode={viewMode}
                rows={
                  viewMode === "categories" ? categoryRows : productRows
                }
              />
            ) : null}
            <TabsContent value="products" className="mt-0">
              <SalesRankTable
                viewMode="products"
                rows={productRows}
                isPending={productSalesQuery.isPending}
                isError={productSalesQuery.isError}
                errorMessage={errorMessage}
              />
            </TabsContent>
            <TabsContent value="categories" className="mt-0">
              <SalesRankTable
                viewMode="categories"
                rows={categoryRows}
                isPending={productSalesQuery.isPending}
                isError={productSalesQuery.isError}
                errorMessage={errorMessage}
              />
            </TabsContent>
          </CardContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default ProductSalesSummary;
