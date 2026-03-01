// File: apps/backend/src/utils/case.ts

type AnyObject = Record<string, any>;

const isObject = (v: any) =>
    v !== null && typeof v === "object" && !Array.isArray(v) && !(v instanceof Date);

export function camelToSnakeKey(key: string) {
    return key.replace(/([A-Z])/g, "_$1").toLowerCase();
}

export function snakeToCamelKey(key: string) {
    return key.replace(/_([a-z])/g, (_, ch) => ch.toUpperCase());
}

/**
 * Convert camelCase object keys to snake_case
 * - deep (default: true) applies recursively to nested objects and arrays
 * - undefined values are removed (useful for SQL inserts/updates)
 */
export function camelToSnake<T = any>(input: T, deep = false): any {
    if (Array.isArray(input)) {
        return input.map((v) => (deep ? camelToSnake(v, deep) : v));
    }
    if (!isObject(input)) return input;

    const result: AnyObject = {};
    for (const [key, value] of Object.entries(input as AnyObject)) {
        if (value === undefined) continue; // don't include undefined fields
        const newKey = camelToSnakeKey(key);
        result[newKey] =
            deep && (Array.isArray(value) || isObject(value))
                ? camelToSnake(value, deep)
                : value;
    }
    return result;
}

/**
 * Convert snake_case object keys to camelCase
 * - deep (default: true) applies recursively to nested objects and arrays
 */
export function snakeToCamel<T = any>(input: T, deep = false): any {
    if (Array.isArray(input)) {
        return input.map((v) => (deep ? snakeToCamel(v, deep) : v));
    }
    if (!isObject(input)) return input;

    const result: AnyObject = {};
    for (const [key, value] of Object.entries(input as AnyObject)) {
        const newKey = snakeToCamelKey(key);
        result[newKey] =
            deep && (Array.isArray(value) || isObject(value))
                ? snakeToCamel(value, deep)
                : value;
    }
    return result;
}
