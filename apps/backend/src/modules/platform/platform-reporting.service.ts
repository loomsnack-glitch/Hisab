import {
    STATUS_CODES,
    resolveActiveStoreWindow,
    resolvePlatformReportingPeriod,
    type PlatformDashboardQuerySVC,
    type PlatformDashboardResponse,
    type ServiceResponse,
} from "@repo/types";
import * as platformReportingRepository from "./platform-reporting.repository";

type PlatformReportingRepository = Pick<typeof platformReportingRepository, "getDashboardMetrics">;

type PlatformReportingDependencies = {
    repository: PlatformReportingRepository;
    now: () => Date;
};

export type PlatformReportingService = ReturnType<typeof createPlatformReportingService>;

export const createPlatformReportingService = (dependencies: PlatformReportingDependencies) => ({
    getDashboard: async (
        query: PlatformDashboardQuerySVC,
    ): Promise<ServiceResponse<PlatformDashboardResponse | null>> => {
        const now = dependencies.now();
        const resolved = resolvePlatformReportingPeriod(query, now);
        if (!resolved.ok) {
            return {
                status: "error",
                message: resolved.message,
                data: null,
                code: STATUS_CODES.BAD_REQUEST,
            };
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
