import {
    STATUS_CODES,
    resolveActiveStoreWindow,
    resolvePlatformReportingPeriod,
    type PlatformDashboardQuerySVC,
    type PlatformDashboardResponse,
    type PlatformOrganizationDetailQuerySVC,
    type PlatformOrganizationDetailResponse,
    type PlatformOrganizationListItemDTO,
    type PlatformOrganizationListQuerySVC,
    type PlatformOrganizationListResponse,
    type ServiceResponse,
} from "@repo/types";
import * as platformReportingRepository from "./platform-reporting.repository";
import type { PlatformOrganizationListMetricsRow } from "./platform-reporting.repository";

type PlatformReportingRepository = Pick<
    typeof platformReportingRepository,
    "getDashboardMetrics" | "listOrganizations" | "getOrganizationDetail"
>;

type PlatformReportingDependencies = {
    repository: PlatformReportingRepository;
    now: () => Date;
};

export type PlatformReportingService = ReturnType<typeof createPlatformReportingService>;

const reportingPeriodError = (message: string) => ({
    status: "error" as const,
    message,
    data: null,
    code: STATUS_CODES.BAD_REQUEST,
});

const toOrganizationListItem = (
    organization: PlatformOrganizationListMetricsRow,
): PlatformOrganizationListItemDTO => ({
    id: organization.id,
    name: organization.name,
    username: organization.username,
    isActive: organization.isActive,
    creator: {
        firstName: organization.creatorFirstName,
        lastName: organization.creatorLastName,
        phone: organization.creatorPhone,
    },
    storeCount: organization.storeCount,
    activeStoreCount: organization.activeStoreCount,
    customerCount: organization.customerCount,
    completedSaleCount: organization.completedSaleCount,
    completedSalesValue: organization.completedSalesValue,
    lastCompletedSaleAt: organization.lastCompletedSaleAt,
});

export const createPlatformReportingService = (dependencies: PlatformReportingDependencies) => ({
    getDashboard: async (
        query: PlatformDashboardQuerySVC,
    ): Promise<ServiceResponse<PlatformDashboardResponse | null>> => {
        const now = dependencies.now();
        const resolved = resolvePlatformReportingPeriod(query, now);
        if (!resolved.ok) {
            return reportingPeriodError(resolved.message);
        }

        const activityWindow = resolveActiveStoreWindow(now);
        const metrics = await dependencies.repository.getDashboardMetrics({
            activityStartAt: activityWindow.startAt,
            activityEndAt: activityWindow.endAt,
            periodStartAt: resolved.period.startAt,
            periodEndAt: resolved.period.endAt,
        });

        return {
            status: "success",
            message: "Platform dashboard retrieved successfully",
            data: {
                reportingPeriod: {
                    selection: resolved.period.selection,
                    startDate: resolved.period.startDate,
                    endDate: resolved.period.endDate,
                },
                allTime: {
                    organizationCount: metrics.organizationCount,
                    storeCount: metrics.storeCount,
                    customerCount: metrics.customerCount,
                    completedSaleCount: metrics.completedSaleCount,
                },
                activity: {
                    activeOrganizationCount: metrics.activeOrganizationCount,
                    activeStoreCount: metrics.activeStoreCount,
                },
                reportingPeriodMetrics: {
                    completedSaleCount: metrics.periodCompletedSaleCount,
                    completedSalesValue: metrics.periodCompletedSalesValue,
                    customerCount: metrics.periodCustomerCount,
                },
            },
            code: STATUS_CODES.SUCCESS,
        };
    },

    listOrganizations: async (
        query: PlatformOrganizationListQuerySVC,
    ): Promise<ServiceResponse<PlatformOrganizationListResponse | null>> => {
        const now = dependencies.now();
        const resolved = resolvePlatformReportingPeriod(query, now);
        if (!resolved.ok) {
            return reportingPeriodError(resolved.message);
        }

        const activityWindow = resolveActiveStoreWindow(now);
        const metrics = await dependencies.repository.listOrganizations({
            activityStartAt: activityWindow.startAt,
            activityEndAt: activityWindow.endAt,
            periodStartAt: resolved.period.startAt,
            periodEndAt: resolved.period.endAt,
            search: query.search ?? "",
            activity: query.activity,
            sort: query.sort,
            page: query.page,
            limit: query.limit,
        });

        return {
            status: "success",
            message: "Platform Organizations retrieved successfully",
            data: {
                reportingPeriod: {
                    selection: resolved.period.selection,
                    startDate: resolved.period.startDate,
                    endDate: resolved.period.endDate,
                },
                organizations: metrics.organizations.map(toOrganizationListItem),
                pagination: {
                    page: query.page,
                    limit: query.limit,
                    totalCount: metrics.totalCount,
                },
            },
            code: STATUS_CODES.SUCCESS,
        };
    },

    getOrganization: async (
        organizationId: string,
        query: PlatformOrganizationDetailQuerySVC,
    ): Promise<ServiceResponse<PlatformOrganizationDetailResponse | null>> => {
        const now = dependencies.now();
        const resolved = resolvePlatformReportingPeriod(query, now);
        if (!resolved.ok) {
            return reportingPeriodError(resolved.message);
        }

        const activityWindow = resolveActiveStoreWindow(now);
        const organization = await dependencies.repository.getOrganizationDetail({
            organizationId,
            activityStartAt: activityWindow.startAt,
            activityEndAt: activityWindow.endAt,
            periodStartAt: resolved.period.startAt,
            periodEndAt: resolved.period.endAt,
        });

        if (!organization) {
            return {
                status: "error",
                message: "Organization not found",
                data: null,
                code: STATUS_CODES.NOT_FOUND,
            };
        }

        return {
            status: "success",
            message: "Platform Organization retrieved successfully",
            data: {
                reportingPeriod: {
                    selection: resolved.period.selection,
                    startDate: resolved.period.startDate,
                    endDate: resolved.period.endDate,
                },
                organization: {
                    ...toOrganizationListItem(organization),
                    stores: organization.stores.map((store) => ({
                        id: store.id,
                        name: store.name,
                        isActive: store.isActive,
                        customerCount: store.customerCount,
                        completedSaleCount: store.completedSaleCount,
                        completedSalesValue: store.completedSalesValue,
                        lastCompletedSaleAt: store.lastCompletedSaleAt,
                    })),
                    recentSales: organization.recentSales.map((sale) => ({
                        id: sale.id,
                        saleNumber: sale.saleNumber,
                        status: sale.status,
                        grandTotal: sale.grandTotal,
                        occurredAt: sale.occurredAt,
                        store: {
                            id: sale.storeId,
                            name: sale.storeName,
                        },
                    })),
                },
            },
            code: STATUS_CODES.SUCCESS,
        };
    },
});

const defaultDependencies = (): PlatformReportingDependencies => ({
    repository: platformReportingRepository,
    now: () => new Date(),
});

let defaultService: PlatformReportingService | null = null;

export const getPlatformReportingService = (): PlatformReportingService => {
    defaultService ??= createPlatformReportingService(defaultDependencies());
    return defaultService;
};
