import {
    STATUS_CODES,
    type CommercialCatalogRevisionStatus,
    type CommercialFeatureDetailResponse,
    type CommercialFeatureListQuerySVC,
    type CommercialFeatureListResponse,
    type CommercialModuleDetailResponse,
    type CommercialModuleListQuerySVC,
    type CommercialModuleListResponse,
    type CreateCommercialFeatureSVC,
    type CreateCommercialModuleSVC,
    type OwnerUserDTO,
    type ServiceResponse,
    type UpdateCommercialFeatureDraftSVC,
    type UpdateCommercialModuleDraftSVC,
} from "@repo/types";
import * as commercialCatalogRepository from "./commercial-catalog.repository";
import type { InvalidMembershipReason } from "./commercial-catalog.repository";

type CommercialCatalogRepository = Pick<
    typeof commercialCatalogRepository,
    | "listFeatures"
    | "getFeatureDetail"
    | "createDraftFeature"
    | "updateDraftRevision"
    | "publishRevision"
    | "retireRevision"
    | "discardRevision"
    | "createSuccessorRevision"
    | "listModules"
    | "getModuleDetail"
    | "createDraftModule"
    | "updateDraftModuleRevision"
    | "publishModuleRevision"
    | "retireModuleRevision"
    | "discardModuleRevision"
    | "createSuccessorModuleRevision"
>;

type CommercialCatalogDependencies = {
    repository: CommercialCatalogRepository;
    createId: () => string;
    now: () => Date;
};

export type CommercialCatalogService = ReturnType<typeof createCommercialCatalogService>;

const notFound = (): ServiceResponse<CommercialFeatureDetailResponse | null> => ({
    status: "error",
    message: "Feature not found",
    data: null,
    code: STATUS_CODES.NOT_FOUND,
});

const revisionNotFound = (): ServiceResponse<CommercialFeatureDetailResponse | null> => ({
    status: "error",
    message: "Feature revision not found",
    data: null,
    code: STATUS_CODES.NOT_FOUND,
});

const notDraftEdit = (
    currentStatus: CommercialCatalogRevisionStatus,
): ServiceResponse<CommercialFeatureDetailResponse | null> => ({
    status: "error",
    message: currentStatus === "active"
        ? "Active Feature revisions are immutable"
        : "Only Draft revisions can be edited",
    data: null,
    code: STATUS_CODES.CONFLICT,
});

const successFeature = (
    message: string,
    feature: CommercialFeatureDetailResponse["feature"],
    code: typeof STATUS_CODES.SUCCESS | typeof STATUS_CODES.CREATED = STATUS_CODES.SUCCESS,
): ServiceResponse<CommercialFeatureDetailResponse> => ({
    status: "success",
    message,
    data: { feature },
    code,
});

const notFoundModule = (): ServiceResponse<CommercialModuleDetailResponse | null> => ({
    status: "error",
    message: "Module not found",
    data: null,
    code: STATUS_CODES.NOT_FOUND,
});

const revisionNotFoundModule = (): ServiceResponse<CommercialModuleDetailResponse | null> => ({
    status: "error",
    message: "Module revision not found",
    data: null,
    code: STATUS_CODES.NOT_FOUND,
});

const notDraftModuleEdit = (
    currentStatus: CommercialCatalogRevisionStatus,
): ServiceResponse<CommercialModuleDetailResponse | null> => ({
    status: "error",
    message: currentStatus === "active"
        ? "Active Module revisions are immutable"
        : "Only Draft revisions can be edited",
    data: null,
    code: STATUS_CODES.CONFLICT,
});

const successModule = (
    message: string,
    moduleDetail: CommercialModuleDetailResponse["module"],
    code: typeof STATUS_CODES.SUCCESS | typeof STATUS_CODES.CREATED = STATUS_CODES.SUCCESS,
): ServiceResponse<CommercialModuleDetailResponse> => ({
    status: "success",
    message,
    data: { module: moduleDetail },
    code,
});

const membershipError = (
    reason: InvalidMembershipReason,
): ServiceResponse<CommercialModuleDetailResponse | null> => {
    if (reason === "empty") {
        return {
            status: "error",
            message: "A Module must include at least one Feature revision",
            data: null,
            code: STATUS_CODES.BAD_REQUEST,
        };
    }
    if (reason === "not-found") {
        return {
            status: "error",
            message: "One or more Feature revisions were not found",
            data: null,
            code: STATUS_CODES.BAD_REQUEST,
        };
    }
    if (reason === "discarded") {
        return {
            status: "error",
            message: "A discarded Feature revision cannot be included in a Module",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }
    return {
        status: "error",
        message: "A Module can include a Feature only once",
        data: null,
        code: STATUS_CODES.CONFLICT,
    };
};

export const createCommercialCatalogService = (dependencies: CommercialCatalogDependencies) => ({
    listFeatures: async (
        query: CommercialFeatureListQuerySVC,
    ): Promise<ServiceResponse<CommercialFeatureListResponse>> => ({
        status: "success",
        message: "Features retrieved successfully",
        data: { features: await dependencies.repository.listFeatures(query) },
        code: STATUS_CODES.SUCCESS,
    }),

    getFeature: async (featureId: string): Promise<ServiceResponse<CommercialFeatureDetailResponse | null>> => {
        const feature = await dependencies.repository.getFeatureDetail(featureId);
        if (!feature) {
            return notFound();
        }
        return successFeature("Feature retrieved successfully", feature);
    },

    createFeature: async (
        actor: OwnerUserDTO,
        input: CreateCommercialFeatureSVC,
    ): Promise<ServiceResponse<CommercialFeatureDetailResponse | null>> => {
        const result = await dependencies.repository.createDraftFeature({
            featureId: dependencies.createId(),
            revisionId: dependencies.createId(),
            key: input.key,
            displayName: input.displayName,
            description: input.description,
            actorId: actor.id,
            now: dependencies.now(),
        });
        if (result.status === "duplicate-key") {
            return {
                status: "error",
                message: "A Feature with that Commercial Catalog Key already exists",
                data: null,
                code: STATUS_CODES.CONFLICT,
            };
        }
        return successFeature("Draft Feature created successfully", result.feature, STATUS_CODES.CREATED);
    },

    updateDraft: async (
        featureId: string,
        revisionId: string,
        input: UpdateCommercialFeatureDraftSVC,
    ): Promise<ServiceResponse<CommercialFeatureDetailResponse | null>> => {
        const result = await dependencies.repository.updateDraftRevision({
            featureId,
            revisionId,
            displayName: input.displayName,
            description: input.description,
        });
        if (result.status === "not-found") {
            return revisionNotFound();
        }
        if (result.status === "not-draft") {
            return notDraftEdit(result.currentStatus);
        }
        return successFeature("Draft Feature updated successfully", result.feature);
    },

    publishRevision: async (
        actor: OwnerUserDTO,
        featureId: string,
        revisionId: string,
    ): Promise<ServiceResponse<CommercialFeatureDetailResponse | null>> => {
        const result = await dependencies.repository.publishRevision({
            featureId,
            revisionId,
            actorId: actor.id,
            now: dependencies.now(),
        });
        if (result.status === "not-found") {
            return revisionNotFound();
        }
        if (result.status === "not-draft") {
            return {
                status: "error",
                message: result.currentStatus === "active"
                    ? "Active Feature revisions are immutable"
                    : "Only Draft revisions can be published",
                data: null,
                code: STATUS_CODES.CONFLICT,
            };
        }
        return successFeature("Feature revision published successfully", result.feature);
    },

    retireRevision: async (
        actor: OwnerUserDTO,
        featureId: string,
        revisionId: string,
    ): Promise<ServiceResponse<CommercialFeatureDetailResponse | null>> => {
        const result = await dependencies.repository.retireRevision({
            featureId,
            revisionId,
            actorId: actor.id,
            now: dependencies.now(),
        });
        if (result.status === "not-found") {
            return revisionNotFound();
        }
        if (result.status === "not-active") {
            return {
                status: "error",
                message: "Only Active revisions can be retired",
                data: null,
                code: STATUS_CODES.CONFLICT,
            };
        }
        return successFeature("Feature revision retired successfully", result.feature);
    },

    discardRevision: async (
        actor: OwnerUserDTO,
        featureId: string,
        revisionId: string,
    ): Promise<ServiceResponse<CommercialFeatureDetailResponse | null>> => {
        const result = await dependencies.repository.discardRevision({
            featureId,
            revisionId,
            actorId: actor.id,
            now: dependencies.now(),
        });
        if (result.status === "not-found") {
            return revisionNotFound();
        }
        if (result.status === "not-draft") {
            return {
                status: "error",
                message: result.currentStatus === "active"
                    ? "Active Feature revisions are immutable"
                    : "Only Draft revisions can be discarded",
                data: null,
                code: STATUS_CODES.CONFLICT,
            };
        }
        return successFeature("Draft Feature discarded successfully", result.feature);
    },

    createSuccessor: async (
        actor: OwnerUserDTO,
        featureId: string,
        revisionId: string,
    ): Promise<ServiceResponse<CommercialFeatureDetailResponse | null>> => {
        const result = await dependencies.repository.createSuccessorRevision({
            featureId,
            revisionId,
            successorRevisionId: dependencies.createId(),
            actorId: actor.id,
            now: dependencies.now(),
        });
        if (result.status === "not-found") {
            return revisionNotFound();
        }
        if (result.status === "draft-exists") {
            return {
                status: "error",
                message: "A Draft revision already exists for this Feature",
                data: null,
                code: STATUS_CODES.CONFLICT,
            };
        }
        if (result.status === "invalid-source") {
            return {
                status: "error",
                message: "A successor can only be created from an Active or Retired revision",
                data: null,
                code: STATUS_CODES.CONFLICT,
            };
        }
        return successFeature("Successor Feature revision created successfully", result.feature, STATUS_CODES.CREATED);
    },

    listModules: async (
        query: CommercialModuleListQuerySVC,
    ): Promise<ServiceResponse<CommercialModuleListResponse>> => ({
        status: "success",
        message: "Modules retrieved successfully",
        data: { modules: await dependencies.repository.listModules(query) },
        code: STATUS_CODES.SUCCESS,
    }),

    getModule: async (moduleId: string): Promise<ServiceResponse<CommercialModuleDetailResponse | null>> => {
        const moduleDetail = await dependencies.repository.getModuleDetail(moduleId);
        if (!moduleDetail) {
            return notFoundModule();
        }
        return successModule("Module retrieved successfully", moduleDetail);
    },

    createModule: async (
        actor: OwnerUserDTO,
        input: CreateCommercialModuleSVC,
    ): Promise<ServiceResponse<CommercialModuleDetailResponse | null>> => {
        const result = await dependencies.repository.createDraftModule({
            moduleId: dependencies.createId(),
            revisionId: dependencies.createId(),
            key: input.key,
            displayName: input.displayName,
            description: input.description,
            isSeparatelyPurchasable: input.isSeparatelyPurchasable,
            priceInr: input.priceInr,
            term: input.term,
            featureRevisionIds: input.featureRevisionIds,
            actorId: actor.id,
            now: dependencies.now(),
        });
        if (result.status === "duplicate-key") {
            return {
                status: "error",
                message: "A Module with that Commercial Catalog Key already exists",
                data: null,
                code: STATUS_CODES.CONFLICT,
            };
        }
        if (result.status === "invalid-membership") {
            return membershipError(result.reason);
        }
        return successModule("Draft Module created successfully", result.module, STATUS_CODES.CREATED);
    },

    updateModuleDraft: async (
        moduleId: string,
        revisionId: string,
        input: UpdateCommercialModuleDraftSVC,
    ): Promise<ServiceResponse<CommercialModuleDetailResponse | null>> => {
        const result = await dependencies.repository.updateDraftModuleRevision({
            moduleId,
            revisionId,
            displayName: input.displayName,
            description: input.description,
            isSeparatelyPurchasable: input.isSeparatelyPurchasable,
            priceInr: input.priceInr,
            term: input.term,
            featureRevisionIds: input.featureRevisionIds,
        });
        if (result.status === "not-found") {
            return revisionNotFoundModule();
        }
        if (result.status === "not-draft") {
            return notDraftModuleEdit(result.currentStatus);
        }
        if (result.status === "invalid-membership") {
            return membershipError(result.reason);
        }
        return successModule("Draft Module updated successfully", result.module);
    },

    publishModuleRevision: async (
        actor: OwnerUserDTO,
        moduleId: string,
        revisionId: string,
    ): Promise<ServiceResponse<CommercialModuleDetailResponse | null>> => {
        const result = await dependencies.repository.publishModuleRevision({
            moduleId,
            revisionId,
            actorId: actor.id,
            now: dependencies.now(),
        });
        if (result.status === "not-found") {
            return revisionNotFoundModule();
        }
        if (result.status === "not-draft") {
            return {
                status: "error",
                message: result.currentStatus === "active"
                    ? "Active Module revisions are immutable"
                    : "Only Draft revisions can be published",
                data: null,
                code: STATUS_CODES.CONFLICT,
            };
        }
        if (result.status === "invalid-membership") {
            return membershipError(result.reason);
        }
        return successModule("Module revision published successfully", result.module);
    },

    retireModuleRevision: async (
        actor: OwnerUserDTO,
        moduleId: string,
        revisionId: string,
    ): Promise<ServiceResponse<CommercialModuleDetailResponse | null>> => {
        const result = await dependencies.repository.retireModuleRevision({
            moduleId,
            revisionId,
            actorId: actor.id,
            now: dependencies.now(),
        });
        if (result.status === "not-found") {
            return revisionNotFoundModule();
        }
        if (result.status === "not-active") {
            return {
                status: "error",
                message: "Only Active revisions can be retired",
                data: null,
                code: STATUS_CODES.CONFLICT,
            };
        }
        return successModule("Module revision retired successfully", result.module);
    },

    discardModuleRevision: async (
        actor: OwnerUserDTO,
        moduleId: string,
        revisionId: string,
    ): Promise<ServiceResponse<CommercialModuleDetailResponse | null>> => {
        const result = await dependencies.repository.discardModuleRevision({
            moduleId,
            revisionId,
            actorId: actor.id,
            now: dependencies.now(),
        });
        if (result.status === "not-found") {
            return revisionNotFoundModule();
        }
        if (result.status === "not-draft") {
            return {
                status: "error",
                message: result.currentStatus === "active"
                    ? "Active Module revisions are immutable"
                    : "Only Draft revisions can be discarded",
                data: null,
                code: STATUS_CODES.CONFLICT,
            };
        }
        return successModule("Draft Module discarded successfully", result.module);
    },

    createModuleSuccessor: async (
        actor: OwnerUserDTO,
        moduleId: string,
        revisionId: string,
    ): Promise<ServiceResponse<CommercialModuleDetailResponse | null>> => {
        const result = await dependencies.repository.createSuccessorModuleRevision({
            moduleId,
            revisionId,
            successorRevisionId: dependencies.createId(),
            actorId: actor.id,
            now: dependencies.now(),
        });
        if (result.status === "not-found") {
            return revisionNotFoundModule();
        }
        if (result.status === "draft-exists") {
            return {
                status: "error",
                message: "A Draft revision already exists for this Module",
                data: null,
                code: STATUS_CODES.CONFLICT,
            };
        }
        if (result.status === "invalid-source") {
            return {
                status: "error",
                message: "A successor can only be created from an Active or Retired revision",
                data: null,
                code: STATUS_CODES.CONFLICT,
            };
        }
        return successModule("Successor Module revision created successfully", result.module, STATUS_CODES.CREATED);
    },
});

const defaultDependencies = (): CommercialCatalogDependencies => ({
    repository: commercialCatalogRepository,
    createId: () => crypto.randomUUID(),
    now: () => new Date(),
});

let defaultService: CommercialCatalogService | null = null;

export const getCommercialCatalogService = (): CommercialCatalogService => {
    defaultService ??= createCommercialCatalogService(defaultDependencies());
    return defaultService;
};
