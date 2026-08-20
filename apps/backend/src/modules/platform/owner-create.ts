import { OwnerUserSeedSchema, type CreateOwnerUserREPO } from "@repo/types";
import * as ownerUserRepository from "./owner-user.repository";

type OwnerCreateRepository = Pick<
    typeof ownerUserRepository,
    "createSeedOwnerUser"
>;

type OwnerCreateDependencies = {
    promptText: (label: string) => Promise<string>;
    promptPassword: (label: string) => Promise<string>;
    write: (message: string) => void;
    repository: OwnerCreateRepository;
    hashPassword: (password: string) => Promise<string>;
    createId: () => string;
};

const isUniqueViolation = (error: unknown) =>
    typeof error === "object" && error !== null && "code" in error && error.code === "23505";

const unexpectedErrorMessage = (error: unknown) => {
    const record = typeof error === "object" && error !== null ? error as Record<string, unknown> : undefined;
    const cause = typeof record?.cause === "object" && record.cause !== null
        ? record.cause as Record<string, unknown>
        : undefined;
    const code = typeof record?.code === "string"
        ? record.code
        : typeof cause?.code === "string"
            ? cause.code
            : undefined;
    const message = error instanceof Error ? error.message : undefined;
    const details = [code ? `database error ${code}` : undefined, message].filter(Boolean).join(": ");

    return details
        ? `Owner User was not created due to an unexpected error: ${details}.`
        : "Owner User was not created due to an unexpected error.";
};

export const assertNoOwnerCreateArguments = (args: string[]) => {
    if (args.length > 0) {
        throw new Error("console:create-owner does not accept command-line arguments; all values are prompted securely");
    }
};

export const runOwnerCreate = async (dependencies: OwnerCreateDependencies): Promise<0 | 1> => {
    try {
        const firstName = await dependencies.promptText("First name: ");
        const lastName = await dependencies.promptText("Last name: ");
        const phone = await dependencies.promptText("WhatsApp phone: ");
        const password = await dependencies.promptPassword("Password: ");
        const passwordConfirmation = await dependencies.promptPassword("Confirm password: ");

        if (password !== passwordConfirmation) {
            dependencies.write("Owner User was not created: passwords do not match.");
            return 1;
        }

        const parsed = OwnerUserSeedSchema.safeParse({ firstName, lastName, phone, password });
        if (!parsed.success) {
            dependencies.write(`Owner User was not created: ${parsed.error.issues[0]?.message ?? "invalid input"}.`);
            return 1;
        }

        const input: CreateOwnerUserREPO = {
            id: dependencies.createId(),
            firstName: parsed.data.firstName,
            lastName: parsed.data.lastName,
            phone: parsed.data.phone,
            passwordHash: await dependencies.hashPassword(parsed.data.password),
            isActive: true,
        };
        const result = await dependencies.repository.createSeedOwnerUser(input);
        if (result.status !== "created") {
            const reason = result.status === "duplicate-phone"
                ? "that phone already exists"
                : result.status === "already-seeded"
                    ? "the Seed Owner User already exists"
                    : "persistence failed";
            dependencies.write(`Owner User was not created: ${reason}.`);
            return 1;
        }

        const ownerUser = result.ownerUser;
        dependencies.write(`Seed Owner User created for ${ownerUser.firstName} ${ownerUser.lastName}.`);
        return 0;
    } catch (error) {
        dependencies.write(
            isUniqueViolation(error)
                ? "Owner User was not created: that phone already exists."
                : unexpectedErrorMessage(error),
        );
        return 1;
    }
};
