import { useEffect, useMemo, useState } from "react";
import {
  buildSalesDistributionSlices,
  OTHER_SALES_SLICE_NAME,
} from "@repo/types";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

// Hues spaced around the wheel so adjacent slices stay easy to tell apart.
const SLICE_COLORS = [
  "oklch(0.58 0.19 250)", // blue
  "oklch(0.68 0.17 55)", // orange
  "oklch(0.62 0.17 145)", // green
  "oklch(0.64 0.20 350)", // pink
  "oklch(0.62 0.14 195)", // teal
  "oklch(0.72 0.15 75)", // amber
  "oklch(0.50 0.18 275)", // indigo
  "oklch(0.58 0.20 25)", // red
];

type SalesDistributionChartProps = {
  rows: Array<{ name: string; quantitySold: number }>;
  viewMode: "products" | "categories";
};

type SliceTooltipProps = {
  active?: boolean;
  payload?: Array<{ name?: string; value?: number }>;
};

const colorForSlice = (name: string, index: number) =>
  name === OTHER_SALES_SLICE_NAME
    ? "var(--muted-foreground)"
    : SLICE_COLORS[index % SLICE_COLORS.length];

const formatPercent = (value: number, total: number) => {
  if (total <= 0) {
    return "0%";
  }

  const percent = (value / total) * 100;
  if (percent > 0 && percent < 1) {
    return "<1%";
  }

  return `${Math.round(percent)}%`;
};

const SliceTooltip = ({ active, payload }: SliceTooltipProps) => {
  if (!active || !payload?.length) {
    return null;
  }

  const item = payload[0];
  if (!item) {
    return null;
  }

  return (
    <div className="rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl">
      <p className="font-medium text-foreground">{item.name}</p>
      <p className="tabular-nums text-muted-foreground">{item.value} sold</p>
    </div>
  );
};

const SalesDistributionChart = ({
  rows,
  viewMode,
}: SalesDistributionChartProps) => {
  const [canRender, setCanRender] = useState(false);

  useEffect(() => {
    setCanRender(true);
  }, []);

  const slices = useMemo(
    () =>
      buildSalesDistributionSlices(
        rows.map((row) => ({
          name: row.name,
          quantitySold: row.quantitySold,
        })),
      ),
    [rows],
  );
  const total = useMemo(
    () => slices.reduce((sum, slice) => sum + slice.value, 0),
    [slices],
  );
  const chartData = useMemo(
    () =>
      slices.map((slice, index) => ({
        name: slice.name,
        value: slice.value,
        fill: colorForSlice(slice.name, index),
        sliceKey: `slice${index}`,
      })),
    [slices],
  );

  if (slices.length === 0 || total <= 0) {
    return null;
  }

  return (
    <div
      className="border-b border-border/60 px-4 py-5 sm:px-5"
      data-testid={`report-${viewMode}-chart`}
    >
      <p className="mb-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {viewMode === "categories"
          ? "Units sold by category"
          : "Units sold by product"}
      </p>
      {canRender ? (
        <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-center sm:gap-8">
          <div className="relative mx-auto h-[220px] w-full max-w-[240px] shrink-0 sm:mx-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Tooltip content={<SliceTooltip />} />
                <Pie
                  data={chartData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={62}
                  outerRadius={88}
                  paddingAngle={1.5}
                  stroke="var(--card)"
                  strokeWidth={2}
                >
                  {chartData.map((entry) => (
                    <Cell key={entry.sliceKey} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold tabular-nums text-foreground">
                {total}
              </span>
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                sold
              </span>
            </div>
          </div>
          <ul className="grid w-full min-w-0 flex-1 gap-2">
            {chartData.map((entry) => (
              <li
                key={entry.sliceKey}
                className="flex min-w-0 items-center justify-between gap-3 text-sm"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-2.5 shrink-0 rounded-sm"
                    style={{ backgroundColor: entry.fill }}
                    aria-hidden
                  />
                  <span className="truncate font-medium text-foreground">
                    {entry.name}
                  </span>
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">
                  {entry.value} - {formatPercent(entry.value, total)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <div className="h-[220px]" aria-hidden />
      )}
    </div>
  );
};

export default SalesDistributionChart;
