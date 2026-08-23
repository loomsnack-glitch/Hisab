import { pg } from "@/config/db";
import { snakeToCamel } from "@/utils/case";
import { camelToSnakeSql } from "@/utils/case-sql";
import type {
    CreateKotItemAddOnREPO,
    CreateKotItemBundleComponentAddOnREPO,
    CreateKotItemBundleComponentREPO,
    CreateKotItemREPO,
    CreateKotREPO,
    CreateTableOrderREPO,
    KitchenKotDTO,
    KotDTO,
    KotItemAddOnDTO,
    KotItemBundleComponentAddOnDTO,
    KotItemBundleComponentDTO,
    KotItemDTO,
    TableOrderDTO,
} from "@repo/types";
import {
    DEFAULT_SALE_NUMBER_TIMEZONE,
    formatKotNumber,
    getKotNumberPeriodKey,
} from "@/modules/tenant/billing/sale-numbering";

const mapRow = <T>(row: Record<string, unknown>) => snakeToCamel(row) as T;

const mapKot = (
  row: Record<string, unknown>,
  items: KotItemDTO[] = [],
): KotDTO => ({
    ...mapRow<Omit<KotDTO, "items">>(row),
    saleId: (row.sale_id as string | null | undefined) ?? null,
    tableOrderId: (row.table_order_id as string | null | undefined) ?? null,
  kitchenCompletedAt:
    (row.kitchen_completed_at as Date | null | undefined) ?? null,
  saleBatchSequence:
    row.sale_batch_sequence == null ? null : Number(row.sale_batch_sequence),
  generationRequestId:
    (row.generation_request_id as string | null | undefined) ?? null,
  fulfillmentType:
    row.fulfillment_type === "pick_up"
      ? "pick_up"
      : row.fulfillment_type === "dine_in"
        ? "dine_in"
        : "dine_in",
    items,
});

const remainingTotalsFromKots = (kots: KotDTO[]) => {
    const remainingSubtotal = kots.reduce(
        (sum, kot) =>
            sum +
            kot.items.reduce(
                (itemSum, item) =>
                    itemSum +
                    Number(item.lineSubtotal ?? 0) +
          item.addOns.reduce(
            (addOnSum, addOn) => addOnSum + Number(addOn.lineSubtotal ?? 0),
            0,
          ),
                0,
            ),
        0,
    );
    const remainingDiscountTotal = kots.reduce(
        (sum, kot) =>
            sum +
            kot.items.reduce(
                (itemSum, item) =>
                    itemSum +
                    Number(item.discountAmount ?? 0) +
          item.addOns.reduce(
            (addOnSum, addOn) => addOnSum + Number(addOn.discountAmount ?? 0),
            0,
          ),
                0,
            ),
        0,
    );
    return {
        remainingSubtotal,
        remainingDiscountTotal,
        remainingGrandTotal: remainingSubtotal - remainingDiscountTotal,
    };
};

const mapTableOrder = (
    row: Record<string, unknown>,
    kots: KotDTO[] = [],
): TableOrderDTO => ({
  ...mapRow<
    Omit<
      TableOrderDTO,
      | "kots"
      | "remainingSubtotal"
      | "remainingDiscountTotal"
      | "remainingGrandTotal"
    >
  >(row),
    customerId: (row.customer_id as string | null | undefined) ?? null,
    saleId: (row.sale_id as string | null | undefined) ?? null,
    notes: (row.notes as string | null | undefined) ?? null,
    kots,
    ...remainingTotalsFromKots(kots),
});

export const allocateSaleBatchSequence = async (
  organizationId: string,
  storeId: string,
  saleId: string,
  tx?: Bun.TransactionSQL,
): Promise<number> => {
  const db = tx || pg;
  const [result] = await db`
        SELECT COALESCE(MAX(sale_batch_sequence), 0) + 1 AS next_sequence
        FROM kots
        WHERE sale_id = ${saleId}
          AND organization_id = ${organizationId}
          AND store_id = ${storeId}
          AND kot_type = 'parcel'
    `;
  return Number(result?.next_sequence ?? 1);
};

export const getKotByGenerationRequestId = async (
  organizationId: string,
  storeId: string,
  generationRequestId: string,
  tx?: Bun.TransactionSQL,
): Promise<KotDTO | null> => {
  const db = tx || pg;
  const [result] = await db`
        SELECT *
        FROM kots
        WHERE organization_id = ${organizationId}
          AND store_id = ${storeId}
          AND generation_request_id = ${generationRequestId}
        LIMIT 1
    `;
  return result
    ? mapKot(result, await getKotItemsByKotId(String(result.id), tx))
    : null;
};

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
        SELECT sale_number_timezone
        FROM store_billing_settings
        WHERE organization_id = ${organizationId}
          AND store_id = ${storeId}
    `;
    const timezone =
    typeof settingsRow?.sale_number_timezone === "string" &&
    settingsRow.sale_number_timezone.trim()
            ? settingsRow.sale_number_timezone
            : DEFAULT_SALE_NUMBER_TIMEZONE;
    const periodKey = getKotNumberPeriodKey(generatedAt, timezone);
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
  return results.map((result: Record<string, unknown>) =>
    mapRow<KotItemAddOnDTO>(result),
  );
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
  const addOnsByComponentId = new Map<
    string,
    KotItemBundleComponentAddOnDTO[]
  >();
    for (const addOn of addOns) {
    const existing =
      addOnsByComponentId.get(addOn.kotItemBundleComponentId) ?? [];
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
    // Bun's postgres driver hangs until idleTimeout if more than one query
    // is in flight on the same reserved transaction connection.
    const itemResults = await db`
        SELECT *
        FROM kot_items
        WHERE kot_id = ${kotId}
        ORDER BY created_at ASC
    `;
    const addOnResults = await getKotItemAddOnsByKotId(kotId, tx);
  const bundleComponentResults = await getKotItemBundleComponentsByKotId(
    kotId,
    tx,
  );

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
    const item =
      mapRow<Omit<KotItemDTO, "addOns" | "bundleComponents">>(result);
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
        ORDER BY
            sale_batch_sequence ASC NULLS LAST,
            created_at ASC,
            kot_sequence_number ASC
        LIMIT 1
    `;
    if (!result) {
        return null;
    }

    return mapKot(result, await getKotItemsByKotId(String(result.id), tx));
};

export const getKotsBySaleId = async (
  organizationId: string,
  storeId: string,
  saleId: string,
  tx?: Bun.TransactionSQL,
): Promise<KotDTO[]> => {
  const db = tx || pg;
  const results = await db`
        SELECT *
        FROM kots
        WHERE sale_id = ${saleId}
          AND organization_id = ${organizationId}
          AND store_id = ${storeId}
        ORDER BY
            sale_batch_sequence ASC NULLS LAST,
            created_at ASC,
            kot_sequence_number ASC
    `;
  const kots: KotDTO[] = [];
  for (const result of results) {
    kots.push(mapKot(result, await getKotItemsByKotId(String(result.id), tx)));
  }
  return kots;
};

export const getKotNumbersBySaleId = async (
    organizationId: string,
    storeId: string,
    saleId: string,
    tx?: Bun.TransactionSQL,
): Promise<string[]> => {
    const db = tx || pg;
    const results = await db`
        SELECT kot_number
        FROM kots
        WHERE sale_id = ${saleId}
          AND organization_id = ${organizationId}
          AND store_id = ${storeId}
        ORDER BY
            sale_batch_sequence ASC NULLS LAST,
            created_at ASC,
            kot_sequence_number ASC
    `;
    return results.map((row) => String(row.kot_number));
};

export const getKotsByTableOrderId = async (
    organizationId: string,
    storeId: string,
    tableOrderId: string,
    tx?: Bun.TransactionSQL,
): Promise<KotDTO[]> => {
    const db = tx || pg;
    const results = await db`
        SELECT *
        FROM kots
        WHERE table_order_id = ${tableOrderId}
          AND organization_id = ${organizationId}
          AND store_id = ${storeId}
        ORDER BY
            sale_batch_sequence ASC NULLS LAST,
            created_at ASC,
            kot_sequence_number ASC
    `;
    const kots: KotDTO[] = [];
    for (const result of results) {
        kots.push(mapKot(result, await getKotItemsByKotId(String(result.id), tx)));
    }
    return kots;
};

export const createTableOrder = async (
    tableOrder: CreateTableOrderREPO,
    tx?: Bun.TransactionSQL,
): Promise<TableOrderDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        INSERT INTO table_orders ${camelToSnakeSql(tableOrder)}
        RETURNING *
    `;
    return result ? mapTableOrder(result) : null;
};

export const getTableOrderById = async (
    organizationId: string,
    storeId: string,
    tableOrderId: string,
    tx?: Bun.TransactionSQL,
): Promise<TableOrderDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        SELECT *
        FROM table_orders
        WHERE id = ${tableOrderId}
          AND organization_id = ${organizationId}
          AND store_id = ${storeId}
    `;
    if (!result) {
        return null;
    }
    return mapTableOrder(
        result,
        await getKotsByTableOrderId(organizationId, storeId, tableOrderId, tx),
    );
};

export const lockActiveTableOrderForTable = async (
    organizationId: string,
    storeId: string,
    tableId: string,
    tx: Bun.TransactionSQL,
): Promise<TableOrderDTO | null> => {
    const [result] = await tx`
        SELECT *
        FROM table_orders
        WHERE service_table_id = ${tableId}
          AND organization_id = ${organizationId}
          AND store_id = ${storeId}
          AND status = 'active'
        FOR UPDATE
    `;
    if (!result) {
        return null;
    }
    return mapTableOrder(
        result,
        await getKotsByTableOrderId(organizationId, storeId, String(result.id), tx),
    );
};

export const updateTableOrderCustomer = async (
    organizationId: string,
    storeId: string,
    tableOrderId: string,
    customerId: string | null,
    notes: string | null | undefined,
    updatedByDeviceId: string,
    tx?: Bun.TransactionSQL,
): Promise<TableOrderDTO | null> => {
    const db = tx || pg;
    const [result] =
        notes === undefined
            ? await db`
                UPDATE table_orders
                SET customer_id = ${customerId},
                    updated_by_device_id = ${updatedByDeviceId},
                    updated_at = NOW()
                WHERE id = ${tableOrderId}
                  AND organization_id = ${organizationId}
                  AND store_id = ${storeId}
                  AND status = 'active'
                RETURNING *
              `
            : await db`
                UPDATE table_orders
                SET customer_id = ${customerId},
                    notes = ${notes},
                    updated_by_device_id = ${updatedByDeviceId},
                    updated_at = NOW()
                WHERE id = ${tableOrderId}
                  AND organization_id = ${organizationId}
                  AND store_id = ${storeId}
                  AND status = 'active'
                RETURNING *
              `;
    if (!result) {
        return null;
    }
    return mapTableOrder(
        result,
        await getKotsByTableOrderId(organizationId, storeId, tableOrderId, tx),
    );
};

export const markTableOrderCheckedOut = async (
    organizationId: string,
    storeId: string,
    tableOrderId: string,
    saleId: string,
    updatedByDeviceId: string,
    tx: Bun.TransactionSQL,
): Promise<TableOrderDTO | null> => {
    const [result] = await tx`
        UPDATE table_orders
        SET status = 'checked_out',
            sale_id = ${saleId},
            updated_by_device_id = ${updatedByDeviceId},
            updated_at = NOW()
        WHERE id = ${tableOrderId}
          AND organization_id = ${organizationId}
          AND store_id = ${storeId}
          AND status = 'active'
        RETURNING *
    `;
    if (!result) {
        return null;
    }
    return mapTableOrder(
        result,
        await getKotsByTableOrderId(organizationId, storeId, tableOrderId, tx),
    );
};

export const deleteKotsByTableOrderId = async (
    organizationId: string,
    storeId: string,
    tableOrderId: string,
    tx: Bun.TransactionSQL,
): Promise<void> => {
    await tx`
        DELETE FROM kots
        WHERE table_order_id = ${tableOrderId}
          AND organization_id = ${organizationId}
          AND store_id = ${storeId}
    `;
};

export const discardTableOrder = async (
    organizationId: string,
    storeId: string,
    tableOrderId: string,
    updatedByDeviceId: string,
    tx: Bun.TransactionSQL,
): Promise<boolean> => {
    const [result] = await tx`
        UPDATE table_orders
        SET status = 'discarded',
            updated_by_device_id = ${updatedByDeviceId},
            updated_at = NOW()
        WHERE id = ${tableOrderId}
          AND organization_id = ${organizationId}
          AND store_id = ${storeId}
          AND status = 'active'
        RETURNING id
    `;
    if (!result) {
        return false;
    }

    await deleteKotsByTableOrderId(
        organizationId,
        storeId,
        tableOrderId,
        tx,
    );
    return true;
};

export const linkKotsToSale = async (
    organizationId: string,
    storeId: string,
    tableOrderId: string,
    saleId: string,
    updatedByDeviceId: string,
    tx: Bun.TransactionSQL,
): Promise<void> => {
    await tx`
        UPDATE kots
        SET sale_id = ${saleId},
            updated_by_device_id = ${updatedByDeviceId},
            updated_at = NOW()
        WHERE table_order_id = ${tableOrderId}
          AND organization_id = ${organizationId}
          AND store_id = ${storeId}
    `;
};

export const replaceKotItems = async (
    kotId: string,
    items: CreateKotItemREPO[],
    updatedByDeviceId: string,
    tx: Bun.TransactionSQL,
): Promise<KotDTO | null> => {
    await tx`
        UPDATE kots
        SET updated_by_device_id = ${updatedByDeviceId},
            updated_at = NOW()
        WHERE id = ${kotId}
    `;
    await tx`
        DELETE FROM kot_items
        WHERE kot_id = ${kotId}
    `;
    for (const item of items) {
        const created = await createKotItem(item, tx);
        if (!created) {
            throw new Error("Failed to replace KOT items");
        }
    }
    const [result] = await tx`
        SELECT *
        FROM kots
        WHERE id = ${kotId}
    `;
    if (!result) {
        return null;
    }
    return mapKot(result, await getKotItemsByKotId(kotId, tx));
};

export const listPendingKitchenKots = async (
    organizationId: string,
    storeId: string,
    tx?: Bun.TransactionSQL,
): Promise<KitchenKotDTO[]> => {
    const db = tx || pg;
    const results = await db`
        SELECT
            kots.id,
            kots.kot_number,
            kots.kot_type,
            kots.fulfillment_type,
            service_tables.table_label
        FROM kots
        LEFT JOIN table_orders
            ON table_orders.id = kots.table_order_id
            AND table_orders.organization_id = kots.organization_id
            AND table_orders.store_id = kots.store_id
        LEFT JOIN service_tables
            ON service_tables.id = table_orders.service_table_id
            AND service_tables.organization_id = kots.organization_id
            AND service_tables.store_id = kots.store_id
        WHERE kots.organization_id = ${organizationId}
          AND kots.store_id = ${storeId}
          AND kots.kitchen_completed_at IS NULL
        ORDER BY kots.created_at ASC, kots.kot_sequence_number ASC
    `;

    const kots: KitchenKotDTO[] = [];
    for (const result of results) {
        const kotId = String(result.id);
        const items = await getKotItemsByKotId(kotId, tx);
        kots.push({
            id: kotId,
            kotNumber: String(result.kot_number),
      fulfillmentType:
        result.fulfillment_type === "pick_up" ? "pick_up" : "dine_in",
            tableLabel:
                result.kot_type === "parcel"
                    ? null
                    : ((result.table_label as string | null | undefined) ?? null),
            items: items.map((item) => ({
                productNameSnapshot: item.productNameSnapshot,
                quantity: Number(item.quantity),
            })),
        });
    }
    return kots;
};

export const markKotKitchenCompleted = async (
    organizationId: string,
    storeId: string,
    kotId: string,
    updatedByDeviceId: string,
    tx?: Bun.TransactionSQL,
): Promise<KotDTO | null> => {
    const db = tx || pg;
    const [result] = await db`
        UPDATE kots
        SET kitchen_completed_at = NOW(),
            updated_by_device_id = ${updatedByDeviceId},
            updated_at = NOW()
        WHERE id = ${kotId}
          AND organization_id = ${organizationId}
          AND store_id = ${storeId}
          AND kitchen_completed_at IS NULL
        RETURNING *
    `;
    if (!result) {
        return null;
    }
    return mapKot(result, await getKotItemsByKotId(kotId, tx));
};
