import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getWhatsAppCloudTemplateSubmissions,
  getWhatsAppCloudTemplates,
  getWhatsAppCloudTemplateBindings,
  archiveWhatsAppCloudTemplateBinding,
  importWhatsAppCloudTemplateForStore,
  getWhatsAppPublicInvoiceTemplateConfig,
  rollbackWhatsAppCloudTemplateBinding,
  submitWhatsAppCloudTemplate,
  syncWhatsAppCloudTemplates,
} from "@repo/services";
import {
  WHATSAPP_DEFAULT_TEMPLATE_BODIES,
  type WhatsAppCloudAccountSnapshot,
  type WhatsAppMessageTemplateKind,
} from "@repo/types";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Input } from "@repo/ui/components/input";
import { Skeleton } from "@repo/ui/components/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { Textarea } from "@repo/ui/components/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@repo/ui/components/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@repo/ui/components/table";
import {
  AlertCircle,
  Archive,
  CheckCircle2,
  Eye,
  ExternalLink,
  FileType2,
  Image as ImageIcon,
  LoaderCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Send,
  ShieldAlert,
  Star,
} from "lucide-react";
import { toast } from "sonner";
import { whatsappKeys } from "@/lib/query-keys";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@repo/ui/components/tooltip";

export type WhatsAppCloudAccountOption = {
  id: string;
  phoneNumber: string;
  snapshot: WhatsAppCloudAccountSnapshot;
};
type Props = {
  organizationId: string;
  storeId: string;
  accounts: WhatsAppCloudAccountOption[];
  storeName: string;
};
const kinds: Array<{
  value: WhatsAppMessageTemplateKind;
  label: string;
  category: string;
}> = [
  { value: "bill", label: "Bill", category: "Utility" },
  { value: "due_reminder", label: "Due reminder", category: "Utility" },
  { value: "promotion", label: "Promotion", category: "Marketing" },
];
const statusLabels: Record<string, string> = {
  draft: "Draft",
  submitting: "Submitting",
  pending: "Pending approval",
  approved: "Approved",
  rejected: "Rejected",
  paused: "Paused",
  disabled: "Disabled",
  failed: "Failed",
  archived: "Archived",
};
const statusClass: Record<string, string> = {
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  submitting: "border-amber-200 bg-amber-50 text-amber-700",
  paused: "border-orange-200 bg-orange-50 text-orange-700",
  disabled: "border-slate-200 bg-slate-50 text-slate-600",
  archived: "border-slate-200 bg-slate-50 text-slate-600",
};

const mutationErrorMessage = (error: unknown, fallback: string): string => {
  if (typeof error !== "object" || error === null) return fallback;

  const value = error as Record<string, unknown>;
  if (typeof value.message === "string" && value.message.trim()) {
    return value.message;
  }

  const response = value.response;
  if (typeof response === "object" && response !== null) {
    const responseData = (response as Record<string, unknown>).data;
    if (typeof responseData === "object" && responseData !== null) {
      const message = (responseData as Record<string, unknown>).message;
      if (typeof message === "string" && message.trim()) return message;
    }
  }

  return fallback;
};

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 512) || "ganatri_template";

const contentIdempotencyKey = async (
  businessAccountId: string,
  template: {
    friendlyName: string;
    languageCode: string;
    kind: WhatsAppMessageTemplateKind;
    content: unknown;
  },
): Promise<string> => {
  const encoded = new TextEncoder().encode(JSON.stringify(template.content));
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  const fingerprint = Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, "0"),
  )
    .join("")
    .slice(0, 24);
  return `${businessAccountId}:${slugify(template.friendlyName)}:${template.languageCode}:${template.kind}:${fingerprint}`;
};
const defaultTokenNames: Record<WhatsAppMessageTemplateKind, string[]> = {
  bill: [
    "customer_name",
    "bill_number",
    "total",
    "paid",
    "balance_due",
    "organization_name",
    "store_name",
  ],
  due_reminder: ["customer_name", "total_due", "bill_count", "store_name"],
  promotion: ["customer_name", "store_name"],
};
const defaultSampleValues: Record<WhatsAppMessageTemplateKind, string> = {
  bill: "Customer|INV-1001|₹1,250|₹1,000|₹250|Ganatri|My Store",
  due_reminder: "Customer|₹250|2|My Store",
  promotion: "Customer|My Store",
};
const variableHelp: Record<WhatsAppMessageTemplateKind, string[]> = {
  bill: [
    "Customer name",
    "Bill number",
    "Total",
    "Paid",
    "Balance due",
    "Organization name",
    "Store name",
  ],
  due_reminder: ["Customer name", "Total due", "Bill count", "Store name"],
  promotion: ["Customer name", "Store name"],
};
const readMediaFile = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value =
        typeof reader.result === "string" ? reader.result.split(",")[1] : "";
      if (value) resolve(value);
      else reject(new Error("Media file could not be read"));
    };
    reader.onerror = () =>
      reject(reader.error ?? new Error("Media file could not be read"));
    reader.readAsDataURL(file);
  });
const defaultBody = (kind: WhatsAppMessageTemplateKind): string => {
  const source =
    WHATSAPP_DEFAULT_TEMPLATE_BODIES[kind] ?? "Hello {{customer_name}}";
  const names = defaultTokenNames[kind];
  return source.replace(/{{\s*([^{}]+?)\s*}}/g, (match, token: string) => {
    const index = names.indexOf(token.trim().toLowerCase());
    return index >= 0 ? `{{${index + 1}}}` : match;
  });
};

const invoiceTemplateKinds = new Set<WhatsAppMessageTemplateKind>([
  "bill",
  "due_reminder",
]);

const isInvoiceTemplateKind = (kind: WhatsAppMessageTemplateKind): boolean =>
  invoiceTemplateKinds.has(kind);

const cloudAuthoringBody = (kind: WhatsAppMessageTemplateKind): string =>
  defaultBody(kind)
    .replace(
      "Your bill is attached for your reference.",
      "Your bill is ready for your reference.",
    )
    .replace(/\n*View your invoice online:\s*\{\{invoice_url\}\}\s*/i, "\n")
    .trim();

const invoiceButtonLabel = (kind: WhatsAppMessageTemplateKind): string =>
  isInvoiceTemplateKind(kind) ? "View invoice" : "View details";

const statusBadge = (status: string) => (
  <Badge
    variant="outline"
    className={`rounded-full text-[10px] ${statusClass[status] ?? ""}`}
  >
    {status === "approved" ? <CheckCircle2 className="mr-1 size-3" /> : null}
    {statusLabels[status] ?? status}
  </Badge>
);

const normalizeLanguageCode = (languageCode: string): string => {
  const normalized = languageCode.trim().toLowerCase().replace(/-/g, "_");
  return normalized === "en" || normalized === "en_us" ? "en_US" : languageCode;
};

const languageLabel = (languageCode: string): string =>
  languageCode === "en_US"
    ? "English (US)"
    : languageCode.replace(/_/g, "-").toUpperCase();

const WhatsAppCloudTemplateManager = ({
  organizationId,
  storeId,
  accounts,
  storeName,
}: Props) => {
  const queryClient = useQueryClient();
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<WhatsAppMessageTemplateKind>("bill");
  const [friendlyName, setFriendlyName] = useState("");
  const [languageCode, setLanguageCode] = useState("en_US");
  const [body, setBody] = useState(cloudAuthoringBody("bill"));
  const [footer, setFooter] = useState("");
  const [urlButton, setUrlButton] = useState("");
  const [headerFormat, setHeaderFormat] = useState<
    "none" | "image" | "document"
  >("none");
  const [headerSample, setHeaderSample] = useState<{
    base64: string;
    fileName: string;
    mimeType: string;
  } | null>(null);
  const [previewCardId, setPreviewCardId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [sampleValues, setSampleValues] = useState(defaultSampleValues.bill);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | "bill" | "due_reminder">(
    "all",
  );
  const [languageFilter, setLanguageFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const selectedAccountId = accounts.some((item) => item.id === accountId)
    ? accountId
    : (accounts[0]?.id ?? "");
  const account =
    accounts.find((item) => item.id === selectedAccountId) ?? accounts[0];
  const businessAccountId = account?.snapshot.whatsappBusinessAccountId ?? "";
  const publicInvoiceTemplateConfigQuery = useQuery({
    queryKey: whatsappKeys.publicInvoiceTemplateConfig(organizationId),
    queryFn: () => getWhatsAppPublicInvoiceTemplateConfig(organizationId),
    enabled: Boolean(organizationId),
  });
  const publicInvoiceTemplateUrl =
    publicInvoiceTemplateConfigQuery.data?.status === "success"
      ? publicInvoiceTemplateConfigQuery.data.data?.invoiceTemplateUrl ?? ""
      : "";
  const publicInvoiceConfigError =
    publicInvoiceTemplateConfigQuery.data?.status === "error"
      ? publicInvoiceTemplateConfigQuery.data.message
      : publicInvoiceTemplateConfigQuery.isError
        ? "Public invoice link configuration could not be loaded."
        : null;
  useEffect(() => {
    if (
      !open ||
      !isInvoiceTemplateKind(kind) ||
      headerFormat !== "none" ||
      !publicInvoiceTemplateUrl
    ) {
      return;
    }
    setUrlButton((current) => current || publicInvoiceTemplateUrl);
  }, [headerFormat, kind, open, publicInvoiceTemplateUrl]);
  const cloudQuery = useQuery({
    queryKey: [
      "whatsapp",
      "cloud-templates",
      organizationId,
      selectedAccountId,
    ],
    queryFn: () => getWhatsAppCloudTemplates(organizationId, selectedAccountId),
    enabled: Boolean(organizationId && selectedAccountId),
  });
  const submissionsQuery = useQuery({
    queryKey: [
      "whatsapp",
      "cloud-submissions",
      organizationId,
      selectedAccountId,
      storeId,
    ],
    queryFn: () =>
      getWhatsAppCloudTemplateSubmissions(
        organizationId,
        selectedAccountId,
        storeId,
      ),
    enabled: Boolean(organizationId && selectedAccountId && storeId),
  });
  const cloudTemplates = useMemo(
    () =>
      cloudQuery.data?.status === "success"
        ? (cloudQuery.data.data?.templates ?? [])
        : [],
    [cloudQuery.data],
  );
  const submissions = useMemo(
    () =>
      submissionsQuery.data?.status === "success"
        ? (submissionsQuery.data.data?.submissions ?? [])
        : [],
    [submissionsQuery.data],
  );
  const bindingsQuery = useQuery({
    queryKey: [
      "whatsapp",
      "cloud-template-bindings",
      organizationId,
      storeId,
      businessAccountId,
    ],
    queryFn: () =>
      getWhatsAppCloudTemplateBindings(
        organizationId,
        storeId,
        businessAccountId,
      ),
    enabled: Boolean(organizationId && storeId && businessAccountId),
  });
  const bindings =
    bindingsQuery.data?.status === "success"
      ? (bindingsQuery.data.data?.bindings ?? [])
      : [];
  const isTemplateDataLoading =
    cloudQuery.isLoading ||
    submissionsQuery.isLoading ||
    bindingsQuery.isLoading;
  const cards = useMemo(() => {
    const byProviderId = new Map(
      submissions
        .filter((item) => item.metaTemplateId)
        .map((item) => [item.metaTemplateId!, item]),
    );
    const assets = cloudTemplates.map((template) => ({
      id: `asset-${template.id}`,
      submissionId: byProviderId.get(template.metaTemplateId)?.id ?? null,
      submissionStatus:
        byProviderId.get(template.metaTemplateId)?.status ?? null,
      cloudTemplateId: template.id,
      name: template.name,
      language: normalizeLanguageCode(template.languageCode),
      kind: byProviderId.get(template.metaTemplateId)?.kind ?? null,
      category: template.category,
      status: template.status,
      reason: template.rejectionReason,
      errorCode:
        byProviderId.get(template.metaTemplateId)?.lastErrorCode ?? null,
      components: template.components,
      sampleValues:
        byProviderId.get(template.metaTemplateId)?.sampleValues ?? {},
    }));
    const activeSubmissionIdentities = new Set(
      submissions
        .filter((item) =>
          ["draft", "submitting", "pending"].includes(item.status),
        )
        .map((item) => `${item.metaTemplateName}:${item.languageCode}`),
    );
    const activeSubmissionContent = new Set(
      submissions
        .filter((item) =>
          ["draft", "submitting", "pending"].includes(item.status),
        )
        .map(
          (item) =>
            `${item.kind}:${item.languageCode}:${JSON.stringify(item.requestedComponents)}`,
        ),
    );
    const pending = submissions.filter((item) => {
      if (
        item.metaTemplateId &&
        cloudTemplates.some(
          (template) => template.metaTemplateId === item.metaTemplateId,
        )
      ) {
        return false;
      }
      const identity = `${item.metaTemplateName}:${item.languageCode}`;
      const contentIdentity = `${item.kind}:${item.languageCode}:${JSON.stringify(item.requestedComponents)}`;
      return !(
        item.status === "failed" &&
        (activeSubmissionIdentities.has(identity) ||
          activeSubmissionContent.has(contentIdentity))
      );
    });
    return [
      ...assets,
      ...pending.map((item) => ({
        id: item.id,
        submissionId: item.id,
        submissionStatus: item.status,
        cloudTemplateId: null,
        name: item.friendlyName,
        language: normalizeLanguageCode(item.languageCode),
        kind: item.kind,
        category: item.category,
        status: item.status,
        reason: item.rejectionReason ?? item.lastErrorMessage,
        errorCode: item.lastErrorCode,
        components: item.requestedComponents,
        sampleValues: item.sampleValues,
      })),
    ];
  }, [cloudTemplates, submissions]);
  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: [
        "whatsapp",
        "cloud-templates",
        organizationId,
        selectedAccountId,
      ],
    });
    void queryClient.invalidateQueries({
      queryKey: [
        "whatsapp",
        "cloud-submissions",
        organizationId,
        selectedAccountId,
        storeId,
      ],
    });
    void queryClient.invalidateQueries({
      queryKey: [
        "whatsapp",
        "cloud-template-bindings",
        organizationId,
        storeId,
        businessAccountId,
      ],
    });
  };
  const syncMutation = useMutation({
    mutationFn: () =>
      syncWhatsAppCloudTemplates(organizationId, selectedAccountId),
    onSuccess: (response) => {
      if (response.status !== "success") toast.error(response.message);
      else {
        invalidate();
        toast.success("Cloud templates refreshed");
      }
    },
    onError: (error) => {
      toast.error(
        mutationErrorMessage(error, "Cloud templates could not be refreshed"),
      );
    },
  });
  const submitMutation = useMutation({
    mutationFn: async () => {
      const template = {
        storeId,
        whatsappBusinessAccountId: businessAccountId,
        kind,
        friendlyName: friendlyName.trim(),
        metaTemplateName: slugify(friendlyName),
        languageCode: languageCode.trim(),
        components: [
          ...(headerFormat !== "none"
            ? [{ type: "HEADER", format: headerFormat.toUpperCase() }]
            : []),
          { type: "BODY", text: body.trim() },
          ...(footer.trim() ? [{ type: "FOOTER", text: footer.trim() }] : []),
          ...(urlButton.trim()
            ? [
                {
                  type: "BUTTONS",
                  buttons: [
                    {
                      type: "URL",
                      text: invoiceButtonLabel(kind),
                      url: urlButton.trim(),
                    },
                  ],
                },
              ]
            : []),
        ],
        sampleValues: Object.fromEntries(
          sampleValues
            .split("|")
            .map((value, index) => [String(index + 1), value.trim()]),
        ),
        ...(headerSample
          ? {
              headerSampleBase64: headerSample.base64,
              headerSampleFileName: headerSample.fileName,
              headerSampleMimeType: headerSample.mimeType,
            }
          : {}),
      };
      const idempotencyKey = await contentIdempotencyKey(businessAccountId, {
        friendlyName: template.friendlyName,
        languageCode: template.languageCode,
        kind: template.kind,
        content: template,
      });
      return submitWhatsAppCloudTemplate(organizationId, selectedAccountId, {
        ...template,
        idempotencyKey,
      });
    },
    onMutate: () => setSubmitError(null),
    onSuccess: (response) => {
      if (response.status !== "success") {
        setSubmitError(response.message);
        toast.error(response.message);
      } else {
        setOpen(false);
        setSubmitError(null);
        invalidate();
        toast.success(response.message);
      }
    },
    onError: (error) => {
      const message = mutationErrorMessage(
        error,
        "Template could not be submitted",
      );
      setSubmitError(message);
      toast.error(message);
    },
  });
  const importMutation = useMutation({
    mutationFn: (input: {
      cloudTemplateId: string;
      whatsappBusinessAccountId: string;
      kind: WhatsAppMessageTemplateKind;
    }) => importWhatsAppCloudTemplateForStore(organizationId, storeId, input),
    onSuccess: (response) => {
      if (response.status !== "success") toast.error(response.message);
      else {
        invalidate();
        toast.success(response.message);
      }
    },
    onError: (error) => {
      toast.error(
        mutationErrorMessage(
          error,
          "Existing Cloud template could not be assigned",
        ),
      );
    },
  });
  const archiveMutation = useMutation({
    mutationFn: (bindingId: string) =>
      archiveWhatsAppCloudTemplateBinding(organizationId, bindingId),
    onSuccess: (response) => {
      if (response.status !== "success") toast.error(response.message);
      else {
        invalidate();
        toast.success("Cloud template revision archived");
      }
    },
    onError: (error) =>
      toast.error(
        mutationErrorMessage(
          error,
          "Cloud template revision could not be archived",
        ),
      ),
  });
  const rollbackMutation = useMutation({
    mutationFn: (bindingId: string) =>
      rollbackWhatsAppCloudTemplateBinding(organizationId, bindingId),
    onSuccess: (response) => {
      if (response.status !== "success") toast.error(response.message);
      else {
        invalidate();
        toast.success("Approved Cloud template restored as the Store default");
      }
    },
    onError: (error) =>
      toast.error(
        mutationErrorMessage(
          error,
          "Cloud template revision could not be restored",
        ),
      ),
  });
  const openCreate = () => {
    setSubmitError(null);
    setKind("bill");
    setFriendlyName("");
    setLanguageCode("en_US");
    setBody(cloudAuthoringBody("bill"));
    setFooter("");
    setUrlButton(publicInvoiceTemplateUrl);
    setHeaderFormat("none");
    setHeaderSample(null);
    setSampleValues(defaultSampleValues.bill);
    setOpen(true);
  };
  const duplicateSubmission = (submissionId: string) => {
    const submission = submissions.find((item) => item.id === submissionId);
    if (!submission) return;
    const bodyComponent = submission.requestedComponents.find(
      (component) =>
        component &&
        typeof component === "object" &&
        !Array.isArray(component) &&
        String((component as Record<string, unknown>).type).toUpperCase() ===
          "BODY",
    ) as Record<string, unknown> | undefined;
    const footerComponent = submission.requestedComponents.find(
      (component) =>
        component &&
        typeof component === "object" &&
        !Array.isArray(component) &&
        String((component as Record<string, unknown>).type).toUpperCase() ===
          "FOOTER",
    ) as Record<string, unknown> | undefined;
    const headerComponent = submission.requestedComponents.find(
      (component) =>
        component &&
        typeof component === "object" &&
        !Array.isArray(component) &&
        String((component as Record<string, unknown>).type).toUpperCase() ===
          "HEADER",
    ) as Record<string, unknown> | undefined;
    const header = String(headerComponent?.format ?? "").toLowerCase();
    const hasLegacyDocumentHeader = header === "document";
    const duplicatedBody =
      typeof bodyComponent?.text === "string"
        ? bodyComponent.text
        : cloudAuthoringBody(submission.kind);
    setKind(submission.kind);
    setFriendlyName(`${submission.friendlyName} copy`);
    setLanguageCode(submission.languageCode);
    setBody(duplicatedBody);
    setFooter(
      typeof footerComponent?.text === "string" ? footerComponent.text : "",
    );
    setUrlButton(
      isInvoiceTemplateKind(submission.kind) &&
        !hasLegacyDocumentHeader
        ? publicInvoiceTemplateUrl
        : "",
    );
    setHeaderFormat(
      header === "image" || header === "document" ? header : "none",
    );
    setHeaderSample(null);
    setSampleValues(
      Object.keys(submission.sampleValues)
        .sort((a, b) => Number(a) - Number(b))
        .map((key) => String(submission.sampleValues[key] ?? ""))
        .join("|"),
    );
    setSubmitError(null);
    setOpen(true);
  };
  const selectedKind = kinds.find((item) => item.value === kind)!;
  const placeholderIndexes = [
    ...new Set([...body.matchAll(/\{\{(\d+)\}\}/g)].map((match) => match[1]!)),
  ].sort((a, b) => Number(a) - Number(b));
  const hasUnsupportedPlaceholder = placeholderIndexes.some(
    (index) => !variableHelp[kind][Number(index) - 1],
  );
  const trimmedBody = body.trim();
  const hasEdgePlaceholder =
    /^\{\{\d+\}\}/.test(trimmedBody) ||
    /(?:^|\n)\s*\{\{\d+\}\}\s*[^\w{}]*$/.test(trimmedBody);
  const updateSampleValue = (index: string, value: string) => {
    const values = sampleValues.split("|");
    values[Number(index) - 1] = value;
    setSampleValues(values.join("|"));
  };
  const templateCards = cards.filter(
    (card) => card.kind !== "promotion" && card.category !== "marketing",
  );
  const previewCard =
    templateCards.find((card) => card.id === previewCardId) ?? null;
  const approvedTemplates = templateCards.filter(
    (card) => card.status === "approved" && card.cloudTemplateId,
  );
  const defaultKinds = kinds.filter((item) => item.value !== "promotion");
  const availableLanguages = [
    ...new Set(templateCards.map((card) => card.language)),
  ].sort();
  const kindFilterLabel =
    kindFilter === "all"
      ? "All message types"
      : (kinds.find((item) => item.value === kindFilter)?.label ?? kindFilter);
  const languageFilterLabel =
    languageFilter === "all" ? "All languages" : languageLabel(languageFilter);
  const statusFilterLabel =
    statusFilter === "all"
      ? "All statuses"
      : (statusLabels[statusFilter] ?? statusFilter);
  const filteredCards = templateCards.filter((card) => {
    const normalizedSearch = search.trim().toLowerCase();
    const matchesSearch =
      !normalizedSearch ||
      [
        card.name,
        card.language,
        card.kind ? kinds.find((item) => item.value === card.kind)?.label : "",
        card.reason ?? "",
      ].some((value) => value?.toLowerCase().includes(normalizedSearch));
    const matchesKind = kindFilter === "all" || card.kind === kindFilter;
    const matchesLanguage =
      languageFilter === "all" || card.language === languageFilter;
    const matchesStatus =
      statusFilter === "all" || card.status === statusFilter;
    return matchesSearch && matchesKind && matchesLanguage && matchesStatus;
  });
  const bindingForCloudTemplate = (
    cloudTemplateId: string | null,
    messageKind?: WhatsAppMessageTemplateKind,
    languageCode?: string,
  ) =>
    bindings
      .filter(
        (binding) =>
          binding.cloudTemplateId === cloudTemplateId &&
          (!messageKind || binding.kind === messageKind) &&
          (!languageCode ||
            normalizeLanguageCode(binding.languageCode ?? "en_US") ===
              normalizeLanguageCode(languageCode)),
      )
      .sort(
        (left, right) =>
          Number(right.isActive) - Number(left.isActive) ||
          Number(right.isDefault) - Number(left.isDefault) ||
          String(right.updatedAt).localeCompare(String(left.updatedAt)),
      )[0];
  const defaultBindingFor = (
    messageKind: WhatsAppMessageTemplateKind,
    languageCode: string,
  ) =>
    bindings.find(
      (binding) =>
        binding.kind === messageKind &&
        binding.isActive &&
        binding.isDefault &&
        normalizeLanguageCode(binding.languageCode ?? "en_US") ===
          normalizeLanguageCode(languageCode),
    );
  const templateForBinding = (bindingId: string | undefined) =>
    approvedTemplates.find(
      (template) =>
        template.cloudTemplateId ===
        bindings.find((binding) => binding.id === bindingId)?.cloudTemplateId,
    );
  const languagesForKind = (messageKind: WhatsAppMessageTemplateKind) =>
    [
      ...new Set([
        ...approvedTemplates
          .filter(
            (template) =>
              template.kind === messageKind ||
              (template.kind === null && template.category === "utility"),
          )
          .map((template) => template.language),
        ...bindings
          .filter((binding) => binding.kind === messageKind)
          .map((binding) =>
            normalizeLanguageCode(binding.languageCode ?? "en_US"),
          ),
      ]),
    ].sort();
  const linkedKindsFor = (cloudTemplateId: string, languageCode: string) =>
    bindings
      .filter(
        (binding) =>
          binding.cloudTemplateId === cloudTemplateId &&
          normalizeLanguageCode(binding.languageCode ?? "en_US") ===
            normalizeLanguageCode(languageCode) &&
          binding.isActive &&
          binding.isDefault,
      )
      .map(
        (binding) =>
          kinds.find((item) => item.value === binding.kind)?.label ??
          "Message type",
      );
  const bindingSummary = (
    cloudTemplateId: string | null,
    messageKind?: WhatsAppMessageTemplateKind,
    languageCode?: string,
  ) => {
    const binding = bindingForCloudTemplate(
      cloudTemplateId,
      messageKind,
      languageCode,
    );
    if (!binding) return "Not assigned";
    const mappedVariableCount = Object.keys(
      binding.variableMapping ?? {},
    ).length;
    return `${binding.isActive ? "Active" : "Archived"} revision · ${mappedVariableCount} variables mapped`;
  };
  const templateName = (card: (typeof cards)[number], className: string) => {
    const binding = card.kind
      ? bindingForCloudTemplate(card.cloudTemplateId, card.kind, card.language)
      : undefined;
    const kindLabel = card.kind
      ? (kinds.find((item) => item.value === card.kind)?.label ?? "message")
      : card.category === "marketing"
        ? "marketing"
        : "utility";

    return (
      <div className="flex min-w-0 items-center gap-1.5">
        {binding?.isActive && binding.isDefault ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <span
                  className="inline-flex shrink-0"
                  aria-label={`Default ${kindLabel} template for this Store`}
                />
              }
            >
              <Star
                className="size-3.5 fill-amber-400 text-amber-500"
                aria-hidden="true"
              />
            </TooltipTrigger>
            <TooltipContent>
              This is the default {kindLabel} template for this Store.
            </TooltipContent>
          </Tooltip>
        ) : null}
        <Tooltip>
          <TooltipTrigger render={<span className={className} />}>
            {card.name}
          </TooltipTrigger>
          <TooltipContent>{card.name}</TooltipContent>
        </Tooltip>
      </div>
    );
  };
  const templateActions = (card: (typeof cards)[number]) => {
    const binding = card.kind
      ? bindingForCloudTemplate(card.cloudTemplateId, card.kind, card.language)
      : undefined;
    const canSetDefault =
      card.status === "approved" &&
      Boolean(card.cloudTemplateId) &&
      (card.kind === "bill" || card.kind === "due_reminder");

    return (
      <div className="flex items-center justify-end gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl"
                aria-label={`Actions for ${card.name}`}
              />
            }
          >
            <MoreHorizontal className="size-4" />
            <span className="hidden sm:inline">Actions</span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 rounded-xl p-2">
            <DropdownMenuItem onClick={() => setPreviewCardId(card.id)}>
              <Eye /> Preview
            </DropdownMenuItem>
            {canSetDefault ? (
              <DropdownMenuItem
                disabled={
                  Boolean(binding?.isActive && binding.isDefault) ||
                  importMutation.isPending
                }
                onClick={() => {
                  if (!card.cloudTemplateId || !card.kind) return;
                  importMutation.mutate({
                    cloudTemplateId: card.cloudTemplateId,
                    whatsappBusinessAccountId: businessAccountId,
                    kind: card.kind,
                  });
                }}
              >
                <CheckCircle2 /> Set as Store default
              </DropdownMenuItem>
            ) : null}
            {card.submissionId &&
            (card.status === "approved" ||
              card.status === "rejected" ||
              card.status === "failed") ? (
              <DropdownMenuItem
                onClick={() => duplicateSubmission(card.submissionId!)}
              >
                <Pencil /> Edit as new revision
              </DropdownMenuItem>
            ) : null}
            {binding && !binding.isActive ? (
              <DropdownMenuItem
                disabled={rollbackMutation.isPending}
                onClick={() => rollbackMutation.mutate(binding.id)}
              >
                <RotateCcw /> Restore archived revision
              </DropdownMenuItem>
            ) : null}
            {binding?.isActive ? (
              <DropdownMenuItem
                variant="destructive"
                disabled={archiveMutation.isPending}
                onClick={() =>
                  setArchiveTarget({ id: binding.id, name: card.name })
                }
              >
                <Archive /> Archive Store revision
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };
  const previewBinding = previewCard?.kind
    ? bindingForCloudTemplate(
        previewCard.cloudTemplateId,
        previewCard.kind,
        previewCard.language,
      )
    : undefined;
  const preview = body.replace(
    /\{\{(\d+)\}\}/g,
    (_, index: string) =>
      sampleValues.split("|")[Number(index) - 1]?.trim() || `{{${index}}}`,
  );
  const usesInvoiceUrlButton =
    isInvoiceTemplateKind(kind) && headerFormat === "none";
  if (accounts.length === 0)
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
        Assign a connected Cloud account to this Store before creating
        templates.
      </div>
    );
  return (
    <div className="w-full space-y-5">
      <div className="flex flex-col gap-4 border-b border-border/60 pb-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold tracking-tight">
            WhatsApp Cloud templates
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Create, submit, and assign approved templates for {storeName}.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          {accounts.length > 1 ? (
            <div className="w-full space-y-2 sm:w-64 lg:w-72">
              <span className="text-xs font-medium text-muted-foreground">
                Cloud account
              </span>
              <Select
                value={selectedAccountId}
                onValueChange={(value) => {
                  if (value) setAccountId(value);
                }}
              >
                <SelectTrigger
                  className="h-9 w-full rounded-xl"
                  aria-label="Cloud account"
                >
                  <SelectValue>{account?.phoneNumber}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.phoneNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-full rounded-xl sm:w-auto"
              disabled={syncMutation.isPending}
              onClick={() => syncMutation.mutate()}
            >
              <RefreshCw
                className={`size-4 ${syncMutation.isPending ? "animate-spin" : ""}`}
              />{" "}
              Refresh
            </Button>
            <Button
              type="button"
              size="sm"
              className="w-full rounded-xl sm:w-auto"
              onClick={openCreate}
            >
              <Plus className="size-4" /> Create template
            </Button>
          </div>
        </div>
      </div>
      {cloudQuery.data?.status === "error" ||
      submissionsQuery.data?.status === "error" ? (
        <p className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="size-4" /> Templates could not be loaded. Try
          Refresh.
        </p>
      ) : null}
      {!isTemplateDataLoading && templateCards.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 px-4 py-8 text-center">
          <p className="text-sm font-medium">No templates yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create a Bill or Due reminder template and submit it for Meta
            approval.
          </p>
        </div>
      ) : null}
      {isTemplateDataLoading ? (
        <section className="space-y-4 rounded-2xl border border-border/60 p-4 sm:p-5">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
          <Skeleton className="h-10 w-full rounded-xl" />
          <div className="hidden space-y-2 lg:block">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
            <Skeleton className="h-16 w-full rounded-xl" />
          </div>
          <div className="space-y-3 lg:hidden">
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </div>
        </section>
      ) : (
        <>
          <section className="space-y-3 rounded-2xl border border-primary/20 bg-primary/[0.03] p-4 sm:p-5">
            <div>
              <p className="text-sm font-semibold">Store defaults</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Choose the approved template Ganatri sends for each message type
                in this Store.
              </p>
            </div>
            <div className="grid gap-2 lg:grid-cols-2">
              {defaultKinds.flatMap((messageKind) => {
                const languages = languagesForKind(messageKind.value);
                return (languages.length > 0 ? languages : ["en_US"]).map(
                  (languageCode) => {
                    const binding = defaultBindingFor(
                      messageKind.value,
                      languageCode,
                    );
                    const selectedTemplate = templateForBinding(binding?.id);
                    const compatibleTemplates = approvedTemplates.filter(
                      (template) =>
                        (template.kind === messageKind.value ||
                          template.kind === null) &&
                        template.category === "utility" &&
                        template.language === languageCode,
                    );
                    const savingDefault =
                      importMutation.isPending &&
                      importMutation.variables?.kind === messageKind.value &&
                      compatibleTemplates.some(
                        (template) =>
                          template.cloudTemplateId ===
                          importMutation.variables?.cloudTemplateId,
                      );
                    return (
                      <div
                        key={`${messageKind.value}-${languageCode}`}
                        className="grid gap-3 rounded-xl border border-border/60 bg-background/80 p-3 sm:grid-cols-[minmax(10rem,0.7fr)_minmax(0,1.3fr)] sm:items-center"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {messageKind.label} · {languageLabel(languageCode)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Utility message ·{" "}
                            {binding?.isDefault
                              ? "Current default"
                              : "No default selected"}
                            {binding
                              ? ` · ${Object.keys(binding.variableMapping ?? {}).length} variables mapped`
                              : ""}
                          </p>
                        </div>
                        <Select
                          value={selectedTemplate?.cloudTemplateId ?? ""}
                          onValueChange={(value) => {
                            if (!value) return;
                            importMutation.mutate({
                              cloudTemplateId: value,
                              whatsappBusinessAccountId: businessAccountId,
                              kind: messageKind.value,
                            });
                          }}
                          disabled={
                            importMutation.isPending ||
                            compatibleTemplates.length === 0
                          }
                        >
                          <SelectTrigger className="w-full rounded-xl bg-background">
                            <SelectValue
                              placeholder={
                                compatibleTemplates.length === 0
                                  ? "No approved template"
                                  : "Choose a template"
                              }
                            >
                              {savingDefault ? (
                                <span className="flex items-center gap-2">
                                  <LoaderCircle className="size-4 animate-spin" />{" "}
                                  Saving…
                                </span>
                              ) : (
                                (selectedTemplate?.name ?? "Choose a template")
                              )}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {compatibleTemplates.map((template) => (
                              <SelectItem
                                key={template.cloudTemplateId}
                                value={template.cloudTemplateId!}
                              >
                                {template.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  },
                );
              })}
            </div>
            {approvedTemplates.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Sync Meta templates and wait for approval before assigning Store
                defaults.
              </p>
            ) : null}
          </section>
          <section className="space-y-4">
            <div>
              <p className="text-sm font-semibold">Cloud template library</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Review Bill and Due reminder revisions, approval status, and
                Store usage.
              </p>
            </div>
            <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_10rem_10rem_10rem]">
              <label className="space-y-2.5 text-xs font-medium text-muted-foreground">
                <span>Search</span>
                <div className="relative min-w-0">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search templates"
                    aria-label="Search templates"
                    className="rounded-xl pl-9"
                  />
                </div>
              </label>
              <label className="space-y-2.5 text-xs font-medium text-muted-foreground">
                <span>Message type</span>
                <Select
                  value={kindFilter}
                  onValueChange={(value) =>
                    setKindFilter(value as typeof kindFilter)
                  }
                >
                  <SelectTrigger
                    className="h-9 w-full rounded-xl"
                    aria-label="Filter by message type"
                  >
                    <SelectValue>{kindFilterLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All message types</SelectItem>
                    {defaultKinds.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="space-y-2.5 text-xs font-medium text-muted-foreground">
                <span>Language</span>
                <Select
                  value={languageFilter}
                  onValueChange={(value) => setLanguageFilter(value ?? "all")}
                >
                  <SelectTrigger
                    className="h-9 w-full rounded-xl"
                    aria-label="Filter by language"
                  >
                    <SelectValue>{languageFilterLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All languages</SelectItem>
                    {availableLanguages.map((language) => (
                      <SelectItem key={language} value={language}>
                        {languageLabel(language)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <label className="space-y-2.5 text-xs font-medium text-muted-foreground">
                <span>Meta status</span>
                <Select
                  value={statusFilter}
                  onValueChange={(value) => setStatusFilter(value ?? "all")}
                >
                  <SelectTrigger
                    className="h-9 w-full rounded-xl"
                    aria-label="Filter by Meta status"
                  >
                    <SelectValue>{statusFilterLabel}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    {Object.entries(statusLabels)
                      .filter(([value]) => value !== "draft")
                      .map(([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </label>
            </div>
            <div className="hidden overflow-x-auto rounded-2xl border border-border/60 lg:block">
              <Table className="min-w-[760px]">
                <TableHeader>
                  <TableRow>
                    <TableHead>Template</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Language</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Used for</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCards.map((card) => (
                    <TableRow key={card.id}>
                      <TableCell>
                        {templateName(
                          card,
                          "block max-w-52 truncate font-medium",
                        )}
                        {card.errorCode ? (
                          <p className="mt-1 text-[11px] text-destructive">
                            Meta code: {card.errorCode}
                          </p>
                        ) : null}
                        {card.reason ? (
                          <p className="mt-1 flex max-w-64 gap-1 text-xs text-destructive">
                            <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
                            <span className="truncate">{card.reason}</span>
                          </p>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {card.kind
                          ? kinds.find((item) => item.value === card.kind)
                              ?.label
                          : card.category === "marketing"
                            ? "Marketing"
                            : "Utility"}
                      </TableCell>
                      <TableCell>{languageLabel(card.language)}</TableCell>
                      <TableCell>{statusBadge(card.status)}</TableCell>
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {card.cloudTemplateId &&
                          linkedKindsFor(card.cloudTemplateId, card.language)
                            .length > 0
                            ? linkedKindsFor(
                                card.cloudTemplateId,
                                card.language,
                              ).join(", ")
                            : bindingSummary(
                                card.cloudTemplateId,
                                card.kind ?? undefined,
                                card.language,
                              )}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {templateActions(card)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            <div className="space-y-3 lg:hidden">
              {filteredCards.map((card) => (
                <article
                  key={card.id}
                  className="space-y-3 rounded-2xl border border-border/60 bg-background p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {templateName(card, "block truncate font-medium")}
                      <p className="mt-1 text-xs text-muted-foreground">
                        {card.kind
                          ? kinds.find((item) => item.value === card.kind)
                              ?.label
                          : "Utility"}{" "}
                        · {languageLabel(card.language)}
                      </p>
                    </div>
                    {statusBadge(card.status)}
                  </div>
                  {card.errorCode ? (
                    <p className="text-[11px] text-destructive">
                      Meta code: {card.errorCode}
                    </p>
                  ) : null}
                  {card.reason ? (
                    <p className="flex gap-1 text-xs text-destructive">
                      <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
                      <span>{card.reason}</span>
                    </p>
                  ) : null}
                  <div className="grid gap-2 rounded-xl bg-muted/20 p-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">Used for</p>
                      <p className="mt-0.5 font-medium">
                        {card.cloudTemplateId &&
                        linkedKindsFor(card.cloudTemplateId, card.language)
                          .length > 0
                          ? linkedKindsFor(
                              card.cloudTemplateId,
                              card.language,
                            ).join(", ")
                          : bindingSummary(
                              card.cloudTemplateId,
                              card.kind ?? undefined,
                              card.language,
                            )}
                      </p>
                    </div>
                  </div>
                  {templateActions(card)}
                </article>
              ))}
            </div>
            {filteredCards.length === 0 && templateCards.length > 0 ? (
              <div className="rounded-xl border border-dashed border-border/70 px-4 py-8 text-center">
                <p className="text-sm font-medium">No matching templates</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Try clearing the search or filters.
                </p>
              </div>
            ) : null}
          </section>
        </>
      )}
      <Sheet
        open={Boolean(previewCard)}
        onOpenChange={(value) => {
          if (!value) setPreviewCardId(null);
        }}
      >
        <SheetContent
          side="right"
          className="w-full overflow-y-auto sm:max-w-2xl lg:max-w-3xl"
        >
          <SheetHeader className="border-b border-border/60">
            <SheetTitle>{previewCard?.name ?? "Template preview"}</SheetTitle>
            <SheetDescription>
              {previewCard
                ? `${statusLabels[previewCard.status] ?? previewCard.status} · ${languageLabel(previewCard.language)}`
                : "Preview"}
            </SheetDescription>
          </SheetHeader>
          {previewCard ? (
            <div className="space-y-4 px-4">
              <div className="flex flex-wrap items-center gap-2">
                {statusBadge(previewCard.status)}
                <Badge variant="outline" className="rounded-full text-[10px]">
                  {previewCard.kind
                    ? kinds.find((item) => item.value === previewCard.kind)
                        ?.label
                    : "Utility"}
                </Badge>
                {previewCard.errorCode ? (
                  <span className="text-xs text-destructive">
                    Meta code: {previewCard.errorCode}
                  </span>
                ) : null}
              </div>
              {previewCard.reason ? (
                <p className="flex gap-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-xs text-destructive">
                  <ShieldAlert className="size-4 shrink-0" />
                  <span>{previewCard.reason}</span>
                </p>
              ) : null}
              <div className="rounded-2xl bg-[#e5f6df] p-3 shadow-inner">
                <div className="space-y-2 rounded-xl bg-white p-3 text-sm text-slate-900 shadow-sm">
                  {Array.isArray(previewCard.components) ? (
                    previewCard.components.map((component, index) => {
                      if (
                        !component ||
                        typeof component !== "object" ||
                        Array.isArray(component)
                      )
                        return null;
                      const value = component as Record<string, unknown>;
                      const type = String(value.type ?? "").toLowerCase();
                      const format = String(value.format ?? "").toLowerCase();
                      if (type === "header" && format === "image")
                        return (
                          <div
                            key={index}
                            className="flex h-28 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-500"
                          >
                            <ImageIcon className="mr-2 size-5" />
                            Image header
                          </div>
                        );
                      if (type === "header" && format === "document")
                        return (
                          <div
                            key={index}
                            className="flex items-center gap-2 rounded-lg bg-slate-100 p-3 text-xs text-slate-600"
                          >
                            <FileType2 className="size-5" />
                            PDF invoice attached when sent
                          </div>
                        );
                      if (
                        type === "header" ||
                        type === "body" ||
                        type === "footer"
                      ) {
                        const text =
                          typeof value.text === "string" ? value.text : "";
                        const rendered = text.replace(
                          /\{\{(\d+)\}\}/g,
                          (_, number: string) =>
                            String(
                              previewCard.sampleValues[number] ??
                                `Example ${number}`,
                            ),
                        );
                        return (
                          <p
                            key={index}
                            className={
                              type === "footer"
                                ? "text-xs text-slate-500"
                                : "whitespace-pre-wrap"
                            }
                          >
                            {rendered}
                          </p>
                        );
                      }
                      if (type === "buttons")
                        return (
                          <div key={index} className="space-y-1 border-t pt-2">
                            {Array.isArray(value.buttons)
                              ? value.buttons.map((button, buttonIndex) => (
                                  <div
                                    key={buttonIndex}
                                    className="rounded-lg border border-emerald-200 px-3 py-2 text-center text-xs font-medium text-emerald-700"
                                  >
                                    {button &&
                                    typeof button === "object" &&
                                    !Array.isArray(button)
                                      ? String(
                                          (button as Record<string, unknown>)
                                            .text ?? "Button",
                                        )
                                      : "Button"}
                                  </div>
                                ))
                              : null}
                          </div>
                        );
                      return null;
                    })
                  ) : (
                    <p className="text-sm text-slate-500">
                      Template content is not available for preview.
                    </p>
                  )}
                </div>
              </div>
              <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground">Store usage</p>
                <p className="mt-1">
                  {bindingSummary(
                    previewCard.cloudTemplateId,
                    previewCard.kind ?? undefined,
                    previewCard.language,
                  )}
                </p>
                {previewBinding?.variableMapping &&
                Object.keys(previewBinding.variableMapping).length > 0 ? (
                  <div className="mt-3 border-t border-border/60 pt-3">
                    <p className="font-medium text-foreground">
                      Variable mapping
                    </p>
                    <div className="mt-1 space-y-1">
                      {Object.entries(previewBinding.variableMapping).map(
                        ([slot, value]) => (
                          <p key={slot}>
                            <span className="font-medium text-foreground">
                              {"{{" + slot + "}}"}
                            </span>{" "}
                            · {String(value)}
                          </p>
                        ),
                      )}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}
          <SheetFooter className="border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setPreviewCardId(null)}
            >
              Close
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
      <AlertDialog
        open={Boolean(archiveTarget)}
        onOpenChange={(value) => {
          if (!value) setArchiveTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this Store revision?</AlertDialogTitle>
            <AlertDialogDescription>
              {archiveTarget
                ? `${archiveTarget.name} will stop being active for this Store and Cloud account. The approved Meta template will remain available for a later rollback.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={archiveMutation.isPending}
              onClick={() => {
                if (!archiveTarget) return;
                archiveMutation.mutate(archiveTarget.id);
                setArchiveTarget(null);
              }}
            >
              {archiveMutation.isPending ? "Archiving…" : "Archive revision"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          setOpen(value);
          if (!value) setSubmitError(null);
        }}
      >
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-5xl">
          <DialogHeader>
            <DialogTitle>Create Bill or Due reminder template</DialogTitle>
            <DialogDescription>
              Ganatri will submit this utility template to Meta for approval.
            </DialogDescription>
          </DialogHeader>
          {submitError ? (
            <div
              role="alert"
              className="flex gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-medium">Template could not be submitted</p>
                <p className="mt-1">{submitError}</p>
              </div>
            </div>
          ) : null}
          <div className="grid gap-6 py-2 lg:grid-cols-[minmax(0,1fr)_minmax(20rem,0.72fr)]">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label
                    className="text-xs font-medium"
                    htmlFor="cloud-template-kind"
                  >
                    Message type
                  </label>
                  <Select
                    value={kind}
                    onValueChange={(value) => {
                      const next = value as WhatsAppMessageTemplateKind;
                      setKind(next);
                      setBody(cloudAuthoringBody(next));
                      setSampleValues(defaultSampleValues[next]);
                      setHeaderFormat("none");
                      setHeaderSample(null);
                      setUrlButton(
                        isInvoiceTemplateKind(next)
                          ? publicInvoiceTemplateUrl
                          : "",
                      );
                    }}
                  >
                    <SelectTrigger
                      id="cloud-template-kind"
                      className="rounded-xl"
                    >
                      <SelectValue>{selectedKind.label}</SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {defaultKinds.map((item) => (
                        <SelectItem key={item.value} value={item.value}>
                          {item.label} · {item.category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label
                    className="text-xs font-medium"
                    htmlFor="cloud-template-language"
                  >
                    Language
                  </label>
                  <Input
                    id="cloud-template-language"
                    className="rounded-xl"
                    value={languageCode}
                    onChange={(event) => setLanguageCode(event.target.value)}
                    placeholder="en_US"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label
                  className="text-xs font-medium"
                  htmlFor="cloud-template-name"
                >
                  Template name
                </label>
                <Input
                  id="cloud-template-name"
                  className="rounded-xl"
                  value={friendlyName}
                  onChange={(event) => setFriendlyName(event.target.value)}
                  placeholder={`e.g. ${selectedKind.label} ready`}
                />
                <p className="text-[11px] text-muted-foreground">
                  Meta-safe name: {slugify(friendlyName)}
                </p>
              </div>
              <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
                <div>
                  <p className="text-xs font-semibold">Header media</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Bill and Due templates use a dynamic invoice link by default.
                    PDF is available only for legacy document-header templates.
                  </p>
                </div>
                <Select
                  value={headerFormat}
                  onValueChange={(value) => {
                    const next = value as "none" | "image" | "document";
                    setHeaderFormat(next);
                    setHeaderSample(null);
                    if (isInvoiceTemplateKind(kind)) {
                      setUrlButton(
                        next === "none" ? publicInvoiceTemplateUrl : "",
                      );
                    }
                  }}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue>
                      {headerFormat === "none"
                        ? "No header · View invoice button"
                        : headerFormat === "image"
                          ? "Image header"
                          : "PDF document header · Legacy"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      No header · Dynamic invoice link
                    </SelectItem>
                    <SelectItem value="image" disabled>
                      Image header
                    </SelectItem>
                    <SelectItem value="document">
                      PDF header · Legacy
                    </SelectItem>
                  </SelectContent>
                </Select>
                {headerFormat !== "none" ? (
                  <div className="space-y-2">
                    <label
                      className="text-xs font-medium"
                      htmlFor="cloud-template-header-sample"
                    >
                      Sample media for Meta approval
                    </label>
                    <Input
                      id="cloud-template-header-sample"
                      type="file"
                      accept={
                        headerFormat === "image" ? "image/*" : "application/pdf"
                      }
                      className="rounded-xl bg-background"
                      onChange={async (event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        try {
                          setHeaderSample({
                            base64: await readMediaFile(file),
                            fileName: file.name,
                            mimeType: file.type,
                          });
                        } catch (error) {
                          toast.error(
                            error instanceof Error
                              ? error.message
                              : "Media file could not be read",
                          );
                        }
                      }}
                    />
                    <p className="text-[11px] text-muted-foreground">
                      {headerSample
                        ? `${headerSample.fileName} selected`
                        : "Required when submitting an image or PDF header."}
                    </p>
                  </div>
                ) : null}
              </div>
              <div className="space-y-2">
                <label
                  className="text-xs font-medium"
                  htmlFor="cloud-template-body"
                >
                  Message body
                </label>
                <Textarea
                  id="cloud-template-body"
                  className="min-h-32 rounded-xl"
                  value={body}
                  onChange={(event) => setBody(event.target.value)}
                  placeholder="Use {{1}}, {{2}}, etc. for values filled by Ganatri."
                />
                <p className="text-[11px] text-muted-foreground">
                  Use numbered placeholders such as {"{{1}}"}. Sample values are
                  used for the preview.
                </p>
                {hasEdgePlaceholder ? (
                  <p role="alert" className="text-[11px] text-destructive">
                    Meta does not allow a variable at the beginning or end of
                    the message body. Add text before the first variable or
                    after the last one.
                  </p>
                ) : null}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {variableHelp[kind].map((label, index) => (
                    <button
                      key={label}
                      type="button"
                      className="rounded-full border border-border/70 bg-muted/30 px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted"
                      onClick={() =>
                        setBody(
                          (current) =>
                            `${current}${current.endsWith(" ") || !current ? "" : " "}{{${index + 1}}}`,
                        )
                      }
                    >
                      {`{{${index + 1}}}`} {label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <label
                    className="text-xs font-medium"
                    htmlFor="cloud-template-footer"
                  >
                    Footer{" "}
                    <span className="font-normal text-muted-foreground">
                      (optional)
                    </span>
                  </label>
                  <Input
                    id="cloud-template-footer"
                    className="rounded-xl"
                    value={footer}
                    onChange={(event) => setFooter(event.target.value)}
                    placeholder="Thank you for choosing us"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    className="text-xs font-medium"
                    htmlFor="cloud-template-button"
                  >
                    {isInvoiceTemplateKind(kind)
                      ? "Invoice link button"
                      : "HTTPS button link"}{" "}
                    {!isInvoiceTemplateKind(kind) ? (
                      <span className="font-normal text-muted-foreground">
                        (optional)
                      </span>
                    ) : null}
                  </label>
                  <Input
                    id="cloud-template-button"
                    className="rounded-xl"
                    value={urlButton}
                    onChange={(event) => setUrlButton(event.target.value)}
                    readOnly={
                      usesInvoiceUrlButton
                    }
                    placeholder={
                      isInvoiceTemplateKind(kind)
                        ? "Configured by backend"
                        : "https://example.com/review"
                    }
                  />
                  {usesInvoiceUrlButton ? (
                    <p className="text-[11px] text-muted-foreground">
                      Ganatri injects each customer&apos;s secure invoice link
                      into this dynamic button when sending.
                    </p>
                  ) : null}
                  {isInvoiceTemplateKind(kind) && headerFormat !== "none" ? (
                    <p className="text-[11px] text-muted-foreground">
                      Legacy PDF mode does not use an invoice link button.
                    </p>
                  ) : null}
                  {publicInvoiceConfigError && isInvoiceTemplateKind(kind) ? (
                    <p role="alert" className="text-[11px] text-destructive">
                      {publicInvoiceConfigError}
                    </p>
                  ) : null}
                </div>
              </div>
              <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
                <div>
                  <p className="text-xs font-semibold">
                    What will {"{{1}}"} mean?
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    These are approval examples. Ganatri replaces them with live
                    customer, bill, due, and Store values when sending.
                  </p>
                </div>
                {placeholderIndexes.length > 0 ? (
                  placeholderIndexes.map((index) => (
                    <div
                      key={index}
                      className="grid gap-1 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-center"
                    >
                      <label
                        className="text-xs font-medium"
                        htmlFor={`cloud-template-sample-${index}`}
                      >
                        {`{{${index}}}`} ·{" "}
                        {variableHelp[kind][Number(index) - 1] ?? "Value"}
                      </label>
                      <Input
                        id={`cloud-template-sample-${index}`}
                        className="rounded-xl bg-background"
                        value={sampleValues.split("|")[Number(index) - 1] ?? ""}
                        onChange={(event) =>
                          updateSampleValue(index, event.target.value)
                        }
                        placeholder="Example value"
                      />
                    </div>
                  ))
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Add a variable to provide Meta with an example value.
                  </p>
                )}
                {hasUnsupportedPlaceholder ? (
                  <p className="text-[11px] text-destructive">
                    This message type supports only the listed variable slots.
                  </p>
                ) : null}
              </div>
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 lg:sticky lg:top-0 lg:self-start">
              <p className="mb-2 text-xs font-semibold">Preview</p>
              <div className="whitespace-pre-wrap rounded-lg bg-emerald-50 p-3 text-sm text-emerald-950">
                {preview}
                {footer.trim() ? `\n\n${footer.trim()}` : ""}
                {urlButton.trim() ? (
                  <span className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-700">
                    <ExternalLink className="size-3.5" />
                    {invoiceButtonLabel(kind)}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <DialogFooter className="sticky bottom-0 z-10 -mx-6 border-t border-border/60 bg-background/95 px-6 py-4 backdrop-blur">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl"
              disabled={
                submitMutation.isPending ||
                !businessAccountId ||
                !friendlyName.trim() ||
                !body.trim() ||
                hasUnsupportedPlaceholder ||
                hasEdgePlaceholder ||
                (headerFormat !== "none" && !headerSample) ||
                (Boolean(urlButton.trim()) &&
                  !/^https:\/\//i.test(urlButton.trim())) ||
                (usesInvoiceUrlButton &&
                  (!urlButton.trim() || !/\{\{1\}\}/.test(urlButton))) ||
                (isInvoiceTemplateKind(kind) && body.includes("{{invoice_url}}"))
              }
              onClick={() => submitMutation.mutate()}
            >
              {submitMutation.isPending ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <Send className="size-4" />
              )}{" "}
              {submitMutation.isPending ? "Submitting…" : "Submit for approval"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default WhatsAppCloudTemplateManager;
