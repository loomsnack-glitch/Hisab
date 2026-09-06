import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers3, Pencil, PlusCircle } from "lucide-react";
import {
    createCommercialFeature as createCommercialFeatureRequest,
    createCommercialFeatureSuccessor as createCommercialFeatureSuccessorRequest,
    discardCommercialFeatureRevision as discardCommercialFeatureRevisionRequest,
    getCommercialFeature as getCommercialFeatureRequest,
    listCommercialFeatures as listCommercialFeaturesRequest,
    publishCommercialFeatureRevision as publishCommercialFeatureRevisionRequest,
    retireCommercialFeatureRevision as retireCommercialFeatureRevisionRequest,
    updateCommercialFeatureDraft as updateCommercialFeatureDraftRequest,
} from "@repo/services";
import {
    CreateCommercialFeatureSchema,
    UpdateCommercialFeatureDraftSchema,
    type CommercialCatalogRevisionStatus,
    type CommercialFeatureListItemDTO,
    type CommercialFeatureListQueryJSON,
    type CommercialFeatureListStatusFilter,
    type CommercialFeatureRevisionDTO,
    type CreateCommercialFeatureJSON,
} from "@repo/types";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/table";
import { Textarea } from "@repo/ui/components/textarea";

import {
    CommercialCatalogActionConfirmDialog,
    CommercialCatalogDetailHeader,
    CommercialCatalogDetailRelations,
    CommercialCatalogDialogFooter,
    CommercialCatalogEditorDialog,
    CommercialCatalogListToolbar,
    CommercialCatalogRevisionHistorySheet,
    commercialCatalogAddButtonClass,
    commercialCatalogEditButtonClass,
    commercialCatalogNormalizeStatusSelection,
    commercialCatalogResolveInitialStatusSelection,
    commercialCatalogStatusBadge,
    commercialCatalogUnauthorizedCode,
    type CommercialCatalogActionKind,
} from "@/components/commercial-catalog-ui";
import {
    commercialCatalogNeedsDiscardedListFetch,
    commercialCatalogPrimaryListStatus,
    commercialCatalogStatusesFromSelection,
    filterCommercialCatalogListItems,
} from "@/lib/commercial-catalog-list-filters";
import {
    commercialCatalogFeaturesListPath,
    commercialFeaturePath,
    parseCommercialCatalogPath,
    parseCommercialCatalogSearch,
    type CommercialCatalogLocation,
} from "@/lib/commercial-catalog-url";

const featuresQueryKey = ["platform-owner", "commercial-catalog", "features"] as const;
const featureQueryKey = (featureId: string) => ["platform-owner", "commercial-catalog", "feature", featureId] as const;

const resolveFeaturesLocation = (pathname: string): CommercialCatalogLocation => {
    const parsed = parseCommercialCatalogPath(pathname);
    return parsed.kind === "feature" ? parsed : { kind: "features" };
};

type PendingAction = {
    kind: CommercialCatalogActionKind;
    revision: CommercialFeatureRevisionDTO;
};

type CommercialCatalogFeaturesPageProps = {
    listCommercialFeatures?: typeof listCommercialFeaturesRequest;
    getCommercialFeature?: typeof getCommercialFeatureRequest;
    createCommercialFeature?: typeof createCommercialFeatureRequest;
    updateCommercialFeatureDraft?: typeof updateCommercialFeatureDraftRequest;
    publishCommercialFeatureRevision?: typeof publishCommercialFeatureRevisionRequest;
    retireCommercialFeatureRevision?: typeof retireCommercialFeatureRevisionRequest;
    discardCommercialFeatureRevision?: typeof discardCommercialFeatureRevisionRequest;
    createCommercialFeatureSuccessor?: typeof createCommercialFeatureSuccessorRequest;
    initialSearch?: string;
    initialStatus?: CommercialFeatureListStatusFilter;
    initialStatuses?: CommercialCatalogRevisionStatus[];
    initialCreateValues?: CreateCommercialFeatureJSON;
    onUnauthorized?: () => Promise<void>;
};

const CommercialCatalogFeaturesPage = ({
    listCommercialFeatures = listCommercialFeaturesRequest,
    getCommercialFeature = getCommercialFeatureRequest,
    createCommercialFeature = createCommercialFeatureRequest,
    updateCommercialFeatureDraft = updateCommercialFeatureDraftRequest,
    publishCommercialFeatureRevision = publishCommercialFeatureRevisionRequest,
    retireCommercialFeatureRevision = retireCommercialFeatureRevisionRequest,
    discardCommercialFeatureRevision = discardCommercialFeatureRevisionRequest,
    createCommercialFeatureSuccessor = createCommercialFeatureSuccessorRequest,
    initialSearch,
    initialStatus,
    initialStatuses,
    initialCreateValues,
    onUnauthorized,
}: CommercialCatalogFeaturesPageProps) => {
    const queryClient = useQueryClient();
    const [location, setLocation] = useState<CommercialCatalogLocation>(() =>
        typeof window === "undefined" ? { kind: "features" } : resolveFeaturesLocation(window.location.pathname),
    );
    const initialFilters = typeof window === "undefined"
        ? { search: initialSearch, statuses: initialStatuses }
        : parseCommercialCatalogSearch(window.location.search);
    const [search, setSearch] = useState(initialSearch ?? initialFilters.search ?? "");
    const [statusSelection, setStatusSelection] = useState<Set<string>>(() =>
        commercialCatalogResolveInitialStatusSelection({
            initialStatus,
            initialStatuses,
            urlStatuses: initialFilters.statuses,
        }),
    );
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingFeature, setEditingFeature] = useState<CommercialFeatureListItemDTO | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const selectedStatuses = commercialCatalogStatusesFromSelection(statusSelection);
    const selectedStatusKey = selectedStatuses.join(",");
    const listQuery: CommercialFeatureListQueryJSON = {
        ...(search.trim() ? { search: search.trim() } : {}),
        status: commercialCatalogPrimaryListStatus(statusSelection),
    };

    useEffect(() => {
        const syncLocation = () => {
            setLocation(resolveFeaturesLocation(window.location.pathname));
            if (resolveFeaturesLocation(window.location.pathname).kind !== "features") return;
            const filters = parseCommercialCatalogSearch(window.location.search);
            setSearch(filters.search ?? "");
            setStatusSelection(commercialCatalogResolveInitialStatusSelection({ urlStatuses: filters.statuses }));
        };
        window.addEventListener("popstate", syncLocation);
        return () => window.removeEventListener("popstate", syncLocation);
    }, []);

    useEffect(() => {
        if (location.kind !== "features") return;
        const path = commercialCatalogFeaturesListPath({
            search: search.trim() || undefined,
            statuses: selectedStatuses,
        });
        const current = `${window.location.pathname}${window.location.search}`;
        if (current !== path) window.history.replaceState(null, "", path);
    }, [location.kind, search, selectedStatusKey]);

    const openList = () => {
        const path = commercialCatalogFeaturesListPath({
            search: search.trim() || undefined,
            statuses: selectedStatuses,
        });
        if (`${window.location.pathname}${window.location.search}` !== path) {
            window.history.pushState(null, "", path);
            window.dispatchEvent(new Event("popstate"));
        }
        setLocation({ kind: "features" });
    };

    const openFeature = (featureId: string) => {
        const path = commercialFeaturePath(featureId);
        if (window.location.pathname !== path) {
            window.history.pushState(null, "", path);
            window.dispatchEvent(new Event("popstate"));
        }
        setLocation({ kind: "feature", featureId });
    };

    const featuresQuery = useQuery({
        queryKey: [...featuresQueryKey, listQuery, selectedStatusKey],
        queryFn: async () => {
            const response = await listCommercialFeatures(listQuery);
            if (response.status !== "success") return response;
            let features = response.data?.features ?? [];
            if (commercialCatalogNeedsDiscardedListFetch(statusSelection)) {
                const discardedResponse = await listCommercialFeatures({
                    ...(search.trim() ? { search: search.trim() } : {}),
                    status: "discarded",
                });
                if (discardedResponse.status === "success") {
                    const seen = new Set(features.map((feature) => feature.id));
                    for (const feature of discardedResponse.data?.features ?? []) {
                        if (!seen.has(feature.id)) features.push(feature);
                    }
                }
            }
            return {
                ...response,
                data: {
                    ...response.data,
                    features: filterCommercialCatalogListItems(features, statusSelection),
                },
            };
        },
        retry: false,
        enabled: location.kind === "features",
    });
    const features = featuresQuery.data?.status === "success" ? featuresQuery.data.data?.features ?? [] : [];
    const listErrorCode = commercialCatalogUnauthorizedCode(featuresQuery.error, featuresQuery.data);

    useEffect(() => {
        if (listErrorCode === 401) void onUnauthorized?.();
    }, [listErrorCode, onUnauthorized]);

    const closeEditor = () => {
        setShowCreateForm(false);
        setEditingFeature(null);
        setFormError(null);
    };

    const createMutation = useMutation({
        mutationFn: createCommercialFeature,
        onMutate: () => setFormError(null),
        onSuccess: async (response) => {
            if (response.status === "error") {
                if (response.code === 401) await onUnauthorized?.();
                setFormError(response.message);
                return;
            }
            const featureId = response.data?.feature.id;
            closeEditor();
            await queryClient.invalidateQueries({ queryKey: featuresQueryKey });
            if (featureId) openFeature(featureId);
        },
        onError: (error: { message?: string; code?: number }) => {
            if (error.code === 401) void onUnauthorized?.();
            setFormError(error.message ?? "Draft Feature was not created");
        },
    });

    const updateMutation = useMutation({
        mutationFn: (input: CreateCommercialFeatureJSON) =>
            updateCommercialFeatureDraft(editingFeature!.id, editingFeature!.currentRevisionId, {
                displayName: input.displayName,
                description: input.description ?? "",
            }),
        onMutate: () => setFormError(null),
        onSuccess: async (response) => {
            if (response.status === "error") {
                if (response.code === 401) await onUnauthorized?.();
                setFormError(response.message);
                return;
            }
            closeEditor();
            await queryClient.invalidateQueries({ queryKey: featuresQueryKey });
        },
        onError: (error: { message?: string; code?: number }) => {
            if (error.code === 401) void onUnauthorized?.();
            setFormError(error.message ?? "Draft Feature was not updated");
        },
    });

    if (location.kind === "feature") {
        return (
            <FeatureDetail
                featureId={location.featureId}
                getCommercialFeature={getCommercialFeature}
                updateCommercialFeatureDraft={updateCommercialFeatureDraft}
                publishCommercialFeatureRevision={publishCommercialFeatureRevision}
                retireCommercialFeatureRevision={retireCommercialFeatureRevision}
                discardCommercialFeatureRevision={discardCommercialFeatureRevision}
                createCommercialFeatureSuccessor={createCommercialFeatureSuccessor}
                onBack={openList}
                onUnauthorized={onUnauthorized}
            />
        );
    }

    return (
        <section className="space-y-5">
            <CommercialCatalogListToolbar
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search features..."
                searchAriaLabel="Search Features by name or key"
                statusSelection={statusSelection}
                onStatusSelectionChange={(values) => setStatusSelection(commercialCatalogNormalizeStatusSelection(values))}
                countLabel={featuresQuery.isSuccess ? `${features.length} feature${features.length === 1 ? "" : "s"}` : undefined}
                addButton={
                    <Button
                        type="button"
                        className={commercialCatalogAddButtonClass}
                        onClick={() => { setShowCreateForm(true); setFormError(null); }}
                    >
                        <PlusCircle className="size-3.5 sm:size-4" /> Add Feature
                    </Button>
                }
            />

            <CommercialCatalogEditorDialog
                open={showCreateForm || Boolean(editingFeature)}
                onOpenChange={(open) => { if (!open) closeEditor(); }}
                title={editingFeature ? "Edit Feature" : "Add Feature"}
                icon={<Layers3 className="size-5" />}
            >
                <FeatureEditor
                    key={editingFeature?.id ?? "create"}
                    lockedKey={editingFeature?.key}
                    initialValues={editingFeature
                        ? { key: editingFeature.key, displayName: editingFeature.displayName, description: editingFeature.description }
                        : initialCreateValues}
                    submitLabel={editingFeature ? "Save draft" : "Create Draft Feature"}
                    pendingLabel={editingFeature ? "Saving..." : "Creating..."}
                    errorTitle={editingFeature ? "Draft Feature was not updated" : "Draft Feature was not created"}
                    formError={formError}
                    isPending={editingFeature ? updateMutation.isPending : createMutation.isPending}
                    onCancel={closeEditor}
                    onSubmit={(values) => editingFeature ? updateMutation.mutate(values) : createMutation.mutate(values)}
                />
            </CommercialCatalogEditorDialog>

            {featuresQuery.isPending ? (
                <p aria-busy="true">Loading Features…</p>
            ) : featuresQuery.isError || featuresQuery.data?.status === "error" ? (
                <Alert variant="destructive" role="alert">
                    <AlertTitle>Features could not be loaded</AlertTitle>
                    <AlertDescription>
                        {(featuresQuery.error as { message?: string } | null)?.message
                            ?? featuresQuery.data?.message
                            ?? "The Feature list is unavailable."}
                    </AlertDescription>
                </Alert>
            ) : (
                <Card>
                    <CardContent className="p-0">
                        {features.length === 0 ? (
                            <p className="p-6 text-sm text-muted-foreground">No Features match this view.</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Display name</TableHead>
                                        <TableHead>Key</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Revision</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {features.map((feature) => (
                                        <TableRow
                                            key={feature.id}
                                            className="cursor-pointer"
                                            onClick={() => openFeature(feature.id)}
                                        >
                                            <TableCell>
                                                <button type="button" className="text-left font-medium" onClick={() => openFeature(feature.id)}>
                                                    {feature.displayName}
                                                </button>
                                            </TableCell>
                                            <TableCell><code>{feature.key}</code></TableCell>
                                            <TableCell>{commercialCatalogStatusBadge(feature.status)}</TableCell>
                                            <TableCell>{feature.revisionNumber}</TableCell>
                                            <TableCell className="text-right">
                                                {feature.status === "draft" ? (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className={commercialCatalogEditButtonClass}
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            setEditingFeature(feature);
                                                            setFormError(null);
                                                        }}
                                                    >
                                                        <Pencil className="size-3" />
                                                        Edit
                                                    </Button>
                                                ) : null}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            )}
        </section>
    );
};

type FeatureEditorProps = {
    lockedKey?: string;
    initialValues?: CreateCommercialFeatureJSON;
    submitLabel: string;
    pendingLabel: string;
    errorTitle: string;
    formError: string | null;
    isPending: boolean;
    onCancel: () => void;
    onSubmit: (values: CreateCommercialFeatureJSON) => void;
};

const FeatureEditor = ({
    lockedKey,
    initialValues,
    submitLabel,
    pendingLabel,
    errorTitle,
    formError,
    isPending,
    onCancel,
    onSubmit,
}: FeatureEditorProps) => {
    const [key, setKey] = useState(initialValues?.key ?? "");
    const [displayName, setDisplayName] = useState(initialValues?.displayName ?? "");
    const [description, setDescription] = useState(initialValues?.description ?? "");
    const [localError, setLocalError] = useState<string | null>(null);

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const payload = { key: lockedKey ?? key, displayName, description };
        const parsed = (lockedKey ? UpdateCommercialFeatureDraftSchema : CreateCommercialFeatureSchema).safeParse(
            lockedKey ? { displayName, description } : payload,
        );
        if (!parsed.success) {
            setLocalError(parsed.error.issues[0]?.message ?? "Check the Feature details");
            return;
        }
        setLocalError(null);
        onSubmit(payload);
    };

    return (
        <form className="grid gap-4 pt-2" onSubmit={submit}>
            <label className="block space-y-2 text-sm font-medium">
                Key
                <Input
                    value={lockedKey ?? key}
                    onChange={(event) => setKey(event.target.value)}
                    readOnly={Boolean(lockedKey)}
                    autoComplete="off"
                    className="h-11 rounded-xl"
                    placeholder="billing"
                />
            </label>
            <label className="block space-y-2 text-sm font-medium">
                Display name
                <Input
                    value={displayName}
                    onChange={(event) => setDisplayName(event.target.value)}
                    className="h-11 rounded-xl"
                    placeholder="Billing"
                />
            </label>
            <label className="block space-y-2 text-sm font-medium">
                Description
                <Textarea
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="min-h-24 rounded-xl"
                />
            </label>
            {localError || formError ? (
                <Alert variant="destructive" role="alert">
                    <AlertTitle>{errorTitle}</AlertTitle>
                    <AlertDescription>{localError ?? formError}</AlertDescription>
                </Alert>
            ) : null}
            <CommercialCatalogDialogFooter>
                <Button type="button" variant="outline" className="rounded-xl" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" className="rounded-xl" disabled={isPending}>
                    {isPending ? pendingLabel : submitLabel}
                </Button>
            </CommercialCatalogDialogFooter>
        </form>
    );
};

type FeatureDetailProps = {
    featureId: string;
    getCommercialFeature: typeof getCommercialFeatureRequest;
    updateCommercialFeatureDraft: typeof updateCommercialFeatureDraftRequest;
    publishCommercialFeatureRevision: typeof publishCommercialFeatureRevisionRequest;
    retireCommercialFeatureRevision: typeof retireCommercialFeatureRevisionRequest;
    discardCommercialFeatureRevision: typeof discardCommercialFeatureRevisionRequest;
    createCommercialFeatureSuccessor: typeof createCommercialFeatureSuccessorRequest;
    onBack: () => void;
    onUnauthorized?: () => Promise<void>;
};

const FeatureDetail = ({
    featureId,
    getCommercialFeature,
    updateCommercialFeatureDraft,
    publishCommercialFeatureRevision,
    retireCommercialFeatureRevision,
    discardCommercialFeatureRevision,
    createCommercialFeatureSuccessor,
    onBack,
    onUnauthorized,
}: FeatureDetailProps) => {
    const queryClient = useQueryClient();
    const [showEdit, setShowEdit] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

    const featureQuery = useQuery({
        queryKey: featureQueryKey(featureId),
        queryFn: () => getCommercialFeature(featureId),
        retry: false,
    });
    const feature = featureQuery.data?.status === "success" ? featureQuery.data.data?.feature : undefined;
    const current = feature?.currentRevision;
    const detailErrorCode = commercialCatalogUnauthorizedCode(featureQuery.error, featureQuery.data);

    useEffect(() => {
        if (detailErrorCode === 401) void onUnauthorized?.();
    }, [detailErrorCode, onUnauthorized]);

    const invalidate = async () => {
        await queryClient.invalidateQueries({ queryKey: featureQueryKey(featureId) });
        await queryClient.invalidateQueries({ queryKey: featuresQueryKey });
    };

    const updateMutation = useMutation({
        mutationFn: (input: CreateCommercialFeatureJSON) =>
            updateCommercialFeatureDraft(featureId, current!.id, {
                displayName: input.displayName,
                description: input.description ?? "",
            }),
        onMutate: () => setFormError(null),
        onSuccess: async (response) => {
            if (response.status === "error") {
                if (response.code === 401) await onUnauthorized?.();
                setFormError(response.message);
                return;
            }
            setShowEdit(false);
            await invalidate();
        },
        onError: (error: { message?: string; code?: number }) => {
            if (error.code === 401) void onUnauthorized?.();
            setFormError(error.message ?? "Draft Feature was not updated");
        },
    });

    const actionMutation = useMutation({
        mutationFn: async (action: PendingAction) => {
            if (action.kind === "publish") return publishCommercialFeatureRevision(featureId, action.revision.id);
            if (action.kind === "retire") return retireCommercialFeatureRevision(featureId, action.revision.id);
            if (action.kind === "discard") return discardCommercialFeatureRevision(featureId, action.revision.id);
            return createCommercialFeatureSuccessor(featureId, action.revision.id);
        },
        onMutate: () => setActionError(null),
        onSuccess: async (response) => {
            if (response.status === "error") {
                if (response.code === 401) await onUnauthorized?.();
                setActionError(response.message);
                return;
            }
            setPendingAction(null);
            setShowEdit(false);
            await invalidate();
        },
        onError: (error: { message?: string; code?: number }) => {
            if (error.code === 401) void onUnauthorized?.();
            setActionError(error.message ?? "The Feature revision was not updated");
        },
    });

    if (featureQuery.isPending) {
        return <p aria-busy="true">Loading Feature…</p>;
    }
    if (!feature || !current || featureQuery.isError || featureQuery.data?.status === "error") {
        return (
            <section className="space-y-4">
                <Button type="button" variant="ghost" onClick={onBack}>
                    Back to Features
                </Button>
                <Alert variant="destructive" role="alert">
                    <AlertTitle>Feature could not be loaded</AlertTitle>
                    <AlertDescription>
                        {(featureQuery.error as { message?: string } | null)?.message
                            ?? featureQuery.data?.message
                            ?? "This Feature is unavailable."}
                    </AlertDescription>
                </Alert>
            </section>
        );
    }

    const isDraft = current.status === "draft";
    const canSuccessor = current.status === "active" || current.status === "retired";

    return (
        <section className="space-y-6">
            <CommercialCatalogDetailHeader
                backLabel="Back to Features"
                onBack={onBack}
                title={current.displayName}
                catalogKey={feature.key}
                revisionNumber={current.revisionNumber}
                status={current.status}
                description={current.description}
                actions={
                    <>
                        <CommercialCatalogRevisionHistorySheet revisions={feature.revisions} />
                        {isDraft ? (
                            <Button
                                type="button"
                                variant="outline"
                                className={commercialCatalogEditButtonClass}
                                onClick={() => { setShowEdit(true); setFormError(null); }}
                            >
                                <Pencil className="size-3.5" />
                                Edit
                            </Button>
                        ) : null}
                        {isDraft ? (
                            <Button type="button" className="rounded-full" onClick={() => setPendingAction({ kind: "publish", revision: current })}>
                                Publish
                            </Button>
                        ) : null}
                        {current.status === "active" ? (
                            <Button type="button" variant="outline" className="rounded-full" onClick={() => setPendingAction({ kind: "retire", revision: current })}>
                                Retire
                            </Button>
                        ) : null}
                        {canSuccessor ? (
                            <Button type="button" className="rounded-full" onClick={() => setPendingAction({ kind: "successor", revision: current })}>
                                Create successor revision
                            </Button>
                        ) : null}
                        {isDraft ? (
                            <Button type="button" variant="outline" className="rounded-full text-destructive hover:text-destructive" onClick={() => setPendingAction({ kind: "discard", revision: current })}>
                                Discard draft
                            </Button>
                        ) : null}
                    </>
                }
            />

            <CommercialCatalogActionConfirmDialog
                open={Boolean(pendingAction)}
                onOpenChange={(open) => {
                    if (!open) {
                        setPendingAction(null);
                        setActionError(null);
                    }
                }}
                action={pendingAction?.kind ?? null}
                error={actionError}
                isPending={actionMutation.isPending}
                errorTitle="The Feature revision was not updated"
                onConfirm={() => {
                    if (pendingAction) actionMutation.mutate(pendingAction);
                }}
            />

            <CommercialCatalogEditorDialog
                open={showEdit}
                onOpenChange={(open) => { if (!open) { setShowEdit(false); setFormError(null); } }}
                title="Edit Feature"
                icon={<Layers3 className="size-5" />}
            >
                <FeatureEditor
                    key={current.id}
                    lockedKey={feature.key}
                    initialValues={{
                        key: feature.key,
                        displayName: current.displayName,
                        description: current.description,
                    }}
                    submitLabel="Save draft"
                    pendingLabel="Saving..."
                    errorTitle="Draft Feature was not updated"
                    formError={formError}
                    isPending={updateMutation.isPending}
                    onCancel={() => { setShowEdit(false); setFormError(null); }}
                    onSubmit={(values) => updateMutation.mutate(values)}
                />
            </CommercialCatalogEditorDialog>

            <CommercialCatalogDetailRelations
                sections={[
                    {
                        title: "Referencing Modules",
                        items: feature.referencingModules.map((moduleItem) => ({
                            id: moduleItem.revisionId,
                            label: moduleItem.displayName,
                            hint: moduleItem.key,
                        })),
                        empty: "No Modules currently include this Feature.",
                    },
                    {
                        title: "Affected Plans",
                        items: feature.affectedPlans.map((planItem) => ({
                            id: planItem.revisionId,
                            label: planItem.displayName,
                            hint: planItem.key,
                        })),
                        empty: "No Plans currently include this Feature.",
                    },
                ]}
            />
        </section>
    );
};

export default CommercialCatalogFeaturesPage;
export type { CommercialCatalogFeaturesPageProps };
