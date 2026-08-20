import type { CreateOwnerUserREPO, OwnerUserDTO, OwnerUserRecord } from "@repo/types";
import { pg } from "@/config/db";
import { camelToSnakeSql } from "@/utils/case-sql";
import { snakeToCamel } from "@/utils/case";

// Serializes seed, create, and active-state writes so the last-active Owner User cannot be dropped.
const OWNER_USERS_WRITE_LOCK_ID = 726384920;

const toOwnerUserRecord = (row: unknown): OwnerUserRecord => snakeToCamel(row) as OwnerUserRecord;
const toOwnerUserDTO = (row: unknown): OwnerUserDTO => {
    const { passwordHash: _passwordHash, ...ownerUser } = toOwnerUserRecord(row);
    return ownerUser;
};

export type SeedOwnerUserResult =
    | { status: "created"; ownerUser: OwnerUserRecord }
    | { status: "duplicate-phone" | "already-seeded" | "persistence-failed" };

export const createSeedOwnerUser = async (data: CreateOwnerUserREPO): Promise<SeedOwnerUserResult> =>
    pg.begin(async (tx) => {
        await tx`SELECT pg_advisory_xact_lock(${OWNER_USERS_WRITE_LOCK_ID})`;

        const [existingPhone] = await tx`
            SELECT id
            FROM console_users
            WHERE phone = ${data.phone}
        `;
        if (existingPhone) {
            return { status: "duplicate-phone" };
        }

        const [existingOwner] = await tx`
            SELECT id
            FROM console_users
            LIMIT 1
        `;
        if (existingOwner) {
            return { status: "already-seeded" };
        }

        const [created] = await tx`
            INSERT INTO console_users ${camelToSnakeSql(data)}
            RETURNING *
        `;
        return created
            ? { status: "created", ownerUser: toOwnerUserRecord(created) }
            : { status: "persistence-failed" };
    });

export const getOwnerUserById = async (id: string): Promise<OwnerUserRecord | null> => {
    const [result] = await pg`
        SELECT *
        FROM console_users
        WHERE id = ${id}
    `;

    return result ? toOwnerUserRecord(result) : null;
};

export const getOwnerUserByPhone = async (phone: string): Promise<OwnerUserRecord | null> => {
    const [result] = await pg`
        SELECT *
        FROM console_users
        WHERE phone = ${phone}
    `;

    return result ? toOwnerUserRecord(result) : null;
};

export const listOwnerUsers = async (): Promise<OwnerUserDTO[]> => {
    const results = await pg`
        SELECT id, first_name, last_name, phone, is_active, created_at, updated_at
        FROM console_users
        ORDER BY created_at ASC, first_name ASC, last_name ASC, id ASC
    `;

    return results.map(toOwnerUserDTO);
};

export const countActiveOwnerUsers = async (tx: typeof pg | Bun.TransactionSQL = pg): Promise<number> => {
    const [row] = await tx`
        SELECT COUNT(*)::int AS active_count
        FROM console_users
        WHERE is_active
    `;

    return Number(row?.active_count ?? 0);
};

export type CreateConsoleOwnerUserResult =
    | { status: "created"; ownerUser: OwnerUserRecord }
    | { status: "duplicate-phone" | "persistence-failed" };

export const createOwnerUser = async (data: CreateOwnerUserREPO): Promise<CreateConsoleOwnerUserResult> =>
    pg.begin(async (tx) => {
        await tx`SELECT pg_advisory_xact_lock(${OWNER_USERS_WRITE_LOCK_ID})`;

        const [existingPhone] = await tx`
            SELECT id
            FROM console_users
            WHERE phone = ${data.phone}
        `;
        if (existingPhone) {
            return { status: "duplicate-phone" };
        }

        const [created] = await tx`
            INSERT INTO console_users ${camelToSnakeSql(data)}
            RETURNING *
        `;
        return created
            ? { status: "created", ownerUser: toOwnerUserRecord(created) }
            : { status: "persistence-failed" };
    });

export type UpdateOwnerUserActiveStateResult =
    | { status: "updated" | "unchanged"; ownerUser: OwnerUserRecord }
    | { status: "not-found" }
    | { status: "last-active" };

export const updateOwnerUserActiveState = async (
    ownerUserId: string,
    isActive: boolean,
): Promise<UpdateOwnerUserActiveStateResult> =>
    pg.begin(async (tx) => {
        await tx`SELECT pg_advisory_xact_lock(${OWNER_USERS_WRITE_LOCK_ID})`;

        const [existing] = await tx`
            SELECT *
            FROM console_users
            WHERE id = ${ownerUserId}
            FOR UPDATE
        `;
        if (!existing) {
            return { status: "not-found" };
        }

        const current = toOwnerUserRecord(existing);
        if (current.isActive === isActive) {
            return { status: "unchanged", ownerUser: current };
        }

        if (!isActive && current.isActive && (await countActiveOwnerUsers(tx)) <= 1) {
            return { status: "last-active" };
        }

        const [updated] = await tx`
            UPDATE console_users
            SET is_active = ${isActive}, updated_at = NOW()
            WHERE id = ${ownerUserId}
            RETURNING *
        `;
        return updated
            ? { status: "updated", ownerUser: toOwnerUserRecord(updated) }
            : { status: "not-found" };
    });
