import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createWhatsAppPromotion, getWhatsAppMessageTemplates } from "@repo/services";
import { whatsappLinkToken, type StoreMessageLink } from "@repo/types";
import { Button } from "@repo/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Textarea } from "@repo/ui/components/textarea";
import { Megaphone } from "lucide-react";
import { toast } from "sonner";
import { whatsappKeys } from "@/lib/query-keys";

type PromotionDialogProps = { organizationId: string; storeId: string; links?: StoreMessageLink[]; className?: string };

const PromotionDialog = ({ organizationId, storeId, links = [], className }: PromotionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [templateId, setTemplateId] = useState("");
  const [image, setImage] = useState<{ base64: string; name: string; mime: string } | null>(null);
  const templatesQuery = useQuery({ queryKey: whatsappKeys.templates(organizationId, storeId, "promotion"), queryFn: () => getWhatsAppMessageTemplates(organizationId, storeId, "promotion"), enabled: open });
  const templates = templatesQuery.data?.status === "success" ? templatesQuery.data.data?.templates ?? [] : [];
  const mutation = useMutation({
    mutationFn: () => {
      if (!image) throw new Error("Choose an image first");
      return createWhatsAppPromotion(organizationId, storeId, {
        title: title.trim(), body: body.trim(), imageBase64: image.base64, imageFileName: image.name, imageMimeType: image.mime,
      });
    },
    onSuccess: response => {
      if (response.status !== "success") { toast.error(response.message || "Promotion could not be queued"); return; }
      toast.success(`Promotion queued for ${response.data?.recipientCount ?? 0} eligible customers`);
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

  return (
    <>
      <Button variant="outline" className={className} onClick={() => setOpen(true)}><Megaphone className="size-4" /> Promotion</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100vw-1rem)] max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle>Send promotion</DialogTitle>
            <DialogDescription>Send an image and message to active customers who have not opted out of promotions.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input value={title} onChange={event => setTitle(event.target.value)} placeholder="Promotion title" maxLength={120} />
            <select className="h-10 rounded-xl border border-border/60 bg-background px-3 text-sm" value={templateId} onChange={event => { const id = event.target.value; setTemplateId(id); const template = templates.find(item => item.id === id); if (template) setBody(template.body); }}>
              <option value="">Write a one-time message</option>
              {templates.filter(template => template.isActive).map(template => <option key={template.id} value={template.id}>{template.name}{template.isDefault ? " (default)" : ""}</option>)}
            </select>
            <Textarea value={body} onChange={event => setBody(event.target.value)} placeholder="Write your promotion message" maxLength={4096} className="min-h-32 rounded-xl" />
            <div className="flex flex-wrap gap-1.5">
              <Button type="button" variant="outline" size="sm" className="h-7 rounded-full px-2 text-[11px]" onClick={() => insertToken("customer_name")}>Customer</Button>
              <Button type="button" variant="outline" size="sm" className="h-7 rounded-full px-2 text-[11px]" onClick={() => insertToken("store_name")}>Store</Button>
              {links.filter(link => link.isActive).map(link => <Button key={link.key} type="button" variant="outline" size="sm" className="h-7 rounded-full px-2 text-[11px]" onClick={() => insertToken(whatsappLinkToken(link.key))}>Link: {link.label}</Button>)}
            </div>
            <Input type="file" accept="image/*" onChange={event => readImage(event.target.files?.[0])} />
            {image ? <p className="text-xs text-muted-foreground">Selected: {image.name}</p> : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button disabled={mutation.isPending || !title.trim() || !body.trim() || !image} onClick={() => mutation.mutate()}>
              {mutation.isPending ? "Queueing..." : "Queue promotion"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default PromotionDialog;
