import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getWhatsAppCloudTemplateSubmissions,
  getWhatsAppCloudTemplates,
  getWhatsAppCloudTemplateBindings,
  importWhatsAppCloudTemplateForStore,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@repo/ui/components/select";
import { Textarea } from "@repo/ui/components/textarea";
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
  CheckCircle2,
  Eye,
  ExternalLink,
  FileText,
  FileType2,
  Image as ImageIcon,
  LoaderCircle,
  Plus,
  RefreshCw,
  Send,
  ShieldAlert,
} from "lucide-react";
import { toast } from "sonner";

export type WhatsAppCloudAccountOption = {
  id: string;
  phoneNumber: string;
  snapshot: WhatsAppCloudAccountSnapshot;
};
type Props = {
  organizationId: string;
  storeId: string;
  accounts: WhatsAppCloudAccountOption[];
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
};
const statusClass: Record<string, string> = {
  approved: "border-emerald-200 bg-emerald-50 text-emerald-700",
  rejected: "border-red-200 bg-red-50 text-red-700",
  failed: "border-red-200 bg-red-50 text-red-700",
  pending: "border-amber-200 bg-amber-50 text-amber-700",
  submitting: "border-amber-200 bg-amber-50 text-amber-700",
  paused: "border-orange-200 bg-orange-50 text-orange-700",
  disabled: "border-slate-200 bg-slate-50 text-slate-600",
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
  const fingerprint = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("").slice(0, 24);
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
  bill: ["Customer name", "Bill number", "Total", "Paid", "Balance due", "Organization name", "Store name"],
  due_reminder: ["Customer name", "Total due", "Bill count", "Store name"],
  promotion: ["Customer name", "Store name"],
};
const readMediaFile = (file: File): Promise<string> => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => {
    const value = typeof reader.result === "string" ? reader.result.split(",")[1] : "";
    value ? resolve(value) : reject(new Error("Media file could not be read"));
  };
  reader.onerror = () => reject(reader.error ?? new Error("Media file could not be read"));
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
const statusBadge = (status: string) => (
  <Badge
    variant="outline"
    className={`rounded-full text-[10px] ${statusClass[status] ?? ""}`}
  >
    {status === "approved" ? <CheckCircle2 className="mr-1 size-3" /> : null}
    {statusLabels[status] ?? status}
  </Badge>
);

const WhatsAppCloudTemplateManager = ({
  organizationId,
  storeId,
  accounts,
}: Props) => {
  const queryClient = useQueryClient();
  const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<WhatsAppMessageTemplateKind>("bill");
  const [friendlyName, setFriendlyName] = useState("");
  const [languageCode, setLanguageCode] = useState("en_US");
  const [body, setBody] = useState(defaultBody("bill"));
  const [footer, setFooter] = useState("");
  const [urlButton, setUrlButton] = useState("");
  const [headerFormat, setHeaderFormat] = useState<"none" | "image" | "document">("image");
  const [headerSample, setHeaderSample] = useState<{ base64: string; fileName: string; mimeType: string } | null>(null);
  const [previewCardId, setPreviewCardId] = useState<string | null>(null);
  const [sampleValues, setSampleValues] = useState(defaultSampleValues.bill);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const account = accounts.find((item) => item.id === accountId) ?? accounts[0];
  const businessAccountId = account?.snapshot.whatsappBusinessAccountId ?? "";
  useEffect(() => {
    if (!accounts.some((item) => item.id === accountId))
      setAccountId(accounts[0]?.id ?? "");
  }, [accounts, accountId]);
  const cloudQuery = useQuery({
    queryKey: ["whatsapp", "cloud-templates", organizationId, accountId],
    queryFn: () => getWhatsAppCloudTemplates(organizationId, accountId),
    enabled: Boolean(organizationId && accountId),
  });
  const submissionsQuery = useQuery({
    queryKey: [
      "whatsapp",
      "cloud-submissions",
      organizationId,
      accountId,
      storeId,
    ],
    queryFn: () =>
      getWhatsAppCloudTemplateSubmissions(organizationId, accountId, storeId),
    enabled: Boolean(organizationId && accountId && storeId),
  });
  const cloudTemplates =
    cloudQuery.data?.status === "success"
      ? (cloudQuery.data.data?.templates ?? [])
      : [];
  const submissions =
    submissionsQuery.data?.status === "success"
      ? (submissionsQuery.data.data?.submissions ?? [])
      : [];
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
      language: template.languageCode,
      kind: byProviderId.get(template.metaTemplateId)?.kind ?? null,
      category: template.category,
      status: template.status,
      reason: template.rejectionReason,
      components: template.components,
      sampleValues: byProviderId.get(template.metaTemplateId)?.sampleValues ?? {},
    }));
    const activeSubmissionIdentities = new Set(
      submissions
        .filter((item) => ["draft", "submitting", "pending"].includes(item.status))
        .map((item) => `${item.metaTemplateName}:${item.languageCode}`),
    );
    const activeSubmissionContent = new Set(
      submissions
        .filter((item) => ["draft", "submitting", "pending"].includes(item.status))
        .map((item) => `${item.kind}:${item.languageCode}:${JSON.stringify(item.requestedComponents)}`),
    );
    const pending = submissions.filter(
      (item) => {
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
          (activeSubmissionIdentities.has(identity) || activeSubmissionContent.has(contentIdentity))
        );
      },
    );
    return [
      ...assets,
      ...pending.map((item) => ({
        id: item.id,
        submissionId: item.id,
        submissionStatus: item.status,
        cloudTemplateId: null,
        name: item.friendlyName,
        language: item.languageCode,
        kind: item.kind,
        category: item.category,
        status: item.status,
        reason: item.rejectionReason ?? item.lastErrorMessage,
        components: item.requestedComponents,
        sampleValues: item.sampleValues,
      })),
    ];
  }, [cloudTemplates, submissions]);
  const invalidate = () => {
    void queryClient.invalidateQueries({
      queryKey: ["whatsapp", "cloud-templates", organizationId, accountId],
    });
    void queryClient.invalidateQueries({
      queryKey: [
        "whatsapp",
        "cloud-submissions",
        organizationId,
        accountId,
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
    mutationFn: () => syncWhatsAppCloudTemplates(organizationId, accountId),
    onSuccess: (response) => {
      if (response.status !== "success") toast.error(response.message);
      else {
        invalidate();
        toast.success("Cloud templates refreshed");
      }
    },
    onError: (error) => {
      toast.error(mutationErrorMessage(error, "Cloud templates could not be refreshed"));
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
          ...(headerFormat !== "none" ? [{ type: "HEADER", format: headerFormat.toUpperCase() }] : []),
          { type: "BODY", text: body.trim() },
          ...(footer.trim() ? [{ type: "FOOTER", text: footer.trim() }] : []),
          ...(urlButton.trim()
            ? [
                {
                  type: "BUTTONS",
                  buttons: [
                    {
                      type: "URL",
                      text: "View details",
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
      return submitWhatsAppCloudTemplate(organizationId, accountId, {
        ...template,
        idempotencyKey,
      });
    },
    onMutate: () => setSubmitError(null),
    onSuccess: (response) => {
      if (response.status !== "success") {
        setSubmitError(response.message);
        toast.error(response.message);
      }
      else {
        setOpen(false);
        setSubmitError(null);
        invalidate();
        toast.success(response.message);
      }
    },
    onError: (error) => {
      const message = mutationErrorMessage(error, "Template could not be submitted");
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
        mutationErrorMessage(error, "Existing Cloud template could not be assigned"),
      );
    },
  });
  const openCreate = () => {
    setSubmitError(null);
    setKind("bill");
    setFriendlyName("");
    setLanguageCode("en_US");
    setBody(defaultBody("bill"));
    setFooter("");
    setUrlButton("");
    setHeaderFormat("document");
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
        String((component as Record<string, unknown>).type).toUpperCase() === "HEADER",
    ) as Record<string, unknown> | undefined;
    setKind(submission.kind);
    setFriendlyName(`${submission.friendlyName} copy`);
    setLanguageCode(submission.languageCode);
    setBody(
      typeof bodyComponent?.text === "string"
        ? bodyComponent.text
        : defaultBody(submission.kind),
    );
    setFooter(
      typeof footerComponent?.text === "string" ? footerComponent.text : "",
    );
    setUrlButton("");
    const header = String(headerComponent?.format ?? "").toLowerCase();
    setHeaderFormat(header === "image" || header === "document" ? header : "none");
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
  const placeholderIndexes = [...new Set([...body.matchAll(/\{\{(\d+)\}\}/g)].map((match) => match[1]!))].sort((a, b) => Number(a) - Number(b));
  const hasUnsupportedPlaceholder = placeholderIndexes.some((index) => !variableHelp[kind][Number(index) - 1]);
  const trimmedBody = body.trim();
  const hasEdgePlaceholder = /^\{\{\d+\}\}/.test(trimmedBody) || /(?:^|\n)\s*\{\{\d+\}\}\s*[^\w{}]*$/.test(trimmedBody);
  const updateSampleValue = (index: string, value: string) => {
    const values = sampleValues.split("|");
    values[Number(index) - 1] = value;
    setSampleValues(values.join("|"));
  };
  const previewCard = cards.find((card) => card.id === previewCardId) ?? null;
  const approvedTemplates = cards.filter(
    (card) => card.status === "approved" && card.cloudTemplateId,
  );
  const defaultBindingFor = (messageKind: WhatsAppMessageTemplateKind) =>
    bindings.find(
      (binding) =>
        binding.kind === messageKind && binding.isActive && binding.isDefault,
    );
  const templateForBinding = (bindingId: string | undefined) =>
    approvedTemplates.find(
      (template) =>
        template.cloudTemplateId ===
        bindings.find((binding) => binding.id === bindingId)?.cloudTemplateId,
    );
  const linkedKindsFor = (cloudTemplateId: string) =>
    bindings
      .filter(
        (binding) =>
          binding.cloudTemplateId === cloudTemplateId &&
          binding.isActive &&
          binding.isDefault,
      )
      .map(
        (binding) =>
          kinds.find((item) => item.value === binding.kind)?.label ??
          "Message type",
      );
  const preview = body.replace(
    /\{\{(\d+)\}\}/g,
    (_, index: string) =>
      sampleValues.split("|")[Number(index) - 1]?.trim() || `{{${index}}}`,
  );
  if (accounts.length === 0)
    return (
      <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">
        Assign a connected Cloud account to this Store before creating
        templates.
      </div>
    );
  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-background/50 p-3 sm:p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <FileText className="size-4 text-primary" /> WhatsApp templates
          </p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Create once in Ganatri, submit to Meta, then use approved templates
            for this Store.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="rounded-xl"
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
            className="rounded-xl"
            onClick={openCreate}
          >
            <Plus className="size-4" /> Create template
          </Button>
        </div>
      </div>
      {accounts.length > 1 ? (
        <div className="max-w-sm space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Cloud account
          </span>
          <Select value={accountId} onValueChange={(value) => { if (value) setAccountId(value); }}>
            <SelectTrigger
              className="w-full rounded-xl"
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
      ) : (
        <p className="text-xs text-muted-foreground">
          Sending number:{" "}
          <span className="font-medium text-foreground">
            {account?.phoneNumber}
          </span>
        </p>
      )}
      {cloudQuery.data?.status === "error" ||
      submissionsQuery.data?.status === "error" ? (
        <p className="flex items-center gap-2 text-xs text-destructive">
          <AlertCircle className="size-4" /> Templates could not be loaded. Try
          Refresh.
        </p>
      ) : null}
      {cloudQuery.isPending || submissionsQuery.isPending ? (
        <p className="text-xs text-muted-foreground">
          Loading template status…
        </p>
      ) : null}
      {!cloudQuery.isPending &&
      !submissionsQuery.isPending &&
      cards.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border/70 px-4 py-8 text-center">
          <p className="text-sm font-medium">No templates yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create a bill, reminder, or promotion template and submit it for
            Meta approval.
          </p>
        </div>
      ) : null}
      <section className="space-y-3 rounded-xl border border-border/60 bg-background/70 p-3 sm:p-4">
        <div>
          <p className="text-sm font-semibold">Templates</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Track approval here. Assign approved templates in the Store defaults section below.
          </p>
        </div>
        <Table className="min-w-[680px]">
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
            {cards.map((card) => (
              <TableRow key={card.id}>
                <TableCell>
                  <p className="max-w-52 truncate font-medium">{card.name}</p>
                  {card.reason ? (
                    <p className="mt-1 flex max-w-64 gap-1 text-xs text-destructive">
                      <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
                      <span className="truncate">{card.reason}</span>
                    </p>
                  ) : null}
                </TableCell>
                <TableCell>
                  {card.kind
                    ? kinds.find((item) => item.value === card.kind)?.label
                    : card.category === "marketing"
                      ? "Marketing"
                      : "Utility"}
                </TableCell>
                <TableCell>{card.language}</TableCell>
                <TableCell>{statusBadge(card.status)}</TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">
                    {card.cloudTemplateId && linkedKindsFor(card.cloudTemplateId).length > 0
                      ? linkedKindsFor(card.cloudTemplateId).join(", ")
                      : "Not assigned"}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1.5">
                    <Button type="button" size="sm" variant="ghost" className="h-8 rounded-lg px-2 text-xs" onClick={() => setPreviewCardId(card.id)}>
                      <Eye className="size-3.5" /> Preview
                    </Button>
                    {card.status === "rejected" || card.status === "failed" ? (
                      <Button type="button" size="sm" variant="outline" className="h-8 rounded-lg text-xs" onClick={() => duplicateSubmission(card.submissionId ?? card.id)}>
                        Duplicate
                      </Button>
                    ) : card.status === "pending" || card.status === "submitting" ? (
                      <span className="self-center text-xs text-muted-foreground">Awaiting Meta</span>
                    ) : card.status === "approved" ? (
                      <span className="self-center text-xs text-emerald-700">Ready</span>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </section>
      <section className="space-y-3 rounded-xl border border-primary/20 bg-primary/[0.03] p-3 sm:p-4">
        <div>
          <p className="text-sm font-semibold">Store defaults</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose the approved template Ganatri sends for each message type in this Store.
          </p>
        </div>
        <div className="grid gap-2">
          {kinds.map((messageKind) => {
            const binding = defaultBindingFor(messageKind.value);
            const selectedTemplate = templateForBinding(binding?.id);
            const savingDefault =
              importMutation.isPending &&
              importMutation.variables?.kind === messageKind.value;
            const compatibleTemplates = approvedTemplates.filter(
              (template) =>
                (messageKind.value === "promotion" ? "marketing" : "utility") ===
                template.category,
            );
            return (
              <div
                key={messageKind.value}
                className="grid gap-2 rounded-xl border border-border/60 bg-background/80 p-3 sm:grid-cols-[minmax(9rem,0.7fr)_minmax(0,1.3fr)] sm:items-center"
              >
                <div>
                  <p className="text-sm font-medium">{messageKind.label}</p>
                  <p className="text-xs text-muted-foreground">{messageKind.category} message</p>
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
                  disabled={importMutation.isPending || compatibleTemplates.length === 0}
                >
                  <SelectTrigger className="w-full rounded-xl bg-background">
                    <SelectValue placeholder={compatibleTemplates.length === 0 ? "No approved template" : "Choose a template"}>
                      {savingDefault ? (
                        <span className="flex items-center gap-2">
                          <LoaderCircle className="size-4 animate-spin" />
                          Saving…
                        </span>
                      ) : (
                        selectedTemplate?.name ?? "Choose a template"
                      )}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {compatibleTemplates.map((template) => (
                      <SelectItem key={template.cloudTemplateId} value={template.cloudTemplateId!}>
                        {template.name} · {template.language}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            );
          })}
        </div>
        {approvedTemplates.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Sync Meta templates and wait for approval before assigning Store defaults.
          </p>
        ) : null}
      </section>
      <Dialog open={Boolean(previewCard)} onOpenChange={(value) => { if (!value) setPreviewCardId(null); }}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-md rounded-2xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>{previewCard?.name ?? "Template preview"}</DialogTitle>
            <DialogDescription>
              {previewCard ? `${statusLabels[previewCard.status] ?? previewCard.status} · ${previewCard.language}` : "Preview"}
            </DialogDescription>
          </DialogHeader>
          {previewCard ? (
            <div className="rounded-2xl bg-[#e5f6df] p-3 shadow-inner">
              <div className="space-y-2 rounded-xl bg-white p-3 text-sm text-slate-900 shadow-sm">
                {Array.isArray(previewCard.components) ? previewCard.components.map((component, index) => {
                  if (!component || typeof component !== "object" || Array.isArray(component)) return null;
                  const value = component as Record<string, unknown>;
                  const type = String(value.type ?? "").toLowerCase();
                  const format = String(value.format ?? "").toLowerCase();
                  if (type === "header" && format === "image") return <div key={index} className="flex h-28 items-center justify-center rounded-lg bg-slate-100 text-xs text-slate-500"><ImageIcon className="mr-2 size-5" />Image header</div>;
                  if (type === "header" && format === "document") return <div key={index} className="flex items-center gap-2 rounded-lg bg-slate-100 p-3 text-xs text-slate-600"><FileType2 className="size-5" />PDF invoice attached when sent</div>;
                  if (type === "header" || type === "body" || type === "footer") {
                    const text = typeof value.text === "string" ? value.text : "";
                    const rendered = text.replace(/\{\{(\d+)\}\}/g, (_, number: string) => String(previewCard.sampleValues[number] ?? `Example ${number}`));
                    return <p key={index} className={type === "footer" ? "text-xs text-slate-500" : "whitespace-pre-wrap"}>{rendered}</p>;
                  }
                  if (type === "buttons") return <div key={index} className="space-y-1 border-t pt-2">{Array.isArray(value.buttons) ? value.buttons.map((button, buttonIndex) => <div key={buttonIndex} className="rounded-lg border border-emerald-200 px-3 py-2 text-center text-xs font-medium text-emerald-700">{button && typeof button === "object" && !Array.isArray(button) ? String((button as Record<string, unknown>).text ?? "Button") : "Button"}</div>) : null}</div>;
                  return null;
                }) : <p className="text-sm text-slate-500">Template content is not available for preview.</p>}
              </div>
            </div>
          ) : null}
          <DialogFooter><Button type="button" variant="outline" className="rounded-xl" onClick={() => setPreviewCardId(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (!value) setSubmitError(null); }}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create WhatsApp template</DialogTitle>
            <DialogDescription>
              Ganatri will submit this template to Meta for approval. The
              category is chosen from the message type.
            </DialogDescription>
          </DialogHeader>
          {submitError ? (
            <div role="alert" className="flex gap-2 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-medium">Template could not be submitted</p>
                <p className="mt-1">{submitError}</p>
              </div>
            </div>
          ) : null}
          <div className="grid gap-4 py-2">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
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
                    setBody(defaultBody(next));
                    setSampleValues(defaultSampleValues[next]);
                    setHeaderFormat(next === "promotion" ? "image" : "document");
                    setHeaderSample(null);
                  }}
                >
                  <SelectTrigger
                    id="cloud-template-kind"
                    className="rounded-xl"
                  >
                    <SelectValue>{selectedKind.label}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {kinds.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label} · {item.category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
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
            <div className="space-y-1.5">
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
                  Promotion templates can use an image. Bill and due-reminder templates can use a PDF invoice header.
                </p>
              </div>
              <Select
                value={headerFormat}
                onValueChange={(value) => {
                  setHeaderFormat(value as "none" | "image" | "document");
                  setHeaderSample(null);
                }}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue>{headerFormat === "none" ? "No header" : headerFormat === "image" ? "Image header" : "PDF document header"}</SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No header</SelectItem>
                  <SelectItem value="image" disabled={kind !== "promotion"}>Image header · Promotion</SelectItem>
                  <SelectItem value="document" disabled={kind === "promotion"}>PDF header · Bill or due reminder</SelectItem>
                </SelectContent>
              </Select>
              {headerFormat !== "none" ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium" htmlFor="cloud-template-header-sample">Sample media for Meta approval</label>
                  <Input
                    id="cloud-template-header-sample"
                    type="file"
                    accept={headerFormat === "image" ? "image/*" : "application/pdf"}
                    className="rounded-xl bg-background"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      try {
                        setHeaderSample({ base64: await readMediaFile(file), fileName: file.name, mimeType: file.type });
                      } catch (error) {
                        toast.error(error instanceof Error ? error.message : "Media file could not be read");
                      }
                    }}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    {headerSample ? `${headerSample.fileName} selected` : "Required when submitting an image or PDF header."}
                  </p>
                </div>
              ) : null}
            </div>
            <div className="space-y-1.5">
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
                  Meta does not allow a variable at the beginning or end of the message body. Add text before the first variable or after the last one.
                </p>
              ) : null}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {variableHelp[kind].map((label, index) => (
                  <button
                    key={label}
                    type="button"
                    className="rounded-full border border-border/70 bg-muted/30 px-2 py-1 text-[11px] text-muted-foreground hover:bg-muted"
                    onClick={() => setBody((current) => `${current}${current.endsWith(" ") || !current ? "" : " "}{{${index + 1}}}`)}
                  >
                    {`{{${index + 1}}}`} {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
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
              <div className="space-y-1.5">
                <label
                  className="text-xs font-medium"
                  htmlFor="cloud-template-button"
                >
                  HTTPS button link{" "}
                  <span className="font-normal text-muted-foreground">
                    (optional)
                  </span>
                </label>
                <Input
                  id="cloud-template-button"
                  className="rounded-xl"
                  value={urlButton}
                  onChange={(event) => setUrlButton(event.target.value)}
                  placeholder="https://example.com/review"
                />
              </div>
            </div>
            <div className="space-y-2 rounded-xl border border-border/60 bg-muted/20 p-3">
              <div>
                <p className="text-xs font-semibold">What will {"{{1}}"} mean?</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  These are approval examples. Ganatri replaces them with live customer, bill, due, and Store values when sending.
                </p>
              </div>
              {placeholderIndexes.length > 0 ? placeholderIndexes.map((index) => (
                <div key={index} className="grid gap-1 sm:grid-cols-[7rem_minmax(0,1fr)] sm:items-center">
                  <label className="text-xs font-medium" htmlFor={`cloud-template-sample-${index}`}>{`{{${index}}}`} · {variableHelp[kind][Number(index) - 1] ?? "Value"}</label>
                  <Input id={`cloud-template-sample-${index}`} className="rounded-xl bg-background" value={sampleValues.split("|")[Number(index) - 1] ?? ""} onChange={(event) => updateSampleValue(index, event.target.value)} placeholder="Example value" />
                </div>
              )) : <p className="text-[11px] text-muted-foreground">Add a variable to provide Meta with an example value.</p>}
              {hasUnsupportedPlaceholder ? <p className="text-[11px] text-destructive">This message type supports only the listed variable slots.</p> : null}
            </div>
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
              <p className="mb-2 text-xs font-semibold">Preview</p>
              <div className="whitespace-pre-wrap rounded-lg bg-emerald-50 p-3 text-sm text-emerald-950">
                {preview}
                {footer.trim() ? `\n\n${footer.trim()}` : ""}
                {urlButton.trim() ? (
                  <span className="mt-2 flex items-center gap-1 text-xs font-medium text-emerald-700">
                    <ExternalLink className="size-3.5" />
                    View details
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <DialogFooter>
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
                  !/^https:\/\//.test(urlButton.trim()))
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
