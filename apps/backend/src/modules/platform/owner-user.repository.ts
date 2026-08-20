import type { CreateOwnerUserREPO, OwnerUserRecord } from "@repo/types";
import { pg } from "@/config/db";
import { camelToSnakeSql } from "@/utils/case-sql";
import { snakeToCamel } from "@/utils/case";

// Stable app-specific namespace: serializes only first Owner User seed attempts.
const SEED_OWNER_USER_ADVISORY_LOCK_ID = 726384920;

export type SeedOwnerUserResult =
    | { status: "created"; ownerUser: OwnerUserRecord }
    | { status: "duplicate-phone" | "already-seeded" | "persistence-failed" };

export const createSeedOwnerUser = async (data: CreateOwnerUserREPO): Promise<SeedOwnerUserResult> =>
    pg.begin(async (tx) => {
        await tx`SELECT pg_advisory_xact_lock(${SEED_OWNER_USER_ADVISORY_LOCK_ID})`;

        const [existingPhone] = await tx`
            SELECT id
            FROM owner_users
            WHERE phone = ${data.phone}
        `;
        if (existingPhone) {
            return { status: "duplicate-phone" };
        }

        const [existingOwner] = await tx`
            SELECT id
            FROM owner_users
            LIMIT 1
        `;
        if (existingOwner) {
            return { status: "already-seeded" };
        }

        const [created] = await tx`
            INSERT INTO owner_users ${camelToSnakeSql(data)}
            RETURNING *
        `;
        return created
            ? { status: "created", ownerUser: snakeToCamel(created) as OwnerUserRecord }
            : { status: "persistence-failed" };
    });

export const getOwnerUserById = async (id: string): Promise<OwnerUserRecord | null> => {
    const [result] = await pg`
        SELECT *
        FROM owner_users
        WHERE id = ${id}
    `;

    return result ? (snakeToCamel(result) as OwnerUserRecord) : null;
};

export const getOwnerUserByPhone = async (phone: string): Promise<OwnerUserRecord | null> => {
    const [result] = await pg`
        SELECT *
        FROM owner_users
        WHERE phone = ${phone}
    `;

    return result ? (snakeToCamel(result) as OwnerUserRecord) : null;
};
