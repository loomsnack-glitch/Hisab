import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createWhatsAppPromotion, getWhatsAppMessageTemplates } from "@repo/services";
import { whatsappLinkToken, type StoreMessageLink } from "@repo/types";
import { Button } from "@repo/ui/components/button";
import { Badge } from "@repo/ui/components/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Textarea } from "@repo/ui/components/textarea";
import ReactSelect from "@repo/ui/components/react-select/react-select";
import { ImagePlus, Megaphone, Sparkles, Upload } from "lucide-react";
import { toast } from "sonner";
import { whatsappKeys } from "@/lib/query-keys";

type PromotionDialogProps = {
  organizationId: string;
  storeId: string;
  links?: StoreMessageLink[];
  className?: string;
  disabled?: boolean;
  disabledReason?: string;
  approvedTemplates?: ApprovedPromotionTemplate[];
  onQueued?: () => void;
};

export type ApprovedPromotionTemplate = {
  bindingId: string;
  name: string;
  languageCode: string;
  body: string;
  components: unknown[];
  sampleValues: Record<string, unknown>;
};

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;
const textValue = (value: unknown) => typeof value === "string" ? value : "";
const renderSampleText = (value: string, sampleValues: Record<string, unknown>) => value.replace(/\{\{\s*(\d+)\s*\}\}/g, (_, key: string) => String(sampleValues[key] ?? `Example ${key}`));

const PromotionDialog = ({ organizationId, storeId, links = [], className, disabled = false, disabledReason, approvedTemplates = [], onQueued }: PromotionDialogProps) => {
  const isCloudTemplate = approvedTemplates.length > 0;
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [selectedBindingId, setSelectedBindingId] = useState("");
  const [image, setImage] = useState<{ base64: string; name: string; mime: string } | null>(null);
  const templatesQuery = useQuery({ queryKey: whatsappKeys.templates(organizationId, storeId, "promotion"), queryFn: () => getWhatsAppMessageTemplates(organizationId, storeId, "promotion"), enabled: open && !isCloudTemplate });
  const templates = templatesQuery.data?.status === "success" ? templatesQuery.data.data?.templates ?? [] : [];
  const selectedCloudTemplate = approvedTemplates.find(template => template.bindingId === selectedBindingId) ?? approvedTemplates[0] ?? null;
  const promotionBody = selectedCloudTemplate?.body ?? body;
  const requiresImage = selectedCloudTemplate?.components.some(component => isRecord(component) && textValue(component.type).toUpperCase() === "HEADER" && textValue(component.format).toUpperCase() === "IMAGE") ?? false;
  const mutation = useMutation({
    mutationFn: () => {
      return createWhatsAppPromotion(organizationId, storeId, {
        title: title.trim(),
        body: promotionBody.trim(),
        ...(selectedCloudTemplate ? { cloudTemplateBindingId: selectedCloudTemplate.bindingId } : {}),
        ...(image ? { imageBase64: image.base64, imageFileName: image.name, imageMimeType: image.mime } : {}),
      });
    },
    onSuccess: response => {
      if (response.status !== "success") { toast.error(response.message || "Promotion could not be queued"); return; }
      toast.success(`Promotion queued for ${response.data?.recipientCount ?? 0} eligible customers`);
      onQueued?.();
      setOpen(false); setTitle(""); setBody(""); setImage(null); setTemplateId("");
    },
    onError: (error: { message?: string }) => toast.error(error.message || "Promotion could not be queued"),
  });

  const readImage = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Choose an image file"); return; }
    if (file.size > 10 * 1024 * 1024) { toast.error("Image must be 10 MB or smaller"); return; }
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result ?? "");
      setImage({ base64: value.split(",", 2)[1] ?? "", name: file.name, mime: file.type });
    };
    reader.readAsDataURL(file);
  };
  const insertToken = (token: string) => setBody(current => `${current}${current && !current.endsWith(" ") ? " " : ""}{{${token}}}`);
  const templateOptions = templates.filter(template => template.isActive).map(template => ({
    value: template.id,
    label: `${template.name}${template.isDefault ? " · Default" : ""}`,
  }));
  const selectedTemplate = templateOptions.find(option => option.value === templateId) ?? null;
  const imagePreview = image ? `data:${image.mime};base64,${image.base64}` : null;
  const approvedTemplateOptions = approvedTemplates.map(template => ({
    value: template.bindingId,
    label: `${template.name} · ${template.languageCode}`,
  }));
  const selectedApprovedTemplateOption = selectedCloudTemplate ? {
    value: selectedCloudTemplate.bindingId,
    label: `${selectedCloudTemplate.name} · ${selectedCloudTemplate.languageCode}`,
  } : null;
  const selectCloudTemplate = (bindingId: string) => {
    setSelectedBindingId(bindingId);
    const template = approvedTemplates.find(item => item.bindingId === bindingId);
    const templateRequiresImage = template?.components.some(component => isRecord(component) && textValue(component.type).toUpperCase() === "HEADER" && textValue(component.format).toUpperCase() === "IMAGE") ?? false;
    if (!templateRequiresImage) setImage(null);
  };
  const openPromotionDialog = () => {
    if (approvedTemplates.length && !approvedTemplates.some(template => template.bindingId === selectedBindingId)) setSelectedBindingId(approvedTemplates[0]!.bindingId);
    setOpen(true);
  };
  const renderCloudPreview = () => {
    if (!selectedCloudTemplate) return null;
    return <div className="overflow-hidden rounded-xl border border-border/60 bg-background shadow-sm">
      {imagePreview ? <img src={imagePreview} alt="Promotion template header" className="aspect-[4/3] w-full object-cover" /> : requiresImage ? <div className="flex aspect-[4/3] items-center justify-center bg-muted/40 text-xs text-muted-foreground">Image header</div> : null}
      <div className="space-y-2 p-3">
        {selectedCloudTemplate.components.map((component, index) => {
          if (!isRecord(component)) return null;
          const type = textValue(component.type).toUpperCase();
          const format = textValue(component.format).toUpperCase();
          if (type === "HEADER" && format === "DOCUMENT") return <div key={index} className="rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">Document header</div>;
          if (type === "HEADER" && format === "IMAGE") return null;
          if (type === "HEADER") return <p key={index} className="text-sm font-semibold">{renderSampleText(textValue(component.text), selectedCloudTemplate.sampleValues)}</p>;
          if (type === "BODY") return <p key={index} className="whitespace-pre-wrap text-xs text-muted-foreground">{renderSampleText(textValue(component.text), selectedCloudTemplate.sampleValues)}</p>;
          if (type === "FOOTER") return <p key={index} className="text-[11px] text-muted-foreground">{renderSampleText(textValue(component.text), selectedCloudTemplate.sampleValues)}</p>;
          if (type === "BUTTONS" && Array.isArray(component.buttons)) return <div key={index} className="flex flex-wrap gap-1.5">{component.buttons.map((button, buttonIndex) => isRecord(button) ? <span key={buttonIndex} className="rounded-full border border-border/70 px-2 py-1 text-[11px] text-primary">{textValue(button.text) || textValue(button.type)}</span> : null)}</div>;
          return null;
        })}
      </div>
    </div>;
  };

  return (
    <>
      <Button variant="outline" size="sm" className={className ?? "h-9 rounded-xl px-3 text-xs"} disabled={disabled} title={disabledReason} onClick={openPromotionDialog}><Megaphone className="size-3.5" /> New promotion</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="!flex !flex-col max-h-[calc(100dvh-2rem)] w-[calc(100vw-1rem)] !max-w-2xl overflow-y-auto rounded-2xl p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Send promotion</DialogTitle>
            <DialogDescription>{isCloudTemplate ? "Choose an approved WhatsApp marketing template and send it to active customers who have opted in to promotions." : "One image and message to active customers who have opted in to promotions."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-5">
            <div className="space-y-4">
              <div className="space-y-1.5"><p className="text-sm font-medium">Promotion title <span className="text-red-500" aria-hidden="true">*</span></p><Input value={title} onChange={event => setTitle(event.target.value)} placeholder="Summer offer" maxLength={120} aria-required="true" /></div>
              {isCloudTemplate ? <div className="space-y-2 rounded-xl border border-emerald-300/60 bg-emerald-50/60 p-3 dark:bg-emerald-950/20"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium">Approved promotion template</p><Badge variant="outline" className="border-emerald-300/70 text-emerald-700 dark:text-emerald-300">Approved</Badge></div><ReactSelect options={approvedTemplateOptions} value={selectedApprovedTemplateOption} onChange={(option: { value: string } | null) => selectCloudTemplate(option?.value ?? "")} placeholder="Choose an approved template" isSearchable={false} /><p className="text-xs text-muted-foreground">The approved content is locked. Customer and Store values are filled when sent.</p></div> : <>
                <div className="space-y-1.5"><p className="text-sm font-medium">Message template <span className="font-normal text-muted-foreground">(optional)</span></p><ReactSelect options={templateOptions} value={selectedTemplate} onChange={(option: { value: string } | null) => { const id = option?.value ?? ""; setTemplateId(id); const template = templates.find(item => item.id === id); if (template) setBody(template.body); }} placeholder={templatesQuery.isPending ? "Loading templates…" : "Write a one-time message"} isLoading={templatesQuery.isPending} isClearable /></div>
                <div className="space-y-1.5"><div className="flex items-center justify-between"><p className="text-sm font-medium">Message <span className="text-red-500" aria-hidden="true">*</span></p><span className="text-xs text-muted-foreground">{body.length}/4096</span></div><Textarea value={body} onChange={event => setBody(event.target.value)} placeholder="Share the offer, dates, and what customers should do next…" maxLength={4096} className="min-h-32 rounded-xl" aria-required="true" /></div>
                <div className="space-y-2"><p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground"><Sparkles className="size-3.5" />Personalise with tokens</p><div className="flex flex-wrap gap-1.5">
                  <Button type="button" variant="outline" size="sm" className="h-7 rounded-full px-2 text-[11px]" onClick={() => insertToken("customer_name")}>Customer</Button>
                  <Button type="button" variant="outline" size="sm" className="h-7 rounded-full px-2 text-[11px]" onClick={() => insertToken("store_name")}>Store</Button>
                  {links.filter(link => link.isActive).map(link => <Button key={link.key} type="button" variant="outline" size="sm" className="h-7 rounded-full px-2 text-[11px]" onClick={() => insertToken(whatsappLinkToken(link.key))}>{link.label}</Button>)}
                </div></div>
              </>}
              {!isCloudTemplate || requiresImage ? <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-border/80 bg-muted/20 px-3 py-2.5 text-sm transition hover:bg-muted/40"><Upload className="size-4 text-muted-foreground" /><span className="min-w-0 flex-1 truncate">{image?.name ?? `Choose ${isCloudTemplate ? "template" : "promotion"} image (${requiresImage ? "required" : "optional"})`}</span><span className="text-xs text-muted-foreground">Up to 10 MB</span><Input className="hidden" type="file" accept="image/*" onChange={event => readImage(event.target.files?.[0])} /></label> : null}
            </div>
            <div className="mx-auto w-full max-w-sm rounded-2xl border border-border/60 bg-muted/20 p-3">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Preview</p>
              {isCloudTemplate ? renderCloudPreview() : <div className="overflow-hidden rounded-xl border border-border/60 bg-background shadow-sm"><div className="overflow-hidden rounded-xl">{imagePreview ? <img src={imagePreview} alt="Promotion preview" className="aspect-[4/3] w-full object-cover" /> : <div className="flex aspect-[4/3] items-center justify-center bg-muted/40"><ImagePlus className="size-8 text-muted-foreground/50" /></div>}<div className="space-y-1.5 p-3"><p className="text-sm font-semibold">{title || "Your promotion title"}</p><p className="line-clamp-5 whitespace-pre-wrap text-xs text-muted-foreground">{body || "Your promotion message will appear here."}</p></div></div></div>}
              <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{isCloudTemplate ? "Preview uses the selected approved template. Customer and Store values are replaced when sent." : "Preview uses the text you enter. Customer and Store tokens are replaced when sent."}</p>
            </div>
          </div>
          <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={mutation.isPending || !title.trim() || !promotionBody.trim() || (requiresImage && !image)} onClick={() => mutation.mutate()}>
              {mutation.isPending ? "Queueing..." : "Queue promotion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PromotionDialog;
