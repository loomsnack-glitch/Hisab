import {
    STATUS_CODES,
    type CommercialCatalogRevisionStatus,
    type CommercialFeatureDetailResponse,
    type CommercialFeatureListQuerySVC,
    type CommercialFeatureListResponse,
    type CreateCommercialFeatureSVC,
    type OwnerUserDTO,
    type ServiceResponse,
    type UpdateCommercialFeatureDraftSVC,
} from "@repo/types";
import * as commercialCatalogRepository from "./commercial-catalog.repository";

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
