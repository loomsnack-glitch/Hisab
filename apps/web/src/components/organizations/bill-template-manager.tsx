import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    createWhatsAppMessageTemplate,
    deleteWhatsAppMessageTemplate,
    getWhatsAppMessageTemplates,
    updateWhatsAppMessageTemplate,
} from "@repo/services";
import type { WhatsAppMessageTemplateDTO } from "@repo/types";
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
import { Textarea } from "@repo/ui/components/textarea";
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
import { Eye, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { whatsappKeys } from "@/lib/query-keys";

const TOKEN_EXAMPLES: Array<{ token: string; label: string }> = [
    { token: "{{customer_name}}", label: "Customer" },
    { token: "{{bill_number}}", label: "Bill number" },
    { token: "{{total}}", label: "Total" },
    { token: "{{paid}}", label: "Paid" },
    { token: "{{balance_due}}", label: "Balance due" },
];

const previewTemplate = (body: string) =>
    body.replace(/{{\s*([a-z_]+)\s*}}/gi, (_, token: string) => ({
        customer_name: "Aarav",
        bill_number: "INV-1042",
        total: "₹850.00",
        paid: "₹500.00",
        balance_due: "₹350.00",
        store_name: "Ganatri Store",
    })[token.toLowerCase()] ?? `{{${token}}}`);

type BillTemplateManagerProps = {
    organizationId: string;
    storeId: string;
};

const BillTemplateManager = ({ organizationId, storeId }: BillTemplateManagerProps) => {
    const queryClient = useQueryClient();
    const queryKey = whatsappKeys.templates(organizationId, storeId, "bill");
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<WhatsAppMessageTemplateDTO | null>(null);
    const [name, setName] = useState("");
    const [body, setBody] = useState("");
    const [isDefault, setIsDefault] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<WhatsAppMessageTemplateDTO | null>(null);

    const templatesQuery = useQuery({
        queryKey,
        queryFn: () => getWhatsAppMessageTemplates(organizationId, storeId, "bill"),
    });
    const templates = templatesQuery.data?.status === "success" ? templatesQuery.data.data?.templates ?? [] : [];

    const refresh = () => queryClient.invalidateQueries({ queryKey });
    const saveMutation = useMutation({
        mutationFn: () => editingTemplate
            ? updateWhatsAppMessageTemplate(organizationId, storeId, editingTemplate.id, { name: name.trim(), body: body.trim(), isDefault })
            : createWhatsAppMessageTemplate(organizationId, storeId, { kind: "bill", name: name.trim(), body: body.trim(), isDefault }),
        onSuccess: response => {
            if (response.status !== "success") {
                toast.error(response.message);
                return;
            }
            toast.success(editingTemplate ? "Bill template updated" : "Bill template created");
            setEditorOpen(false);
            refresh();
        },
        onError: (error: { message?: string }) => toast.error(error.message ?? "Unable to save template"),
    });
    const deleteMutation = useMutation({
        mutationFn: (templateId: string) => deleteWhatsAppMessageTemplate(organizationId, storeId, templateId),
        onSuccess: response => {
            if (response.status !== "success") {
                toast.error(response.message);
                return;
            }
            toast.success("Bill template deleted");
            setDeleteTarget(null);
            refresh();
        },
        onError: (error: { message?: string }) => toast.error(error.message ?? "Unable to delete template"),
    });
    const defaultMutation = useMutation({
        mutationFn: (templateId: string) => updateWhatsAppMessageTemplate(organizationId, storeId, templateId, { isDefault: true }),
        onSuccess: response => {
            if (response.status !== "success") {
                toast.error(response.message);
                return;
            }
            toast.success("Default bill template updated");
            refresh();
        },
        onError: (error: { message?: string }) => toast.error(error.message ?? "Unable to set default template"),
    });

    const openEditor = (template?: WhatsAppMessageTemplateDTO) => {
        setEditingTemplate(template ?? null);
        setName(template?.name ?? "");
        setBody(template?.body ?? "Hello {{customer_name}}, your bill {{bill_number}} total is {{total}}.");
        setIsDefault(template?.isDefault ?? templates.length === 0);
        setEditorOpen(true);
    };

    return (
        <div className="space-y-3 rounded-xl border border-primary/15 bg-primary/[0.03] p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-sm font-semibold">Bill templates</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">Save reusable bill messages, choose a default, and preview token values before sending.</p>
                </div>
                <Button type="button" size="sm" className="shrink-0 rounded-xl" onClick={() => openEditor()}>
                    <Plus className="size-4" /> Add template
                </Button>
            </div>
            {templatesQuery.isPending ? <p className="text-xs text-muted-foreground">Loading templates…</p> : null}
            {!templatesQuery.isPending && templates.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/70 px-3 py-4 text-center text-xs text-muted-foreground">
                    No saved bill templates yet. The current Store message will continue to work as a fallback.
                </div>
            ) : null}
            <div className="grid gap-2">
                {templates.map(template => (
                    <div key={template.id} className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/70 p-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                                <p className="truncate text-sm font-medium">{template.name}</p>
                                {template.isDefault ? <Badge variant="secondary" className="gap-1 rounded-full text-[10px]"><Star className="size-3" /> Default</Badge> : null}
                                {!template.isActive ? <Badge variant="outline" className="rounded-full text-[10px]">Inactive</Badge> : null}
                            </div>
                            <p className="line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">{template.body}</p>
                        </div>
                        <div className="flex shrink-0 flex-wrap gap-1">
                            {!template.isDefault && template.isActive ? <Button type="button" variant="ghost" size="sm" className="h-8 rounded-lg text-xs" onClick={() => defaultMutation.mutate(template.id)} disabled={defaultMutation.isPending}>Set default</Button> : null}
                            <Button type="button" variant="ghost" size="icon" className="size-8 rounded-lg" aria-label={`Edit ${template.name}`} onClick={() => openEditor(template)}><Pencil className="size-4" /></Button>
                            <Button type="button" variant="ghost" size="icon" className="size-8 rounded-lg text-destructive hover:text-destructive" aria-label={`Delete ${template.name}`} onClick={() => setDeleteTarget(template)}><Trash2 className="size-4" /></Button>
                        </div>
                    </div>
                ))}
            </div>

            <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>{editingTemplate ? "Edit bill template" : "Create bill template"}</DialogTitle>
                        <DialogDescription>Use tokens to insert bill details when the message is sent.</DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4">
                        <div className="grid gap-2">
                            <label htmlFor="bill-template-name" className="text-sm font-medium">Template name</label>
                            <Input id="bill-template-name" value={name} maxLength={120} placeholder="Thank-you bill" onChange={event => setName(event.target.value)} />
                        </div>
                        <div className="grid gap-2">
                            <label htmlFor="bill-template-body" className="text-sm font-medium">Message body</label>
                            <Textarea id="bill-template-body" value={body} maxLength={4096} className="min-h-36 rounded-xl" placeholder="Hello {{customer_name}}, your bill {{bill_number}} is {{total}}." onChange={event => setBody(event.target.value)} />
                            <div className="flex flex-wrap gap-1.5">
                                {TOKEN_EXAMPLES.map(item => <Button key={item.token} type="button" variant="outline" size="sm" className="h-7 rounded-full px-2 text-[11px]" onClick={() => setBody(current => `${current}${current && !current.endsWith(" ") ? " " : ""}${item.token}`)}>{item.label}</Button>)}
                            </div>
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                            <input type="checkbox" checked={isDefault} onChange={event => setIsDefault(event.target.checked)} /> Use as default bill template
                        </label>
                        <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                            <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground"><Eye className="size-3.5" /> Preview</div>
                            <p className="whitespace-pre-wrap text-sm">{previewTemplate(body) || "Your preview will appear here."}</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
                        <Button type="button" onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending || !name.trim() || !body.trim()}>{saveMutation.isPending ? "Saving…" : "Save template"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={Boolean(deleteTarget)} onOpenChange={open => { if (!open) setDeleteTarget(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete bill template?</AlertDialogTitle>
                        <AlertDialogDescription>This will permanently remove “{deleteTarget?.name}”. Existing queued messages are not changed.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteMutation.isPending} onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default BillTemplateManager;
