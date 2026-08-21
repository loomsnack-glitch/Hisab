import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";

import { isParcelKotActionVisible, PosParcelKotAction } from "./pos-parcel-kot";

describe("Parcel KOT POS action", () => {
  test("is visible only for a KOT-enabled device session that is not editing a bill", () => {
    expect(
      isParcelKotActionVisible({
        isDeviceMode: true,
        kotSystemEnabled: true,
        isReplacingSale: false,
      }),
    ).toBe(true);
    expect(
      isParcelKotActionVisible({
        isDeviceMode: true,
        kotSystemEnabled: false,
        isReplacingSale: false,
      }),
    ).toBe(false);
    expect(
      isParcelKotActionVisible({
        isDeviceMode: false,
        kotSystemEnabled: true,
        isReplacingSale: false,
      }),
    ).toBe(false);
    expect(
      isParcelKotActionVisible({
        isDeviceMode: true,
        kotSystemEnabled: true,
        isReplacingSale: true,
      }),
    ).toBe(false);
  });

  test("renders the Parcel KOT action when the KOT System is enabled", () => {
    const visible = renderToStaticMarkup(
      <PosParcelKotAction available disabled={false} isPending={false} onGenerate={() => undefined} />,
    );
    const hidden = renderToStaticMarkup(
      <PosParcelKotAction
        available={false}
        disabled={false}
        isPending={false}
        onGenerate={() => undefined}
      />,
    );

    expect(visible).toContain("Parcel KOT");
    expect(visible).toContain("parcel-kot-action");
    expect(hidden).not.toContain("Parcel KOT");
  });
});
