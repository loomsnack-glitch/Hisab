import {
    STATUS_CODES,
    resolveActiveStoreWindow,
    resolvePlatformReportingPeriod,
    type PlatformDashboardQuerySVC,
    type PlatformDashboardResponse,
    type PlatformOrganizationListQuerySVC,
    type PlatformOrganizationListResponse,
    type ServiceResponse,
} from "@repo/types";
import * as platformReportingRepository from "./platform-reporting.repository";

type PlatformReportingRepository = Pick<typeof platformReportingRepository, "getDashboardMetrics" | "listOrganizations">;

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
                organizations: metrics.organizations.map((organization) => ({
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
                })),
                pagination: {
                    page: query.page,
                    limit: query.limit,
                    totalCount: metrics.totalCount,
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
