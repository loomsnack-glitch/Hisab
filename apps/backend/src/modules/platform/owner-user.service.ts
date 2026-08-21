import {
    STATUS_CODES,
    type CreateOwnerUserSVC,
    type OwnerUserActiveStateSVC,
    type OwnerUserDTO,
    type OwnerUserListResponse,
    type OwnerUserRecord,
    type OwnerUserResponse,
    type ServiceResponse,
} from "@repo/types";
import * as ownerUserRepository from "./owner-user.repository";

const sanitizeOwnerUser = ({ passwordHash: _passwordHash, ...ownerUser }: OwnerUserRecord): OwnerUserDTO => ownerUser;

const isUniqueViolation = (error: unknown) =>
    typeof error === "object" && error !== null && "code" in error && error.code === "23505";

type OwnerUserRepository = Pick<
    typeof ownerUserRepository,
    | "listOwnerUsers"
    | "getOwnerUserById"
    | "createOwnerUser"
    | "countActiveOwnerUsers"
    | "updateOwnerUserActiveState"
>;

type OwnerUserDependencies = {
    repository: OwnerUserRepository;
    hashPassword: (password: string) => Promise<string>;
    createId: () => string;
};

export type OwnerUserService = ReturnType<typeof createOwnerUserService>;

const notFound = (): ServiceResponse<OwnerUserResponse | null> => ({
    status: "error",
    message: "Owner User not found",
    data: null,
    code: STATUS_CODES.NOT_FOUND,
});

const lastActiveDenied = (): ServiceResponse<OwnerUserResponse | null> => ({
    status: "error",
    message: "The final active Owner User cannot be deactivated",
    data: null,
    code: STATUS_CODES.CONFLICT,
});

export const createOwnerUserService = (dependencies: OwnerUserDependencies) => ({
    list: async (): Promise<ServiceResponse<OwnerUserListResponse>> => ({
        status: "success",
        message: "Owner Users retrieved successfully",
        data: { ownerUsers: await dependencies.repository.listOwnerUsers() },
        code: STATUS_CODES.SUCCESS,
    }),

    create: async (input: CreateOwnerUserSVC): Promise<ServiceResponse<OwnerUserResponse | null>> => {
        try {
            const result = await dependencies.repository.createOwnerUser({
                id: dependencies.createId(),
                firstName: input.firstName,
                lastName: input.lastName,
                phone: input.phone,
                passwordHash: await dependencies.hashPassword(input.password),
                isActive: true,
            });
            if (result.status === "duplicate-phone") {
                return {
                    status: "error",
                    message: "An Owner User with that phone already exists",
                    data: null,
                    code: STATUS_CODES.CONFLICT,
                };
            }
            if (result.status !== "created") {
                return {
                    status: "error",
                    message: "Owner User was not created",
                    data: null,
                    code: STATUS_CODES.INTERNAL_SERVER_ERROR,
                };
            }

            return {
                status: "success",
                message: "Owner User created successfully",
                data: { ownerUser: sanitizeOwnerUser(result.ownerUser) },
                code: STATUS_CODES.CREATED,
            };
        } catch (error) {
            if (isUniqueViolation(error)) {
                return {
                    status: "error",
                    message: "An Owner User with that phone already exists",
                    data: null,
                    code: STATUS_CODES.CONFLICT,
                };
            }
            throw error;
        }
    },

    setActiveState: async (
        actorId: string,
        ownerUserId: string,
        input: OwnerUserActiveStateSVC,
    ): Promise<ServiceResponse<OwnerUserResponse | null>> => {
        if (!input.isActive && actorId === ownerUserId) {
            const actor = await dependencies.repository.getOwnerUserById(actorId);
            if (!actor) {
                return notFound();
            }
            if (actor.isActive && (await dependencies.repository.countActiveOwnerUsers()) <= 1) {
                return lastActiveDenied();
            }
            return {
                status: "error",
                message: "Owner Users cannot deactivate themselves",
                data: null,
                code: STATUS_CODES.FORBIDDEN,
            };
        }

        const result = await dependencies.repository.updateOwnerUserActiveState(ownerUserId, input.isActive);
        if (result.status === "not-found") {
            return notFound();
        }
        if (result.status === "last-active") {
            return lastActiveDenied();
        }

        return {
            status: "success",
            message: input.isActive ? "Owner User activated successfully" : "Owner User deactivated successfully",
            data: { ownerUser: sanitizeOwnerUser(result.ownerUser) },
            code: STATUS_CODES.SUCCESS,
        };
    },
});

const defaultDependencies = (): OwnerUserDependencies => ({
    repository: ownerUserRepository,
    hashPassword: Bun.password.hash,
    createId: () => crypto.randomUUID(),
});

let defaultService: OwnerUserService | null = null;

export const getOwnerUserService = (): OwnerUserService => {
    defaultService ??= createOwnerUserService(defaultDependencies());
    return defaultService;
};
