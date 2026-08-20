import { useEffect } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { getPlatformOrganization as getPlatformOrganizationRequest } from "@repo/services";
import {
    PLATFORM_REPORTING_TIMEZONE,
    formatPhoneDisplay,
    type PlatformDashboardQueryJSON,
    type PlatformOrganizationDetailQueryJSON,
} from "@repo/types";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/table";

const organizationDetailQueryKey = ["platform-owner", "organization"] as const;

type PlatformOrganizationDetailPageProps = {
    organizationId: string;
    onBack: () => void;
    reportingQuery?: PlatformDashboardQueryJSON;
    getPlatformOrganization?: typeof getPlatformOrganizationRequest;
    onUnauthorized?: () => Promise<void>;
};

const formatCompletedSalesValue = (value: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(value);

const formatLastCompletedSale = (value: string | Date | null) => {
    if (!value) return "No completed Sale";
    return new Intl.DateTimeFormat("en-IN", {
        timeZone: PLATFORM_REPORTING_TIMEZONE,
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date(value));
};

const reportingPeriodLabel = (query: PlatformDashboardQueryJSON) => {
    const period = query.period ?? "all-time";
    if (period === "all-time") return "All-time";
    if (period === "custom") {
        return `Custom ${query.startDate ?? ""} to ${query.endDate ?? ""} in Asia/Kolkata`;
    }
    if (period === "7d") return "7-day";
    if (period === "30d") return "30-day";
    return "90-day";
};

const toDetailQuery = (reportingQuery: PlatformDashboardQueryJSON): PlatformOrganizationDetailQueryJSON => {
    const period = reportingQuery.period ?? "all-time";
    return period === "custom"
        ? { period: "custom", startDate: reportingQuery.startDate, endDate: reportingQuery.endDate }
        : { period };
};

const MetricCard = ({ label, value }: { label: string; value: string }) => (
    <Card>
        <CardHeader>
            <CardDescription>{label}</CardDescription>
            <CardTitle>{value}</CardTitle>
        </CardHeader>
    </Card>
);

const PlatformOrganizationDetailPage = ({
    organizationId,
    onBack,
    reportingQuery = { period: "all-time" },
    getPlatformOrganization = getPlatformOrganizationRequest,
    onUnauthorized,
}: PlatformOrganizationDetailPageProps) => {
    const detailQueryInput = toDetailQuery(reportingQuery);
    const detailQuery = useQuery({
        queryKey: [...organizationDetailQueryKey, organizationId, detailQueryInput],
        queryFn: () => getPlatformOrganization(organizationId, detailQueryInput),
        retry: false,
        placeholderData: keepPreviousData,
    });
    const response = detailQuery.data;
    const organization = response?.status === "success" ? response.data?.organization : undefined;
    const errorCode = (detailQuery.error as { code?: number } | null)?.code ?? (response?.status === "error" ? response.code : undefined);
    const errorMessage =
        (detailQuery.error as { message?: string } | null)?.message
        ?? (response?.status === "error" ? response.message : undefined);

    useEffect(() => {
        if (errorCode === 401) void onUnauthorized?.();
    }, [errorCode, onUnauthorized]);

    return (
        <section className="space-y-6">
            <div className="space-y-1">
                <Button type="button" variant="ghost" className="-ml-3" onClick={onBack}>
                    <ArrowLeft className="size-4" /> Back to Organizations
                </Button>
                <h1 className="text-3xl font-semibold tracking-tight">
                    {organization?.name ?? "Organization"}
                </h1>
                <p className="text-slate-600">
                    Read-only adoption drill-down. Active Store uses the preceding seven calendar days in Asia/Kolkata
                    and does not follow the selected Platform Reporting Period.
                </p>
            </div>

            <p>
                Reporting metrics use the {reportingPeriodLabel(reportingQuery)} Platform Reporting Period. Change the
                period on the Dashboard.
            </p>

            {detailQuery.isLoading ? (
                <p aria-busy="true">Loading Organization…</p>
            ) : errorCode === 401 ? (
                <Alert variant="destructive" role="alert">
                    <AlertTitle>Owner session is no longer valid</AlertTitle>
                    <AlertDescription>
                        {errorMessage ?? "Sign in again to continue using Ganatri Console."}
                    </AlertDescription>
                </Alert>
            ) : errorCode === 404 || errorMessage === "Organization not found" ? (
                <Alert role="alert">
                    <AlertTitle>Organization was not found</AlertTitle>
                    <AlertDescription>
                        This Organization is not available. Return to the outreach list to continue.
                    </AlertDescription>
                </Alert>
            ) : detailQuery.isError || response?.status === "error" ? (
                <Alert variant="destructive" role="alert">
                    <AlertTitle>Organization could not be loaded</AlertTitle>
                    <AlertDescription>{errorMessage ?? "The Organization detail is unavailable."}</AlertDescription>
                </Alert>
            ) : organization ? (
                <div className="space-y-8">
                    <section className="space-y-3" aria-label="Organization identity">
                        <div className="flex flex-wrap items-center gap-3">
                            <p className="text-slate-500">{organization.username}</p>
                            <Badge variant={organization.isActive ? "secondary" : "outline"}>
                                {organization.isActive ? "Active Organization" : "Inactive"}
                            </Badge>
                        </div>
                        <div>
                            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Creator</h2>
                            <p>{`${organization.creator.firstName} ${organization.creator.lastName}`}</p>
                            <p className="text-slate-500">{formatPhoneDisplay(organization.creator.phone)}</p>
                        </div>
                    </section>

                    <section className="space-y-3" aria-label="Organization adoption health">
                        <h2 className="text-xl font-semibold">Organization adoption health</h2>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            <MetricCard
                                label="Stores"
                                value={`${organization.activeStoreCount} Active Store / ${organization.storeCount}`}
                            />
                            <MetricCard label="Customer Count" value={String(organization.customerCount)} />
                            <MetricCard label="Completed Sales" value={String(organization.completedSaleCount)} />
                            <MetricCard
                                label="Completed Sales Value"
                                value={formatCompletedSalesValue(organization.completedSalesValue)}
                            />
                            <MetricCard
                                label="Last completed Sale"
                                value={formatLastCompletedSale(organization.lastCompletedSaleAt)}
                            />
                        </div>
                    </section>

                    <section className="space-y-3" aria-label="Stores">
                        <div>
                            <h2 className="text-xl font-semibold">Stores</h2>
                            <p className="text-sm text-slate-600">
                                Store activity is independent of the selected Platform Reporting Period.
                            </p>
                        </div>
                        {organization.stores.length === 0 ? (
                            <p>This Organization has no Stores.</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Store</TableHead>
                                        <TableHead>Activity</TableHead>
                                        <TableHead>Customer Count</TableHead>
                                        <TableHead>Completed Sales</TableHead>
                                        <TableHead>Completed Sales Value</TableHead>
                                        <TableHead>Last completed Sale</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {organization.stores.map((store) => (
                                        <TableRow key={store.id}>
                                            <TableCell className="font-medium">{store.name}</TableCell>
                                            <TableCell>
                                                <Badge variant={store.isActive ? "secondary" : "outline"}>
                                                    {store.isActive ? "Active Store" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{store.customerCount}</TableCell>
                                            <TableCell>{store.completedSaleCount}</TableCell>
                                            <TableCell>{formatCompletedSalesValue(store.completedSalesValue)}</TableCell>
                                            <TableCell>{formatLastCompletedSale(store.lastCompletedSaleAt)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </section>
                </div>
            ) : null}
        </section>
    );
};

export default PlatformOrganizationDetailPage;
export type { PlatformOrganizationDetailPageProps };
