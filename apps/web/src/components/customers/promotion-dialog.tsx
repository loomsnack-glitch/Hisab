import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { createWhatsAppPromotion } from "@repo/services";
import { Button } from "@repo/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { Textarea } from "@repo/ui/components/textarea";
import { Megaphone } from "lucide-react";
import { toast } from "sonner";

type PromotionDialogProps = { organizationId: string; storeId: string; className?: string };

const PromotionDialog = ({ organizationId, storeId, className }: PromotionDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [image, setImage] = useState<{ base64: string; name: string; mime: string } | null>(null);
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
      setOpen(false); setTitle(""); setBody(""); setImage(null);
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
            <Textarea value={body} onChange={event => setBody(event.target.value)} placeholder="Message. You can include links such as Google review or app install URLs." maxLength={4096} className="min-h-32 rounded-xl" />
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
