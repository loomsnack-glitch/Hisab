import { pg } from "@/config/db";
import { snakeToCamel } from "@/utils/case";
import { camelToSnakeSql } from "@/utils/case-sql";
import type {
    CreateKotItemAddOnREPO,
    CreateKotItemBundleComponentAddOnREPO,
    CreateKotItemBundleComponentREPO,
    CreateKotItemREPO,
    CreateKotREPO,
    KotDTO,
    KotItemAddOnDTO,
    KotItemBundleComponentAddOnDTO,
    KotItemBundleComponentDTO,
    KotItemDTO,
    KotNumberResetPeriod,
} from "@repo/types";
import {
    DEFAULT_SALE_NUMBER_TIMEZONE,
    formatKotNumber,
    getKotNumberPeriodKey,
} from "@/modules/tenant/billing/sale-numbering";

const mapRow = <T>(row: Record<string, unknown>) => snakeToCamel(row) as T;

const mapKot = (row: Record<string, unknown>, items: KotItemDTO[] = []): KotDTO => ({
    ...mapRow<Omit<KotDTO, "items">>(row),
    items,
});

export const allocateKotNumber = async (
    organizationId: string,
    storeId: string,
    generatedAt: Date,
    tx?: Bun.TransactionSQL,
): Promise<{
    kotNumber: string;
    kotSequenceNumber: number;
    kotPeriodKey: string;
}> => {
    const db = tx || pg;
    const [settingsRow] = await db`
        SELECT
            kot_number_reset_period,
            sale_number_timezone
        FROM store_billing_settings
        WHERE organization_id = ${organizationId}
          AND store_id = ${storeId}
    `;
    const resetPeriod = (settingsRow?.kot_number_reset_period as KotNumberResetPeriod | undefined) ?? "daily";
    const timezone =
        typeof settingsRow?.sale_number_timezone === "string" && settingsRow.sale_number_timezone.trim()
            ? settingsRow.sale_number_timezone
            : DEFAULT_SALE_NUMBER_TIMEZONE;
    const periodKey = getKotNumberPeriodKey(resetPeriod, generatedAt, timezone);
    const [result] = await db`
        INSERT INTO store_kot_sequences (
            store_id,
            organization_id,
            period_key,
            next_sequence_number
        ) VALUES (
            ${storeId},
            ${organizationId},
            ${periodKey},
            2
        )
        ON CONFLICT (store_id, period_key)
        DO UPDATE SET
            next_sequence_number = store_kot_sequences.next_sequence_number + 1,
            updated_at = NOW()
        RETURNING next_sequence_number - 1 AS sequence_number
    `;

    const kotSequenceNumber = Number(result?.sequence_number ?? 1);
    return {
        kotNumber: formatKotNumber(kotSequenceNumber),
        kotSequenceNumber,
        kotPeriodKey: periodKey,
    };
};

const createKotItemAddOn = async (
    addOnData: CreateKotItemAddOnREPO,
    tx?: Bun.TransactionSQL,
): Promise<KotItemAddOnDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO kot_item_add_ons ${camelToSnakeSql(addOnData)}
        RETURNING *
    `;
    return result ? mapRow<KotItemAddOnDTO>(result) : null;
};

const createKotItemBundleComponentAddOn = async (
    addOnData: CreateKotItemBundleComponentAddOnREPO,
    tx?: Bun.TransactionSQL,
): Promise<KotItemBundleComponentAddOnDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO kot_item_bundle_component_add_ons ${camelToSnakeSql(addOnData)}
        RETURNING *
    `;
    return result ? mapRow<KotItemBundleComponentAddOnDTO>(result) : null;
};

const createKotItemBundleComponent = async (
    componentData: CreateKotItemBundleComponentREPO,
    tx?: Bun.TransactionSQL,
): Promise<KotItemBundleComponentDTO | null> => {
    const db = tx || pg;
    const { addOns, ...row } = componentData;
    const [result] = await db`
        INSERT INTO kot_item_bundle_components ${camelToSnakeSql(row)}
        RETURNING *
    `;
    if (!result) {
        return null;
    }

    const createdAddOns: KotItemBundleComponentAddOnDTO[] = [];
    for (const addOn of addOns) {
        const created = await createKotItemBundleComponentAddOn(addOn, tx);
        if (!created) {
            throw new Error("Failed to create KOT item bundle component add-on");
        }
        createdAddOns.push(created);
    }

    return {
        ...mapRow<Omit<KotItemBundleComponentDTO, "addOns">>(result),
        addOns: createdAddOns,
    };
};

const createKotItem = async (
    itemData: CreateKotItemREPO,
    tx?: Bun.TransactionSQL,
): Promise<KotItemDTO | null> => {
    const db = tx || pg;
    const { addOns, bundleComponents, ...row } = itemData;
    const [result] = await db`
        INSERT INTO kot_items ${camelToSnakeSql(row)}
        RETURNING *
    `;
    if (!result) {
        return null;
    }

    const createdAddOns: KotItemAddOnDTO[] = [];
    for (const addOn of addOns) {
        const created = await createKotItemAddOn(addOn, tx);
        if (!created) {
            throw new Error("Failed to create KOT item add-on");
        }
        createdAddOns.push(created);
    }

    const createdComponents: KotItemBundleComponentDTO[] = [];
    for (const component of bundleComponents) {
        const created = await createKotItemBundleComponent(component, tx);
        if (!created) {
            throw new Error("Failed to create KOT item bundle component");
        }
        createdComponents.push(created);
    }

    return {
        ...mapRow<Omit<KotItemDTO, "addOns" | "bundleComponents">>(result),
        addOns: createdAddOns,
        bundleComponents: createdComponents,
    };
};

export const createKot = async (
    kotData: CreateKotREPO,
    tx?: Bun.TransactionSQL,
): Promise<KotDTO | null> => {
    const db = tx || pg;
    const { items, ...row } = kotData;
    const [result] = await db`
        INSERT INTO kots ${camelToSnakeSql(row)}
        RETURNING *
    `;
    if (!result) {
        return null;
    }

    const createdItems: KotItemDTO[] = [];
    for (const item of items) {
        const created = await createKotItem(item, tx);
        if (!created) {
            throw new Error("Failed to create KOT item");
        }
        createdItems.push(created);
    }

    return mapKot(result, createdItems);
};

const getKotItemAddOnsByKotId = async (
    kotId: string,
    tx?: Bun.TransactionSQL,
): Promise<KotItemAddOnDTO[]> => {
    const db = tx || pg;
    const results = await db`
        SELECT *
        FROM kot_item_add_ons
        WHERE kot_id = ${kotId}
        ORDER BY created_at ASC
    `;
    return results.map((result: Record<string, unknown>) => mapRow<KotItemAddOnDTO>(result));
};

const getKotItemBundleComponentAddOnsByKotId = async (
    kotId: string,
    tx?: Bun.TransactionSQL,
): Promise<KotItemBundleComponentAddOnDTO[]> => {
    const db = tx || pg;
    const results = await db`
        SELECT *
        FROM kot_item_bundle_component_add_ons
        WHERE kot_id = ${kotId}
        ORDER BY created_at ASC
    `;
    return results.map((result: Record<string, unknown>) =>
        mapRow<KotItemBundleComponentAddOnDTO>(result),
    );
};

const getKotItemBundleComponentsByKotId = async (
    kotId: string,
    tx?: Bun.TransactionSQL,
): Promise<KotItemBundleComponentDTO[]> => {
    const addOns = await getKotItemBundleComponentAddOnsByKotId(kotId, tx);
    const addOnsByComponentId = new Map<string, KotItemBundleComponentAddOnDTO[]>();
    for (const addOn of addOns) {
        const existing = addOnsByComponentId.get(addOn.kotItemBundleComponentId) ?? [];
        existing.push(addOn);
        addOnsByComponentId.set(addOn.kotItemBundleComponentId, existing);
    }

    const db = tx || pg;
    const results = await db`
        SELECT *
        FROM kot_item_bundle_components
        WHERE kot_id = ${kotId}
        ORDER BY created_at ASC
    `;
    return results.map((result: Record<string, unknown>) => {
        const component = mapRow<Omit<KotItemBundleComponentDTO, "addOns">>(result);
        return {
            ...component,
            addOns: addOnsByComponentId.get(component.id) ?? [],
        };
    });
};

export const getKotItemsByKotId = async (
    kotId: string,
    tx?: Bun.TransactionSQL,
): Promise<KotItemDTO[]> => {
    const db = tx || pg;
    const [itemResults, addOnResults, bundleComponentResults] = await Promise.all([
        db`
            SELECT *
            FROM kot_items
            WHERE kot_id = ${kotId}
            ORDER BY created_at ASC
        `,
        getKotItemAddOnsByKotId(kotId, tx),
        getKotItemBundleComponentsByKotId(kotId, tx),
    ]);

    const addOnsByItemId = new Map<string, KotItemAddOnDTO[]>();
    for (const addOn of addOnResults) {
        const existing = addOnsByItemId.get(addOn.kotItemId) ?? [];
        existing.push(addOn);
        addOnsByItemId.set(addOn.kotItemId, existing);
    }

    const componentsByItemId = new Map<string, KotItemBundleComponentDTO[]>();
    for (const component of bundleComponentResults) {
        const existing = componentsByItemId.get(component.kotItemId) ?? [];
        existing.push(component);
        componentsByItemId.set(component.kotItemId, existing);
    }

    return itemResults.map((result: Record<string, unknown>) => {
        const item = mapRow<Omit<KotItemDTO, "addOns" | "bundleComponents">>(result);
        return {
            ...item,
            configurationSignature: String(item.configurationSignature ?? ""),
            addOns: addOnsByItemId.get(item.id) ?? [],
            bundleComponents: componentsByItemId.get(item.id) ?? [],
        };
    });
};

export const getKotById = async (
    organizationId: string,
    storeId: string,
    kotId: string,
    tx?: Bun.TransactionSQL,
): Promise<KotDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        SELECT *
        FROM kots
        WHERE id = ${kotId}
          AND organization_id = ${organizationId}
          AND store_id = ${storeId}
    `;
    if (!result) {
        return null;
    }

    return mapKot(result, await getKotItemsByKotId(kotId, tx));
};

export const getKotBySaleId = async (
    organizationId: string,
    storeId: string,
    saleId: string,
    tx?: Bun.TransactionSQL,
): Promise<KotDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        SELECT *
        FROM kots
        WHERE sale_id = ${saleId}
          AND organization_id = ${organizationId}
          AND store_id = ${storeId}
    `;
    if (!result) {
        return null;
    }

    return mapKot(result, await getKotItemsByKotId(String(result.id), tx));
};
