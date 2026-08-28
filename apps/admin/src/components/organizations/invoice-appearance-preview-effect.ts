import { useEffect, useRef } from "react";
import { previewStoreInvoiceAppearance } from "@repo/services";
import type { InvoiceAppearanceSettings, UpdateInvoiceAppearanceSettings } from "@repo/types";

export type InvoiceAppearancePreviewMode = "desktop" | "mobile" | "pdf";

export type InvoiceAppearancePreviewVariables = UpdateInvoiceAppearanceSettings & {
  usesOrganizationDefault?: boolean;
  viewport: InvoiceAppearancePreviewMode;
  mode: "screen" | "print" | "preview";
};

export type InvoiceAppearancePreviewResponse = Awaited<ReturnType<typeof previewStoreInvoiceAppearance>>;

export type InvoiceAppearancePreviewMutate = (
  values: InvoiceAppearancePreviewVariables,
  options: {
    onSuccess: (response: InvoiceAppearancePreviewResponse) => void;
    onError: (error: { message?: string }) => void;
  },
) => void;

const toAppearancePayload = (settings: InvoiceAppearanceSettings): UpdateInvoiceAppearanceSettings => ({
  preset: settings.preset,
  logoPath: settings.logoPath,
  accentColor: settings.accentColor,
  headerStyle: settings.headerStyle,
  fontPreset: settings.fontPreset,
  density: settings.density,
  visibility: settings.visibility,
  footerText: settings.footerText ?? "",
  termsText: settings.termsText ?? "",
});

export const useInvoiceAppearancePreviewEffect = ({
  draft,
  previewMode,
  usesOrganizationDefault,
  requestPreview,
  applyPreviewResponse,
  onPreviewError,
}: {
  draft: InvoiceAppearanceSettings;
  previewMode: InvoiceAppearancePreviewMode;
  usesOrganizationDefault: boolean;
  requestPreview: InvoiceAppearancePreviewMutate;
  applyPreviewResponse: (response: InvoiceAppearancePreviewResponse) => void;
  onPreviewError: (error: { message?: string }) => void;
}) => {
  const previewRequestId = useRef(0);

  useEffect(() => {
    const requestId = ++previewRequestId.current;
    const handle = window.setTimeout(() => {
      requestPreview({
        ...toAppearancePayload(draft),
        usesOrganizationDefault,
        viewport: previewMode,
        mode: previewMode === "pdf" ? "print" : "screen",
      }, {
        onSuccess: (response) => {
          if (requestId !== previewRequestId.current) return;
          applyPreviewResponse(response);
        },
        onError: (error) => {
          if (requestId !== previewRequestId.current) return;
          onPreviewError(error);
        },
      });
    }, 350);
    return () => window.clearTimeout(handle);
  }, [applyPreviewResponse, draft, onPreviewError, previewMode, requestPreview, usesOrganizationDefault]);
};
