import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Package2, Pencil, PlusCircle } from "lucide-react";
import {
    createCommercialPlan as createCommercialPlanRequest,
    createCommercialPlanSuccessor as createCommercialPlanSuccessorRequest,
    discardCommercialPlanRevision as discardCommercialPlanRevisionRequest,
    getCommercialPlan as getCommercialPlanRequest,
    listCommercialModules as listCommercialModulesRequest,
    listCommercialPlans as listCommercialPlansRequest,
    publishCommercialPlanRevision as publishCommercialPlanRevisionRequest,
    retireCommercialPlanRevision as retireCommercialPlanRevisionRequest,
    updateCommercialPlanDraft as updateCommercialPlanDraftRequest,
} from "@repo/services";
import {
    CreateCommercialPlanSchema,
    UpdateCommercialPlanDraftSchema,
    type CommercialCatalogRevisionStatus,
    type CommercialCatalogTermUnit,
    type CommercialFeatureListStatusFilter,
    type CommercialModuleListItemDTO,
    type CommercialPlanListItemDTO,
    type CommercialPlanListQueryJSON,
    type CommercialPlanRevisionDTO,
    type CommercialPlanType,
    type CreateCommercialPlanJSON,
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
    commercialCatalogPlanTypeLabels,
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
    commercialCatalogPlansListPath,
    commercialPlanPath,
    parseCommercialCatalogPath,
    parseCommercialCatalogSearch,
    type CommercialCatalogLocation,
} from "@/lib/commercial-catalog-url";

const plansQueryKey = ["platform-owner", "commercial-catalog", "plans"] as const;
const planQueryKey = (planId: string) => ["platform-owner", "commercial-catalog", "plan", planId] as const;
const pickerModulesQueryKey = ["platform-owner", "commercial-catalog", "modules", "plan-picker"] as const;

const resolvePlansLocation = (pathname: string): CommercialCatalogLocation => {
    const parsed = parseCommercialCatalogPath(pathname);
    return parsed.kind === "plan" || parsed.kind === "plans" ? parsed : { kind: "plans" };
};

type PendingAction = {
    kind: CommercialCatalogActionKind;
    revision: CommercialPlanRevisionDTO;
};

type CommercialCatalogPlansPageProps = {
    listCommercialPlans?: typeof listCommercialPlansRequest;
    getCommercialPlan?: typeof getCommercialPlanRequest;
    createCommercialPlan?: typeof createCommercialPlanRequest;
    updateCommercialPlanDraft?: typeof updateCommercialPlanDraftRequest;
    publishCommercialPlanRevision?: typeof publishCommercialPlanRevisionRequest;
    retireCommercialPlanRevision?: typeof retireCommercialPlanRevisionRequest;
    discardCommercialPlanRevision?: typeof discardCommercialPlanRevisionRequest;
    createCommercialPlanSuccessor?: typeof createCommercialPlanSuccessorRequest;
    listCommercialModules?: typeof listCommercialModulesRequest;
    initialSearch?: string;
    initialStatus?: CommercialFeatureListStatusFilter;
    initialStatuses?: CommercialCatalogRevisionStatus[];
    initialCreateValues?: CreateCommercialPlanJSON;
    onUnauthorized?: () => Promise<void>;
};

const CommercialCatalogPlansPage = ({
    listCommercialPlans = listCommercialPlansRequest,
    getCommercialPlan = getCommercialPlanRequest,
    createCommercialPlan = createCommercialPlanRequest,
    updateCommercialPlanDraft = updateCommercialPlanDraftRequest,
    publishCommercialPlanRevision = publishCommercialPlanRevisionRequest,
    retireCommercialPlanRevision = retireCommercialPlanRevisionRequest,
    discardCommercialPlanRevision = discardCommercialPlanRevisionRequest,
    createCommercialPlanSuccessor = createCommercialPlanSuccessorRequest,
    listCommercialModules = listCommercialModulesRequest,
    initialSearch,
    initialStatus,
    initialStatuses,
    initialCreateValues,
    onUnauthorized,
}: CommercialCatalogPlansPageProps) => {
    const queryClient = useQueryClient();
    const [location, setLocation] = useState<CommercialCatalogLocation>(() =>
        typeof window === "undefined" ? { kind: "plans" } : resolvePlansLocation(window.location.pathname),
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
    const [editingPlan, setEditingPlan] = useState<CommercialPlanListItemDTO | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const selectedStatuses = commercialCatalogStatusesFromSelection(statusSelection);
    const selectedStatusKey = selectedStatuses.join(",");
    const listQuery: CommercialPlanListQueryJSON = {
        ...(search.trim() ? { search: search.trim() } : {}),
        status: commercialCatalogPrimaryListStatus(statusSelection),
    };

    useEffect(() => {
        const syncLocation = () => {
            setLocation(resolvePlansLocation(window.location.pathname));
            const resolved = resolvePlansLocation(window.location.pathname);
            if (resolved.kind !== "plans") return;
            const filters = parseCommercialCatalogSearch(window.location.search);
            setSearch(filters.search ?? "");
            setStatusSelection(commercialCatalogResolveInitialStatusSelection({ urlStatuses: filters.statuses }));
        };
        window.addEventListener("popstate", syncLocation);
        return () => window.removeEventListener("popstate", syncLocation);
    }, []);

    useEffect(() => {
        if (location.kind !== "plans") return;
        const path = commercialCatalogPlansListPath({
            search: search.trim() || undefined,
            statuses: selectedStatuses,
        });
        const current = `${window.location.pathname}${window.location.search}`;
        if (current !== path) window.history.replaceState(null, "", path);
    }, [location.kind, search, selectedStatusKey]);

    const openList = () => {
        const path = commercialCatalogPlansListPath({
            search: search.trim() || undefined,
            statuses: selectedStatuses,
        });
        if (`${window.location.pathname}${window.location.search}` !== path) {
            window.history.pushState(null, "", path);
            window.dispatchEvent(new Event("popstate"));
        }
        setLocation({ kind: "plans" });
    };

    const openPlan = (planId: string) => {
        const path = commercialPlanPath(planId);
        if (window.location.pathname !== path) {
            window.history.pushState(null, "", path);
            window.dispatchEvent(new Event("popstate"));
        }
        setLocation({ kind: "plan", planId });
    };

    const plansQuery = useQuery({
        queryKey: [...plansQueryKey, listQuery, selectedStatusKey],
        queryFn: async () => {
            const response = await listCommercialPlans(listQuery);
            if (response.status !== "success") return response;
            let plans = response.data?.plans ?? [];
            if (commercialCatalogNeedsDiscardedListFetch(statusSelection)) {
                const discardedResponse = await listCommercialPlans({
                    ...(search.trim() ? { search: search.trim() } : {}),
                    status: "discarded",
                });
                if (discardedResponse.status === "success") {
                    const seen = new Set(plans.map((planItem) => planItem.id));
                    for (const planItem of discardedResponse.data?.plans ?? []) {
                        if (!seen.has(planItem.id)) plans.push(planItem);
                    }
                }
            }
            return {
                ...response,
                data: {
                    ...response.data,
                    plans: filterCommercialCatalogListItems(plans, statusSelection),
                },
            };
        },
        retry: false,
        enabled: location.kind === "plans",
    });
    const plans = plansQuery.data?.status === "success" ? plansQuery.data.data?.plans ?? [] : [];
    const listErrorCode = commercialCatalogUnauthorizedCode(plansQuery.error, plansQuery.data);

    useEffect(() => {
        if (listErrorCode === 401) void onUnauthorized?.();
    }, [listErrorCode, onUnauthorized]);

    const editQuery = useQuery({
        queryKey: [...planQueryKey(editingPlan?.id ?? ""), "list-edit"],
        queryFn: () => getCommercialPlan(editingPlan!.id),
        retry: false,
        enabled: Boolean(editingPlan),
    });
    const editingDetail = editQuery.data?.status === "success" ? editQuery.data.data?.plan : undefined;

    const closeEditor = () => {
        setShowCreateForm(false);
        setEditingPlan(null);
        setFormError(null);
    };

    const createMutation = useMutation({
        mutationFn: createCommercialPlan,
        onMutate: () => setFormError(null),
        onSuccess: async (response) => {
            if (response.status === "error") {
                if (response.code === 401) await onUnauthorized?.();
                setFormError(response.message);
                return;
            }
            const planId = response.data?.plan.id;
            closeEditor();
            await queryClient.invalidateQueries({ queryKey: plansQueryKey });
            if (planId) openPlan(planId);
        },
        onError: (error: { message?: string; code?: number }) => {
            if (error.code === 401) void onUnauthorized?.();
            setFormError(error.message ?? "Draft Plan was not created");
        },
    });

    const updateMutation = useMutation({
        mutationFn: (input: CreateCommercialPlanJSON) =>
            updateCommercialPlanDraft(editingDetail!.id, editingDetail!.currentRevision.id, {
                displayName: input.displayName,
                description: input.description ?? "",
                planType: input.planType,
                priceInr: input.priceInr,
                term: input.term,
                moduleRevisionIds: input.moduleRevisionIds,
            }),
        onMutate: () => setFormError(null),
        onSuccess: async (response) => {
            if (response.status === "error") {
                if (response.code === 401) await onUnauthorized?.();
                setFormError(response.message);
                return;
            }
            closeEditor();
            await queryClient.invalidateQueries({ queryKey: plansQueryKey });
        },
        onError: (error: { message?: string; code?: number }) => {
            if (error.code === 401) void onUnauthorized?.();
            setFormError(error.message ?? "Draft Plan was not updated");
        },
    });

    if (location.kind === "plan") {
        return (
            <PlanDetail
                planId={location.planId}
                getCommercialPlan={getCommercialPlan}
                updateCommercialPlanDraft={updateCommercialPlanDraft}
                publishCommercialPlanRevision={publishCommercialPlanRevision}
                retireCommercialPlanRevision={retireCommercialPlanRevision}
                discardCommercialPlanRevision={discardCommercialPlanRevision}
                createCommercialPlanSuccessor={createCommercialPlanSuccessor}
                listCommercialModules={listCommercialModules}
                onBack={openList}
                onUnauthorized={onUnauthorized}
            />
        );
    }

    const editorOpen = showCreateForm || Boolean(editingPlan);
    const currentRevision = editingDetail?.currentRevision;

    return (
        <section className="space-y-5">
            <CommercialCatalogListToolbar
                search={search}
                onSearchChange={setSearch}
                searchPlaceholder="Search plans..."
                searchAriaLabel="Search Plans by name or key"
                statusSelection={statusSelection}
                onStatusSelectionChange={(values) => setStatusSelection(commercialCatalogNormalizeStatusSelection(values))}
                countLabel={plansQuery.isSuccess ? `${plans.length} plan${plans.length === 1 ? "" : "s"}` : undefined}
                addButton={
                    <Button
                        type="button"
                        className={commercialCatalogAddButtonClass}
                        onClick={() => { setShowCreateForm(true); setFormError(null); }}
                    >
                        <PlusCircle className="size-3.5 sm:size-4" /> Add Plan
                    </Button>
                }
            />

            <CommercialCatalogEditorDialog
                open={editorOpen}
                onOpenChange={(open) => { if (!open) closeEditor(); }}
                title={editingPlan ? "Edit Plan" : "Add Plan"}
                icon={<Package2 className="size-5" />}
                wide
            >
                {editingPlan && !currentRevision ? (
                    <p aria-busy="true">Loading Plan…</p>
                ) : (
                    <PlanEditor
                        key={currentRevision?.id ?? "create"}
                        modulesQueryFn={listCommercialModules}
                        lockedKey={editingDetail?.key}
                        initialValues={currentRevision && editingDetail
                            ? {
                                key: editingDetail.key,
                                displayName: currentRevision.displayName,
                                description: currentRevision.description,
                                planType: currentRevision.planType,
                                priceInr: currentRevision.priceInr,
                                term: currentRevision.term,
                                moduleRevisionIds: currentRevision.modules.map((moduleItem) => moduleItem.moduleRevisionId),
                            }
                            : initialCreateValues}
                        submitLabel={editingPlan ? "Save draft" : "Create Draft Plan"}
                        pendingLabel={editingPlan ? "Saving..." : "Creating..."}
                        errorTitle={editingPlan ? "Draft Plan was not updated" : "Draft Plan was not created"}
                        formError={formError}
                        isPending={editingPlan ? updateMutation.isPending : createMutation.isPending}
                        onCancel={closeEditor}
                        onSubmit={(values) => editingPlan ? updateMutation.mutate(values) : createMutation.mutate(values)}
                    />
                )}
            </CommercialCatalogEditorDialog>

            {plansQuery.isPending ? (
                <p aria-busy="true">Loading Plans…</p>
            ) : plansQuery.isError || plansQuery.data?.status === "error" ? (
                <Alert variant="destructive" role="alert">
                    <AlertTitle>Plans could not be loaded</AlertTitle>
                    <AlertDescription>
                        {(plansQuery.error as { message?: string } | null)?.message
                            ?? plansQuery.data?.message
                            ?? "The Plan list is unavailable."}
                    </AlertDescription>
                </Alert>
            ) : (
                <Card>
                    <CardContent className="p-0">
                        {plans.length === 0 ? (
                            <p className="p-6 text-sm text-muted-foreground">No Plans match this view.</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Display name</TableHead>
                                        <TableHead>Key</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Revision</TableHead>
                                        <TableHead>Type</TableHead>
                                        <TableHead>Price / term</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {plans.map((planItem) => (
                                        <TableRow
                                            key={planItem.id}
                                            className="cursor-pointer"
                                            onClick={() => openPlan(planItem.id)}
                                        >
                                            <TableCell>
                                                <button type="button" className="text-left font-medium" onClick={() => openPlan(planItem.id)}>
                                                    {planItem.displayName}
                                                </button>
                                            </TableCell>
                                            <TableCell><code>{planItem.key}</code></TableCell>
                                            <TableCell>{commercialCatalogStatusBadge(planItem.status)}</TableCell>
                                            <TableCell>{planItem.revisionNumber}</TableCell>
                                            <TableCell>{commercialCatalogPlanTypeLabels[planItem.planType]}</TableCell>
                                            <TableCell>
                                                {`${formatCommercialCatalogInr(planItem.priceInr)} / ${formatCommercialCatalogTerm(planItem.term)}`}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                {planItem.status === "draft" ? (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        className={commercialCatalogEditButtonClass}
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            setEditingPlan(planItem);
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

type PlanEditorProps = {
    modulesQueryFn: typeof listCommercialModulesRequest;
    initialValues?: CreateCommercialPlanJSON;
    lockedKey?: string;
    submitLabel: string;
    pendingLabel: string;
    errorTitle: string;
    formError: string | null;
    isPending: boolean;
    onCancel: () => void;
    onSubmit: (values: CreateCommercialPlanJSON) => void;
};

const PlanEditor = ({
    modulesQueryFn,
    initialValues,
    lockedKey,
    submitLabel,
    pendingLabel,
    errorTitle,
    formError,
    isPending,
    onCancel,
    onSubmit,
}: PlanEditorProps) => {
    const [key, setKey] = useState(initialValues?.key ?? "");
    const [displayName, setDisplayName] = useState(initialValues?.displayName ?? "");
    const [description, setDescription] = useState(initialValues?.description ?? "");
    const [selectedRevisionIds, setSelectedRevisionIds] = useState<Set<string>>(
        () => new Set(initialValues?.moduleRevisionIds ?? []),
    );
    const [planType, setPlanType] = useState<CommercialPlanType>(initialValues?.planType ?? "paid");
    const [priceInr, setPriceInr] = useState(initialValues?.priceInr != null ? String(initialValues.priceInr) : "");
    const [termCount, setTermCount] = useState(initialValues?.term?.count != null ? String(initialValues.term.count) : "1");
    const [termUnit, setTermUnit] = useState<CommercialCatalogTermUnit>(initialValues?.term?.unit ?? "year");
    const [localError, setLocalError] = useState<string | null>(null);

    const modulesQuery = useQuery({
        queryKey: pickerModulesQueryKey,
        queryFn: () => modulesQueryFn({ status: "all" }),
        retry: false,
    });
    const modules = modulesQuery.data?.status === "success" ? modulesQuery.data.data?.modules ?? [] : [];

    const toggleModule = (moduleItem: CommercialModuleListItemDTO) => {
        const next = new Set(selectedRevisionIds);
        if (next.has(moduleItem.currentRevisionId)) {
            next.delete(moduleItem.currentRevisionId);
        } else {
            for (const item of modules) {
                if (item.id === moduleItem.id) next.delete(item.currentRevisionId);
            }
            next.add(moduleItem.currentRevisionId);
        }
        setSelectedRevisionIds(next);
    };

    const changePlanType = (nextType: CommercialPlanType) => {
        setPlanType(nextType);
        if (nextType === "trial") {
            setPriceInr("0");
            setTermCount("7");
            setTermUnit("day");
        }
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const payload: CreateCommercialPlanJSON = {
            key: lockedKey ?? key,
            displayName,
            description,
            planType,
            priceInr: Number(priceInr),
            term: { count: Number(termCount), unit: termUnit },
            moduleRevisionIds: [...selectedRevisionIds],
        };
        const parsed = (lockedKey ? UpdateCommercialPlanDraftSchema : CreateCommercialPlanSchema).safeParse(
            lockedKey
                ? {
                    displayName: payload.displayName,
                    description: payload.description,
                    planType: payload.planType,
                    priceInr: payload.priceInr,
                    term: payload.term,
                    moduleRevisionIds: payload.moduleRevisionIds,
                }
                : payload,
        );
        if (!parsed.success) {
            setLocalError(parsed.error.issues[0]?.message ?? "Check the Plan details");
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
            <label className="block space-y-2 text-sm font-medium">
                Plan type
                <select
                    className="border-input h-11 rounded-xl border bg-transparent px-2.5 text-sm"
                    value={planType}
                    onChange={(event) => changePlanType(event.target.value as CommercialPlanType)}
                    aria-label="Plan type"
                >
                    <option value="trial">Trial</option>
                    <option value="paid">Paid</option>
                </select>
            </label>
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
            <fieldset className="space-y-2">
                <legend className="text-sm font-medium">Modules</legend>
                {modulesQuery.isPending ? (
                    <p aria-busy="true">Loading Modules…</p>
                ) : modules.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No Modules are available to include.</p>
                ) : (
                    <ul className="max-h-48 space-y-2 overflow-y-auto rounded-xl border p-3">
                        {modules.map((moduleItem) => (
                            <li key={moduleItem.id}>
                                <label className="flex items-center gap-2 text-sm">
                                    <input
                                        type="checkbox"
                                        checked={selectedRevisionIds.has(moduleItem.currentRevisionId)}
                                        onChange={() => toggleModule(moduleItem)}
                                        aria-label={`Include Module ${moduleItem.displayName}`}
                                    />
                                    <span>
                                        {moduleItem.displayName} · <code>{moduleItem.key}</code>
                                    </span>
                                </label>
                            </li>
                        ))}
                    </ul>
                )}
            </fieldset>
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

type PlanDetailProps = {
    planId: string;
    getCommercialPlan: typeof getCommercialPlanRequest;
    updateCommercialPlanDraft: typeof updateCommercialPlanDraftRequest;
    publishCommercialPlanRevision: typeof publishCommercialPlanRevisionRequest;
    retireCommercialPlanRevision: typeof retireCommercialPlanRevisionRequest;
    discardCommercialPlanRevision: typeof discardCommercialPlanRevisionRequest;
    createCommercialPlanSuccessor: typeof createCommercialPlanSuccessorRequest;
    listCommercialModules: typeof listCommercialModulesRequest;
    onBack: () => void;
    onUnauthorized?: () => Promise<void>;
};

const PlanDetail = ({
    planId,
    getCommercialPlan,
    updateCommercialPlanDraft,
    publishCommercialPlanRevision,
    retireCommercialPlanRevision,
    discardCommercialPlanRevision,
    createCommercialPlanSuccessor,
    listCommercialModules,
    onBack,
    onUnauthorized,
}: PlanDetailProps) => {
    const queryClient = useQueryClient();
    const [showEdit, setShowEdit] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

    const planQuery = useQuery({
        queryKey: planQueryKey(planId),
        queryFn: () => getCommercialPlan(planId),
        retry: false,
    });
    const planDetail = planQuery.data?.status === "success" ? planQuery.data.data?.plan : undefined;
    const current = planDetail?.currentRevision;
    const detailErrorCode = commercialCatalogUnauthorizedCode(planQuery.error, planQuery.data);

    useEffect(() => {
        if (detailErrorCode === 401) void onUnauthorized?.();
    }, [detailErrorCode, onUnauthorized]);

    const invalidate = async () => {
        await queryClient.invalidateQueries({ queryKey: planQueryKey(planId) });
        await queryClient.invalidateQueries({ queryKey: plansQueryKey });
    };

    const updateMutation = useMutation({
        mutationFn: (input: CreateCommercialPlanJSON) =>
            updateCommercialPlanDraft(planId, current!.id, {
                displayName: input.displayName,
                description: input.description ?? "",
                planType: input.planType,
                priceInr: input.priceInr,
                term: input.term,
                moduleRevisionIds: input.moduleRevisionIds,
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
            setFormError(error.message ?? "Draft Plan was not updated");
        },
    });

    const actionMutation = useMutation({
        mutationFn: async (action: PendingAction) => {
            if (action.kind === "publish") return publishCommercialPlanRevision(planId, action.revision.id);
            if (action.kind === "retire") return retireCommercialPlanRevision(planId, action.revision.id);
            if (action.kind === "discard") return discardCommercialPlanRevision(planId, action.revision.id);
            return createCommercialPlanSuccessor(planId, action.revision.id);
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
            setActionError(error.message ?? "The Plan revision was not updated");
        },
    });

    if (planQuery.isPending) {
        return <p aria-busy="true">Loading Plan…</p>;
    }
    if (!planDetail || !current || planQuery.isError || planQuery.data?.status === "error") {
        return (
            <section className="space-y-4">
                <Button type="button" variant="ghost" onClick={onBack}>
                    Back to Plans
                </Button>
                <Alert variant="destructive" role="alert">
                    <AlertTitle>Plan could not be loaded</AlertTitle>
                    <AlertDescription>
                        {(planQuery.error as { message?: string } | null)?.message
                            ?? planQuery.data?.message
                            ?? "This Plan is unavailable."}
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
                backLabel="Back to Plans"
                onBack={onBack}
                title={current.displayName}
                catalogKey={planDetail.key}
                revisionNumber={current.revisionNumber}
                status={current.status}
                description={current.description}
                actions={
                    <>
                        <CommercialCatalogRevisionHistorySheet revisions={planDetail.revisions} />
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
                errorTitle="The Plan revision was not updated"
                onConfirm={() => {
                    if (pendingAction) actionMutation.mutate(pendingAction);
                }}
            />

            {isDraft ? (
                <CommercialCatalogEditorDialog
                    open={showEdit}
                    onOpenChange={(open) => { if (!open) { setShowEdit(false); setFormError(null); } }}
                    title="Edit Plan"
                    icon={<Package2 className="size-5" />}
                    wide
                >
                    <PlanEditor
                        key={current.id}
                        modulesQueryFn={listCommercialModules}
                        lockedKey={planDetail.key}
                        initialValues={{
                            key: planDetail.key,
                            displayName: current.displayName,
                            description: current.description,
                            planType: current.planType,
                            priceInr: current.priceInr,
                            term: current.term,
                            moduleRevisionIds: current.modules.map((moduleItem) => moduleItem.moduleRevisionId),
                        }}
                        submitLabel="Save draft"
                        pendingLabel="Saving..."
                        errorTitle="Draft Plan was not updated"
                        formError={formError}
                        isPending={updateMutation.isPending}
                        onCancel={() => { setShowEdit(false); setFormError(null); }}
                        onSubmit={(values) => updateMutation.mutate(values)}
                    />
                </CommercialCatalogEditorDialog>
            ) : null}

            <div className="grid gap-1 text-sm">
                <p>
                    {commercialCatalogPlanTypeLabels[current.planType]}
                    {" · "}
                    {`${formatCommercialCatalogInr(current.priceInr)} / ${formatCommercialCatalogTerm(current.term)}`}
                </p>
            </div>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>Included Modules</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {current.modules.map((moduleItem) => (
                        <div key={moduleItem.moduleRevisionId} className="space-y-2">
                            <p className="text-sm font-medium">
                                {moduleItem.displayName} <span className="font-normal text-muted-foreground">·</span> <code>{moduleItem.key}</code>
                            </p>
                            <CommercialCatalogChipList
                                items={moduleItem.features.map((feature) => ({
                                    id: feature.featureRevisionId,
                                    label: feature.displayName,
                                    hint: feature.key,
                                }))}
                                empty="No Features"
                            />
                        </div>
                    ))}
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="pb-3">
                    <CardTitle>Resolved Features</CardTitle>
                </CardHeader>
                <CardContent>
                    <CommercialCatalogChipList
                        items={current.resolvedFeatures.map((feature) => ({
                            id: feature.featureId,
                            label: feature.displayName,
                            hint: feature.key,
                        }))}
                        empty="No Features are resolved through these Modules."
                    />
                </CardContent>
            </Card>
        </section>
    );
};

export default CommercialCatalogPlansPage;
export type { CommercialCatalogPlansPageProps };
