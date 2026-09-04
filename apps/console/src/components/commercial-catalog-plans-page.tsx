import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, PackagePlus, Search } from "lucide-react";
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
    type CommercialCatalogTermUnit,
    type CommercialFeatureListStatusFilter,
    type CommercialModuleListItemDTO,
    type CommercialPlanListQueryJSON,
    type CommercialPlanRevisionDTO,
    type CommercialPlanType,
    type CreateCommercialPlanJSON,
} from "@repo/types";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { DataTableFacetedFilter } from "@repo/ui/components/data-table-faceted-filter";
import { Input } from "@repo/ui/components/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/table";
import { Textarea } from "@repo/ui/components/textarea";

import {
    commercialCatalogActorName,
    commercialCatalogPlanTypeLabels,
    commercialCatalogStatusBadge,
    commercialCatalogStatusFilterOptions,
    commercialCatalogUnauthorizedCode,
    formatCommercialCatalogAuditTime,
    formatCommercialCatalogInr,
    formatCommercialCatalogTerm,
} from "@/components/commercial-catalog-ui";
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
    kind: "publish" | "retire" | "discard" | "successor";
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
    initialCreateValues?: CreateCommercialPlanJSON;
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
    initialCreateValues,
    onUnauthorized,
}: CommercialCatalogPlansPageProps) => {
    const queryClient = useQueryClient();
    const [location, setLocation] = useState<CommercialCatalogLocation>(() =>
        typeof window === "undefined" ? { kind: "plans" } : resolvePlansLocation(window.location.pathname),
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
    const listQuery: CommercialPlanListQueryJSON = {
        ...(search.trim() ? { search: search.trim() } : {}),
        status,
    };

    useEffect(() => {
        const syncLocation = () => setLocation(resolvePlansLocation(window.location.pathname));
        window.addEventListener("popstate", syncLocation);
        return () => window.removeEventListener("popstate", syncLocation);
    }, []);

    const openList = () => {
        const path = commercialCatalogPlansListPath({ search: search.trim() || undefined, status });
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
        queryKey: [...plansQueryKey, listQuery],
        queryFn: () => listCommercialPlans(listQuery),
        retry: false,
        enabled: location.kind === "plans",
    });
    const plans = plansQuery.data?.status === "success" ? plansQuery.data.data?.plans ?? [] : [];
    const listErrorCode = commercialCatalogUnauthorizedCode(plansQuery.error, plansQuery.data);

    useEffect(() => {
        if (listErrorCode === 401) void onUnauthorized?.();
    }, [listErrorCode, onUnauthorized]);

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
            setShowCreateForm(false);
            await queryClient.invalidateQueries({ queryKey: plansQueryKey });
            if (planId) openPlan(planId);
        },
        onError: (error: { message?: string; code?: number }) => {
            if (error.code === 401) void onUnauthorized?.();
            setFormError(error.message ?? "Draft Plan was not created");
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

    return (
        <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Commercial Catalog</p>
                    <h1 className="text-3xl font-semibold tracking-tight">Plans</h1>
                    <p className="text-muted-foreground">
                        Bundle Modules into reusable Store offerings. A Plan never includes Features directly.
                    </p>
                </div>
                <Button type="button" onClick={() => { setShowCreateForm(true); setFormError(null); }}>
                    <PackagePlus className="size-4" /> Add Plan
                </Button>
            </div>

            {showCreateForm ? (
                <PlanEditor
                    title="Create Draft Plan"
                    modulesQueryFn={listCommercialModules}
                    initialValues={initialCreateValues}
                    submitLabel="Create Draft Plan"
                    pendingLabel="Creating..."
                    errorTitle="Draft Plan was not created"
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
                        placeholder="Search Plans by name or key"
                        aria-label="Search Plans by name or key"
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
                    <CardHeader>
                        <CardTitle>Plan catalog</CardTitle>
                        <CardDescription>Each Plan shows its current revision, type, INR price, and calendar term.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {plans.length === 0 ? (
                            <p>No Plans match this view.</p>
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
    title: string;
    modulesQueryFn: typeof listCommercialModulesRequest;
    initialValues?: CreateCommercialPlanJSON;
    lockedKey?: string;
    submitLabel: string;
    pendingLabel: string;
    errorTitle: string;
    formError: string | null;
    isPending: boolean;
    onCancel?: () => void;
    onSubmit: (values: CreateCommercialPlanJSON) => void;
};

const PlanEditor = ({
    title,
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
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>
                    Select one or more exact Module revisions. Plans cannot include Features directly.
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
                    <label className="block space-y-2 text-sm font-medium">
                        Plan type
                        <select
                            className="border-input h-9 rounded-lg border bg-transparent px-2.5 text-sm"
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
                    <fieldset className="space-y-2">
                        <legend className="text-sm font-medium">Module revisions</legend>
                        {modulesQuery.isPending ? (
                            <p aria-busy="true">Loading Modules…</p>
                        ) : modules.length === 0 ? (
                            <p>No Modules are available to include.</p>
                        ) : (
                            <ul className="space-y-2">
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
                                                {moduleItem.displayName} · <code>{moduleItem.key}</code> · revision {moduleItem.revisionNumber}
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
            await invalidate();
        },
        onError: (error: { message?: string; code?: number }) => {
            if (error.code === 401) void onUnauthorized?.();
            setActionError(error.message ?? "The Plan revision was not updated");
        },
    });

    const confirmCopy: Record<PendingAction["kind"], { title: string; body: string; confirm: string }> = {
        publish: {
            title: "Publish this Plan revision?",
            body: "Publishing makes this revision Active and immutable, including its selected Modules, price, and term. If another revision is Active, it will be Retired.",
            confirm: "Publish revision",
        },
        retire: {
            title: "Retire this Plan revision?",
            body: "The Active revision will become unavailable for future catalog composition. Its history stays retained.",
            confirm: "Retire revision",
        },
        discard: {
            title: "Discard this Draft Plan?",
            body: "The unused Draft will leave the working catalog. Its Commercial Catalog Key cannot be reused.",
            confirm: "Confirm discard",
        },
        successor: {
            title: "Create a successor Draft revision?",
            body: "The current revision stays unchanged until the successor Draft is published.",
            confirm: "Confirm successor revision",
        },
    };

    if (planQuery.isPending) {
        return <p aria-busy="true">Loading Plan…</p>;
    }
    if (!planDetail || !current || planQuery.isError || planQuery.data?.status === "error") {
        return (
            <section className="space-y-4">
                <Button type="button" variant="ghost" onClick={onBack}>
                    <ChevronLeft className="size-4" /> Back to Plans
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
            <div className="space-y-3">
                <Button type="button" variant="ghost" onClick={onBack}>
                    <ChevronLeft className="size-4" /> Back to Plans
                </Button>
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                        <p className="text-sm font-medium text-muted-foreground">Commercial Catalog · Plans</p>
                        <h1 className="text-3xl font-semibold tracking-tight">{current.displayName}</h1>
                        <p className="text-muted-foreground">
                            Key <code>{planDetail.key}</code> · Revision {current.revisionNumber}
                        </p>
                    </div>
                    {commercialCatalogStatusBadge(current.status)}
                </div>
            </div>

            {pendingAction ? (
                <div role="alertdialog" aria-labelledby="plan-action-title" className="rounded-xl border bg-card p-4 shadow-sm">
                    <h2 id="plan-action-title" className="text-lg font-semibold">{confirmCopy[pendingAction.kind].title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{confirmCopy[pendingAction.kind].body}</p>
                    {actionError ? (
                        <Alert variant="destructive" className="mt-3" role="alert">
                            <AlertTitle>The Plan revision was not updated</AlertTitle>
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
                <PlanEditor
                    title="Current revision"
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
                    onSubmit={(values) => updateMutation.mutate(values)}
                />
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Current revision</CardTitle>
                        <CardDescription>Active and historical revisions are retained. Create a successor Draft to make a change.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4">
                        <p><span className="font-medium">Key:</span> <code>{planDetail.key}</code></p>
                        <p><span className="font-medium">Display name:</span> {current.displayName}</p>
                        <p><span className="font-medium">Description:</span> {current.description || "—"}</p>
                        <p><span className="font-medium">Plan type:</span> {commercialCatalogPlanTypeLabels[current.planType]}</p>
                        <p>
                            <span className="font-medium">Price / term:</span>{" "}
                            {`${formatCommercialCatalogInr(current.priceInr)} / ${formatCommercialCatalogTerm(current.term)}`}
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
                    <CardTitle>Included Modules</CardTitle>
                    <CardDescription>This Plan pins exact Module revisions. Features are reached only through those Modules.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {current.modules.map((moduleItem) => (
                        <article key={moduleItem.moduleRevisionId} className="space-y-2">
                            <p>
                                {moduleItem.displayName} · <code>{moduleItem.key}</code> · revision {moduleItem.revisionNumber} · {moduleItem.status}
                            </p>
                            <ul className="space-y-1 pl-4 text-sm text-muted-foreground">
                                {moduleItem.features.map((feature) => (
                                    <li key={feature.featureRevisionId}>
                                        {feature.displayName} · <code>{feature.key}</code> · revision {feature.revisionNumber}
                                    </li>
                                ))}
                            </ul>
                        </article>
                    ))}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Resolved Features</CardTitle>
                    <CardDescription>Capabilities a customer would receive through the selected Modules. This is review only.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ul className="space-y-2">
                        {current.resolvedFeatures.map((feature) => (
                            <li key={feature.featureId}>
                                {feature.displayName} · <code>{feature.key}</code> · revision {feature.revisionNumber} · {feature.status}
                            </li>
                        ))}
                    </ul>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Revision history</CardTitle>
                    <CardDescription>Who created, published, retired, or discarded each revision.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {planDetail.revisions.map((revision) => (
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

export default CommercialCatalogPlansPage;
export type { CommercialCatalogPlansPageProps };
