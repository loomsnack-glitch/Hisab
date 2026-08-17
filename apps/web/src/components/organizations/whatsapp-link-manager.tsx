import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateStore } from "@repo/services";
import { type OrganizationDetailsResponse, type ServiceResponse, type StoreDTO, type StoreMessageLink } from "@repo/types";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@repo/ui/components/alert-dialog";
import { Button } from "@repo/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@repo/ui/components/dialog";
import { Field, FieldContent, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Badge } from "@repo/ui/components/badge";
import { Link2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { organizationKeys } from "@/lib/query-keys";

const slugify = (value: string) =>
    value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 64) || "link";

const whatsappWorkspaceOrganizationKey = (organizationId: string) =>
    ["whatsapp-workspace", organizationId, "organization"] as const;

type Props = { organizationId: string; store: StoreDTO };
type WorkspaceOrganizationResponse = ServiceResponse<OrganizationDetailsResponse | null>;

const WhatsAppLinkManager = ({ organizationId, store }: Props) => {
    const queryClient = useQueryClient();
    const [open, setOpen] = useState(false);
    const [editing, setEditing] = useState<StoreMessageLink | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<StoreMessageLink | null>(null);
    const [label, setLabel] = useState("");
    const [url, setUrl] = useState("");

    const mutation = useMutation({
        mutationFn: (links: StoreMessageLink[]) => updateStore(organizationId, store.id, {
            name: store.name,
            address: store.address ?? "",
            reviewPlatform: store.reviewPlatform ?? "",
            reviewLink: store.reviewLink ?? "",
            socialMediaName: store.socialMediaName ?? "",
            socialMediaLink: store.socialMediaLink ?? "",
            whatsappLinks: links,
        }),
        onSuccess: response => {
            if (response.status !== "success") {
                toast.error(response.message);
                return;
            }
            const updatedStore = response.data?.store;
            if (updatedStore) {
                queryClient.setQueryData<WorkspaceOrganizationResponse>(
                    whatsappWorkspaceOrganizationKey(organizationId),
                    current => {
                        if (!current?.data?.organization) return current;
                        return {
                            ...current,
                            data: {
                                ...current.data,
                                organization: {
                                    ...current.data.organization,
                                    stores: current.data.organization.stores.map(currentStore =>
                                        currentStore.id === updatedStore.id
                                            ? { ...currentStore, ...updatedStore }
                                            : currentStore,
                                    ),
                                },
                            },
                        };
                    },
                );
            }
            queryClient.invalidateQueries({ queryKey: organizationKeys.detail(organizationId) });
            queryClient.invalidateQueries({ queryKey: whatsappWorkspaceOrganizationKey(organizationId) });
            setOpen(false);
            setDeleteTarget(null);
            toast.success("WhatsApp link saved");
        },
        onError: (error: { message?: string }) => toast.error(error.message ?? "Unable to save link"),
    });

    const openEditor = (link?: StoreMessageLink) => {
        setEditing(link ?? null);
        setLabel(link?.label ?? "");
        setUrl(link?.url ?? "");
        setOpen(true);
    };

    const save = () => {
        const nextLabel = label.trim();
        const nextUrl = url.trim();
        if (!nextLabel || !nextUrl) {
            toast.error("Enter a link name and URL");
            return;
        }

        const base = slugify(editing?.key ?? nextLabel);
        const used = new Set(store.whatsappLinks.filter(link => link.key !== editing?.key).map(link => link.key));
        let key = base;
        let suffix = 2;
        while (used.has(key)) key = `${base.slice(0, 60)}_${suffix++}`;

        const next: StoreMessageLink = {
            key: editing?.key ?? key,
            type: editing?.type ?? "custom",
            label: nextLabel,
            url: nextUrl,
            isActive: true,
        };
        const links = editing
            ? store.whatsappLinks.map(link => link.key === editing.key ? next : link)
            : [...store.whatsappLinks, next];
        mutation.mutate(links);
    };

    return (
        <div className="space-y-3 rounded-xl border border-border/60 bg-background/50 p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-sm font-semibold">Reusable links</p>
                    <p className="text-xs leading-relaxed text-muted-foreground">Save links once and insert them into any message template.</p>
                </div>
                <Button type="button" size="sm" className="rounded-xl" onClick={() => openEditor()}>
                    <Plus className="size-4" /> Add link
                </Button>
            </div>

            {store.whatsappLinks.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border/70 px-3 py-4 text-center text-xs text-muted-foreground">No links saved for this Store.</p>
            ) : (
                <div className="grid gap-2">
                    {store.whatsappLinks.map(link => (
                        <div key={link.key} className="flex flex-col gap-2 rounded-xl border border-border/60 bg-background/70 p-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                    <Link2 className="size-4 shrink-0 text-primary" />
                                    <p className="truncate text-sm font-medium">{link.label}</p>
                                    {!link.isActive ? <Badge variant="outline" className="rounded-full text-[10px]">Unavailable</Badge> : null}
                                </div>
                                <p className="truncate text-xs text-muted-foreground">{link.url}</p>
                            </div>
                            <div className="flex shrink-0 gap-1">
                                <Button type="button" variant="ghost" size="icon" className="size-8 rounded-lg" aria-label={`Edit ${link.label}`} onClick={() => openEditor(link)}>
                                    <Pencil className="size-4" />
                                </Button>
                                <Button type="button" variant="ghost" size="icon" className="size-8 rounded-lg text-destructive hover:text-destructive" aria-label={`Delete ${link.label}`} onClick={() => setDeleteTarget(link)}>
                                    <Trash2 className="size-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <Dialog open={open} onOpenChange={setOpen} disablePointerDismissal>
                <DialogContent className="w-[calc(100vw-1rem)] max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle>{editing ? "Edit link" : "Add link"}</DialogTitle>
                        <DialogDescription>Add a link that you can reuse in your bill, reminder, and promotion templates.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 pt-2">
                        <Field>
                            <FieldLabel required>Link name</FieldLabel>
                            <FieldContent>
                                <Input className="h-11 rounded-xl" value={label} onChange={event => setLabel(event.target.value)} placeholder="e.g. Google review" maxLength={100} autoFocus />
                                <p className="text-xs text-muted-foreground">This name appears when you insert the link into a template.</p>
                            </FieldContent>
                        </Field>

                        <Field>
                            <FieldLabel required>URL</FieldLabel>
                            <FieldContent>
                                <Input className="h-11 rounded-xl" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://example.com" type="url" inputMode="url" autoComplete="url" maxLength={2048} />
                                <p className="text-xs text-muted-foreground">Include the complete URL starting with https://.</p>
                            </FieldContent>
                        </Field>

                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="button" onClick={save} disabled={mutation.isPending}>{mutation.isPending ? "Saving…" : editing ? "Save changes" : "Add link"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={Boolean(deleteTarget)} onOpenChange={value => { if (!value) setDeleteTarget(null); }}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete this link?</AlertDialogTitle>
                        <AlertDialogDescription>Templates using this link will show a missing-link warning until you update them.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteTarget && mutation.mutate(store.whatsappLinks.filter(link => link.key !== deleteTarget.key))}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default WhatsAppLinkManager;
