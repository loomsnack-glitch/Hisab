import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import { updateStore } from "@repo/services";
import { UpdateStoreSchema, type StoreDTO, type StoreMessageLink, type UpdateStoreJSON } from "@repo/types";
import { Button } from "@repo/ui/components/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTrigger,
} from "@repo/ui/components/dialog";
import { Field, FieldContent, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Textarea } from "@repo/ui/components/textarea";
import { Pencil, Share2, Star, Store } from "lucide-react";
import { toast } from "sonner";

import { organizationKeys } from "@/lib/query-keys";
import { useUnsavedChanges } from "@/hooks/use-unsaved-changes";
import BillTemplateManager from "@/components/organizations/bill-template-manager";

type EditStoreDialogProps = {
    organizationId: string;
    store: StoreDTO;
    trigger?: React.ReactElement;
};

const getDefaultValues = (store: StoreDTO): UpdateStoreJSON => ({
    name: store.name,
    address: store.address ?? "",
    reviewPlatform: store.reviewPlatform ?? "",
    reviewLink: store.reviewLink ?? "",
    socialMediaName: store.socialMediaName ?? "",
    socialMediaLink: store.socialMediaLink ?? "",
    whatsappLinks: store.whatsappLinks,
    whatsappMessageTemplates: store.whatsappMessageTemplates,
});

const getExtraLinks = (store: StoreDTO): StoreMessageLink[] =>
    store.whatsappLinks.filter(link => link.type !== "google_review" && link.type !== "social");

const EditStoreDialog = ({ organizationId, store, trigger }: EditStoreDialogProps) => {
    const [open, setOpen] = useState(false);
    const [extraLinks, setExtraLinks] = useState<StoreMessageLink[]>(() => getExtraLinks(store));
    const queryClient = useQueryClient();

    const form = useForm<UpdateStoreJSON>({
        resolver: zodResolver(UpdateStoreSchema),
        defaultValues: getDefaultValues(store),
    });

    const storeName = form.watch("name");
    const address = form.watch("address");
    const reviewPlatform = form.watch("reviewPlatform");
    const reviewLink = form.watch("reviewLink");
    const socialMediaName = form.watch("socialMediaName");
    const socialMediaLink = form.watch("socialMediaLink");

    useEffect(() => {
        if (open) {
            form.reset(getDefaultValues(store));
            setExtraLinks(getExtraLinks(store));
        }
    }, [form, open, store]);

    const updateMutation = useMutation({
        mutationFn: (values: UpdateStoreJSON) => updateStore(organizationId, store.id, values),
        onSuccess: (response) => {
            if (response.status === "success") {
                toast.success(response.message);
                queryClient.invalidateQueries({ queryKey: organizationKeys.detail(organizationId) });
                setOpen(false);
                return;
            }

            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Failed to update store");
        },
    });

    const { AlertDialogComponent, interceptClose } = useUnsavedChanges({
        isDirty: form.formState.isDirty,
        onSave: async () => {
            let result = false;
            await form.handleSubmit(async (values) => {
                try {
                    const response = await updateMutation.mutateAsync({
                        name: values.name.trim(),
                        address: values.address,
                        reviewPlatform: values.reviewPlatform,
                        reviewLink: values.reviewLink,
                        socialMediaName: values.socialMediaName,
                        socialMediaLink: values.socialMediaLink,
                        whatsappLinks: [
                            ...(values.reviewPlatform && values.reviewLink ? [{ type: "google_review" as const, label: values.reviewPlatform, url: values.reviewLink, includeInBill: true, includeInReminder: false, includeInPromotion: false }] : []),
                            ...(values.socialMediaName && values.socialMediaLink ? [{ type: "social" as const, label: values.socialMediaName, url: values.socialMediaLink, includeInBill: true, includeInReminder: false, includeInPromotion: true }] : []),
                            ...extraLinks.filter(link => link.label.trim() && link.url.trim()),
                        ],
                        whatsappMessageTemplates: {
                            dueReminder: values.whatsappMessageTemplates.dueReminder,
                            promotion: values.whatsappMessageTemplates.promotion,
                        },
                    });
                    if (response.status === "success") {
                        result = true;
                    }
                } catch {
                    result = false;
                }
            })();
            return result;
        },
        onDiscard: () => {
            form.reset(getDefaultValues(store));
        },
    });

    const handleOpenChange = (nextOpen: boolean) => {
        if (!nextOpen) {
            interceptClose(() => {
                setOpen(false);
                form.reset(getDefaultValues(store));
            });
        } else {
            setOpen(true);
        }
    };

    const onSubmit: SubmitHandler<UpdateStoreJSON> = (values) => {
        updateMutation.mutate({
            name: values.name.trim(),
            address: values.address,
            reviewPlatform: values.reviewPlatform,
            reviewLink: values.reviewLink,
            socialMediaName: values.socialMediaName,
            socialMediaLink: values.socialMediaLink,
            whatsappLinks: [
                ...(values.reviewPlatform && values.reviewLink ? [{ type: "google_review" as const, label: values.reviewPlatform, url: values.reviewLink, includeInBill: true, includeInReminder: false, includeInPromotion: false }] : []),
                ...(values.socialMediaName && values.socialMediaLink ? [{ type: "social" as const, label: values.socialMediaName, url: values.socialMediaLink, includeInBill: true, includeInReminder: false, includeInPromotion: true }] : []),
                ...extraLinks.filter(link => link.label.trim() && link.url.trim()),
            ],
            whatsappMessageTemplates: {
                dueReminder: values.whatsappMessageTemplates.dueReminder,
                promotion: values.whatsappMessageTemplates.promotion,
            },
        });
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange} disablePointerDismissal>
            <DialogTrigger
                render={
                    trigger ?? (
                        <Button variant="outline" size="sm" className="rounded-full">
                            <Pencil className="size-4" />
                        </Button>
                    )
                }
            />
            <DialogContent className="relative min-w-0 overflow-hidden sm:max-w-lg border-border/80 shadow-2xl backdrop-blur-md">
                <DialogHeader
                    icon={<Store className="size-5 transition-transform duration-300" />}
                    title="Edit store"
                />

                <form
                    className="min-w-0 max-h-[75vh] space-y-4 overflow-x-hidden overflow-y-auto pt-3 pr-1"
                    onSubmit={form.handleSubmit(onSubmit)}
                >
                    <Field data-invalid={!!form.formState.errors.name}>
                        <div className="flex items-center justify-between">
                            <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80" required>
                                Store name
                            </FieldLabel>
                            <span className="text-[10px] font-medium text-muted-foreground/50 mb-1.5 tabular-nums select-none">
                                {(storeName ?? "").length}/255
                            </span>
                        </div>
                        <FieldContent>
                            <Input
                                variant="ringShadow"
                                className="h-11 rounded-xl border border-border/60 bg-muted/20 px-3.5 hover:bg-muted/30 focus:bg-background focus:border-primary/80 transition-all duration-200 shadow-inner"
                                maxLength={255}
                                placeholder="e.g. Main Street Branch"
                                {...form.register("name")}
                            />
                            <FieldError errors={[form.formState.errors.name]} />
                        </FieldContent>
                    </Field>

                    <Field data-invalid={!!form.formState.errors.address}>
                        <div className="flex items-center justify-between">
                            <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                                Address <span className="font-normal text-muted-foreground/60 lowercase normal-case">(optional)</span>
                            </FieldLabel>
                            <span className="text-[10px] font-medium text-muted-foreground/50 mb-1.5 tabular-nums select-none">
                                {(address ?? "").length}/500
                            </span>
                        </div>
                        <FieldContent>
                            <Textarea
                                className="min-h-20 rounded-xl border border-border/60 bg-muted/20 px-3.5 hover:bg-muted/30 focus:bg-background focus:border-primary/80 transition-all duration-200 shadow-inner resize-none"
                                maxLength={500}
                                placeholder="e.g. 123 Main St, City, State"
                                {...form.register("address")}
                            />
                            <FieldError errors={[form.formState.errors.address]} />
                        </FieldContent>
                    </Field>

                    <section className="min-w-0 space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 rounded-lg bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
                                <Star className="size-4" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold">Customer reviews</p>
                                <p className="text-xs leading-relaxed text-muted-foreground">
                                    Add both fields to include a feedback request in WhatsApp bills.
                                </p>
                            </div>
                        </div>

                        <div className="min-w-0 space-y-4">
                            <Field className="min-w-0" data-invalid={!!form.formState.errors.reviewPlatform}>
                                <div className="flex items-center justify-between">
                                    <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                                        Review platform
                                    </FieldLabel>
                                    <span className="text-[10px] font-medium text-muted-foreground/50 mb-1.5 tabular-nums select-none">
                                        {(reviewPlatform ?? "").length}/100
                                    </span>
                                </div>
                                <FieldContent>
                                    <Input
                                        variant="ringShadow"
                                        className="h-11 rounded-xl border border-border/60 bg-muted/20 px-3.5 hover:bg-muted/30 focus:bg-background focus:border-primary/80 transition-all duration-200 shadow-inner"
                                        maxLength={100}
                                        placeholder="e.g. Google"
                                        {...form.register("reviewPlatform")}
                                    />
                                    <FieldError errors={[form.formState.errors.reviewPlatform]} />
                                </FieldContent>
                            </Field>

                            <Field className="min-w-0" data-invalid={!!form.formState.errors.reviewLink}>
                                <div className="flex items-center justify-between">
                                    <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                                        Review link
                                    </FieldLabel>
                                    <span className="text-[10px] font-medium text-muted-foreground/50 mb-1.5 tabular-nums select-none">
                                        {(reviewLink ?? "").length}/2048
                                    </span>
                                </div>
                                <FieldContent>
                                    <Input
                                        variant="ringShadow"
                                        className="h-11 rounded-xl border border-border/60 bg-muted/20 px-3.5 hover:bg-muted/30 focus:bg-background focus:border-primary/80 transition-all duration-200 shadow-inner"
                                        type="url"
                                        maxLength={2048}
                                        placeholder="https://g.page/..."
                                        {...form.register("reviewLink")}
                                    />
                                    <FieldError errors={[form.formState.errors.reviewLink]} />
                                </FieldContent>
                            </Field>
                        </div>
                    </section>

                    <section className="min-w-0 space-y-4 rounded-xl border border-border/60 bg-muted/10 p-4">
                        <div>
                            <p className="text-sm font-semibold">WhatsApp links and templates</p>
                            <p className="text-xs leading-relaxed text-muted-foreground">Choose which links are appended to bills and reminders. Use tokens like {"{{customer_name}}"}, {"{{bill_number}}"}, {"{{total}}"}, {"{{paid}}"}, and {"{{balance_due}}"} in templates.</p>
                        </div>
                        {extraLinks.map((link, index) => (
                            <div key={`${link.type}-${index}`} className="space-y-2 rounded-xl border border-border/60 bg-background/50 p-3">
                                <div className="grid gap-2 sm:grid-cols-2">
                                    <Input value={link.label} placeholder="Link label" onChange={event => setExtraLinks(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} />
                                    <Input value={link.url} type="url" placeholder="https://..." onChange={event => setExtraLinks(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, url: event.target.value } : item))} />
                                </div>
                                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                                    {(["includeInBill", "includeInReminder", "includeInPromotion"] as const).map(field => (
                                        <label key={field} className="flex items-center gap-1.5"><input type="checkbox" checked={link[field]} onChange={event => setExtraLinks(current => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: event.target.checked } : item))} /> {field.replace("includeIn", "In ")}</label>
                                    ))}
                                </div>
                            </div>
                        ))}
                        <Button type="button" variant="outline" size="sm" onClick={() => setExtraLinks(current => [...current, { type: "custom", label: "", url: "", includeInBill: true, includeInReminder: false, includeInPromotion: true }])}>Add link</Button>
                        <BillTemplateManager organizationId={organizationId} storeId={store.id} />
                        <Textarea className="min-h-24 rounded-xl" placeholder="Due reminder message (optional)" {...form.register("whatsappMessageTemplates.dueReminder")} />
                        <Textarea className="min-h-24 rounded-xl" placeholder="Promotion message template (optional)" {...form.register("whatsappMessageTemplates.promotion")} />
                    </section>

                    <section className="min-w-0 space-y-3 rounded-xl border border-border/60 bg-muted/10 p-4">
                        <div className="flex items-start gap-3">
                            <div className="mt-0.5 rounded-lg bg-sky-500/10 p-2 text-sky-600 dark:text-sky-400">
                                <Share2 className="size-4" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold">Social media</p>
                                <p className="text-xs leading-relaxed text-muted-foreground">
                                    Add both fields to invite customers to follow the Store.
                                </p>
                            </div>
                        </div>

                        <div className="min-w-0 space-y-4">
                            <Field className="min-w-0" data-invalid={!!form.formState.errors.socialMediaName}>
                                <div className="flex items-center justify-between">
                                    <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                                        Social media name
                                    </FieldLabel>
                                    <span className="text-[10px] font-medium text-muted-foreground/50 mb-1.5 tabular-nums select-none">
                                        {(socialMediaName ?? "").length}/100
                                    </span>
                                </div>
                                <FieldContent>
                                    <Input
                                        variant="ringShadow"
                                        className="h-11 rounded-xl border border-border/60 bg-muted/20 px-3.5 hover:bg-muted/30 focus:bg-background focus:border-primary/80 transition-all duration-200 shadow-inner"
                                        maxLength={100}
                                        placeholder="e.g. Instagram"
                                        {...form.register("socialMediaName")}
                                    />
                                    <FieldError errors={[form.formState.errors.socialMediaName]} />
                                </FieldContent>
                            </Field>

                            <Field className="min-w-0" data-invalid={!!form.formState.errors.socialMediaLink}>
                                <div className="flex items-center justify-between">
                                    <FieldLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/80">
                                        Social media link
                                    </FieldLabel>
                                    <span className="text-[10px] font-medium text-muted-foreground/50 mb-1.5 tabular-nums select-none">
                                        {(socialMediaLink ?? "").length}/2048
                                    </span>
                                </div>
                                <FieldContent>
                                    <Input
                                        variant="ringShadow"
                                        className="h-11 rounded-xl border border-border/60 bg-muted/20 px-3.5 hover:bg-muted/30 focus:bg-background focus:border-primary/80 transition-all duration-200 shadow-inner"
                                        type="url"
                                        maxLength={2048}
                                        placeholder="https://instagram.com/..."
                                        {...form.register("socialMediaLink")}
                                    />
                                    <FieldError errors={[form.formState.errors.socialMediaLink]} />
                                </FieldContent>
                            </Field>
                        </div>
                    </section>

                    <DialogFooter className="mt-4 min-w-0 border-t border-border/30">
                        <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl px-5 font-semibold text-muted-foreground hover:text-foreground transition-all duration-200"
                            onClick={() => handleOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="rounded-xl px-5 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold transition-all duration-200"
                            disabled={updateMutation.isPending}
                        >
                            {updateMutation.isPending ? "Saving..." : "Save changes"}
                        </Button>
                    </DialogFooter>
                </form>
                {AlertDialogComponent}
            </DialogContent>
        </Dialog>
    );
};

export default EditStoreDialog;
