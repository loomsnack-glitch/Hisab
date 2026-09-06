import { pg } from "@/config/db";
import { snakeToCamel } from "@/utils/case";
import { camelToSnakeSql } from "@/utils/case-sql";
import {
    SEEDED_UNITS,
    type CreateUnitREPO,
    type UnitDTO,
    type UpdateUnitREPO,
} from "@repo/types";

const mapRow = <T>(row: Record<string, unknown>) => snakeToCamel(row) as T;

const mapUnit = (row: Record<string, unknown>): UnitDTO => mapRow<UnitDTO>(row);

export const getUnitsByOrganizationId = async (
    organizationId: string,
    tx?: Bun.TransactionSQL,
): Promise<UnitDTO[]> => {
    const db = tx || pg;
    const results = await db`
        SELECT *
        FROM units
        WHERE organization_id = ${organizationId}
        ORDER BY CASE WHEN kind = 'predefined' THEN 0 ELSE 1 END, lower(name) ASC
    `;

    return results.map((result: Record<string, unknown>) => mapUnit(result));
};

export const getUnitById = async (
    organizationId: string,
    unitId: string,
    tx?: Bun.TransactionSQL,
): Promise<UnitDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        SELECT *
        FROM units
        WHERE id = ${unitId}
          AND organization_id = ${organizationId}
    `;

    return result ? mapUnit(result) : null;
};

export const getUnitByPredefinedKey = async (
    organizationId: string,
    predefinedKey: string,
    tx?: Bun.TransactionSQL,
): Promise<UnitDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        SELECT *
        FROM units
        WHERE organization_id = ${organizationId}
          AND predefined_key = ${predefinedKey}
        LIMIT 1
    `;

    return result ? mapUnit(result) : null;
};

export const unitTokenExistsInOrganization = async (
    organizationId: string,
    token: string,
    excludeId?: string,
): Promise<boolean> => {
    const normalized = token;
    const results = excludeId
        ? await pg`
            SELECT 1
            FROM units
            WHERE organization_id = ${organizationId}
              AND id <> ${excludeId}
              AND (
                    lower(btrim(regexp_replace(name, '\\s+', ' ', 'g'))) = ${normalized}
                 OR lower(btrim(regexp_replace(label, '\\s+', ' ', 'g'))) = ${normalized}
              )
            LIMIT 1
        `
        : await pg`
            SELECT 1
            FROM units
            WHERE organization_id = ${organizationId}
              AND (
                    lower(btrim(regexp_replace(name, '\\s+', ' ', 'g'))) = ${normalized}
                 OR lower(btrim(regexp_replace(label, '\\s+', ' ', 'g'))) = ${normalized}
              )
            LIMIT 1
        `;

    return Boolean(results[0]);
};

export const createUnit = async (
    unitData: CreateUnitREPO,
    tx?: Bun.TransactionSQL,
): Promise<UnitDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO units ${camelToSnakeSql(unitData)}
        RETURNING *
    `;

    return result ? mapUnit(result) : null;
};

export const updateUnit = async (unitData: UpdateUnitREPO): Promise<UnitDTO | null> => {
    const [result] = await pg`
        UPDATE units
        SET name = ${unitData.name},
            label = ${unitData.label},
            status = ${unitData.status},
            updated_by = ${unitData.updatedBy},
            updated_at = NOW()
        WHERE id = ${unitData.id}
          AND organization_id = ${unitData.organizationId}
        RETURNING *
    `;

    return result ? mapUnit(result) : null;
};

export const seedDefaultUnits = async (
    organizationId: string,
    createdBy: string,
    tx?: Bun.TransactionSQL,
): Promise<UnitDTO[]> => {
    const existing = await getUnitsByOrganizationId(organizationId, tx);
    const existingKeys = new Set(
        existing
            .filter((unit) => unit.predefinedKey)
            .map((unit) => unit.predefinedKey as string),
    );

    const seeded = existing.filter((unit) => unit.kind === "predefined");
    for (const definition of SEEDED_UNITS) {
        if (existingKeys.has(definition.key)) {
            continue;
        }

        const created = await createUnit(
            {
                id: crypto.randomUUID(),
                organizationId,
                name: definition.name,
                label: definition.label,
                kind: "predefined",
                predefinedKey: definition.key,
                status: "active",
                createdBy,
            },
            tx,
        );
        if (!created) {
            throw new Error("Failed to seed Units");
        }
        seeded.push(created);
    }

    return seeded;
};
