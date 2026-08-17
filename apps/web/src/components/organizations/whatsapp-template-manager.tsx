import { useRef, useState, type MouseEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    createWhatsAppMessageTemplate,
    deleteWhatsAppMessageTemplate,
    getWhatsAppMessageTemplates,
    updateWhatsAppMessageTemplate,
} from "@repo/services";
import {
    renderWhatsAppMessage,
    validateWhatsAppTemplate,
    whatsappLinkToken,
    WHATSAPP_DEFAULT_TEMPLATE_BODIES,
    WHATSAPP_TEMPLATE_TOKENS,
    type StoreMessageLink,
    type WhatsAppMessageTemplateDTO,
    type WhatsAppMessageTemplateKind,
} from "@repo/types";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/components/dialog";
import { Field, FieldContent, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Textarea } from "@repo/ui/components/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@repo/ui/components/alert-dialog";
import { Eye, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { whatsappKeys } from "@/lib/query-keys";

const labels: Record<WhatsAppMessageTemplateKind, string> = {
    bill: "Bill",
    due_reminder: "Due reminder",
    promotion: "Promotion",
};

const previewValues: Record<string, string> = {
    customer_name: "Aarav",
    bill_number: "INV-1042",
    total: "₹850.00",
    paid: "₹500.00",
    balance_due: "₹350.00",
    total_due: "₹350.00",
    bill_count: "2",
    store_name: "Ganatri Store",
    organization_name: "Ganatri",
};

type WhatsAppTemplateManagerProps = {
    organizationId: string;
    storeId: string;
    kind: WhatsAppMessageTemplateKind;
    links: StoreMessageLink[];
};

const WhatsAppTemplateManager = ({ organizationId, storeId, kind, links }: WhatsAppTemplateManagerProps) => {
    const queryClient = useQueryClient();
    const queryKey = whatsappKeys.templates(organizationId, storeId, kind);
    const [editorOpen, setEditorOpen] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState<WhatsAppMessageTemplateDTO | null>(null);
    const [name, setName] = useState("");
    const [body, setBody] = useState("");
    const [isDefault, setIsDefault] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState<WhatsAppMessageTemplateDTO | null>(null);
    const bodyTextareaRef = useRef<HTMLTextAreaElement | null>(null);
    const templatesQuery = useQuery({ queryKey, queryFn: () => getWhatsAppMessageTemplates(organizationId, storeId, kind) });
    const templates = templatesQuery.data?.status === "success" ? templatesQuery.data.data?.templates ?? [] : [];
    const validation = validateWhatsAppTemplate(kind, body, links);
    const defaultBody = WHATSAPP_DEFAULT_TEMPLATE_BODIES[kind] ?? "Hello {{customer_name}}";
    const preview = renderWhatsAppMessage({ kind, template: body, values: previewValues, links });
    const refresh = () => queryClient.invalidateQueries({ queryKey });

    const saveMutation = useMutation({
        mutationFn: () => editingTemplate
            ? updateWhatsAppMessageTemplate(organizationId, storeId, editingTemplate.id, { name: name.trim(), body: body.trim(), isDefault })
            : createWhatsAppMessageTemplate(organizationId, storeId, { kind, name: name.trim(), body: body.trim(), isDefault }),
        onSuccess: response => {
            if (response.status !== "success") { toast.error(response.message); return; }
            toast.success(editingTemplate ? `${labels[kind]} template updated` : `${labels[kind]} template created`);
            setEditorOpen(false); refresh();
        },
        onError: (error: { message?: string }) => toast.error(error.message ?? "Unable to save template"),
    });
    const deleteMutation = useMutation({
        mutationFn: (templateId: string) => deleteWhatsAppMessageTemplate(organizationId, storeId, templateId),
        onSuccess: response => {
            if (response.status !== "success") { toast.error(response.message); return; }
            setDeleteTarget(null); refresh(); toast.success(`${labels[kind]} template deleted`);
        },
        onError: (error: { message?: string }) => toast.error(error.message ?? "Unable to delete template"),
    });
    const defaultMutation = useMutation({
        mutationFn: (templateId: string) => updateWhatsAppMessageTemplate(organizationId, storeId, templateId, { isDefault: true }),
        onSuccess: response => { if (response.status !== "success") toast.error(response.message); else { refresh(); toast.success(`Default ${labels[kind].toLowerCase()} template updated`); } },
    });

    const openEditor = (template?: WhatsAppMessageTemplateDTO) => {
        setEditingTemplate(template ?? null);
        setName(template?.name ?? `Default ${labels[kind].toLowerCase()}`);
        setBody(template?.body ?? defaultBody);
        setIsDefault(template?.isDefault ?? templates.length === 0);
        setEditorOpen(true);
    };
    const insertToken = (token: string) => {
        const tokenText = `{{${token}}}`;
        const textarea = bodyTextareaRef.current;
        const start = textarea?.selectionStart ?? body.length;
        const end = textarea?.selectionEnd ?? start;
        const beforeText = body.slice(0, start);
        const afterText = body.slice(end);
        const leadingSpace = beforeText && !/\s$/.test(beforeText) ? " " : "";
        const trailingSpace = afterText && !/^\s/.test(afterText) ? " " : "";
        const insertedText = `${leadingSpace}${tokenText}${trailingSpace}`;
        const nextBody = `${beforeText}${insertedText}${afterText}`;
        const nextCursor = start + insertedText.length - trailingSpace.length;

        setBody(nextBody);
        requestAnimationFrame(() => {
            const nextTextarea = bodyTextareaRef.current;
            nextTextarea?.focus();
            nextTextarea?.setSelectionRange(nextCursor, nextCursor);
        });
    };

    const preserveCursor = (event: MouseEvent<HTMLButtonElement>) => {
        event.preventDefault();
    };

    return <div className="space-y-3 rounded-xl border border-border/60 bg-background/50 p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div><p className="text-sm font-semibold">{labels[kind]} templates</p><p className="text-xs leading-relaxed text-muted-foreground">Reusable messages with explicit variables and links.</p></div>
            <Button type="button" size="sm" className="shrink-0 rounded-xl" onClick={() => openEditor()}><Plus className="size-4" /> Add template</Button>
        </div>
        {templatesQuery.isPending ? <p className="text-xs text-muted-foreground">Loading templates…</p> : null}
        {!templatesQuery.isPending && templates.length === 0 ? <p className="rounded-xl border border-dashed border-border/70 px-3 py-4 text-center text-xs text-muted-foreground">No saved template. The built-in message will be used.</p> : null}
        <div className="grid gap-2">{templates.map(template => <div key={template.id} className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/70 p-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 space-y-1"><div className="flex flex-wrap items-center gap-2"><p className="truncate text-sm font-medium">{template.name}</p>{template.isDefault ? <Badge variant="secondary" className="gap-1 rounded-full text-[10px]"><Star className="size-3" /> Default</Badge> : null}{!template.isActive ? <Badge variant="outline" className="rounded-full text-[10px]">Inactive</Badge> : null}</div><p className="line-clamp-2 whitespace-pre-wrap text-xs text-muted-foreground">{template.body}</p></div>
            <div className="flex shrink-0 flex-wrap gap-1">{!template.isDefault && template.isActive ? <Button type="button" variant="ghost" size="sm" className="h-8 rounded-lg text-xs" onClick={() => defaultMutation.mutate(template.id)} disabled={defaultMutation.isPending}>Set default</Button> : null}<Button type="button" variant="ghost" size="icon" className="size-8 rounded-lg" aria-label={`Edit ${template.name}`} onClick={() => openEditor(template)}><Pencil className="size-4" /></Button><Button type="button" variant="ghost" size="icon" className="size-8 rounded-lg text-destructive hover:text-destructive" aria-label={`Delete ${template.name}`} onClick={() => setDeleteTarget(template)}><Trash2 className="size-4" /></Button></div>
        </div>)}</div>

        <Dialog open={editorOpen} onOpenChange={setEditorOpen}>
            <DialogContent className="max-h-[90vh] w-[calc(100vw-1rem)] overflow-y-auto rounded-2xl p-4 sm:max-w-2xl sm:p-6">
                <DialogHeader>
                    <DialogTitle>{editingTemplate ? `Edit ${labels[kind].toLowerCase()} template` : `Create ${labels[kind].toLowerCase()} template`}</DialogTitle>
                    <DialogDescription>Insert the details and links you want. Nothing is appended automatically.</DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={event => { event.preventDefault(); saveMutation.mutate(); }}>
                    <Field>
                        <FieldLabel required>Template name</FieldLabel>
                        <FieldContent>
                            <Input id={`${kind}-template-name`} className="h-11 rounded-xl" value={name} maxLength={120} onChange={event => setName(event.target.value)} placeholder={`e.g. Thank-you ${labels[kind].toLowerCase()}`} autoFocus />
                            <p className="text-xs text-muted-foreground">Use a short name so your team can identify this message quickly.</p>
                        </FieldContent>
                    </Field>
                    <Field>
                        <FieldLabel required>Message body</FieldLabel>
                        <FieldContent>
                            <Textarea ref={bodyTextareaRef} id={`${kind}-template-body`} value={body} maxLength={4096} className="min-h-36 rounded-xl" onChange={event => setBody(event.target.value)} placeholder="Write the message your customer will receive." />
                            <div className="flex flex-wrap gap-1.5">
                                {WHATSAPP_TEMPLATE_TOKENS[kind].map(token => <Button key={token.name} type="button" variant="outline" size="sm" className="h-7 rounded-full px-2 text-[11px]" onMouseDown={preserveCursor} onClick={() => insertToken(token.name)}>{token.label}</Button>)}
                                {links.filter(link => link.isActive).map(link => <Button key={link.key} type="button" variant="outline" size="sm" className="h-7 rounded-full px-2 text-[11px]" onMouseDown={preserveCursor} onClick={() => insertToken(whatsappLinkToken(link.key))}>Link: {link.label}</Button>)}
                            </div>
                            {validation.unknownTokens.length > 0 ? <p className="text-xs text-destructive">Unknown or inactive tokens: {validation.unknownTokens.join(", ")}</p> : null}
                        </FieldContent>
                    </Field>
                    <label className="flex items-start gap-2 text-sm leading-5">
                        <input className="mt-1" type="checkbox" checked={isDefault} onChange={event => setIsDefault(event.target.checked)} />
                        <span>Use as default {labels[kind].toLowerCase()} template</span>
                    </label>
                    <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                        <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-muted-foreground"><Eye className="size-3.5" /> Final preview</div>
                        <p className="whitespace-pre-wrap text-sm">{preview || "Your preview will appear here."}</p>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setEditorOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={saveMutation.isPending || !name.trim() || !body.trim() || validation.unknownTokens.length > 0}>{saveMutation.isPending ? "Saving…" : "Save template"}</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
        <AlertDialog open={Boolean(deleteTarget)} onOpenChange={open => { if (!open) setDeleteTarget(null); }}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Delete {labels[kind].toLowerCase()} template?</AlertDialogTitle><AlertDialogDescription>Existing queued messages are not changed.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteMutation.isPending} onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}>Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </div>;
};

export default WhatsAppTemplateManager;
