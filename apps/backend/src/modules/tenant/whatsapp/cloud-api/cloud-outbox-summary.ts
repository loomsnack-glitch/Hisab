export type CloudOutboxReconciliationSummary = {
  reconcilingCount: number;
  oldestReconcilingAt: string | null;
  retryableCount: number;
  deadLetterCount: number;
};

const nonNegativeCount = (value: unknown): number => {
  const count = Number(value ?? 0);
  return Number.isFinite(count) && count >= 0 ? Math.trunc(count) : 0;
};

export const mapCloudOutboxReconciliationSummary = (
  row: Record<string, unknown> | undefined,
): CloudOutboxReconciliationSummary => {
  const oldest = row?.oldest_reconciling_at;
  const oldestDate = oldest ? new Date(String(oldest)) : null;
  return {
    reconcilingCount: nonNegativeCount(row?.reconciling_count),
    oldestReconcilingAt: oldestDate && !Number.isNaN(oldestDate.getTime()) ? oldestDate.toISOString() : null,
    retryableCount: nonNegativeCount(row?.retryable_count),
    deadLetterCount: nonNegativeCount(row?.dead_letter_count),
  };
};
