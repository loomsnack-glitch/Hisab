/** Shared defaults for paginated admin workspace list APIs and tables. */
export const TABLE_PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

export const DEFAULT_TABLE_PAGE_SIZE = 50;

export type TablePageSize = (typeof TABLE_PAGE_SIZE_OPTIONS)[number];

export const createTablePaginationState = (pageSize: number = DEFAULT_TABLE_PAGE_SIZE) => ({
    pageIndex: 0,
    pageSize,
});
