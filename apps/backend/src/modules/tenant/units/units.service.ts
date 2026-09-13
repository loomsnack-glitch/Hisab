import {
    STATUS_CODES,
    normalizeUnitToken,
    type CreateUnitSVC,
    type ServiceResponse,
    type UnitDTO,
    type UnitResponse,
    type UnitsListResponse,
    type UpdateUnitSVC,
} from "@repo/types";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import * as unitsRepository from "./units.repository";

const isUniqueViolation = (error: unknown): boolean =>
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "23505";

const uniqueNameOrLabelConflict = (): ServiceResponse<null> => ({
    status: "error",
    message: "A Unit with this name or label already exists in this organization",
    data: null,
    code: STATUS_CODES.CONFLICT,
});

const getOrganizationForUser = async (organizationId: string, userId: string) =>
    organizationRepository.getOrganizationByIdForUser(organizationId, userId);

const organizationNotFound = (): ServiceResponse<null> => ({
    status: "error",
    message: "Organization not found",
    data: null,
    code: STATUS_CODES.NOT_FOUND,
});

const unitNotFound = (): ServiceResponse<null> => ({
    status: "error",
    message: "Unit not found",
    data: null,
    code: STATUS_CODES.NOT_FOUND,
});

const tokensToCheck = (name: string, label: string): string[] => {
    const nameToken = normalizeUnitToken(name);
    const labelToken = normalizeUnitToken(label);
    return nameToken === labelToken ? [nameToken] : [nameToken, labelToken];
};

const tokenAlreadyTaken = async (
    organizationId: string,
    name: string,
    label: string,
    excludeId?: string,
): Promise<boolean> => {
    for (const token of tokensToCheck(name, label)) {
        const exists = await unitsRepository.unitTokenExistsInOrganization(
            organizationId,
            token,
            excludeId,
        );
        if (exists) {
            return true;
        }
    }
    return false;
};

export const getUnits = async (
    userId: string,
    organizationId: string,
): Promise<ServiceResponse<UnitsListResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const units = await unitsRepository.getUnitsByOrganizationId(organizationId);
    return {
        status: "success",
        data: { units },
        message: "Units fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const getUnitDetails = async (
    userId: string,
    organizationId: string,
    unitId: string,
): Promise<ServiceResponse<UnitResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const unit = await unitsRepository.getUnitById(organizationId, unitId);
    if (!unit) {
        return unitNotFound();
    }

    return {
        status: "success",
        data: { unit },
        message: "Unit fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const createUnit = async (
    userId: string,
    organizationId: string,
    unitData: CreateUnitSVC,
): Promise<ServiceResponse<UnitResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    if (await tokenAlreadyTaken(organizationId, unitData.name, unitData.label)) {
        return uniqueNameOrLabelConflict();
    }

    try {
        const unit = await unitsRepository.createUnit({
            id: crypto.randomUUID(),
            organizationId,
            name: unitData.name,
            label: unitData.label,
            kind: "custom",
            predefinedKey: null,
            status: unitData.status ?? "active",
            createdBy: userId,
        });

        if (!unit) {
            return {
                status: "error",
                message: "Failed to create unit",
                data: null,
                code: STATUS_CODES.INTERNAL_SERVER_ERROR,
            };
        }

        return {
            status: "success",
            data: { unit },
            message: "Unit created successfully",
            code: STATUS_CODES.CREATED,
        };
    } catch (error) {
        if (isUniqueViolation(error)) {
            return uniqueNameOrLabelConflict();
        }
        throw error;
    }
};

export const updateUnit = async (
    userId: string,
    organizationId: string,
    unitId: string,
    unitData: UpdateUnitSVC,
): Promise<ServiceResponse<UnitResponse | null>> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return organizationNotFound();
    }

    const existing = await unitsRepository.getUnitById(organizationId, unitId);
    if (!existing) {
        return unitNotFound();
    }

    if (
        existing.kind === "predefined" &&
        (unitData.name !== undefined || unitData.label !== undefined)
    ) {
        return {
            status: "error",
            message: "Predefined Unit definitions cannot be edited",
            data: null,
            code: STATUS_CODES.BAD_REQUEST,
        };
    }

    const nextName = unitData.name ?? existing.name;
    const nextLabel = unitData.label ?? existing.label;
    const nextStatus = unitData.status ?? existing.status;

    const nameChanged = normalizeUnitToken(nextName) !== normalizeUnitToken(existing.name);
    const labelChanged = normalizeUnitToken(nextLabel) !== normalizeUnitToken(existing.label);
    if (nameChanged || labelChanged) {
        if (await tokenAlreadyTaken(organizationId, nextName, nextLabel, unitId)) {
            return uniqueNameOrLabelConflict();
        }
    }

    try {
        const unit = await unitsRepository.updateUnit({
            id: unitId,
            organizationId,
            name: nextName,
            label: nextLabel,
            status: nextStatus,
            updatedBy: userId,
        });

        if (!unit) {
            return {
                status: "error",
                message: "Failed to update unit",
                data: null,
                code: STATUS_CODES.INTERNAL_SERVER_ERROR,
            };
        }

        return {
            status: "success",
            data: { unit },
            message: "Unit updated successfully",
            code: STATUS_CODES.SUCCESS,
        };
    } catch (error) {
        if (isUniqueViolation(error)) {
            return uniqueNameOrLabelConflict();
        }
        throw error;
    }
};

export const seedDefaultUnits = async (
    organizationId: string,
    createdBy: string,
    tx?: Bun.TransactionSQL,
): Promise<UnitDTO[]> => {
    return unitsRepository.seedDefaultUnits(organizationId, createdBy, tx);
};
