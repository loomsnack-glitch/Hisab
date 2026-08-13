import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "react-router-dom";
import { deleteLabelTemplate, getLabelTemplates } from "@repo/services";
import type { LabelTemplateDTO } from "@repo/types";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogMedia,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@repo/ui/components/alert-dialog";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@repo/ui/components/empty";
import { Spinner } from "@repo/ui/components/spinner";
import { Pencil, PlusCircle, RefreshCw, Sticker, Trash2 } from "lucide-react";
import { toast } from "sonner";

import ProductStatusBadge from "@/components/catalog/product-status-badge";
import UpsertLabelTemplateDialog from "@/components/catalog/upsert-label-template-dialog";
import { catalogKeys } from "@/lib/query-keys";
import { PremiumTable, type ColumnDef } from "@repo/ui/components/premium-table";

const stockSummary = (template: LabelTemplateDTO) => {
    const { widthMm, heightMm, media } = template.stock;
    if (media === "sheet" && template.stock.sheet) {
        return `${widthMm} × ${heightMm} mm · A4 ${template.stock.sheet.columns} × ${template.stock.sheet.rows}`;
    }
    return `${widthMm} × ${heightMm} mm · roll`;
};

const DeleteLabelTemplateButton = ({
    organizationId,
    labelTemplate,
}: {
    organizationId: string;
    labelTemplate: LabelTemplateDTO;
}) => {
    const [open, setOpen] = useState(false);
    const queryClient = useQueryClient();

    const mutation = useMutation({
        mutationFn: () => deleteLabelTemplate(organizationId, labelTemplate.id),
        onSuccess: (response) => {
            if (response.status === "success") {
                toast.success(response.message);
                queryClient.invalidateQueries({
                    queryKey: catalogKeys.labelTemplates(organizationId),
                });
                setOpen(false);
                return;
            }

            toast.error(response.message);
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Failed to delete Label Template");
        },
    });

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger
                render={
                    <Button variant="destructive" size="sm" className="rounded-full h-8 text-xs px-3">
                        <Trash2 className="size-3" />
                        Delete
                    </Button>
                }
            />
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogMedia>
                        <Trash2 />
                    </AlertDialogMedia>
                    <AlertDialogTitle>Delete Label Template</AlertDialogTitle>
                    <AlertDialogDescription>
                        <span className="font-medium text-foreground">{labelTemplate.name}</span> will be
                        removed. Deactivate it instead if you only want to hide it from print.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                    <AlertDialogAction
                        variant="destructive"
                        className="rounded-xl"
                        isLoading={mutation.isPending}
                        loadingText="Deleting..."
                        onClick={() => mutation.mutate()}
                    >
                        Delete Label Template
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
};

const LabelTemplatesPage = () => {
    const { organizationId = "" } = useParams();

    const templatesQuery = useQuery({
        queryKey: catalogKeys.labelTemplates(organizationId),
        queryFn: () => getLabelTemplates(organizationId),
        enabled: Boolean(organizationId),
    });

    const labelTemplates =
        templatesQuery.data?.status === "success"
            ? templatesQuery.data.data?.labelTemplates ?? []
            : [];

    const columns = useMemo<ColumnDef<LabelTemplateDTO>[]>(
        () => [
            {
                id: "name",
                header: "Label Template",
                accessor: (template) => (
                    <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Sticker className="size-3.5" />
                        </div>
                        <span className="font-medium text-foreground">{template.name}</span>
                    </div>
                ),
                sortable: true,
                getSortValue: (template) => template.name,
            },
            {
                id: "stock",
                header: "Label Stock",
                accessor: (template) => (
                    <span className="text-sm text-muted-foreground">{stockSummary(template)}</span>
                ),
                sortable: true,
                getSortValue: (template) => stockSummary(template),
            },
            {
                id: "status",
                header: "Status",
                accessor: (template) => <ProductStatusBadge status={template.status} />,
                sortable: true,
                getSortValue: (template) => template.status,
                filterOptions: [
                    { label: "Active", value: "active" },
                    { label: "Inactive", value: "inactive" },
                ],
                getFilterValue: (template) => template.status,
            },
        ],
        [],
    );

    const renderActions = (template: LabelTemplateDTO) => (
        <>
            <UpsertLabelTemplateDialog
                organizationId={organizationId}
                labelTemplate={template}
                trigger={
                    <Button variant="outline" size="sm" className="rounded-full">
                        <Pencil className="size-3" />
                        Edit
                    </Button>
                }
            />
            <DeleteLabelTemplateButton organizationId={organizationId} labelTemplate={template} />
        </>
    );

    if (templatesQuery.isPending) {
        return (
            <div className="flex min-h-[30vh] items-center justify-center">
                <Spinner className="size-6 text-primary" />
            </div>
        );
    }

    if (templatesQuery.isError || templatesQuery.data?.status === "error") {
        return (
            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardContent className="p-0">
                    <Empty className="rounded-2xl border-0">
                        <EmptyHeader>
                            <EmptyMedia variant="icon">
                                <RefreshCw />
                            </EmptyMedia>
                            <EmptyTitle>Unable to load Label Templates</EmptyTitle>
                            <EmptyDescription>
                                {(templatesQuery.error as { message?: string })?.message ??
                                    templatesQuery.data?.message ??
                                    "Label Templates could not be loaded right now."}
                            </EmptyDescription>
                        </EmptyHeader>
                        <EmptyContent>
                            <Button
                                variant="outline"
                                className="rounded-full"
                                onClick={() => templatesQuery.refetch()}
                            >
                                Try again
                            </Button>
                        </EmptyContent>
                    </Empty>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-4">
            {labelTemplates.length === 0 ? (
                <Card className="border-border/60 bg-card/80 shadow-md">
                    <CardContent className="pt-6">
                        <Empty className="rounded-2xl border border-dashed border-border bg-background/60 py-10">
                            <EmptyHeader>
                                <EmptyMedia variant="icon">
                                    <Sticker />
                                </EmptyMedia>
                                <EmptyTitle>No Label Templates yet</EmptyTitle>
                                <EmptyDescription>
                                    Create an A4 sheet or 58×40 mm thermal Label Template for this Organization.
                                </EmptyDescription>
                            </EmptyHeader>
                            <EmptyContent>
                                <UpsertLabelTemplateDialog organizationId={organizationId} />
                            </EmptyContent>
                        </Empty>
                    </CardContent>
                </Card>
            ) : (
                <PremiumTable
                    data={labelTemplates}
                    columns={columns}
                    actions={renderActions}
                    rowIdKey="id"
                    defaultPageSize={15}
                    searchPlaceholder="Search Label Templates..."
                    searchKeys={[(template) => template.name]}
                    infoText={`${labelTemplates.length} Label Template${labelTemplates.length === 1 ? "" : "s"}`}
                    toolbarActions={
                        <UpsertLabelTemplateDialog
                            organizationId={organizationId}
                            trigger={
                                <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90 h-9 text-xs px-4">
                                    <PlusCircle className="size-3.5" />
                                    Add Label Template
                                </Button>
                            }
                        />
                    }
                />
            )}
        </div>
    );
};

export default LabelTemplatesPage;
