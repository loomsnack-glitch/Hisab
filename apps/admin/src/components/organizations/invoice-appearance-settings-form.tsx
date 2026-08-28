import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getSignedURL,
  getSignedURLForUpload,
  getStoreInvoiceAppearance,
  previewStoreInvoiceAppearance,
  publishOrganizationInvoiceAppearance,
  publishStoreInvoiceAppearance,
  resetOrganizationInvoiceAppearance,
  resetStoreInvoiceAppearance,
  updateOrganizationInvoiceAppearanceDraft,
  updateStoreInvoiceAppearanceDraft,
  uploadFileToSignedURL,
} from "@repo/services";
import {
  FALLBACK_INVOICE_APPEARANCE,
  buildInvoiceLogoStoragePath,
  hasLowContrastAccent,
  mergeInvoiceAppearanceUpdates,
  type InvoiceAppearanceSettings,
  type InvoiceAppearanceVisibility,
  type InvoiceAppearanceSettingsResponse,
  type StoreInvoiceAppearanceSettingsResponse,
  type StoreDTO,
  type UpdateInvoiceAppearanceSettings,
} from "@repo/types";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Checkbox } from "@repo/ui/components/checkbox";
import { Field, FieldContent, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Label } from "@repo/ui/components/label";
import { Spinner } from "@repo/ui/components/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@repo/ui/components/tabs";
import { Textarea } from "@repo/ui/components/textarea";
import { AlertTriangle, FileText, ImageIcon, Monitor, Palette, RefreshCcw, Save, Smartphone, UploadCloud } from "lucide-react";
import { toast } from "sonner";

import { organizationKeys } from "@/lib/query-keys";
import { safeRandomUUID } from "@/lib/uuid";
import {
  useInvoiceAppearancePreviewEffect,
  type InvoiceAppearancePreviewVariables,
} from "./invoice-appearance-preview-effect";

type InvoiceAppearanceSettingsFormProps = {
  organizationId: string;
  store: StoreDTO;
};

type PreviewMode = "desktop" | "mobile" | "pdf";

const presetOptions = [
  { value: "classic", label: "Classic" },
  { value: "modern", label: "Modern" },
  { value: "minimal", label: "Minimal" },
] as const;

const visibilityFields: Array<{ key: keyof InvoiceAppearanceVisibility; label: string }> = [
  { key: "showTagline", label: "Tagline" },
  { key: "showAddress", label: "Address" },
  { key: "showStorePhone", label: "Store phone" },
  { key: "showCustomerPhone", label: "Customer phone" },
  { key: "showServiceMode", label: "Service mode" },
  { key: "showNotes", label: "Notes" },
  { key: "showTerms", label: "Terms" },
  { key: "showReviewLink", label: "Review link" },
  { key: "showSocialLink", label: "Social link" },
  { key: "showStoreLinks", label: "Store links" },
  { key: "showPdfFooter", label: "PDF footer" },
];

const buildLogoPath = (organizationId: string, fileName: string) => {
  const extension = fileName.split(".").pop()?.toLowerCase() || "png";
  return buildInvoiceLogoStoragePath(organizationId, safeRandomUUID(), extension);
};

const settingsEqual = (left: InvoiceAppearanceSettings, right: InvoiceAppearanceSettings): boolean =>
  JSON.stringify(left) === JSON.stringify(right);

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

type AppearanceMutationVariables = {
  usesOrganizationDefault: boolean;
  draft: InvoiceAppearanceSettings;
};

const createPdfPreviewUrl = (pdfBase64: string): string => {
  const binary = atob(pdfBase64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return URL.createObjectURL(new Blob([bytes], { type: "application/pdf" }));
};

const getEffectiveDraftFromStoreResponse = (
  data: StoreInvoiceAppearanceSettingsResponse,
): InvoiceAppearanceSettings => {
  const published = data.settings.usesOrganizationDefault
    ? data.organizationDefaults.publishedSettings
    : data.settings.publishedSettings ?? data.organizationDefaults.publishedSettings;
  return data.settings.usesOrganizationDefault
    ? data.organizationDefaults.draftSettings ?? published
    : data.settings.draftSettings ?? published;
};

const InvoiceAppearanceSettingsForm = ({ organizationId, store }: InvoiceAppearanceSettingsFormProps) => {
  const queryClient = useQueryClient();
  const appearanceQueryKey = organizationKeys.invoiceAppearance(organizationId, store.id);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("desktop");
  const [previewHtml, setPreviewHtml] = useState("");
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [logoUploadError, setLogoUploadError] = useState<string | null>(null);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const [usesOrganizationDefault, setUsesOrganizationDefault] = useState(true);
  const [draft, setDraft] = useState<InvoiceAppearanceSettings>(FALLBACK_INVOICE_APPEARANCE);
  const [baselineDraft, setBaselineDraft] = useState<InvoiceAppearanceSettings>(FALLBACK_INVOICE_APPEARANCE);
  const [formError, setFormError] = useState<string | null>(null);
  const previewPdfUrlRef = useRef<string | null>(null);
  const hydratedSettingsFingerprint = useRef<string | null>(null);
  const isDirty = useMemo(() => !settingsEqual(draft, baselineDraft), [draft, baselineDraft]);

  const settingsQuery = useQuery({
    queryKey: appearanceQueryKey,
    queryFn: () => getStoreInvoiceAppearance(organizationId, store.id),
  });
  const { refetch: refetchSettings } = settingsQuery;

  const settingsResponse =
    settingsQuery.data?.status === "success" ? settingsQuery.data.data : null;

  const settingsFingerprint = settingsResponse
    ? `${store.id}:${settingsResponse.settings.updatedAt}:${settingsResponse.organizationDefaults.updatedAt}:${settingsResponse.settings.usesOrganizationDefault}`
    : null;

  useEffect(() => {
    hydratedSettingsFingerprint.current = null;
  }, [store.id]);

  const applyStoreSettingsResponse = useCallback((data: StoreInvoiceAppearanceSettingsResponse) => {
    const nextDraft = getEffectiveDraftFromStoreResponse(data);
    setUsesOrganizationDefault(data.settings.usesOrganizationDefault);
    setDraft(nextDraft);
    setBaselineDraft(nextDraft);
    hydratedSettingsFingerprint.current = `${store.id}:${data.settings.updatedAt}:${data.organizationDefaults.updatedAt}:${data.settings.usesOrganizationDefault}`;
  }, [store.id]);

  const syncOrganizationDefaultsInCache = useCallback((organizationDefaults: InvoiceAppearanceSettingsResponse["settings"]) => {
    queryClient.setQueryData(appearanceQueryKey, (current) => {
      if (current?.status !== "success" || !current.data) return current;
      return {
        ...current,
        data: {
          ...current.data,
          organizationDefaults,
        },
      };
    });
    const cached = queryClient.getQueryData<Awaited<ReturnType<typeof getStoreInvoiceAppearance>>>(appearanceQueryKey);
    if (cached?.status === "success" && cached.data) {
      applyStoreSettingsResponse(cached.data);
    }
  }, [appearanceQueryKey, applyStoreSettingsResponse, queryClient]);

  const applyLoadedSettings = useCallback((force = false) => {
    if (!settingsResponse || !settingsFingerprint) return;
    if (!force && isDirty) return;
    if (!force && hydratedSettingsFingerprint.current === settingsFingerprint) return;

    applyStoreSettingsResponse(settingsResponse);
  }, [applyStoreSettingsResponse, isDirty, settingsFingerprint, settingsResponse]);

  useEffect(() => {
    applyLoadedSettings();
  }, [applyLoadedSettings]);

  const contrastWarning = useMemo(() => hasLowContrastAccent(draft.accentColor), [draft.accentColor]);

  const previewMutation = useMutation({
    mutationFn: (values: InvoiceAppearancePreviewVariables) => previewStoreInvoiceAppearance(organizationId, store.id, values),
  });
  const { mutate: requestPreview, isPending: isPreviewPending } = previewMutation;

  const applyPreviewResponse = useCallback((response: Awaited<ReturnType<typeof previewStoreInvoiceAppearance>>) => {
    if (response.status !== "success" || !response.data) {
      setPreviewError(response.message ?? "Failed to generate preview");
      return;
    }

    if (response.data.pdfBase64) {
      const nextPdfUrl = createPdfPreviewUrl(response.data.pdfBase64);
      if (previewPdfUrlRef.current) URL.revokeObjectURL(previewPdfUrlRef.current);
      previewPdfUrlRef.current = nextPdfUrl;
      setPreviewPdfUrl(nextPdfUrl);
      setPreviewHtml("");
      setPreviewError(null);
      return;
    }

    if (response.data.html) {
      setPreviewHtml(response.data.html);
      if (previewPdfUrlRef.current) {
        URL.revokeObjectURL(previewPdfUrlRef.current);
        previewPdfUrlRef.current = null;
      }
      setPreviewPdfUrl(null);
      setPreviewError(null);
      return;
    }

    setPreviewError("Failed to generate preview");
  }, []);

  const handlePreviewError = useCallback((error: { message?: string }) => {
    setPreviewError(error.message ?? "Failed to generate preview");
  }, []);

  useEffect(() => () => {
    if (previewPdfUrlRef.current) URL.revokeObjectURL(previewPdfUrlRef.current);
  }, []);

  useInvoiceAppearancePreviewEffect({
    draft,
    previewMode,
    usesOrganizationDefault,
    requestPreview,
    applyPreviewResponse,
    onPreviewError: handlePreviewError,
  });

  useEffect(() => {
    let cancelled = false;
    const loadLogoPreview = async () => {
      if (!draft.logoPath) {
        setLogoPreviewUrl(null);
        return;
      }
      const response = await getSignedURL({ path: draft.logoPath });
      if (!cancelled) {
        if (response.status === "success" && response.data) {
          setLogoPreviewUrl(response.data);
        } else {
          setLogoPreviewUrl(null);
        }
      }
    };
    void loadLogoPreview();
    return () => {
      cancelled = true;
    };
  }, [draft.logoPath]);

  const refreshSettings = useCallback(async () => {
    const refreshed = await refetchSettings();
    const data = refreshed.data?.status === "success" ? refreshed.data.data : null;
    if (data) {
      applyStoreSettingsResponse(data);
      return;
    }
    throw new Error(refreshed.data?.message ?? "Failed to refresh invoice appearance settings");
  }, [applyStoreSettingsResponse, refetchSettings]);

  const handleMutationSuccess = useCallback((
    response: Awaited<ReturnType<typeof updateStoreInvoiceAppearanceDraft>>
      | Awaited<ReturnType<typeof updateOrganizationInvoiceAppearanceDraft>>,
    successMessage: string,
  ) => {
    if (response.status !== "success" || !response.data) {
      const message = response.message ?? "Failed to update invoice appearance";
      setFormError(message);
      toast.error(message);
      return;
    }

    toast.success(successMessage);
    setFormError(null);

    if ("organizationDefaults" in response.data) {
      queryClient.setQueryData(appearanceQueryKey, {
        status: "success",
        message: response.message,
        data: response.data,
        code: response.code,
      });
      applyStoreSettingsResponse(response.data);
      return;
    }

    syncOrganizationDefaultsInCache(response.data.settings);
  }, [appearanceQueryKey, applyStoreSettingsResponse, queryClient, syncOrganizationDefaultsInCache]);

  const handleSettingsRefreshError = useCallback((error: unknown) => {
    const message = error instanceof Error ? error.message : "Failed to refresh invoice appearance settings";
    setFormError(message);
    toast.error(message);
  }, []);

  const saveDraftMutation = useMutation({
    mutationFn: async ({ usesOrganizationDefault: saveToOrganization, draft: draftToSave }: AppearanceMutationVariables) => {
      if (saveToOrganization) {
        return updateOrganizationInvoiceAppearanceDraft(organizationId, toAppearancePayload(draftToSave));
      }
      return updateStoreInvoiceAppearanceDraft(organizationId, store.id, {
        ...toAppearancePayload(draftToSave),
        usesOrganizationDefault: false,
      });
    },
    onSuccess: (response) => {
      handleMutationSuccess(response, "Draft saved");
    },
    onError: (error: { message?: string }) => {
      const message = error.message ?? "Failed to save draft";
      setFormError(message);
      toast.error(message);
    },
  });

  const publishMutation = useMutation({
    mutationFn: async ({ usesOrganizationDefault: publishToOrganization, draft: draftToPublish }: AppearanceMutationVariables) => {
      const draftResponse = publishToOrganization
        ? await updateOrganizationInvoiceAppearanceDraft(organizationId, toAppearancePayload(draftToPublish))
        : await updateStoreInvoiceAppearanceDraft(organizationId, store.id, {
          ...toAppearancePayload(draftToPublish),
          usesOrganizationDefault: false,
        });
      if (draftResponse.status !== "success") {
        throw new Error(draftResponse.message ?? "Failed to save appearance before publishing");
      }
      if (publishToOrganization) {
        return publishOrganizationInvoiceAppearance(organizationId);
      }
      return publishStoreInvoiceAppearance(organizationId, store.id);
    },
    onSuccess: (response) => {
      handleMutationSuccess(response, "Invoice appearance published");
    },
    onError: (error: { message?: string }) => {
      const message = error.message ?? "Failed to publish appearance";
      setFormError(message);
      toast.error(message);
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (usesOrganizationDefault) {
        return resetOrganizationInvoiceAppearance(organizationId);
      }
      return resetStoreInvoiceAppearance(organizationId, store.id);
    },
    onSuccess: (response) => {
      if (response.status === "success") {
        toast.success(usesOrganizationDefault ? "Organization default reset" : "Reset to organization default");
        setFormError(null);
        void refreshSettings().catch(handleSettingsRefreshError);
        return;
      }
      const message = response.message ?? "Failed to reset appearance";
      setFormError(message);
      toast.error(message);
    },
    onError: (error: { message?: string }) => {
      const message = error.message ?? "Failed to reset appearance";
      setFormError(message);
      toast.error(message);
    },
  });

  const uploadLogo = async (file: File) => {
    setLogoUploadError(null);
    setIsLogoUploading(true);
    try {
      const path = buildLogoPath(organizationId, file.name);
      const signed = await getSignedURLForUpload({ path });
      if (signed.status !== "success" || !signed.data) {
        const message = signed.message ?? "Failed to prepare logo upload";
        setLogoUploadError(message);
        toast.error(message);
        return;
      }
      await uploadFileToSignedURL(signed.data, file);
      updateDraft({ logoPath: path });
      toast.success("Logo uploaded");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to upload logo";
      setLogoUploadError(message);
      toast.error(message);
    } finally {
      setIsLogoUploading(false);
    }
  };

  const updateDraft = (updates: UpdateInvoiceAppearanceSettings) => {
    setDraft((current) => mergeInvoiceAppearanceUpdates(current, updates));
    setFormError(null);
  };

  const switchScope = (nextUsesOrganizationDefault: boolean) => {
    if (!settingsResponse) return;
    setUsesOrganizationDefault(nextUsesOrganizationDefault);
    const published = nextUsesOrganizationDefault
      ? settingsResponse.organizationDefaults.publishedSettings
      : settingsResponse.settings.publishedSettings ?? settingsResponse.organizationDefaults.publishedSettings;
    const nextDraft = nextUsesOrganizationDefault
      ? settingsResponse.organizationDefaults.draftSettings ?? published
      : settingsResponse.settings.draftSettings ?? published;
    setDraft(nextDraft);
    setBaselineDraft(nextDraft);
  };

  const previewFrameClass =
    previewMode === "mobile"
      ? "mx-auto w-[390px] max-w-full rounded-[2rem] border-4 border-slate-900 bg-slate-900 p-2 shadow-2xl"
      : previewMode === "pdf"
        ? "mx-auto w-[794px] max-w-full bg-muted/40"
        : "w-full";

  const previewModeDetails = {
    desktop: {
      label: "Desktop preview",
      description: "Wide customer invoice with the desktop table layout.",
      icon: Monitor,
    },
    mobile: {
      label: "Mobile preview",
      description: "390 px phone layout with stacked details and item cards.",
      icon: Smartphone,
    },
    pdf: {
      label: "PDF preview",
      description: "The actual PDF binary customers download.",
      icon: FileText,
    },
  }[previewMode];
  const PreviewModeIcon = previewModeDetails.icon;

  if (settingsQuery.isPending) {
    return (
      <div className="flex min-h-48 items-center justify-center">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  if (settingsQuery.isError || settingsQuery.data?.status === "error") {
    return (
      <Card className="border-destructive/40">
        <CardContent className="p-6 text-sm text-destructive">
          {settingsQuery.data?.message ?? "Failed to load invoice appearance settings"}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
      <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <CardTitle className="font-display text-xl">Invoice appearance</CardTitle>
              <CardDescription>
                Customize the public invoice page and PDF for this store without changing WhatsApp templates.
              </CardDescription>
            </div>
            <Badge variant="outline" className="rounded-full">
              {usesOrganizationDefault ? "Using organization default" : "Store override active"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {formError ? <p className="text-sm text-destructive" role="alert">{formError}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant={usesOrganizationDefault ? "default" : "outline"} className="rounded-full" onClick={() => switchScope(true)}>
              Organization default
            </Button>
            <Button type="button" variant={!usesOrganizationDefault ? "default" : "outline"} className="rounded-full" onClick={() => switchScope(false)}>
              Store override
            </Button>
          </div>
          <div className="rounded-xl border bg-muted/30 p-3 text-sm text-muted-foreground">
            {usesOrganizationDefault
              ? "This store uses the organization design. Save draft keeps your work in progress. Publish applies it to customer invoices for every store on the organization default."
              : "This store uses its own design. Save draft keeps your work in progress. Publish applies it to this store's customer invoices."}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel>Preset</FieldLabel>
              <FieldContent>
                <div className="flex flex-wrap gap-2">
                  {presetOptions.map((option) => (
                    <Button key={option.value} type="button" size="sm" variant={draft.preset === option.value ? "default" : "outline"} className="rounded-full" onClick={() => updateDraft({ preset: option.value })}>
                      {option.label}
                    </Button>
                  ))}
                </div>
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="accent-color">Accent color</FieldLabel>
              <FieldContent className="flex items-center gap-3">
                <Input id="accent-color" type="color" value={draft.accentColor} onChange={(event) => updateDraft({ accentColor: event.target.value })} className="h-11 w-16 p-1" />
                <Input value={draft.accentColor} onChange={(event) => updateDraft({ accentColor: event.target.value })} />
              </FieldContent>
            </Field>
          </div>

          {contrastWarning ? (
            <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-900">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <span>This accent color may be hard to read. Consider choosing a stronger contrast before publishing.</span>
            </div>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-3">
            <Field>
              <FieldLabel>Header style</FieldLabel>
              <FieldContent>
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={draft.headerStyle} onChange={(event) => updateDraft({ headerStyle: event.target.value as InvoiceAppearanceSettings["headerStyle"] })}>
                  <option value="banner">Banner</option>
                  <option value="split">Split</option>
                  <option value="minimal">Minimal</option>
                </select>
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>Font preset</FieldLabel>
              <FieldContent>
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={draft.fontPreset} onChange={(event) => updateDraft({ fontPreset: event.target.value as InvoiceAppearanceSettings["fontPreset"] })}>
                  <option value="system">System</option>
                  <option value="serif">Serif</option>
                  <option value="rounded">Rounded</option>
                </select>
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel>Density</FieldLabel>
              <FieldContent>
                <select className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={draft.density} onChange={(event) => updateDraft({ density: event.target.value as InvoiceAppearanceSettings["density"] })}>
                  <option value="comfortable">Comfortable</option>
                  <option value="compact">Compact</option>
                </select>
              </FieldContent>
            </Field>
          </div>

          <Field>
            <FieldLabel>Logo</FieldLabel>
            <FieldContent className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <label className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm ${isLogoUploading ? "cursor-wait opacity-70" : "cursor-pointer"}`}>
                  {isLogoUploading ? <Spinner className="size-4" /> : <UploadCloud className="size-4" />}
                  {isLogoUploading ? "Uploading logo…" : "Upload logo"}
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={isLogoUploading} onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void uploadLogo(file);
                  }} />
                </label>
                {draft.logoPath ? (
                  <Button type="button" variant="outline" className="rounded-full" disabled={isLogoUploading} onClick={() => updateDraft({ logoPath: "" })}>
                    Remove logo
                  </Button>
                ) : (
                  <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                    <ImageIcon className="size-4" />
                    No logo uploaded
                  </span>
                )}
              </div>
              {logoUploadError ? <p className="text-sm text-destructive" role="alert">{logoUploadError}</p> : null}
              {logoPreviewUrl ? (
                <img src={logoPreviewUrl} alt="Invoice logo preview" className="h-16 w-16 rounded-xl border bg-white object-contain p-2" />
              ) : null}
            </FieldContent>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="footer-text">Footer text</FieldLabel>
              <FieldContent>
                <Textarea id="footer-text" rows={3} value={draft.footerText ?? ""} onChange={(event) => updateDraft({ footerText: event.target.value })} />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="terms-text">Terms text</FieldLabel>
              <FieldContent>
                <Textarea id="terms-text" rows={3} value={draft.termsText ?? ""} onChange={(event) => updateDraft({ termsText: event.target.value })} />
              </FieldContent>
            </Field>
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2 text-sm font-medium">
              <Palette className="size-4" />
              Visibility
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {visibilityFields.map((field) => (
                <label key={field.key} className="flex items-center gap-2 text-sm">
                  <Checkbox checked={draft.visibility[field.key]} onCheckedChange={(checked) => updateDraft({ visibility: { [field.key]: checked === true } })} />
                  <Label>{field.label}</Label>
                </label>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button type="button" className="rounded-full" disabled={saveDraftMutation.isPending || publishMutation.isPending || isLogoUploading || !isDirty} onClick={() => saveDraftMutation.mutate({ usesOrganizationDefault, draft })}>
              <Save className="size-4" />
              Save draft
            </Button>
            <Button type="button" variant="secondary" className="rounded-full" disabled={publishMutation.isPending || isLogoUploading} onClick={() => publishMutation.mutate({ usesOrganizationDefault, draft })}>
              {publishMutation.isPending ? <><Spinner className="size-4" /> Publishing…</> : "Publish"}
            </Button>
            <Button type="button" variant="outline" className="rounded-full" disabled={resetMutation.isPending || isLogoUploading} onClick={() => resetMutation.mutate()}>
              <RefreshCcw className="size-4" />
              {usesOrganizationDefault ? "Reset default" : "Use organization default"}
            </Button>
            {isDirty ? <Badge variant="outline" className="rounded-full">Unsaved changes</Badge> : null}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
        <CardHeader>
          <CardTitle className="font-display text-xl">Live preview</CardTitle>
          <CardDescription>
            Preview the customer-facing invoice before publishing. Desktop and mobile use HTML; PDF uses the same PDFKit renderer as customer downloads.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={previewMode} onValueChange={(value) => setPreviewMode(value as PreviewMode)}>
            <TabsList className="grid w-full grid-cols-3 sm:inline-flex sm:w-fit">
              <TabsTrigger value="desktop"><Monitor className="size-4" />Desktop</TabsTrigger>
              <TabsTrigger value="mobile"><Smartphone className="size-4" />Mobile</TabsTrigger>
              <TabsTrigger value="pdf"><FileText className="size-4" />PDF</TabsTrigger>
            </TabsList>
            <div className="flex items-start gap-2 rounded-lg border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <PreviewModeIcon className="mt-0.5 size-4 shrink-0" />
              <span><span className="font-medium text-foreground">{previewModeDetails.label}.</span> {previewModeDetails.description}</span>
            </div>
            <TabsContent value={previewMode} className="mt-4">
              {previewError ? <p className="mb-3 text-sm text-destructive" role="alert">{previewError}</p> : null}
              {previewMode === "pdf" ? (
                <p className="mb-3 text-xs text-muted-foreground">
                  This tab renders the actual PDF binary. It shares the same document data as the HTML invoice but is not pixel-identical to the web page.
                </p>
              ) : null}
              <div className={`relative overflow-hidden rounded-xl border bg-muted/20 ${previewFrameClass}`} aria-busy={isPreviewPending}>
                {isPreviewPending && !previewHtml && !previewPdfUrl ? (
                  <div className="flex min-h-[520px] items-center justify-center">
                    <Spinner className="size-5 text-primary" />
                  </div>
                ) : previewMode === "pdf" && previewPdfUrl ? (
                  <object
                    data={previewPdfUrl}
                    type="application/pdf"
                    aria-label="Invoice PDF preview"
                    className="min-h-[520px] w-full bg-white"
                  >
                    <p className="p-4 text-sm text-muted-foreground">
                      Your browser could not embed the PDF preview.
                    </p>
                  </object>
                ) : (
                  <iframe title={`${previewModeDetails.label} invoice`} srcDoc={previewHtml} className={`w-full bg-white ${previewMode === "mobile" ? "min-h-[640px] rounded-[1.5rem]" : "min-h-[520px]"}`} />
                )}
                {isPreviewPending && (previewHtml || previewPdfUrl) ? (
                  <div className="absolute inset-0 flex items-center justify-center bg-background/55 backdrop-blur-[1px]">
                    <div className="flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm shadow-sm">
                      <Spinner className="size-4 text-primary" />
                      Updating preview…
                    </div>
                  </div>
                ) : null}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default InvoiceAppearanceSettingsForm;
