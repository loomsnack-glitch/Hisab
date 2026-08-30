import { describe, expect, test } from "bun:test";
import { googleContactDisplayName } from "./google-contacts.display-name";

describe("Google Contact display name", () => {
  test("uses the Customer name when no affix is set", () => {
    expect(
      googleContactDisplayName({
        customerName: "Dev Jariwala",
      }),
    ).toBe("Dev Jariwala");
  });

  test("appends a postfix so staff can recognize Ganatri Contacts", () => {
    expect(
      googleContactDisplayName({
        customerName: "Dev Jariwala",
        postfix: "@ph",
      }),
    ).toBe("Dev Jariwala @ph");
  });

  test("prepends a prefix when one is configured", () => {
    expect(
      googleContactDisplayName({
        customerName: "Dev Jariwala",
        prefix: "PH",
      }),
    ).toBe("PH Dev Jariwala");
  });

  test("joins both prefix and postfix around the Customer name", () => {
    expect(
      googleContactDisplayName({
        customerName: "Dev Jariwala",
        prefix: "PH",
        postfix: "@ph",
      }),
    ).toBe("PH Dev Jariwala @ph");
  });

  test("trims affix and Customer name parts before joining", () => {
    expect(
      googleContactDisplayName({
        customerName: "  Dev Jariwala  ",
        prefix: " PH ",
        postfix: " @ph ",
      }),
    ).toBe("PH Dev Jariwala @ph");
  });
});
