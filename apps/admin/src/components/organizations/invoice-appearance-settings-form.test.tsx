import { describe, expect, mock, test } from "bun:test";
import { Window } from "happy-dom";
import type {
  InvoiceAppearancePreviewMutate,
  InvoiceAppearancePreviewVariables,
} from "./invoice-appearance-preview-effect";

const testWindow = new Window({ url: "http://localhost" });
Object.assign(globalThis, {
  Element: testWindow.Element,
  Event: testWindow.Event,
  HTMLElement: testWindow.HTMLElement,
  Node: testWindow.Node,
  MutationObserver: testWindow.MutationObserver,
  ResizeObserver: testWindow.ResizeObserver,
  document: testWindow.document,
  getComputedStyle: testWindow.getComputedStyle.bind(testWindow),
  navigator: testWindow.navigator,
  window: testWindow,
});

const { renderHook } = await import("@testing-library/react");
const { FALLBACK_INVOICE_APPEARANCE } = await import("@repo/types");
const { useInvoiceAppearancePreviewEffect } = await import("./invoice-appearance-preview-effect");

const waitForPreviewDebounce = () => new Promise((resolve) => setTimeout(resolve, 400));

describe("invoice appearance preview trigger", () => {
  test("does not request another preview when mutation state rerenders the form", async () => {
    const requestPreview = mock<InvoiceAppearancePreviewMutate>((_values: InvoiceAppearancePreviewVariables, options) => {
      options.onSuccess({
        status: "success",
        message: "Preview generated",
        data: null,
        code: 200,
      });
    });
    const applyPreviewResponse = mock();
    const onPreviewError = mock();
    const props = {
      draft: FALLBACK_INVOICE_APPEARANCE,
      previewMode: "desktop" as const,
      usesOrganizationDefault: true,
      requestPreview,
      applyPreviewResponse,
      onPreviewError,
    };

    const rendered = renderHook((input) => useInvoiceAppearancePreviewEffect(input), {
      initialProps: props,
    });

    await waitForPreviewDebounce();
    expect(requestPreview).toHaveBeenCalledTimes(1);

    rendered.rerender({ ...props });
    await waitForPreviewDebounce();

    expect(requestPreview).toHaveBeenCalledTimes(1);
    expect(applyPreviewResponse).toHaveBeenCalledTimes(1);
    expect(onPreviewError).not.toHaveBeenCalled();
    rendered.unmount();
  });
});
