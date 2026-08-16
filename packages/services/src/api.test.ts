import { afterEach, describe, expect, test } from "bun:test";

import { resolveBaseApiUrl } from "./api";

const environmentKeys = [
  "EXPO_PUBLIC_BASE_API_URL",
  "NEXT_PUBLIC_BASE_API_URL",
  "API_BASE_URL",
  "BASE_API_URL",
] as const;

const originalEnvironment = Object.fromEntries(
  environmentKeys.map((key) => [key, process.env[key]]),
);
const originalGlobalBaseUrl = globalThis.__TENDERSENSE_BASE_API_URL__;

afterEach(() => {
  for (const key of environmentKeys) {
    const value = originalEnvironment[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  globalThis.__TENDERSENSE_BASE_API_URL__ = originalGlobalBaseUrl;
});

describe("API base URL resolution", () => {
  test("uses the deployed API when no environment override exists", () => {
    for (const key of environmentKeys) delete process.env[key];
    delete globalThis.__TENDERSENSE_BASE_API_URL__;

    expect(resolveBaseApiUrl()).toBe("https://ganatri.loomsnack.com/api");
  });
});

declare global {
  // Runtime override supported by the services package.
  var __TENDERSENSE_BASE_API_URL__: string | undefined;
}
