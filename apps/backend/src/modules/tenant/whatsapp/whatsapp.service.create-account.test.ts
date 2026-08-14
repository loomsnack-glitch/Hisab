import { beforeEach, describe, expect, mock, test } from "bun:test";

const organizationId = "3b0fedda-b941-4708-a4b6-4a1bcc7d7d61";
const storeId = "be989a67-f3ab-466e-830a-2a8d69387fea";
const userId = "1d90edd7-734e-4d53-a4d3-c972ade17d9e";

const getOrganizationByIdForUser = mock(async () => ({ id: organizationId, name: "Demo" }));
const getStoreById = mock(async () => ({ id: storeId, organizationId, name: "Adajan" }));
const getAccount = mock(async () => null);
const createAccountRepo = mock(async () => {
    throw new Error('relation "whatsapp_accounts" does not exist');
});

mock.module("@/config/redis", () => ({
    redis: {
        set: mock(async () => undefined),
        expire: mock(async () => undefined),
        del: mock(async () => undefined),
    },
}));

mock.module("@/config/minio", () => ({
    default: {},
}));

mock.module("@/services/storage", () => ({
    deleteObject: mock(async () => undefined),
    getSignedUrl: mock(async () => ""),
}));

mock.module("@/modules/tenant/organization/organization.repository", () => ({
    getOrganizationByIdForUser,
    getStoreById,
}));

mock.module("./whatsapp.repository", () => ({
    getAccount,
    createAccount: createAccountRepo,
    updateAccountStatus: mock(async () => null),
    getAccountByPhoneNumber: mock(async () => null),
}));

mock.module("./whatsapp.worker-client", () => ({
    connectAccount: mock(async () => {
        throw new Error("should not connect when insert fails");
    }),
}));

const { createAccount } = await import("./whatsapp.service");

describe("createAccount", () => {
    beforeEach(() => {
        getOrganizationByIdForUser.mockClear();
        getStoreById.mockClear();
        getAccount.mockClear();
        createAccountRepo.mockClear();
        getOrganizationByIdForUser.mockResolvedValue({ id: organizationId, name: "Demo" });
        getStoreById.mockResolvedValue({ id: storeId, organizationId, name: "Adajan" });
        getAccount.mockResolvedValue(null);
    });

    test("returns a 500 response instead of throwing when account insert fails", async () => {
        const response = await createAccount(userId, organizationId, storeId, {
            phoneNumber: "+919876543210",
        });

        expect(response).toEqual({
            status: "error",
            message: "WhatsApp operation failed",
            data: null,
            code: 500,
        });
    });

    test("returns conflict when postgres reports a unique violation", async () => {
        createAccountRepo.mockImplementationOnce(async () => {
            const error = new Error("duplicate key");
            (error as Error & { code: string }).code = "23505";
            throw error;
        });

        const response = await createAccount(userId, organizationId, storeId, {
            phoneNumber: "+919876543210",
        });

        expect(response.code).toBe(409);
        expect(response.message).toBe("This store already has a WhatsApp account");
    });
});
