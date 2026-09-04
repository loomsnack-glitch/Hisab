import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, PackagePlus, Search } from "lucide-react";
import {
    createCommercialModule as createCommercialModuleRequest,
    createCommercialModuleSuccessor as createCommercialModuleSuccessorRequest,
    discardCommercialModuleRevision as discardCommercialModuleRevisionRequest,
    getCommercialModule as getCommercialModuleRequest,
    listCommercialFeatures as listCommercialFeaturesRequest,
    listCommercialModules as listCommercialModulesRequest,
    publishCommercialModuleRevision as publishCommercialModuleRevisionRequest,
    retireCommercialModuleRevision as retireCommercialModuleRevisionRequest,
    updateCommercialModuleDraft as updateCommercialModuleDraftRequest,
} from "@repo/services";
import {
    CreateCommercialModuleSchema,
    UpdateCommercialModuleDraftSchema,
    type CommercialCatalogTermUnit,
    type CommercialFeatureListItemDTO,
    type CommercialFeatureListStatusFilter,
    type CommercialModuleListQueryJSON,
    type CommercialModuleRevisionDTO,
    type CreateCommercialModuleJSON,
} from "@repo/types";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { DataTableFacetedFilter } from "@repo/ui/components/data-table-faceted-filter";
import { Input } from "@repo/ui/components/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/table";
import { Textarea } from "@repo/ui/components/textarea";

import {
    commercialCatalogKotTableNote,
    commercialCatalogActorName,
    commercialCatalogStatusBadge,
    commercialCatalogStatusFilterOptions,
    commercialCatalogUnauthorizedCode,
    formatCommercialCatalogAuditTime,
    formatCommercialCatalogInr,
    formatCommercialCatalogTerm,
} from "@/components/commercial-catalog-ui";
import {
    commercialCatalogModulesListPath,
    commercialModulePath,
    parseCommercialCatalogPath,
    parseCommercialCatalogSearch,
    type CommercialCatalogLocation,
} from "@/lib/commercial-catalog-url";

const modulesQueryKey = ["platform-owner", "commercial-catalog", "modules"] as const;
const moduleQueryKey = (moduleId: string) => ["platform-owner", "commercial-catalog", "module", moduleId] as const;
const pickerFeaturesQueryKey = ["platform-owner", "commercial-catalog", "features", "module-picker"] as const;

const resolveModulesLocation = (pathname: string): CommercialCatalogLocation => {
    const parsed = parseCommercialCatalogPath(pathname);
    return parsed.kind === "module" ? parsed : { kind: "modules" };
};

type PendingAction = {
    kind: "publish" | "retire" | "discard" | "successor";
    revision: CommercialModuleRevisionDTO;
};

type CommercialCatalogModulesPageProps = {
    listCommercialModules?: typeof listCommercialModulesRequest;
    getCommercialModule?: typeof getCommercialModuleRequest;
    createCommercialModule?: typeof createCommercialModuleRequest;
    updateCommercialModuleDraft?: typeof updateCommercialModuleDraftRequest;
    publishCommercialModuleRevision?: typeof publishCommercialModuleRevisionRequest;
    retireCommercialModuleRevision?: typeof retireCommercialModuleRevisionRequest;
    discardCommercialModuleRevision?: typeof discardCommercialModuleRevisionRequest;
    createCommercialModuleSuccessor?: typeof createCommercialModuleSuccessorRequest;
    listCommercialFeatures?: typeof listCommercialFeaturesRequest;
    initialSearch?: string;
    initialStatus?: CommercialFeatureListStatusFilter;
    initialCreateValues?: CreateCommercialModuleJSON;
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

const CommercialCatalogModulesPage = ({
    listCommercialModules = listCommercialModulesRequest,
    getCommercialModule = getCommercialModuleRequest,
    createCommercialModule = createCommercialModuleRequest,
    updateCommercialModuleDraft = updateCommercialModuleDraftRequest,
    publishCommercialModuleRevision = publishCommercialModuleRevisionRequest,
    retireCommercialModuleRevision = retireCommercialModuleRevisionRequest,
    discardCommercialModuleRevision = discardCommercialModuleRevisionRequest,
    createCommercialModuleSuccessor = createCommercialModuleSuccessorRequest,
    listCommercialFeatures = listCommercialFeaturesRequest,
    initialSearch,
    initialStatus,
    initialCreateValues,
    onUnauthorized,
}: CommercialCatalogModulesPageProps) => {
    const queryClient = useQueryClient();
    const [location, setLocation] = useState<CommercialCatalogLocation>(() =>
        typeof window === "undefined" ? { kind: "modules" } : resolveModulesLocation(window.location.pathname),
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
    const [formError, setFormError] = useState<string | null>(null);
    const status = statusFromSelection(statusSelection);
    const listQuery: CommercialModuleListQueryJSON = {
        ...(search.trim() ? { search: search.trim() } : {}),
        status,
    };

    useEffect(() => {
        const syncLocation = () => setLocation(resolveModulesLocation(window.location.pathname));
        window.addEventListener("popstate", syncLocation);
        return () => window.removeEventListener("popstate", syncLocation);
    }, []);

    const openList = () => {
        const path = commercialCatalogModulesListPath({ search: search.trim() || undefined, status });
        if (`${window.location.pathname}${window.location.search}` !== path) {
            window.history.pushState(null, "", path);
            window.dispatchEvent(new Event("popstate"));
        }
        setLocation({ kind: "modules" });
    };

    const openModule = (moduleId: string) => {
        const path = commercialModulePath(moduleId);
        if (window.location.pathname !== path) {
            window.history.pushState(null, "", path);
            window.dispatchEvent(new Event("popstate"));
        }
        setLocation({ kind: "module", moduleId });
    };

    const modulesQuery = useQuery({
        queryKey: [...modulesQueryKey, listQuery],
        queryFn: () => listCommercialModules(listQuery),
        retry: false,
        enabled: location.kind === "modules",
    });
    const modules = modulesQuery.data?.status === "success" ? modulesQuery.data.data?.modules ?? [] : [];
    const listErrorCode = commercialCatalogUnauthorizedCode(modulesQuery.error, modulesQuery.data);

    useEffect(() => {
        if (listErrorCode === 401) void onUnauthorized?.();
    }, [listErrorCode, onUnauthorized]);

    const createMutation = useMutation({
        mutationFn: createCommercialModule,
        onMutate: () => setFormError(null),
        onSuccess: async (response) => {
            if (response.status === "error") {
                if (response.code === 401) await onUnauthorized?.();
                setFormError(response.message);
                return;
            }
            const moduleId = response.data?.module.id;
            setShowCreateForm(false);
            await queryClient.invalidateQueries({ queryKey: modulesQueryKey });
            if (moduleId) openModule(moduleId);
        },
        onError: (error: { message?: string; code?: number }) => {
            if (error.code === 401) void onUnauthorized?.();
            setFormError(error.message ?? "Draft Module was not created");
        },
    });

    if (location.kind === "module") {
        return (
            <ModuleDetail
                moduleId={location.moduleId}
                getCommercialModule={getCommercialModule}
                updateCommercialModuleDraft={updateCommercialModuleDraft}
                publishCommercialModuleRevision={publishCommercialModuleRevision}
                retireCommercialModuleRevision={retireCommercialModuleRevision}
                discardCommercialModuleRevision={discardCommercialModuleRevision}
                createCommercialModuleSuccessor={createCommercialModuleSuccessor}
                listCommercialFeatures={listCommercialFeatures}
                onBack={openList}
                onUnauthorized={onUnauthorized}
            />
        );
    }

    return (
        <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Commercial Catalog</p>
                    <h1 className="text-3xl font-semibold tracking-tight">Modules</h1>
                    <p className="text-muted-foreground">
                        Bundle Features into reusable workflow packages. A Feature may appear in multiple Modules, and a Module may later appear in multiple Plans.
                    </p>
                    <p className="text-sm text-muted-foreground">{commercialCatalogKotTableNote}</p>
                </div>
                <Button type="button" onClick={() => { setShowCreateForm(true); setFormError(null); }}>
                    <PackagePlus className="size-4" /> Add Module
                </Button>
            </div>

            {showCreateForm ? (
                <ModuleEditor
                    title="Create Draft Module"
                    featuresQueryFn={listCommercialFeatures}
                    initialValues={initialCreateValues}
                    submitLabel="Create Draft Module"
                    pendingLabel="Creating..."
                    errorTitle="Draft Module was not created"
                    formError={formError}
                    isPending={createMutation.isPending}
                    onCancel={() => { setShowCreateForm(false); setFormError(null); }}
                    onSubmit={(values) => createMutation.mutate(values)}
                />
            ) : null}

            <div className="flex flex-wrap items-center gap-3">
                <div className="relative min-w-[16rem] flex-1">
                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Search Modules by name or key"
                        aria-label="Search Modules by name or key"
                        className="pl-9"
                    />
                </div>
                <DataTableFacetedFilter
                    title="Status"
                    options={commercialCatalogStatusFilterOptions}
                    selectedValues={statusSelection}
                    onSelectedValuesChange={setStatusSelection}
                />
            </div>

            {modulesQuery.isPending ? (
                <p aria-busy="true">Loading Modules…</p>
            ) : modulesQuery.isError || modulesQuery.data?.status === "error" ? (
                <Alert variant="destructive" role="alert">
                    <AlertTitle>Modules could not be loaded</AlertTitle>
                    <AlertDescription>
                        {(modulesQuery.error as { message?: string } | null)?.message
                            ?? modulesQuery.data?.message
                            ?? "The Module list is unavailable."}
                    </AlertDescription>
                </Alert>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Module catalog</CardTitle>
                        <CardDescription>Each Module shows its current revision, Features, and whether it is separately purchasable.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {modules.length === 0 ? (
                            <p>No Modules match this view.</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Display name</TableHead>
                                        <TableHead>Key</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Revision</TableHead>
                                        <TableHead>Add-on</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {modules.map((moduleItem) => (
                                        <TableRow
                                            key={moduleItem.id}
                                            className="cursor-pointer"
                                            onClick={() => openModule(moduleItem.id)}
                                        >
                                            <TableCell>
                                                <button type="button" className="text-left font-medium" onClick={() => openModule(moduleItem.id)}>
                                                    {moduleItem.displayName}
                                                </button>
                                            </TableCell>
                                            <TableCell><code>{moduleItem.key}</code></TableCell>
                                            <TableCell>{commercialCatalogStatusBadge(moduleItem.status)}</TableCell>
                                            <TableCell>{moduleItem.revisionNumber}</TableCell>
                                            <TableCell>
                                                {moduleItem.isSeparatelyPurchasable
                                                    ? `${formatCommercialCatalogInr(moduleItem.priceInr)} / ${formatCommercialCatalogTerm(moduleItem.term)}`
                                                    : "Not separately purchasable"}
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

type ModuleEditorProps = {
    title: string;
    featuresQueryFn: typeof listCommercialFeaturesRequest;
    initialValues?: CreateCommercialModuleJSON;
    lockedKey?: string;
    submitLabel: string;
    pendingLabel: string;
    errorTitle: string;
    formError: string | null;
    isPending: boolean;
    onCancel?: () => void;
    onSubmit: (values: CreateCommercialModuleJSON) => void;
};

const ModuleEditor = ({
    title,
    featuresQueryFn,
    initialValues,
    lockedKey,
    submitLabel,
    pendingLabel,
    errorTitle,
    formError,
    isPending,
    onCancel,
    onSubmit,
}: ModuleEditorProps) => {
    const [key, setKey] = useState(initialValues?.key ?? "");
    const [displayName, setDisplayName] = useState(initialValues?.displayName ?? "");
    const [description, setDescription] = useState(initialValues?.description ?? "");
    const [selectedRevisionIds, setSelectedRevisionIds] = useState<Set<string>>(
        () => new Set(initialValues?.featureRevisionIds ?? []),
    );
    const [isSeparatelyPurchasable, setIsSeparatelyPurchasable] = useState(initialValues?.isSeparatelyPurchasable ?? false);
    const [priceInr, setPriceInr] = useState(initialValues?.priceInr != null ? String(initialValues.priceInr) : "");
    const [termCount, setTermCount] = useState(initialValues?.term?.count != null ? String(initialValues.term.count) : "1");
    const [termUnit, setTermUnit] = useState<CommercialCatalogTermUnit>(initialValues?.term?.unit ?? "year");
    const [localError, setLocalError] = useState<string | null>(null);

    const featuresQuery = useQuery({
        queryKey: pickerFeaturesQueryKey,
        queryFn: () => featuresQueryFn({ status: "all" }),
        retry: false,
    });
    const features = featuresQuery.data?.status === "success" ? featuresQuery.data.data?.features ?? [] : [];

    const toggleFeature = (feature: CommercialFeatureListItemDTO) => {
        const next = new Set(selectedRevisionIds);
        if (next.has(feature.currentRevisionId)) {
            next.delete(feature.currentRevisionId);
        } else {
            for (const item of features) {
                if (item.id === feature.id) next.delete(item.currentRevisionId);
            }
            next.add(feature.currentRevisionId);
        }
        setSelectedRevisionIds(next);
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const payload: CreateCommercialModuleJSON = {
            key: lockedKey ?? key,
            displayName,
            description,
            featureRevisionIds: [...selectedRevisionIds],
            isSeparatelyPurchasable,
            ...(isSeparatelyPurchasable
                ? {
                    priceInr: Number(priceInr),
                    term: { count: Number(termCount), unit: termUnit },
                }
                : {}),
        };
        const parsed = (lockedKey ? UpdateCommercialModuleDraftSchema : CreateCommercialModuleSchema).safeParse(
            lockedKey
                ? {
                    displayName: payload.displayName,
                    description: payload.description,
                    featureRevisionIds: payload.featureRevisionIds,
                    isSeparatelyPurchasable: payload.isSeparatelyPurchasable,
                    ...(isSeparatelyPurchasable ? { priceInr: payload.priceInr, term: payload.term } : {}),
                }
                : payload,
        );
        if (!parsed.success) {
            setLocalError(parsed.error.issues[0]?.message ?? "Check the Module details");
            return;
        }
        setLocalError(null);
        onSubmit(payload);
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>
                    Select one or more exact Feature revisions. You are responsible for composing a complete workflow; Ganatri Console does not check Feature dependencies. {commercialCatalogKotTableNote}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <form className="grid gap-4" onSubmit={submit}>
                    <label className="block space-y-2 text-sm font-medium">
                        Key
                        <Input value={lockedKey ?? key} onChange={(event) => setKey(event.target.value)} readOnly={Boolean(lockedKey)} autoComplete="off" />
                    </label>
                    <label className="block space-y-2 text-sm font-medium">
                        Display name
                        <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
                    </label>
                    <label className="block space-y-2 text-sm font-medium">
                        Description
                        <Textarea value={description} onChange={(event) => setDescription(event.target.value)} />
                    </label>
                    <fieldset className="space-y-2">
                        <legend className="text-sm font-medium">Feature revisions</legend>
                        {featuresQuery.isPending ? (
                            <p aria-busy="true">Loading Features…</p>
                        ) : features.length === 0 ? (
                            <p>No Features are available to include.</p>
                        ) : (
                            <ul className="space-y-2">
                                {features.map((feature) => (
                                    <li key={feature.id}>
                                        <label className="flex items-center gap-2 text-sm">
                                            <input
                                                type="checkbox"
                                                checked={selectedRevisionIds.has(feature.currentRevisionId)}
                                                onChange={() => toggleFeature(feature)}
                                                aria-label={`Include Feature ${feature.displayName}`}
                                            />
                                            <span>
                                                {feature.displayName} · <code>{feature.key}</code> · revision {feature.revisionNumber}
                                            </span>
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </fieldset>
                    <label className="flex items-center gap-2 text-sm font-medium">
                        <input
                            type="checkbox"
                            checked={isSeparatelyPurchasable}
                            onChange={(event) => setIsSeparatelyPurchasable(event.target.checked)}
                            aria-label="Separately purchasable"
                        />
                        Separately purchasable
                    </label>
                    {isSeparatelyPurchasable ? (
                        <div className="grid gap-4 sm:grid-cols-3">
                            <label className="block space-y-2 text-sm font-medium">
                                Price (INR)
                                <Input
                                    value={priceInr}
                                    onChange={(event) => setPriceInr(event.target.value)}
                                    inputMode="decimal"
                                    aria-label="Price in INR"
                                />
                            </label>
                            <label className="block space-y-2 text-sm font-medium">
                                Term count
                                <Input
                                    value={termCount}
                                    onChange={(event) => setTermCount(event.target.value)}
                                    inputMode="numeric"
                                    aria-label="Term count"
                                />
                            </label>
                            <label className="block space-y-2 text-sm font-medium">
                                Term unit
                                <select
                                    className="border-input h-9 rounded-lg border bg-transparent px-2.5 text-sm"
                                    value={termUnit}
                                    onChange={(event) => setTermUnit(event.target.value as CommercialCatalogTermUnit)}
                                    aria-label="Term unit"
                                >
                                    <option value="day">day</option>
                                    <option value="month">month</option>
                                    <option value="year">year</option>
                                </select>
                            </label>
                        </div>
                    ) : null}
                    {localError || formError ? (
                        <Alert variant="destructive" role="alert">
                            <AlertTitle>{errorTitle}</AlertTitle>
                            <AlertDescription>{localError ?? formError}</AlertDescription>
                        </Alert>
                    ) : null}
                    <div className="flex gap-2">
                        <Button type="submit" disabled={isPending}>
                            {isPending ? pendingLabel : submitLabel}
                        </Button>
                        {onCancel ? (
                            <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                        ) : null}
                    </div>
                </form>
            </CardContent>
        </Card>
    );
};

type ModuleDetailProps = {
    moduleId: string;
    getCommercialModule: typeof getCommercialModuleRequest;
    updateCommercialModuleDraft: typeof updateCommercialModuleDraftRequest;
    publishCommercialModuleRevision: typeof publishCommercialModuleRevisionRequest;
    retireCommercialModuleRevision: typeof retireCommercialModuleRevisionRequest;
    discardCommercialModuleRevision: typeof discardCommercialModuleRevisionRequest;
    createCommercialModuleSuccessor: typeof createCommercialModuleSuccessorRequest;
    listCommercialFeatures: typeof listCommercialFeaturesRequest;
    onBack: () => void;
    onUnauthorized?: () => Promise<void>;
};

const ModuleDetail = ({
    moduleId,
    getCommercialModule,
    updateCommercialModuleDraft,
    publishCommercialModuleRevision,
    retireCommercialModuleRevision,
    discardCommercialModuleRevision,
    createCommercialModuleSuccessor,
    listCommercialFeatures,
    onBack,
    onUnauthorized,
}: ModuleDetailProps) => {
    const queryClient = useQueryClient();
    const [formError, setFormError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

    const moduleQuery = useQuery({
        queryKey: moduleQueryKey(moduleId),
        queryFn: () => getCommercialModule(moduleId),
        retry: false,
    });
    const moduleDetail = moduleQuery.data?.status === "success" ? moduleQuery.data.data?.module : undefined;
    const current = moduleDetail?.currentRevision;
    const detailErrorCode = commercialCatalogUnauthorizedCode(moduleQuery.error, moduleQuery.data);

    useEffect(() => {
        if (detailErrorCode === 401) void onUnauthorized?.();
    }, [detailErrorCode, onUnauthorized]);

    const invalidate = async () => {
        await queryClient.invalidateQueries({ queryKey: moduleQueryKey(moduleId) });
        await queryClient.invalidateQueries({ queryKey: modulesQueryKey });
    };

    const updateMutation = useMutation({
        mutationFn: (input: CreateCommercialModuleJSON) =>
            updateCommercialModuleDraft(moduleId, current!.id, {
                displayName: input.displayName,
                description: input.description ?? "",
                featureRevisionIds: input.featureRevisionIds,
                isSeparatelyPurchasable: input.isSeparatelyPurchasable,
                priceInr: input.priceInr,
                term: input.term,
            }),
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
            setFormError(error.message ?? "Draft Module was not updated");
        },
    });

    const actionMutation = useMutation({
        mutationFn: async (action: PendingAction) => {
            if (action.kind === "publish") return publishCommercialModuleRevision(moduleId, action.revision.id);
            if (action.kind === "retire") return retireCommercialModuleRevision(moduleId, action.revision.id);
            if (action.kind === "discard") return discardCommercialModuleRevision(moduleId, action.revision.id);
            return createCommercialModuleSuccessor(moduleId, action.revision.id);
        },
        onMutate: () => setActionError(null),
        onSuccess: async (response) => {
            if (response.status === "error") {
                if (response.code === 401) await onUnauthorized?.();
                setActionError(response.message);
                return;
            }
            setPendingAction(null);
            await invalidate();
        },
        onError: (error: { message?: string; code?: number }) => {
            if (error.code === 401) void onUnauthorized?.();
            setActionError(error.message ?? "The Module revision was not updated");
        },
    });

    const confirmCopy: Record<PendingAction["kind"], { title: string; body: string; confirm: string }> = {
        publish: {
            title: "Publish this Module revision?",
            body: "Publishing makes this revision Active and immutable, including its selected Features, price, and term. If another revision is Active, it will be Retired.",
            confirm: "Publish revision",
        },
        retire: {
            title: "Retire this Module revision?",
            body: "The Active revision will become unavailable for future catalog composition. Its history stays retained.",
            confirm: "Retire revision",
        },
        discard: {
            title: "Discard this Draft Module?",
            body: "The unused Draft will leave the working catalog. Its Commercial Catalog Key cannot be reused.",
            confirm: "Confirm discard",
        },
        successor: {
            title: "Create a successor Draft revision?",
            body: "The current revision stays unchanged until the successor Draft is published.",
            confirm: "Confirm successor revision",
        },
    };

    if (moduleQuery.isPending) {
        return <p aria-busy="true">Loading Module…</p>;
    }
    if (!moduleDetail || !current || moduleQuery.isError || moduleQuery.data?.status === "error") {
        return (
            <section className="space-y-4">
                <Button type="button" variant="ghost" onClick={onBack}>
                    <ChevronLeft className="size-4" /> Back to Modules
                </Button>
                <Alert variant="destructive" role="alert">
                    <AlertTitle>Module could not be loaded</AlertTitle>
                    <AlertDescription>
                        {(moduleQuery.error as { message?: string } | null)?.message
                            ?? moduleQuery.data?.message
                            ?? "This Module is unavailable."}
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
                    <ChevronLeft className="size-4" /> Back to Modules
                </Button>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Commercial Catalog · Modules</p>
                        <h1 className="text-3xl font-semibold tracking-tight">{current.displayName}</h1>
                        <p className="text-muted-foreground">
                            Key <code>{moduleDetail.key}</code> · Revision {current.revisionNumber}
                        </p>
                    </div>
                    {commercialCatalogStatusBadge(current.status)}
                </div>
            </div>

            {pendingAction ? (
                <div role="alertdialog" aria-labelledby="module-action-title" className="rounded-xl border bg-card p-4 shadow-sm">
                    <h2 id="module-action-title" className="text-lg font-semibold">{confirmCopy[pendingAction.kind].title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{confirmCopy[pendingAction.kind].body}</p>
                    {actionError ? (
                        <Alert variant="destructive" className="mt-3" role="alert">
                            <AlertTitle>The Module revision was not updated</AlertTitle>
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

            {isDraft ? (
                <ModuleEditor
                    title="Current revision"
                    featuresQueryFn={listCommercialFeatures}
                    lockedKey={moduleDetail.key}
                    initialValues={{
                        key: moduleDetail.key,
                        displayName: current.displayName,
                        description: current.description,
                        featureRevisionIds: current.features.map((feature) => feature.featureRevisionId),
                        isSeparatelyPurchasable: current.isSeparatelyPurchasable,
                        priceInr: current.priceInr,
                        term: current.term,
                    }}
                    submitLabel="Save draft"
                    pendingLabel="Saving..."
                    errorTitle="Draft Module was not updated"
                    formError={formError}
                    isPending={updateMutation.isPending}
                    onSubmit={(values) => updateMutation.mutate(values)}
                />
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Current revision</CardTitle>
                        <CardDescription>Active and historical revisions are retained. Create a successor Draft to make a change.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <p><span className="font-medium">Key:</span> <code>{moduleDetail.key}</code></p>
                        <p><span className="font-medium">Display name:</span> {current.displayName}</p>
                        <p><span className="font-medium">Description:</span> {current.description || "—"}</p>
                        <p>
                            <span className="font-medium">Separately purchasable:</span>{" "}
                            {current.isSeparatelyPurchasable
                                ? `${formatCommercialCatalogInr(current.priceInr)} / ${formatCommercialCatalogTerm(current.term)}`
                                : "No"}
                        </p>
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
                    </CardContent>
                </Card>
            )}

            {isDraft ? (
                <div className="flex flex-wrap gap-2">
                    <Button type="button" onClick={() => setPendingAction({ kind: "publish", revision: current })}>
                        Publish
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setPendingAction({ kind: "discard", revision: current })}>
                        Discard draft
                    </Button>
                </div>
            ) : null}

            <Card>
                <CardHeader>
                    <CardTitle>Included Features</CardTitle>
                    <CardDescription>This Module pins exact Feature revisions. The same Feature may also belong to other Modules.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-2">
                        {current.features.map((feature) => (
                            <li key={feature.featureRevisionId}>
                                {feature.displayName} · <code>{feature.key}</code> · revision {feature.revisionNumber} · {feature.status}
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Referencing Plans</CardTitle>
                    <CardDescription>Plans that currently include this Module, when available.</CardDescription>
                </CardHeader>
                <CardContent>
                    {moduleDetail.referencingPlans.length === 0 ? (
                        <p>No Plans currently include this Module.</p>
                    ) : (
                        <ul className="space-y-2">
                            {moduleDetail.referencingPlans.map((plan) => (
                                <li key={plan.revisionId}>
                                    {plan.displayName} · <code>{plan.key}</code> · revision {plan.revisionNumber}
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
                    {moduleDetail.revisions.map((revision) => (
                        <article key={revision.id} className="rounded-xl border p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <h3 className="font-medium">Revision {revision.revisionNumber}</h3>
                                {commercialCatalogStatusBadge(revision.status)}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{revision.displayName}</p>
                            <ul className="mt-3 space-y-1 text-sm">
                                <li>Created by {commercialCatalogActorName(revision.createdBy)} on {formatCommercialCatalogAuditTime(revision.createdAt)}</li>
                                {revision.publishedBy && revision.publishedAt ? (
                                    <li>Published by {commercialCatalogActorName(revision.publishedBy)} on {formatCommercialCatalogAuditTime(revision.publishedAt)}</li>
                                ) : null}
                                {revision.retiredBy && revision.retiredAt ? (
                                    <li>Retired by {commercialCatalogActorName(revision.retiredBy)} on {formatCommercialCatalogAuditTime(revision.retiredAt)}</li>
                                ) : null}
                                {revision.discardedBy && revision.discardedAt ? (
                                    <li>Discarded by {commercialCatalogActorName(revision.discardedBy)} on {formatCommercialCatalogAuditTime(revision.discardedAt)}</li>
                                ) : null}
                            </ul>
                        </article>
                    ))}
                </CardContent>
            </Card>
        </section>
    );
};

export default CommercialCatalogModulesPage;
export type { CommercialCatalogModulesPageProps };
