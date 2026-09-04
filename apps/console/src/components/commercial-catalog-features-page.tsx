import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, PackagePlus, Search } from "lucide-react";
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
    PLATFORM_REPORTING_TIMEZONE,
    UpdateCommercialFeatureDraftSchema,
    type CommercialCatalogRevisionStatus,
    type CommercialFeatureListQueryJSON,
    type CommercialFeatureListStatusFilter,
    type CommercialFeatureRevisionDTO,
    type CreateCommercialFeatureJSON,
} from "@repo/types";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { DataTableFacetedFilter } from "@repo/ui/components/data-table-faceted-filter";
import { Input } from "@repo/ui/components/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/table";
import { Textarea } from "@repo/ui/components/textarea";

import {
    commercialCatalogListPath,
    commercialFeaturePath,
    parseCommercialCatalogPath,
    parseCommercialCatalogSearch,
    type CommercialCatalogLocation,
} from "@/lib/commercial-catalog-url";

const featuresQueryKey = ["platform-owner", "commercial-catalog", "features"] as const;
const featureQueryKey = (featureId: string) => ["platform-owner", "commercial-catalog", "feature", featureId] as const;

const statusLabels: Record<CommercialCatalogRevisionStatus, string> = {
    draft: "Draft",
    active: "Active",
    retired: "Retired",
    discarded: "Discarded",
};

const statusFilterOptions = [
    { value: "draft", label: "Draft" },
    { value: "active", label: "Active" },
    { value: "retired", label: "Retired" },
    { value: "discarded", label: "Discarded" },
] as const;

type PendingAction = {
    kind: "publish" | "retire" | "discard" | "successor";
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
    initialCreateValues?: CreateCommercialFeatureJSON;
    onUnauthorized?: () => Promise<void>;
};

const statusFromSelection = (selection: Set<string>): CommercialFeatureListStatusFilter => {
    if (selection.size === 1) {
        const [value] = [...selection];
        if (value === "draft" || value === "active" || value === "retired" || value === "discarded") {
            return value;
        }
    }
    return "all";
};

const formatAuditTime = (value: string | Date | null) => {
    if (!value) return null;
    return new Intl.DateTimeFormat("en-IN", {
        timeZone: PLATFORM_REPORTING_TIMEZONE,
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
};

const actorName = (actor: { firstName: string; lastName: string } | null) =>
    actor ? `${actor.firstName} ${actor.lastName}` : null;

const statusBadge = (status: CommercialCatalogRevisionStatus) => (
    <Badge variant={status === "active" ? "secondary" : "outline"}>{statusLabels[status]}</Badge>
);

const unauthorizedCode = (error: unknown, response?: { status?: string; code?: number }) =>
    (error as { code?: number } | null)?.code
    ?? (response?.status === "error" ? response.code : undefined);

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
    initialCreateValues,
    onUnauthorized,
}: CommercialCatalogFeaturesPageProps) => {
    const queryClient = useQueryClient();
    const [location, setLocation] = useState<CommercialCatalogLocation>(() =>
        typeof window === "undefined" ? { kind: "features" } : parseCommercialCatalogPath(window.location.pathname),
    );
    const initialFilters = typeof window === "undefined"
        ? { search: initialSearch, status: initialStatus }
        : parseCommercialCatalogSearch(window.location.search);
    const [search, setSearch] = useState(initialSearch ?? initialFilters.search ?? "");
    const [statusSelection, setStatusSelection] = useState<Set<string>>(() => {
        const status = initialStatus ?? initialFilters.status ?? "all";
        return status === "all" ? new Set() : new Set([status]);
    });
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [key, setKey] = useState(initialCreateValues?.key ?? "");
    const [displayName, setDisplayName] = useState(initialCreateValues?.displayName ?? "");
    const [description, setDescription] = useState(initialCreateValues?.description ?? "");
    const [formError, setFormError] = useState<string | null>(null);
    const status = statusFromSelection(statusSelection);
    const listQuery: CommercialFeatureListQueryJSON = {
        ...(search.trim() ? { search: search.trim() } : {}),
        status,
    };

    useEffect(() => {
        const syncLocation = () => setLocation(parseCommercialCatalogPath(window.location.pathname));
        window.addEventListener("popstate", syncLocation);
        return () => window.removeEventListener("popstate", syncLocation);
    }, []);

    const openList = () => {
        const path = commercialCatalogListPath({ search: search.trim() || undefined, status });
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
        queryKey: [...featuresQueryKey, listQuery],
        queryFn: () => listCommercialFeatures(listQuery),
        retry: false,
        enabled: location.kind === "features",
    });
    const features = featuresQuery.data?.status === "success" ? featuresQuery.data.data?.features ?? [] : [];
    const listErrorCode = unauthorizedCode(featuresQuery.error, featuresQuery.data);

    useEffect(() => {
        if (listErrorCode === 401) void onUnauthorized?.();
    }, [listErrorCode, onUnauthorized]);

    const resetCreateForm = () => {
        setKey(initialCreateValues?.key ?? "");
        setDisplayName(initialCreateValues?.displayName ?? "");
        setDescription(initialCreateValues?.description ?? "");
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
            resetCreateForm();
            setShowCreateForm(false);
            await queryClient.invalidateQueries({ queryKey: featuresQueryKey });
            if (featureId) openFeature(featureId);
        },
        onError: (error: { message?: string; code?: number }) => {
            if (error.code === 401) void onUnauthorized?.();
            setFormError(error.message ?? "Draft Feature was not created");
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

    const submitCreate = (event: FormEvent) => {
        event.preventDefault();
        const parsed = CreateCommercialFeatureSchema.safeParse({ key, displayName, description });
        if (!parsed.success) {
            setFormError(parsed.error.issues[0]?.message ?? "Check the Feature details");
            return;
        }
        createMutation.mutate({ key, displayName, description });
    };

    return (
        <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Commercial Catalog</p>
                    <h1 className="text-3xl font-semibold tracking-tight">Features</h1>
                    <p className="text-muted-foreground">
                        Manage platform capabilities. A Feature is packaged through Modules later and is never sold directly.
                    </p>
                </div>
                <Button type="button" onClick={() => { setShowCreateForm(true); setFormError(null); }}>
                    <PackagePlus className="size-4" /> Add Feature
                </Button>
            </div>

            {showCreateForm ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Create Draft Feature</CardTitle>
                        <CardDescription>
                            The Commercial Catalog Key is lowercase and immutable. Display name and description can change in later Draft revisions.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form className="grid gap-4" onSubmit={submitCreate}>
                            <label className="block space-y-2 text-sm font-medium">
                                Key
                                <Input value={key} onChange={(event) => setKey(event.target.value)} autoComplete="off" />
                            </label>
                            <label className="block space-y-2 text-sm font-medium">
                                Display name
                                <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
                            </label>
                            <label className="block space-y-2 text-sm font-medium">
                                Description
                                <Textarea value={description} onChange={(event) => setDescription(event.target.value)} />
                            </label>
                            {formError ? (
                                <Alert variant="destructive" role="alert">
                                    <AlertTitle>Draft Feature was not created</AlertTitle>
                                    <AlertDescription>{formError}</AlertDescription>
                                </Alert>
                            ) : null}
                            <div className="flex gap-2">
                                <Button type="submit" disabled={createMutation.isPending}>
                                    {createMutation.isPending ? "Creating..." : "Create Draft Feature"}
                                </Button>
                                <Button type="button" variant="outline" onClick={() => { setShowCreateForm(false); resetCreateForm(); }}>
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[16rem] flex-1">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search Features by name or key"
                        aria-label="Search Features by name or key"
                        className="pl-9"
                    />
                </div>
                <DataTableFacetedFilter
                    title="Status"
                    options={statusFilterOptions}
                    selectedValues={statusSelection}
                    onSelectedValuesChange={setStatusSelection}
                />
            </div>

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
                    <CardHeader>
                        <CardTitle>Feature catalog</CardTitle>
                        <CardDescription>Each Feature shows its current revision, status, and immutable key.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {features.length === 0 ? (
                            <p>No Features match this view.</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Display name</TableHead>
                                        <TableHead>Key</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Revision</TableHead>
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
                                            <TableCell>{statusBadge(feature.status)}</TableCell>
                                            <TableCell>{feature.revisionNumber}</TableCell>
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
    const [displayName, setDisplayName] = useState("");
    const [description, setDescription] = useState("");
    const [formError, setFormError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
    const [hydratedRevisionId, setHydratedRevisionId] = useState<string | null>(null);

    const featureQuery = useQuery({
        queryKey: featureQueryKey(featureId),
        queryFn: () => getCommercialFeature(featureId),
        retry: false,
    });
    const feature = featureQuery.data?.status === "success" ? featureQuery.data.data?.feature : undefined;
    const current = feature?.currentRevision;
    const detailErrorCode = unauthorizedCode(featureQuery.error, featureQuery.data);

    useEffect(() => {
        if (detailErrorCode === 401) void onUnauthorized?.();
    }, [detailErrorCode, onUnauthorized]);

    useEffect(() => {
        if (current && current.id !== hydratedRevisionId) {
            setDisplayName(current.displayName);
            setDescription(current.description);
            setHydratedRevisionId(current.id);
            setFormError(null);
        }
    }, [current, hydratedRevisionId]);

    const invalidate = async () => {
        await queryClient.invalidateQueries({ queryKey: featureQueryKey(featureId) });
        await queryClient.invalidateQueries({ queryKey: featuresQueryKey });
    };

    const updateMutation = useMutation({
        mutationFn: (input: { displayName: string; description: string }) =>
            updateCommercialFeatureDraft(featureId, current!.id, input),
        onMutate: () => setFormError(null),
        onSuccess: async (response) => {
            if (response.status === "error") {
                if (response.code === 401) await onUnauthorized?.();
                setFormError(response.message);
                return;
            }
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
            setHydratedRevisionId(null);
            await invalidate();
        },
        onError: (error: { message?: string; code?: number }) => {
            if (error.code === 401) void onUnauthorized?.();
            setActionError(error.message ?? "The Feature revision was not updated");
        },
    });

    const submitDraft = (event: FormEvent) => {
        event.preventDefault();
        const parsed = UpdateCommercialFeatureDraftSchema.safeParse({ displayName, description });
        if (!parsed.success) {
            setFormError(parsed.error.issues[0]?.message ?? "Check the Feature details");
            return;
        }
        updateMutation.mutate(parsed.data);
    };

    const confirmCopy: Record<PendingAction["kind"], { title: string; body: string; confirm: string }> = {
        publish: {
            title: "Publish this Feature revision?",
            body: "Publishing makes this revision Active and immutable. If another revision is Active, it will be Retired.",
            confirm: "Publish revision",
        },
        retire: {
            title: "Retire this Feature revision?",
            body: "The Active revision will become unavailable for future catalog composition. Its history stays retained.",
            confirm: "Retire revision",
        },
        discard: {
            title: "Discard this Draft Feature?",
            body: "The unused Draft will leave the working catalog. Its Commercial Catalog Key cannot be reused.",
            confirm: "Confirm discard",
        },
        successor: {
            title: "Create a successor Draft revision?",
            body: "The current revision stays unchanged until the successor Draft is published.",
            confirm: "Confirm successor revision",
        },
    };

    if (featureQuery.isPending) {
        return <p aria-busy="true">Loading Feature…</p>;
    }
    if (!feature || !current || featureQuery.isError || featureQuery.data?.status === "error") {
        return (
            <section className="space-y-4">
                <Button type="button" variant="ghost" onClick={onBack}>
                    <ChevronLeft className="size-4" /> Back to Features
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
            <div className="space-y-3">
                <Button type="button" variant="ghost" onClick={onBack}>
                    <ChevronLeft className="size-4" /> Back to Features
                </Button>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Commercial Catalog · Features</p>
                        <h1 className="text-3xl font-semibold tracking-tight">{current.displayName}</h1>
                        <p className="text-muted-foreground">
                            Key <code>{feature.key}</code> · Revision {current.revisionNumber}
                        </p>
                    </div>
                    {statusBadge(current.status)}
                </div>
            </div>

            {pendingAction ? (
                <div role="alertdialog" aria-labelledby="feature-action-title" className="rounded-xl border bg-card p-4 shadow-sm">
                    <h2 id="feature-action-title" className="text-lg font-semibold">{confirmCopy[pendingAction.kind].title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{confirmCopy[pendingAction.kind].body}</p>
                    {actionError ? (
                        <Alert variant="destructive" className="mt-3" role="alert">
                            <AlertTitle>The Feature revision was not updated</AlertTitle>
                            <AlertDescription>{actionError}</AlertDescription>
                        </Alert>
                    ) : null}
                    <div className="mt-4 flex gap-2">
                        <Button
                            type="button"
                            variant={pendingAction.kind === "discard" || pendingAction.kind === "retire" ? "destructive" : "default"}
                            disabled={actionMutation.isPending}
                            onClick={() => actionMutation.mutate(pendingAction)}
                        >
                            {actionMutation.isPending ? "Updating..." : confirmCopy[pendingAction.kind].confirm}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => { setPendingAction(null); setActionError(null); }}>
                            Cancel
                        </Button>
                    </div>
                </div>
            ) : null}

            <Card>
                <CardHeader>
                    <CardTitle>Current revision</CardTitle>
                    <CardDescription>
                        {isDraft
                            ? "Draft revisions can be edited, published, or discarded. The key cannot change."
                            : "Active and historical revisions are retained. Create a successor Draft to make a change."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isDraft ? (
                        <form className="grid gap-4" onSubmit={submitDraft}>
                            <label className="block space-y-2 text-sm font-medium">
                                Key
                                <Input value={feature.key} readOnly />
                            </label>
                            <label className="block space-y-2 text-sm font-medium">
                                Display name
                                <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
                            </label>
                            <label className="block space-y-2 text-sm font-medium">
                                Description
                                <Textarea value={description} onChange={(event) => setDescription(event.target.value)} />
                            </label>
                            {formError ? (
                                <Alert variant="destructive" role="alert">
                                    <AlertTitle>Draft Feature was not updated</AlertTitle>
                                    <AlertDescription>{formError}</AlertDescription>
                                </Alert>
                            ) : null}
                            <div className="flex flex-wrap gap-2">
                                <Button type="submit" disabled={updateMutation.isPending}>
                                    {updateMutation.isPending ? "Saving..." : "Save draft"}
                                </Button>
                                <Button type="button" onClick={() => setPendingAction({ kind: "publish", revision: current })}>
                                    Publish
                                </Button>
                                <Button type="button" variant="outline" onClick={() => setPendingAction({ kind: "discard", revision: current })}>
                                    Discard draft
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <div className="grid gap-4">
                            <p><span className="font-medium">Key:</span> <code>{feature.key}</code></p>
                            <p><span className="font-medium">Display name:</span> {current.displayName}</p>
                            <p><span className="font-medium">Description:</span> {current.description || "—"}</p>
                            <div className="flex flex-wrap gap-2">
                                {current.status === "active" ? (
                                    <Button type="button" variant="outline" onClick={() => setPendingAction({ kind: "retire", revision: current })}>
                                        Retire
                                    </Button>
                                ) : null}
                                {canSuccessor ? (
                                    <Button type="button" onClick={() => setPendingAction({ kind: "successor", revision: current })}>
                                        Create successor revision
                                    </Button>
                                ) : null}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Referencing Modules</CardTitle>
                    <CardDescription>Modules whose current revision includes this Feature.</CardDescription>
                </CardHeader>
                <CardContent>
                    {feature.referencingModules.length === 0 ? (
                        <p>No Modules currently include this Feature.</p>
                    ) : (
                        <ul className="space-y-2">
                            {feature.referencingModules.map((moduleItem) => (
                                <li key={moduleItem.revisionId}>
                                    {moduleItem.displayName} · <code>{moduleItem.key}</code> · revision {moduleItem.revisionNumber}
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Revision history</CardTitle>
                    <CardDescription>Who created, published, retired, or discarded each revision.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {feature.revisions.map((revision) => (
                        <article key={revision.id} className="rounded-xl border p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h3 className="font-medium">Revision {revision.revisionNumber}</h3>
                                {statusBadge(revision.status)}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{revision.displayName}</p>
                            <ul className="mt-3 space-y-1 text-sm">
                                <li>Created by {actorName(revision.createdBy)} on {formatAuditTime(revision.createdAt)}</li>
                                {revision.publishedBy && revision.publishedAt ? (
                                    <li>Published by {actorName(revision.publishedBy)} on {formatAuditTime(revision.publishedAt)}</li>
                                ) : null}
                                {revision.retiredBy && revision.retiredAt ? (
                                    <li>Retired by {actorName(revision.retiredBy)} on {formatAuditTime(revision.retiredAt)}</li>
                                ) : null}
                                {revision.discardedBy && revision.discardedAt ? (
                                    <li>Discarded by {actorName(revision.discardedBy)} on {formatAuditTime(revision.discardedAt)}</li>
                                ) : null}
                            </ul>
                        </article>
                    ))}
                </CardContent>
            </Card>
        </section>
    );
};

export default CommercialCatalogFeaturesPage;
export type { CommercialCatalogFeaturesPageProps };
