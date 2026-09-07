import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, PlusCircle, Puzzle } from "lucide-react";
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
    type CommercialCatalogRevisionStatus,
    type CommercialCatalogTermUnit,
    type CommercialFeatureListItemDTO,
    type CommercialFeatureListStatusFilter,
    type CommercialModuleListItemDTO,
    type CommercialModuleListQueryJSON,
    type CommercialModuleRevisionDTO,
    type CreateCommercialModuleJSON,
} from "@repo/types";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/table";
import { Textarea } from "@repo/ui/components/textarea";

import {
    CommercialCatalogActionConfirmDialog,
    CommercialCatalogChipList,
    CommercialCatalogDetailHeader,
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
    formatCommercialCatalogInr,
    formatCommercialCatalogTerm,
    type CommercialCatalogActionKind,
} from "@/components/commercial-catalog-ui";
import {
    commercialCatalogNeedsDiscardedListFetch,
    commercialCatalogPrimaryListStatus,
    commercialCatalogStatusesFromSelection,
    filterCommercialCatalogListItems,
} from "@/lib/commercial-catalog-list-filters";
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
    kind: CommercialCatalogActionKind;
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
    initialStatuses?: CommercialCatalogRevisionStatus[];
    initialCreateValues?: CreateCommercialModuleJSON;
    onUnauthorized?: () => Promise<void>;
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
    initialStatuses,
    initialCreateValues,
    onUnauthorized,
}: CommercialCatalogModulesPageProps) => {
    const queryClient = useQueryClient();
    const [location, setLocation] = useState<CommercialCatalogLocation>(() =>
        typeof window === "undefined" ? { kind: "modules" } : resolveModulesLocation(window.location.pathname),
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
    const [editingModule, setEditingModule] = useState<CommercialModuleListItemDTO | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const selectedStatuses = commercialCatalogStatusesFromSelection(statusSelection);
    const selectedStatusKey = selectedStatuses.join(",");
    const listQuery: CommercialModuleListQueryJSON = {
        ...(search.trim() ? { search: search.trim() } : {}),
        status: commercialCatalogPrimaryListStatus(statusSelection),
    };

    useEffect(() => {
        const syncLocation = () => {
            setLocation(resolveModulesLocation(window.location.pathname));
            if (resolveModulesLocation(window.location.pathname).kind !== "modules") return;
            const filters = parseCommercialCatalogSearch(window.location.search);
            setSearch(filters.search ?? "");
            setStatusSelection(commercialCatalogResolveInitialStatusSelection({ urlStatuses: filters.statuses }));
        };
        window.addEventListener("popstate", syncLocation);
        return () => window.removeEventListener("popstate", syncLocation);
    }, []);

    useEffect(() => {
        if (location.kind !== "modules") return;
        const path = commercialCatalogModulesListPath({
            search: search.trim() || undefined,
            statuses: selectedStatuses,
        });
        const current = `${window.location.pathname}${window.location.search}`;
        if (current !== path) window.history.replaceState(null, "", path);
    }, [location.kind, search, selectedStatusKey]);

    const openList = () => {
        const path = commercialCatalogModulesListPath({
            search: search.trim() || undefined,
            statuses: selectedStatuses,
        });
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
        queryKey: [...modulesQueryKey, listQuery, selectedStatusKey],
        queryFn: async () => {
            const response = await listCommercialModules(listQuery);
            if (response.status !== "success") return response;
            let modules = response.data?.modules ?? [];
            if (commercialCatalogNeedsDiscardedListFetch(statusSelection)) {
                const discardedResponse = await listCommercialModules({
                    ...(search.trim() ? { search: search.trim() } : {}),
                    status: "discarded",
                });
                if (discardedResponse.status === "success") {
                    const seen = new Set(modules.map((moduleItem) => moduleItem.id));
                    for (const moduleItem of discardedResponse.data?.modules ?? []) {
                        if (!seen.has(moduleItem.id)) modules.push(moduleItem);
                    }
                }
            }
            return {
                ...response,
                data: {
                    ...response.data,
                    modules: filterCommercialCatalogListItems(modules, statusSelection),
                },
            };
        },
        retry: false,
        enabled: location.kind === "modules",
    });
    const modules = modulesQuery.data?.status === "success" ? modulesQuery.data.data?.modules ?? [] : [];
    const listErrorCode = commercialCatalogUnauthorizedCode(modulesQuery.error, modulesQuery.data);

    useEffect(() => {
        if (listErrorCode === 401) void onUnauthorized?.();
    }, [listErrorCode, onUnauthorized]);

    const editQuery = useQuery({
        queryKey: [...moduleQueryKey(editingModule?.id ?? ""), "list-edit"],
        queryFn: () => getCommercialModule(editingModule!.id),
        retry: false,
        enabled: Boolean(editingModule),
    });
    const editingDetail = editQuery.data?.status === "success" ? editQuery.data.data?.module : undefined;

    const closeEditor = () => {
        setShowCreateForm(false);
        setEditingModule(null);
        setFormError(null);
    };

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
            closeEditor();
            await queryClient.invalidateQueries({ queryKey: modulesQueryKey });
            if (moduleId) openModule(moduleId);
        },
        onError: (error: { message?: string; code?: number }) => {
            if (error.code === 401) void onUnauthorized?.();
            setFormError(error.message ?? "Draft Module was not created");
        },
    });

    const updateMutation = useMutation({
        mutationFn: (input: CreateCommercialModuleJSON) =>
            updateCommercialModuleDraft(editingDetail!.id, editingDetail!.currentRevision.id, {
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
            closeEditor();
            await queryClient.invalidateQueries({ queryKey: modulesQueryKey });
        },
        onError: (error: { message?: string; code?: number }) => {
            if (error.code === 401) void onUnauthorized?.();
            setFormError(error.message ?? "Draft Module was not updated");
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

    const editorOpen = showCreateForm || Boolean(editingModule);
    const currentRevision = editingDetail?.currentRevision;

    return (
        <section className="space-y-5">
            <CommercialCatalogListToolbar
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search modules..."
                searchAriaLabel="Search Modules by name or key"
                statusSelection={statusSelection}
                onStatusSelectionChange={(values) => setStatusSelection(commercialCatalogNormalizeStatusSelection(values))}
                countLabel={modulesQuery.isSuccess ? `${modules.length} module${modules.length === 1 ? "" : "s"}` : undefined}
                addButton={
                    <Button
                        type="button"
                        className={commercialCatalogAddButtonClass}
                        onClick={() => { setShowCreateForm(true); setFormError(null); }}
                    >
                        <PlusCircle className="size-3.5 sm:size-4" /> Add Module
                    </Button>
                }
            />

            <CommercialCatalogEditorDialog
                open={editorOpen}
                onOpenChange={(open) => { if (!open) closeEditor(); }}
                title={editingModule ? "Edit Module" : "Add Module"}
                icon={<Puzzle className="size-5" />}
                wide
            >
                {editingModule && !currentRevision ? (
                    <p aria-busy="true">Loading Module…</p>
                ) : (
                    <ModuleEditor
                        key={currentRevision?.id ?? "create"}
                        featuresQueryFn={listCommercialFeatures}
                        lockedKey={editingDetail?.key}
                        initialValues={currentRevision && editingDetail
                            ? {
                                key: editingDetail.key,
                                displayName: currentRevision.displayName,
                                description: currentRevision.description,
                                featureRevisionIds: currentRevision.features.map((feature) => feature.featureRevisionId),
                                isSeparatelyPurchasable: currentRevision.isSeparatelyPurchasable,
                                priceInr: currentRevision.priceInr,
                                term: currentRevision.term,
                            }
                            : initialCreateValues}
                        submitLabel={editingModule ? "Save draft" : "Create Draft Module"}
                        pendingLabel={editingModule ? "Saving..." : "Creating..."}
                        errorTitle={editingModule ? "Draft Module was not updated" : "Draft Module was not created"}
                        formError={formError}
                        isPending={editingModule ? updateMutation.isPending : createMutation.isPending}
                        onCancel={closeEditor}
                        onSubmit={(values) => editingModule ? updateMutation.mutate(values) : createMutation.mutate(values)}
                    />
                )}
            </CommercialCatalogEditorDialog>

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
                    <CardContent className="p-0">
                        {modules.length === 0 ? (
                            <p className="p-6 text-sm text-muted-foreground">No Modules match this view.</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Display name</TableHead>
                                        <TableHead>Key</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Revision</TableHead>
                                        <TableHead>Add-on</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
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
                                            <TableCell className="text-right">
                                                {moduleItem.status === "draft" ? (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className={commercialCatalogEditButtonClass}
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            setEditingModule(moduleItem);
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

type ModuleEditorProps = {
    featuresQueryFn: typeof listCommercialFeaturesRequest;
    initialValues?: CreateCommercialModuleJSON;
    lockedKey?: string;
    submitLabel: string;
    pendingLabel: string;
    errorTitle: string;
    formError: string | null;
    isPending: boolean;
    onCancel: () => void;
    onSubmit: (values: CreateCommercialModuleJSON) => void;
};

const ModuleEditor = ({
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
        <form className="grid gap-4 pt-2" onSubmit={submit}>
            <label className="block space-y-2 text-sm font-medium">
                Key
                <Input
                    value={lockedKey ?? key}
                    onChange={(event) => setKey(event.target.value)}
                    readOnly={Boolean(lockedKey)}
                    autoComplete="off"
                    className="h-11 rounded-xl"
                />
            </label>
            <label className="block space-y-2 text-sm font-medium">
                Display name
                <Input value={displayName} onChange={(event) => setDisplayName(event.target.value)} className="h-11 rounded-xl" />
            </label>
            <label className="block space-y-2 text-sm font-medium">
                Description
                <Textarea value={description} onChange={(event) => setDescription(event.target.value)} className="min-h-24 rounded-xl" />
            </label>
            <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Features</legend>
                {featuresQuery.isPending ? (
                    <p aria-busy="true">Loading Features…</p>
                ) : features.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No Features are available to include.</p>
                ) : (
                    <ul className="max-h-48 space-y-2 overflow-y-auto rounded-xl border p-3">
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
                                        {feature.displayName} · <code>{feature.key}</code>
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
                            className="h-11 rounded-xl"
                        />
                    </label>
                    <label className="block space-y-2 text-sm font-medium">
                        Term count
                        <Input
                            value={termCount}
                            onChange={(event) => setTermCount(event.target.value)}
                            inputMode="numeric"
                            aria-label="Term count"
                            className="h-11 rounded-xl"
                        />
                    </label>
                    <label className="block space-y-2 text-sm font-medium">
                        Term unit
                        <select
                            className="border-input h-11 rounded-xl border bg-transparent px-2.5 text-sm"
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
            <CommercialCatalogDialogFooter>
                <Button type="button" variant="outline" className="rounded-xl" onClick={onCancel}>Cancel</Button>
                <Button type="submit" className="rounded-xl" disabled={isPending}>
                    {isPending ? pendingLabel : submitLabel}
                </Button>
            </CommercialCatalogDialogFooter>
        </form>
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
    const [showEdit, setShowEdit] = useState(false);
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
            setShowEdit(false);
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
            setShowEdit(false);
            await invalidate();
        },
        onError: (error: { message?: string; code?: number }) => {
            if (error.code === 401) void onUnauthorized?.();
            setActionError(error.message ?? "The Module revision was not updated");
        },
    });

    if (moduleQuery.isPending) {
        return <p aria-busy="true">Loading Module…</p>;
    }
    if (!moduleDetail || !current || moduleQuery.isError || moduleQuery.data?.status === "error") {
        return (
            <section className="space-y-4">
                <Button type="button" variant="ghost" onClick={onBack}>
                    Back to Modules
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
            <CommercialCatalogDetailHeader
                backLabel="Back to Modules"
                onBack={onBack}
                title={current.displayName}
                catalogKey={moduleDetail.key}
                revisionNumber={current.revisionNumber}
                status={current.status}
                description={current.description}
                actions={
                    <>
                        <CommercialCatalogRevisionHistorySheet revisions={moduleDetail.revisions} />
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
                errorTitle="The Module revision was not updated"
                onConfirm={() => {
                    if (pendingAction) actionMutation.mutate(pendingAction);
                }}
            />

            {isDraft ? (
                <CommercialCatalogEditorDialog
                    open={showEdit}
                    onOpenChange={(open) => { if (!open) { setShowEdit(false); setFormError(null); } }}
                    title="Edit Module"
                    icon={<Puzzle className="size-5" />}
                    wide
                >
                    <ModuleEditor
                        key={current.id}
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
                        onCancel={() => { setShowEdit(false); setFormError(null); }}
                        onSubmit={(values) => updateMutation.mutate(values)}
                    />
                </CommercialCatalogEditorDialog>
            ) : null}

            <div className="grid gap-1 text-sm">
                <p>
                    <span className="text-muted-foreground">Add-on</span>
                    {" · "}
                    {current.isSeparatelyPurchasable
                        ? `${formatCommercialCatalogInr(current.priceInr)} / ${formatCommercialCatalogTerm(current.term)}`
                        : "Not separately purchasable"}
                </p>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>Included Features</CardTitle>
                </CardHeader>
                <CardContent>
                    <CommercialCatalogChipList
                        items={current.features.map((feature) => ({
                            id: feature.featureRevisionId,
                            label: feature.displayName,
                            hint: feature.key,
                        }))}
                        empty="No Features are included."
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>Referencing Plans</CardTitle>
                </CardHeader>
                <CardContent>
                    <CommercialCatalogChipList
                        items={moduleDetail.referencingPlans.map((plan) => ({
                            id: plan.revisionId,
                            label: plan.displayName,
                            hint: plan.key,
                        }))}
                        empty="No Plans currently include this Module."
                    />
                </CardContent>
            </Card>
        </section>
    );
};

export default CommercialCatalogModulesPage;
export type { CommercialCatalogModulesPageProps };
