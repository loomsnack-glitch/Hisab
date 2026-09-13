import { describe, expect, test } from "bun:test";

import {
    createTablePaginationState,
    DEFAULT_TABLE_PAGE_SIZE,
    TABLE_PAGE_SIZE_OPTIONS,
} from "./pagination";

describe("table pagination defaults", () => {
    test("uses 10, 25, 50, and 100 as page-size options", () => {
        expect(TABLE_PAGE_SIZE_OPTIONS).toEqual([10, 25, 50, 100]);
    });

    test("defaults new tables to 50 rows per page", () => {
        expect(DEFAULT_TABLE_PAGE_SIZE).toBe(50);
        expect(createTablePaginationState()).toEqual({ pageIndex: 0, pageSize: 50 });
    });
});
