import { pg } from "@/config/db";
import * as billingService from "@/modules/tenant/billing/billing.service";
import * as billingRepository from "@/modules/tenant/billing/billing.repository";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import * as tableRepository from "@/modules/tenant/table-service/table-service.repository";
import * as kotRepository from "./kot.repository";
import {
    STATUS_CODES,
    type CheckoutTableOrderSVC,
    type CreateKotItemREPO,
    type CreateTableKotSVC,
    type DeviceSessionDTO,
    type KotDTO,
    type KitchenKotsListResponse,
    type KotItemDTO,
    type SaleDetailDTO,
    type SaleItemInput,
    type ServiceResponse,
    type ServiceTableDTO,
    type ServiceTableSaleResponse,
    type TableOrderDTO,
    type UpdateTableKotSVC,
  type UpdateStandaloneKotSVC,
    type UpdateTableOrderSVC,
} from "@repo/types";

const moneyFrom = (value: number | string | null | undefined) =>
  Number(value ?? 0);

const roundMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const configurationKeyFor = (
  productId: string,
  configurationSignature: string,
) => `${productId}::${configurationSignature}`;

const bundleComponentKeyFor = (
    choiceGroupId: string | null | undefined,
    componentProductId: string,
) => `${choiceGroupId ?? ""}::${componentProductId}`;

const mergeKotItemsByConfiguration = (items: KotItemDTO[]): KotItemDTO[] => {
    const mergedByKey = new Map<string, KotItemDTO>();

    for (const item of items) {
    const key = configurationKeyFor(
      item.productId,
      item.configurationSignature ?? "",
    );
        const existing = mergedByKey.get(key);
        if (!existing) {
            mergedByKey.set(key, {
                ...item,
                addOns: item.addOns.map((addOn) => ({ ...addOn })),
                bundleComponents: item.bundleComponents.map((component) => ({
                    ...component,
                    addOns: component.addOns.map((addOn) => ({ ...addOn })),
                })),
            });
            continue;
        }

        existing.quantity = Number(existing.quantity) + Number(item.quantity);
        existing.discountAmount = roundMoney(
            moneyFrom(existing.discountAmount) + moneyFrom(item.discountAmount),
        );
        existing.lineSubtotal = roundMoney(
            moneyFrom(existing.lineSubtotal) + moneyFrom(item.lineSubtotal),
        );
    existing.lineTotal = roundMoney(
      moneyFrom(existing.lineTotal) + moneyFrom(item.lineTotal),
    );

        for (const addOn of item.addOns) {
      const matched = existing.addOns.find(
        (row) => row.addOnId === addOn.addOnId,
      );
            if (!matched) {
                existing.addOns.push({ ...addOn });
                continue;
            }
      matched.totalQuantity =
        Number(matched.totalQuantity) + Number(addOn.totalQuantity);
            matched.discountAmount = roundMoney(
                moneyFrom(matched.discountAmount) + moneyFrom(addOn.discountAmount),
            );
            matched.lineSubtotal = roundMoney(
                moneyFrom(matched.lineSubtotal) + moneyFrom(addOn.lineSubtotal),
            );
      matched.lineTotal = roundMoney(
        moneyFrom(matched.lineTotal) + moneyFrom(addOn.lineTotal),
      );
        }

        for (const component of item.bundleComponents) {
            const componentKey = bundleComponentKeyFor(
                component.choiceGroupId,
                component.componentProductId,
            );
            const matched = existing.bundleComponents.find(
                (row) =>
          bundleComponentKeyFor(row.choiceGroupId, row.componentProductId) ===
          componentKey,
            );
            if (!matched) {
                existing.bundleComponents.push({
                    ...component,
                    addOns: component.addOns.map((addOn) => ({ ...addOn })),
                });
                continue;
            }
            matched.totalQuantity =
                Number(matched.totalQuantity) + Number(component.totalQuantity);
            for (const addOn of component.addOns) {
        const matchedAddOn = matched.addOns.find(
          (row) => row.addOnId === addOn.addOnId,
        );
                if (!matchedAddOn) {
                    matched.addOns.push({ ...addOn });
                    continue;
                }
                matchedAddOn.totalQuantity =
                    Number(matchedAddOn.totalQuantity) + Number(addOn.totalQuantity);
            }
        }
    }

    return [...mergedByKey.values()];
};

const normalizeOptionalUuid = (value?: string | null) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
};

const normalizeOptionalText = (value?: string | null) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
};

const requireTableKotStore = async (session: DeviceSessionDTO) => {
    const store = await organizationRepository.getStoreById(
        session.organization.id,
        session.store.id,
    );
    if (!store) {
        return {
            ok: false as const,
            response: {
                status: "error" as const,
                message: "Store not found",
                data: null,
                code: STATUS_CODES.NOT_FOUND,
            },
        };
    }
    if (!store.kotSystemEnabled || !store.tableManagementEnabled) {
        return {
            ok: false as const,
            response: {
                status: "error" as const,
        message:
          "Table KOT is available only when the KOT System and Table Management are enabled",
                data: null,
                code: STATUS_CODES.FORBIDDEN,
            },
        };
    }
    return { ok: true as const, store };
};

const tableOrderWorkspace = (
    table: ServiceTableDTO,
    tableOrder: TableOrderDTO,
    sale: SaleDetailDTO | null,
    message: string,
    code: number,
): ServiceResponse<ServiceTableSaleResponse> => ({
    status: "success",
    data: { table, tableOrder, sale },
    message,
    code,
});

const mapPreparedLinesToKotItems = (
  lines: Awaited<
    ReturnType<typeof billingService.prepareTrustedSaleLines>
  > extends {
        lines: infer L;
    }
        ? L
        : never,
    kotId: string,
): CreateKotItemREPO[] =>
    (lines ?? []).map((line) => {
        const kotItemId = crypto.randomUUID();
        return {
            id: kotItemId,
            organizationId: line.item.organizationId,
            storeId: line.item.storeId,
            kotId,
            productId: line.item.productId,
            quantity: Number(line.item.quantity),
            configurationSignature: line.item.configurationSignature ?? "",
            soldQuantity: Number(line.item.soldQuantity ?? 1),
            unitId: line.item.unitId ?? "00000000-0000-4000-8000-000000000001",
            unitLabelSnapshot: line.item.unitLabelSnapshot ?? "pc",
            productNameSnapshot: line.item.productNameSnapshot,
            unitPriceSnapshot: moneyFrom(line.item.unitPriceSnapshot),
            discountAmount: moneyFrom(line.item.discountAmount),
            lineSubtotal: moneyFrom(line.item.lineSubtotal),
            lineTotal: moneyFrom(line.item.lineTotal),
            addOns: line.addOns.map((addOn) => ({
                id: crypto.randomUUID(),
                organizationId: addOn.organizationId,
                storeId: addOn.storeId,
                kotId,
                kotItemId,
                addOnId: addOn.addOnId,
                quantityPerParent: Number(addOn.quantityPerParent),
                totalQuantity: Number(addOn.totalQuantity),
                addOnNameSnapshot: addOn.addOnNameSnapshot,
                unitPriceSnapshot: moneyFrom(addOn.unitPriceSnapshot),
                unitDiscountSnapshot: moneyFrom(addOn.unitDiscountSnapshot),
                discountAmount: moneyFrom(addOn.discountAmount),
                lineSubtotal: moneyFrom(addOn.lineSubtotal),
                lineTotal: moneyFrom(addOn.lineTotal),
            })),
            bundleComponents: line.bundleComponents.map((component) => {
                const kotItemBundleComponentId = crypto.randomUUID();
                return {
                    id: kotItemBundleComponentId,
                    organizationId: component.component.organizationId,
                    storeId: component.component.storeId,
                    kotId,
                    kotItemId,
                    choiceGroupId: component.component.choiceGroupId ?? null,
                    componentProductId: component.component.componentProductId,
                    quantityPerBundle: Number(component.component.quantityPerBundle),
                    totalQuantity: Number(component.component.totalQuantity),
                    productNameSnapshot: component.component.productNameSnapshot,
                    unitPriceSnapshot: moneyFrom(component.component.unitPriceSnapshot),
          unitDiscountSnapshot: moneyFrom(
            component.component.unitDiscountSnapshot,
          ),
          priceAdjustmentSnapshot: moneyFrom(
            component.component.priceAdjustmentSnapshot,
          ),
                    addOns: component.addOns.map((addOn) => ({
                        id: crypto.randomUUID(),
                        organizationId: addOn.organizationId,
                        storeId: addOn.storeId,
                        kotId,
                        kotItemId,
                        kotItemBundleComponentId,
                        addOnId: addOn.addOnId,
                        quantityPerComponent: Number(addOn.quantityPerComponent),
                        totalQuantity: Number(addOn.totalQuantity),
                        addOnNameSnapshot: addOn.addOnNameSnapshot,
                        unitPriceSnapshot: moneyFrom(addOn.unitPriceSnapshot),
                        unitDiscountSnapshot: moneyFrom(addOn.unitDiscountSnapshot),
                    })),
                };
            }),
        };
    });

const mapKotItemsToTrustedSaleLines = (
    items: KotItemDTO[],
    organizationId: string,
    storeId: string,
    saleId: string,
) =>
    items.map((item) => {
        const saleItemId = crypto.randomUUID();
        return {
            item: {
                id: saleItemId,
                organizationId,
                storeId,
                saleId,
                productId: item.productId,
                quantity: Number(item.quantity),
                configurationSignature: item.configurationSignature ?? "",
                soldQuantity: Number(item.soldQuantity ?? 1),
                unitId: item.unitId ?? "00000000-0000-4000-8000-000000000001",
                unitLabelSnapshot: item.unitLabelSnapshot ?? "pc",
                productNameSnapshot: item.productNameSnapshot,
                unitPriceSnapshot: moneyFrom(item.unitPriceSnapshot),
                discountAmount: moneyFrom(item.discountAmount),
                lineSubtotal: moneyFrom(item.lineSubtotal),
                lineTotal: moneyFrom(item.lineTotal),
            },
            addOns: item.addOns.map((addOn) => ({
                id: crypto.randomUUID(),
                organizationId,
                storeId,
                saleId,
                saleItemId,
                addOnId: addOn.addOnId,
                quantityPerParent: Number(addOn.quantityPerParent),
                totalQuantity: Number(addOn.totalQuantity),
                addOnNameSnapshot: addOn.addOnNameSnapshot,
                unitPriceSnapshot: moneyFrom(addOn.unitPriceSnapshot),
                unitDiscountSnapshot: moneyFrom(addOn.unitDiscountSnapshot),
                discountAmount: moneyFrom(addOn.discountAmount),
                lineSubtotal: moneyFrom(addOn.lineSubtotal),
                lineTotal: moneyFrom(addOn.lineTotal),
            })),
            bundleComponents: item.bundleComponents.map((component) => {
                const saleItemBundleComponentId = crypto.randomUUID();
                return {
                    component: {
                        id: saleItemBundleComponentId,
                        organizationId,
                        storeId,
                        saleId,
                        saleItemId,
                        choiceGroupId: component.choiceGroupId ?? null,
                        componentProductId: component.componentProductId,
                        quantityPerBundle: Number(component.quantityPerBundle),
                        totalQuantity: Number(component.totalQuantity),
                        productNameSnapshot: component.productNameSnapshot,
                        unitPriceSnapshot: moneyFrom(component.unitPriceSnapshot),
                        unitDiscountSnapshot: moneyFrom(component.unitDiscountSnapshot),
            priceAdjustmentSnapshot: moneyFrom(
              component.priceAdjustmentSnapshot,
            ),
                    },
                    addOns: component.addOns.map((addOn) => ({
                        id: crypto.randomUUID(),
                        organizationId,
                        storeId,
                        saleId,
                        saleItemId,
                        saleItemBundleComponentId,
                        addOnId: addOn.addOnId,
                        quantityPerComponent: Number(addOn.quantityPerComponent),
                        totalQuantity: Number(addOn.totalQuantity),
                        addOnNameSnapshot: addOn.addOnNameSnapshot,
                        unitPriceSnapshot: moneyFrom(addOn.unitPriceSnapshot),
                        unitDiscountSnapshot: moneyFrom(addOn.unitDiscountSnapshot),
                    })),
                };
            }),
        };
    });

const priceKotSelections = async (
    session: DeviceSessionDTO,
    ownerId: string,
    items: SaleItemInput[],
    existingItems: KotItemDTO[] = [],
) => {
    const existingSaleItems = existingItems.map((item) => ({
        ...item,
        saleId: ownerId,
        saleItemId: item.id,
        addOns: item.addOns.map((addOn) => ({
            ...addOn,
            saleId: ownerId,
            saleItemId: item.id,
        })),
        bundleComponents: item.bundleComponents.map((component) => ({
            ...component,
            saleId: ownerId,
            saleItemId: item.id,
            addOns: component.addOns.map((addOn) => ({
                ...addOn,
                saleId: ownerId,
                saleItemId: item.id,
            })),
        })),
    }));
    return billingService.prepareTrustedSaleLines(
        session.organization.id,
        session.store.id,
        ownerId,
        items,
        0,
        existingSaleItems as never,
    );
};

export const startActiveTableOrderForDevice = async (
    session: DeviceSessionDTO,
    tableId: string,
): Promise<ServiceResponse<ServiceTableSaleResponse | null>> => {
    const features = await requireTableKotStore(session);
    if (!features.ok) {
        return features.response;
    }

    const result = await pg.begin(async (tx) => {
        const table = await tableRepository.lockServiceTableForDevice(
            session.organization.id,
            session.store.id,
            tableId,
            tx,
        );
        if (!table) return { kind: "not_found" as const };
    if (
      table.state !== "allocated" ||
      table.currentSaleId ||
      table.currentTableOrderId
    ) {
            return { kind: "conflict" as const };
        }

        const tableOrderId = crypto.randomUUID();
        const created = await kotRepository.createTableOrder(
            {
                id: tableOrderId,
                organizationId: session.organization.id,
                storeId: session.store.id,
                serviceTableId: tableId,
                customerId: null,
                status: "active",
                createdByDeviceId: session.device.id,
                updatedByDeviceId: session.device.id,
            },
            tx,
        );
        if (!created) throw new Error("Failed to create table order");

        const engagedTable = await tableRepository.attachTableOrder(
            session.organization.id,
            session.store.id,
            tableId,
            tableOrderId,
            session.device.id,
            tx,
        );
        if (!engagedTable) throw new Error("Failed to engage service table");

        return {
            kind: "started" as const,
            table: {
                ...engagedTable,
                currentTableOrderId: tableOrderId,
                currentSaleId: null,
                currentSaleTotal: 0,
            },
            tableOrder: created,
        };
    });

    if (result.kind === "not_found") {
        return {
            status: "error",
            message: "Service table not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }
    if (result.kind === "conflict") {
        return {
            status: "error",
            message:
                "Only an allocated service table without an active order can start an order",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    return tableOrderWorkspace(
        result.table,
        result.tableOrder,
        null,
        "Table order started",
        STATUS_CODES.CREATED,
    );
};

export const getActiveTableOrderForDevice = async (
    session: DeviceSessionDTO,
    tableId: string,
): Promise<ServiceResponse<ServiceTableSaleResponse | null>> => {
    const table = await tableRepository.getServiceTableById(
        session.organization.id,
        session.store.id,
        tableId,
    );
    if (!table) {
        return {
            status: "error",
            message: "Service table not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }
    if (!table.currentTableOrderId) {
        return {
            status: "error",
            message: "Service table has no active Table Order",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    const tableOrder = await kotRepository.getTableOrderById(
        session.organization.id,
        session.store.id,
        table.currentTableOrderId,
    );
  if (
    !tableOrder ||
    tableOrder.status !== "active" ||
    tableOrder.serviceTableId !== tableId
  ) {
        return {
            status: "error",
            message: "The table's Active Table Order is unavailable",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

  return tableOrderWorkspace(
    table,
    tableOrder,
    null,
    "Table order loaded",
    STATUS_CODES.SUCCESS,
  );
};

export const updateActiveTableOrderForDevice = async (
    session: DeviceSessionDTO,
    tableId: string,
    update: UpdateTableOrderSVC,
): Promise<ServiceResponse<ServiceTableSaleResponse | null>> => {
    const features = await requireTableKotStore(session);
    if (!features.ok) {
        return features.response;
    }

    const customerId =
    update.customerId === undefined
      ? undefined
      : normalizeOptionalUuid(update.customerId);
    if (customerId !== undefined) {
        const customerResult = await billingService.resolveCustomerAssignment(
            session.organization.id,
            customerId,
        );
        if ("status" in customerResult) {
            return customerResult;
        }
    }

    const result = await pg.begin(async (tx) => {
        const table = await tableRepository.lockServiceTableForDevice(
            session.organization.id,
            session.store.id,
            tableId,
            tx,
        );
        if (!table) return { kind: "not_found" as const };
        if (!table.currentTableOrderId) return { kind: "conflict" as const };

        const tableOrder = await kotRepository.lockActiveTableOrderForTable(
            session.organization.id,
            session.store.id,
            tableId,
            tx,
        );
        if (!tableOrder || tableOrder.id !== table.currentTableOrderId) {
            return { kind: "conflict" as const };
        }

        const updated = await kotRepository.updateTableOrderCustomer(
            session.organization.id,
            session.store.id,
            tableOrder.id,
            customerId === undefined ? tableOrder.customerId : customerId,
      update.notes === undefined
        ? undefined
        : normalizeOptionalText(update.notes),
            session.device.id,
            tx,
        );
        if (!updated) throw new Error("Failed to update table order");
        return { kind: "updated" as const, table, tableOrder: updated };
    });

    if (result.kind === "not_found") {
        return {
            status: "error",
            message: "Service table not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }
    if (result.kind === "conflict") {
        return {
            status: "error",
            message: "Service table has no active Table Order",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    return tableOrderWorkspace(
        result.table,
        result.tableOrder,
        null,
        "Table order updated",
        STATUS_CODES.SUCCESS,
    );
};

export const discardActiveTableOrderForDevice = async (
    session: DeviceSessionDTO,
    tableId: string,
): Promise<ServiceResponse<{ table: ServiceTableDTO } | null>> => {
    const result = await pg.begin(async (tx) => {
        const table = await tableRepository.lockServiceTableForDevice(
            session.organization.id,
            session.store.id,
            tableId,
            tx,
        );
        if (!table) return { kind: "not_found" as const };
        if (!table.currentTableOrderId) return { kind: "conflict" as const };

        const discarded = await kotRepository.discardTableOrder(
            session.organization.id,
            session.store.id,
            table.currentTableOrderId,
            session.device.id,
            tx,
        );
        if (!discarded) return { kind: "conflict" as const };

        const freeTable = await tableRepository.clearTableOrder(
            session.organization.id,
            session.store.id,
            tableId,
            table.currentTableOrderId,
            session.device.id,
            tx,
        );
        if (!freeTable) throw new Error("Failed to free service table");
        return {
            kind: "discarded" as const,
      table: {
        ...freeTable,
        currentTableOrderId: null,
        currentSaleId: null,
        currentSaleTotal: null,
      },
        };
    });

    if (result.kind === "not_found") {
        return {
            status: "error",
            message: "Service table not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }
    if (result.kind === "conflict") {
        return {
            status: "error",
            message: "Only the current Active Table Order can be discarded",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }
    return {
        status: "success",
        data: { table: result.table },
        message: "Table order cancelled",
        code: STATUS_CODES.SUCCESS,
    };
};

const createOrReplaceTableKotItems = async (
    session: DeviceSessionDTO,
    items: SaleItemInput[],
    existingItems: KotItemDTO[],
    kotId: string,
) => {
  const prepared = await priceKotSelections(
    session,
    kotId,
    items,
    existingItems,
  );
    if ("error" in prepared && prepared.error) {
        return { error: prepared.error };
    }
    if (!prepared.lines || prepared.lines.length === 0) {
        return {
            error: {
                status: "error" as const,
                message: "A KOT must have at least one item",
                data: null,
                code: STATUS_CODES.BAD_REQUEST,
            },
        };
    }
    return { items: mapPreparedLinesToKotItems(prepared.lines, kotId) };
};

const saleServiceModeToFulfillment = (
  serviceMode: SaleDetailDTO["serviceMode"],
): "dine_in" | "pick_up" => (serviceMode === "pick_up" ? "pick_up" : "dine_in");

export const generateStandaloneKotBatchForActor = async (params: {
  organizationId: string;
  storeId: string;
  deviceId: string;
  saleId: string;
  batchItems: SaleItemInput[];
  serviceMode: SaleDetailDTO["serviceMode"];
}): Promise<ServiceResponse<null>> => {
  if (params.batchItems.length === 0) {
    return {
      status: "success",
      data: null,
      message: "No KOT batch items to generate",
      code: STATUS_CODES.SUCCESS,
    };
  }

  const sale = await billingRepository.getSaleById(
    params.organizationId,
    params.storeId,
    params.saleId,
  );
  if (!sale) {
    return {
      status: "error",
      message: "Sale not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }

  if (sale.serviceTableId) {
    return {
      status: "error",
      message: "A standalone KOT cannot be linked to a Service Table",
      data: null,
      code: STATUS_CODES.CONFLICT,
    };
  }

  const prepared = await prepareStandaloneKotBatchForActor({
    ...params,
    generatedAt: sale.committedAt ? new Date(sale.committedAt) : new Date(),
  });
  if (prepared.status !== "success" || !prepared.data) {
    return prepared as ServiceResponse<null>;
  }

  try {
    await pg.begin((tx) =>
      persistPreparedStandaloneKotBatch(params, prepared.data!, tx),
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === "23505"
    ) {
      return {
        status: "error",
        message:
          "A standalone KOT could not be generated because its sequence was already used",
        data: null,
        code: STATUS_CODES.CONFLICT,
      };
    }
    throw error;
  }

  return {
    status: "success",
    data: null,
    message: "Standalone KOT batch generated successfully",
    code: STATUS_CODES.CREATED,
  };
};

export type PreparedStandaloneKotBatch = {
  kotId: string;
  fulfillmentType: "dine_in" | "pick_up";
  generatedAt: Date;
  items: CreateKotItemREPO[];
  generationRequestId: string | null;
};

export const getStandaloneKotByGenerationRequestIdForActor = async (params: {
  organizationId: string;
  storeId: string;
  generationRequestId: string;
}) =>
  kotRepository.getKotByGenerationRequestId(
    params.organizationId,
    params.storeId,
    params.generationRequestId,
  );

export const prepareStandaloneKotBatchForActor = async (params: {
  organizationId: string;
  storeId: string;
  deviceId: string;
  batchItems: SaleItemInput[];
  serviceMode: SaleDetailDTO["serviceMode"];
  generatedAt?: Date;
  generationRequestId?: string;
}): Promise<ServiceResponse<PreparedStandaloneKotBatch | null>> => {
  const store = await organizationRepository.getStoreById(
    params.organizationId,
    params.storeId,
  );
  if (!store) {
    return {
      status: "error",
      message: "Store not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }
  if (!store.kotSystemEnabled) {
    return {
      status: "error",
      message:
        "Standalone KOT generation is available only when the KOT System is enabled",
      data: null,
      code: STATUS_CODES.FORBIDDEN,
    };
  }

  const session = {
    device: {
      id: params.deviceId,
      organizationId: params.organizationId,
      storeId: params.storeId,
      name: "POS",
      loginUsername: "pos",
      status: "active" as const,
      lastSeenAt: null,
    },
    store: { ...store, address: null },
    organization: {
      id: params.organizationId,
      name: store.name,
      username: "pos",
      tagline: null,
    },
  } satisfies DeviceSessionDTO;

  const kotId = crypto.randomUUID();
  const priced = await createOrReplaceTableKotItems(
    session,
    params.batchItems,
    [],
    kotId,
  );
  if ("error" in priced && priced.error) {
    return priced.error;
  }

  return {
    status: "success",
    data: {
      kotId,
      fulfillmentType: saleServiceModeToFulfillment(params.serviceMode),
      generatedAt: params.generatedAt ?? new Date(),
      items: priced.items!,
      generationRequestId: params.generationRequestId ?? null,
    },
    message: "Standalone KOT batch prepared",
    code: STATUS_CODES.CREATED,
  };
};

export const persistPreparedStandaloneKotBatch = async (
  params: {
    organizationId: string;
    storeId: string;
    deviceId: string;
    saleId: string;
  },
  prepared: PreparedStandaloneKotBatch,
  tx: Bun.TransactionSQL,
): Promise<KotDTO> => {
  const saleBatchSequence = await kotRepository.allocateSaleBatchSequence(
    params.organizationId,
    params.storeId,
    params.saleId,
    tx,
  );
  const allocated = await kotRepository.allocateKotNumber(
    params.organizationId,
    params.storeId,
    prepared.generatedAt,
    tx,
  );
  const created = await kotRepository.createKot(
    {
      id: prepared.kotId,
      organizationId: params.organizationId,
      storeId: params.storeId,
      saleId: params.saleId,
      kotType: "parcel",
      fulfillmentType: prepared.fulfillmentType,
      saleBatchSequence,
      generationRequestId: prepared.generationRequestId,
      kotNumber: allocated.kotNumber,
      kotSequenceNumber: allocated.kotSequenceNumber,
      kotPeriodKey: allocated.kotPeriodKey,
      createdByDeviceId: params.deviceId,
      updatedByDeviceId: params.deviceId,
      items: prepared.items,
    },
    tx,
  );
  if (!created) {
    throw new Error("Failed to create standalone KOT batch");
  }
  return created;
};

const replayTableKotGeneration = async (
  session: DeviceSessionDTO,
  tableId: string,
  generationRequestId: string,
): Promise<ServiceResponse<ServiceTableSaleResponse | null> | null> => {
  const existingKot = await kotRepository.getKotByGenerationRequestId(
    session.organization.id,
    session.store.id,
    generationRequestId,
  );
  if (!existingKot) {
    return null;
  }

  const workspace = await getActiveTableOrderForDevice(session, tableId);
  if (
    existingKot.kotType === "table" &&
    existingKot.tableOrderId &&
    workspace.status === "success" &&
    workspace.data?.tableOrder.id === existingKot.tableOrderId &&
    workspace.data.tableOrder.kots.some((kot) => kot.id === existingKot.id)
  ) {
    return {
      ...workspace,
      message: "Table KOT already generated",
      code: STATUS_CODES.SUCCESS,
    };
  }

  return {
    status: "error",
    message: "That KOT generation request was already used",
    data: null,
    code: STATUS_CODES.CONFLICT,
  };
};

export const createTableKotForDevice = async (
    session: DeviceSessionDTO,
    tableId: string,
    kotData: CreateTableKotSVC,
): Promise<ServiceResponse<ServiceTableSaleResponse | null>> => {
  const generationRequestId = kotData.requestId;
  if (!generationRequestId) {
    return {
      status: "error",
      message: "A KOT generation request id is required",
      data: null,
      code: STATUS_CODES.BAD_REQUEST,
    };
  }

    const features = await requireTableKotStore(session);
    if (!features.ok) {
        return features.response;
    }

  const replay = await replayTableKotGeneration(
    session,
    tableId,
    generationRequestId,
  );
  if (replay) {
    return replay;
  }

    const customerId =
    kotData.customerId === undefined
      ? undefined
      : normalizeOptionalUuid(kotData.customerId);
    if (customerId !== undefined) {
        const customerResult = await billingService.resolveCustomerAssignment(
            session.organization.id,
            customerId,
        );
        if ("status" in customerResult) {
            return customerResult;
        }
    }

    const kotId = crypto.randomUUID();
  const priced = await createOrReplaceTableKotItems(
    session,
    kotData.items,
    [],
    kotId,
  );
    if ("error" in priced && priced.error) {
        return priced.error;
    }

    try {
        const result = await pg.begin(async (tx) => {
            const table = await tableRepository.lockServiceTableForDevice(
                session.organization.id,
                session.store.id,
                tableId,
                tx,
            );
            if (!table) return { kind: "not_found" as const };
            if (
                (table.state !== "engaged" && table.state !== "ready_to_bill") ||
                !table.currentTableOrderId
            ) {
                return { kind: "conflict" as const };
            }

            const tableOrder = await kotRepository.lockActiveTableOrderForTable(
                session.organization.id,
                session.store.id,
                tableId,
                tx,
            );
            if (!tableOrder || tableOrder.id !== table.currentTableOrderId) {
                return { kind: "conflict" as const };
            }

            if (customerId !== undefined || kotData.notes !== undefined) {
                await kotRepository.updateTableOrderCustomer(
                    session.organization.id,
                    session.store.id,
                    tableOrder.id,
                    customerId === undefined ? tableOrder.customerId : customerId,
          kotData.notes === undefined
            ? undefined
            : normalizeOptionalText(kotData.notes),
                    session.device.id,
                    tx,
                );
            }

            const allocated = await kotRepository.allocateKotNumber(
                session.organization.id,
                session.store.id,
                new Date(),
                tx,
            );
            const created = await kotRepository.createKot(
                {
                    id: kotId,
                    organizationId: session.organization.id,
                    storeId: session.store.id,
                    saleId: null,
                    tableOrderId: tableOrder.id,
                    kotType: "table",
          fulfillmentType: kotData.fulfillmentType ?? "dine_in",
          saleBatchSequence: null,
          generationRequestId,
                    kotNumber: allocated.kotNumber,
                    kotSequenceNumber: allocated.kotSequenceNumber,
                    kotPeriodKey: allocated.kotPeriodKey,
                    createdByDeviceId: session.device.id,
                    updatedByDeviceId: session.device.id,
                    items: priced.items!,
                },
                tx,
            );
            if (!created) throw new Error("Failed to create Table KOT");

            const nextOrder = await kotRepository.getTableOrderById(
                session.organization.id,
                session.store.id,
                tableOrder.id,
                tx,
            );
            if (!nextOrder) throw new Error("Failed to load Table Order");
            return { kind: "created" as const, table, tableOrder: nextOrder };
        });

        if (result.kind === "not_found") {
            return {
                status: "error",
                message: "Service table not found",
                data: null,
                code: STATUS_CODES.NOT_FOUND,
            };
        }
        if (result.kind === "conflict") {
            return {
                status: "error",
                message: "A Table KOT can only be generated for an Active Table Order",
                data: null,
                code: STATUS_CODES.CONFLICT,
            };
        }

        return tableOrderWorkspace(
            result.table,
            result.tableOrder,
            null,
            "Table KOT generated successfully",
            STATUS_CODES.CREATED,
        );
    } catch (error) {
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            (error as { code?: unknown }).code === "23505"
        ) {
      const concurrentReplay = await replayTableKotGeneration(
        session,
        tableId,
        generationRequestId,
      );
      if (concurrentReplay) {
        return concurrentReplay;
      }
            return {
                status: "error",
        message:
          "A Table KOT could not be generated because the KOT Number was already used",
                data: null,
                code: STATUS_CODES.CONFLICT,
            };
        }
        throw error;
    }
};

export const updateTableKotForDevice = async (
    session: DeviceSessionDTO,
    tableId: string,
    kotId: string,
    kotData: UpdateTableKotSVC,
): Promise<ServiceResponse<ServiceTableSaleResponse | null>> => {
    const features = await requireTableKotStore(session);
    if (!features.ok) {
        return features.response;
    }

    const existingKot = await kotRepository.getKotById(
        session.organization.id,
        session.store.id,
        kotId,
    );
    if (!existingKot || existingKot.kotType !== "table") {
        return {
            status: "error",
            message: "KOT not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const priced = await createOrReplaceTableKotItems(
        session,
        kotData.items,
        existingKot.items,
        kotId,
    );
    if ("error" in priced && priced.error) {
        return priced.error;
    }

    const result = await pg.begin(async (tx) => {
        const table = await tableRepository.lockServiceTableForDevice(
            session.organization.id,
            session.store.id,
            tableId,
            tx,
        );
        if (!table) return { kind: "not_found" as const };
        if (!table.currentTableOrderId) return { kind: "conflict" as const };

        const tableOrder = await kotRepository.lockActiveTableOrderForTable(
            session.organization.id,
            session.store.id,
            tableId,
            tx,
        );
        if (!tableOrder || tableOrder.id !== table.currentTableOrderId) {
            return { kind: "conflict" as const };
        }
        if (existingKot.tableOrderId !== tableOrder.id) {
            return { kind: "mismatch" as const };
        }

        const updated = await kotRepository.replaceKotItems(
            kotId,
            priced.items!,
            session.device.id,
            tx,
        );
        if (!updated) throw new Error("Failed to edit Table KOT");

        const nextOrder = await kotRepository.getTableOrderById(
            session.organization.id,
            session.store.id,
            tableOrder.id,
            tx,
        );
        if (!nextOrder) throw new Error("Failed to load Table Order");
        return { kind: "updated" as const, table, tableOrder: nextOrder };
    });

    if (result.kind === "not_found") {
        return {
            status: "error",
            message: "Service table not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }
    if (result.kind === "mismatch") {
        return {
            status: "error",
            message: "That KOT does not belong to this Table Order",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }
    if (result.kind === "conflict") {
        return {
            status: "error",
            message: "Only an Active Table Order can be edited",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    return tableOrderWorkspace(
        result.table,
        result.tableOrder,
        null,
        "Table KOT updated",
        STATUS_CODES.SUCCESS,
    );
};

export const updateStandaloneKotForDevice = async (
  session: DeviceSessionDTO,
  saleId: string,
  kotId: string,
  kotData: UpdateStandaloneKotSVC,
): Promise<ServiceResponse<import("@repo/types").SaleResponse | null>> => {
  const store = await organizationRepository.getStoreById(
    session.organization.id,
    session.store.id,
  );
  if (!store?.kotSystemEnabled) {
    return {
      status: "error",
      message:
        "Standalone KOT editing is available only when the KOT System is enabled",
      data: null,
      code: STATUS_CODES.FORBIDDEN,
    };
  }

  const [sale, existingKot] = await Promise.all([
    billingRepository.getSaleById(
      session.organization.id,
      session.store.id,
      saleId,
    ),
    kotRepository.getKotById(session.organization.id, session.store.id, kotId),
  ]);
  if (!sale || sale.status !== "draft") {
    return {
      status: "error",
      message: "Only a Draft Sale KOT can be edited",
      data: null,
      code: sale ? STATUS_CODES.CONFLICT : STATUS_CODES.NOT_FOUND,
    };
  }
  if (
    !existingKot ||
    existingKot.kotType !== "parcel" ||
    existingKot.saleId !== saleId ||
    existingKot.tableOrderId
  ) {
    return {
      status: "error",
      message: "Standalone KOT not found on this Sale",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }

  const priced = await createOrReplaceTableKotItems(
    session,
    kotData.items,
    existingKot.items,
    kotId,
  );
  if ("error" in priced && priced.error) {
    return priced.error;
  }
  return billingService.updateDraftSaleWithWriteForDevice(
    session,
    saleId,
    { ...kotData.sale, generateKot: false, kotBatchItems: undefined },
    async (tx) => {
      const updated = await kotRepository.replaceKotItems(
        kotId,
        priced.items!,
        session.device.id,
        tx,
      );
      if (!updated) {
        throw new Error("Failed to edit standalone KOT");
      }
    },
  );
};

export const checkoutTableOrderForDevice = async (
    session: DeviceSessionDTO,
    tableId: string,
    checkoutData: CheckoutTableOrderSVC,
): Promise<ServiceResponse<ServiceTableSaleResponse | null>> => {
  const store = await organizationRepository.getStoreById(
    session.organization.id,
    session.store.id,
  );
  if (!store) {
    return {
      status: "error",
      message: "Store not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
    }

    const existingSaleId = await billingRepository.getSaleIdByCompletionRequestId(
        session.organization.id,
        session.store.id,
        checkoutData.requestId,
    );
    if (existingSaleId) {
    const saleResponse = await billingService.getSaleDetailsForDevice(
      session,
      existingSaleId,
    );
        if (saleResponse.status !== "success" || !saleResponse.data?.sale) {
            return saleResponse as ServiceResponse<ServiceTableSaleResponse | null>;
        }
        const table = await tableRepository.getServiceTableById(
            session.organization.id,
            session.store.id,
            tableId,
        );
        const tableOrder = saleResponse.data.sale.id
            ? await kotRepository.getTableOrderById(
                  session.organization.id,
                  session.store.id,
                  table?.currentTableOrderId ?? "",
              )
            : null;
        return {
            status: "success",
            data: {
                table: table ?? ({ id: tableId } as ServiceTableDTO),
                tableOrder: tableOrder ?? undefined,
                sale: saleResponse.data.sale,
            },
            message: "Table order checked out",
            code: STATUS_CODES.SUCCESS,
        };
    }

    const saleId = crypto.randomUUID();

    try {
        const result = await pg.begin(async (tx) => {
            const table = await tableRepository.lockServiceTableForDevice(
                session.organization.id,
                session.store.id,
                tableId,
                tx,
            );
            if (!table) return { kind: "not_found" as const };
            if (
                (table.state !== "engaged" && table.state !== "ready_to_bill") ||
                !table.currentTableOrderId
            ) {
                return { kind: "conflict" as const };
            }

            const tableOrder = await kotRepository.lockActiveTableOrderForTable(
                session.organization.id,
                session.store.id,
                tableId,
                tx,
            );
            if (!tableOrder || tableOrder.id !== table.currentTableOrderId) {
                return { kind: "conflict" as const };
            }

            const remainingItems = mergeKotItemsByConfiguration(
                tableOrder.kots.flatMap((kot) => kot.items),
            );
            if (remainingItems.length === 0) {
                return { kind: "empty" as const };
            }

            const lines = mapKotItemsToTrustedSaleLines(
                remainingItems,
                session.organization.id,
                session.store.id,
                saleId,
            );
            const pricingTotals = billingService.totalsFromTrustedSaleLines(
                lines,
                checkoutData.orderDiscountAmount,
            );
            if (pricingTotals.error || !pricingTotals.totals) {
                return {
                    kind: "invalid" as const,
                    response: pricingTotals.error ?? {
                        status: "error" as const,
                        message: "Failed to calculate sale totals",
                        data: null,
                        code: STATUS_CODES.INTERNAL_SERVER_ERROR,
                    },
                };
            }
            if (pricingTotals.totals.grandTotal <= 0) {
                return { kind: "empty" as const };
            }

            const payments = checkoutData.payments ?? [];
      const totalPayment = payments.reduce(
        (sum, payment) => sum + Number(payment.amount),
        0,
      );
            if (totalPayment > pricingTotals.totals.grandTotal) {
                return { kind: "overpay" as const };
            }

            const paymentStatus =
                totalPayment === 0
                    ? "pending"
                    : totalPayment === pricingTotals.totals.grandTotal
                      ? "paid"
                      : "partial";
            const committedAt = new Date();
            const notes =
                checkoutData.notes === undefined
                    ? (tableOrder.notes ?? null)
                    : normalizeOptionalText(checkoutData.notes);
            const nextCustomerId =
                checkoutData.customerId === undefined
                    ? tableOrder.customerId
                    : normalizeOptionalUuid(checkoutData.customerId);
            const customerResult = await billingService.resolveCustomerAssignment(
                session.organization.id,
                nextCustomerId,
            );
            if ("status" in customerResult) {
                return { kind: "invalid" as const, response: customerResult };
            }

            await billingService.persistCompletedSaleFromTrustedLines(tx, {
                actor: { deviceId: session.device.id },
                organizationId: session.organization.id,
                storeId: session.store.id,
                saleId,
                prepared: { lines, totals: pricingTotals.totals },
                customer: customerResult.customer,
                payments,
                notes,
                committedAt,
                requestId: checkoutData.requestId,
                serviceTableId: tableId,
        serviceMode: "dine_in",
            });

            await kotRepository.linkKotsToSale(
                session.organization.id,
                session.store.id,
                tableOrder.id,
                saleId,
                session.device.id,
                tx,
            );
            const checkedOut = await kotRepository.markTableOrderCheckedOut(
                session.organization.id,
                session.store.id,
                tableOrder.id,
                saleId,
                session.device.id,
                tx,
            );
            if (!checkedOut) throw new Error("Failed to check out Table Order");

            const tableState = paymentStatus === "paid" ? "paid" : "payment_due";
            const nextTable = await tableRepository.attachCheckedOutSale(
                session.organization.id,
                session.store.id,
                tableId,
                tableOrder.id,
                saleId,
                tableState,
                session.device.id,
                tx,
            );
      if (!nextTable)
        throw new Error("Failed to transition service table after checkout");

            return {
                kind: "checked_out" as const,
                table: nextTable,
                tableOrder: checkedOut,
            };
        });

        if (result.kind === "not_found") {
            return {
                status: "error",
                message: "Service table not found",
                data: null,
                code: STATUS_CODES.NOT_FOUND,
            };
        }
        if (result.kind === "conflict") {
            return {
                status: "error",
                message: "Only an Active Table Order can be checked out",
                data: null,
                code: STATUS_CODES.CONFLICT,
            };
        }
        if (result.kind === "empty") {
            return {
                status: "error",
        message:
          "A sale must have at least one billable item before it can be completed",
                data: null,
                code: STATUS_CODES.BAD_REQUEST,
            };
        }
        if (result.kind === "overpay") {
            return {
                status: "error",
                message: "Collected payment cannot exceed the sale total",
                data: null,
                code: STATUS_CODES.CONFLICT,
            };
        }
        if (result.kind === "invalid") {
            return result.response as ServiceResponse<ServiceTableSaleResponse | null>;
        }

    const saleResponse = await billingService.getSaleDetailsForDevice(
      session,
      saleId,
    );
        if (saleResponse.status !== "success" || !saleResponse.data?.sale) {
            return {
                status: "error",
                message: "Failed to fetch checked-out table sale",
                data: null,
                code: STATUS_CODES.INTERNAL_SERVER_ERROR,
            };
        }

        const sale = {
            ...saleResponse.data.sale,
            kotNumbers: result.tableOrder.kots.map((kot) => kot.kotNumber),
        };

        return tableOrderWorkspace(
            result.table,
            result.tableOrder,
            sale,
            "Table order checked out",
            STATUS_CODES.CREATED,
        );
    } catch (error) {
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            (error as { code?: unknown }).code === "23505"
        ) {
      const completedSaleId =
        await billingRepository.getSaleIdByCompletionRequestId(
                session.organization.id,
                session.store.id,
                checkoutData.requestId,
            );
            if (completedSaleId) {
                return checkoutTableOrderForDevice(session, tableId, checkoutData);
            }
        }
        throw error;
    }
};

const requireKotSystemStore = async (session: DeviceSessionDTO) => {
    const store = await organizationRepository.getStoreById(
        session.organization.id,
        session.store.id,
    );
    if (!store) {
        return {
            ok: false as const,
            response: {
                status: "error" as const,
                message: "Store not found",
                data: null,
                code: STATUS_CODES.NOT_FOUND,
            },
        };
    }
    if (!store.kotSystemEnabled) {
        return {
            ok: false as const,
            response: {
                status: "error" as const,
                message: "KOT is available only when the KOT System is enabled",
                data: null,
                code: STATUS_CODES.FORBIDDEN,
            },
        };
    }
    return { ok: true as const, store };
};

export const listKitchenKotsForDevice = async (
    session: DeviceSessionDTO,
): Promise<ServiceResponse<KitchenKotsListResponse | null>> => {
    const features = await requireKotSystemStore(session);
    if (!features.ok) {
        return features.response;
    }

    const kots = await kotRepository.listPendingKitchenKots(
        session.organization.id,
        session.store.id,
    );

    return {
        status: "success",
        data: { kots },
        message: "Kitchen KOTs loaded",
        code: STATUS_CODES.SUCCESS,
    };
};

export const completeKitchenKotForDevice = async (
    session: DeviceSessionDTO,
    kotId: string,
): Promise<ServiceResponse<KitchenKotsListResponse | null>> => {
    const features = await requireKotSystemStore(session);
    if (!features.ok) {
        return features.response;
    }

    const existingKot = await kotRepository.getKotById(
        session.organization.id,
        session.store.id,
        kotId,
    );
    if (!existingKot) {
        return {
            status: "error",
            message: "KOT not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }
    if (existingKot.kitchenCompletedAt) {
        return {
            status: "error",
            message: "KOT is already completed",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    const completed = await kotRepository.markKotKitchenCompleted(
        session.organization.id,
        session.store.id,
        kotId,
        session.device.id,
    );
    if (!completed) {
        return {
            status: "error",
            message: "KOT could not be completed",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    const kots = await kotRepository.listPendingKitchenKots(
        session.organization.id,
        session.store.id,
    );

    return {
        status: "success",
        data: { kots },
        message: "KOT marked as complete",
        code: STATUS_CODES.SUCCESS,
    };
};
