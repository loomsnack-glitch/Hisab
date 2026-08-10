import { pg } from "@/config/db";
import * as catalogRepository from "@/modules/tenant/catalog/catalog.repository";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import {
    STATUS_CODES,
    type AddOnSalesRollupsListResponse,
    type BundleSalesRollupsListResponse,
    type CommitSaleSVC,
    type CompleteSaleSVC,
    type ReplaceSaleSVC,
    type CreateCustomerSVC,
    type CreateDraftSaleSVC,
    type CreatePaymentSVC,
    type CreateSaleItemAddOnREPO,
    type CreateSaleItemBundleComponentAddOnREPO,
    type CreateSaleItemBundleComponentREPO,
    type CreateSaleItemREPO,
    type CustomerDTO,
    type CustomerLedgerResponse,
    type CustomerResponse,
    type CustomersListResponse,
    type DeviceSessionDTO,
    type PaymentResponse,
    type ProductSalesSummaryAdminQuery,
    type ProductSalesSummaryListResponse,
    type ProductSalesSummaryQuery,
    type SaleDetailDTO,
    type SaleItemDTO,
    type SaleItemInput,
    type SaleNumberSettingsResponse,
    type SaleResponse,
    type UpdateSaleNumberSettingsSVC,
    type SalesListQuery,
    type SalesListResponse,
    type ServiceResponse,
    type UpdateCustomerSVC,
    type UpdateDraftSaleSVC,
    type VoidSaleSVC,
} from "@repo/types";
import * as billingRepository from "./billing.repository";
import { decodeSalesCursor } from "./sales-pagination";
import { DEFAULT_SALE_NUMBER_TIMEZONE } from "./sale-numbering";

const normalizeOptionalText = (value?: string | null) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
};

const normalizeOptionalUuid = (value?: string | null) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
};

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const moneyFrom = (value: number | string | null | undefined) => roundMoney(Number(value ?? 0));

const sumMoney = (values: Array<number | string | null | undefined>) =>
    roundMoney(values.reduce((total: number, value) => total + Number(value ?? 0), 0));

/**
 * Returns the discount already represented by persisted sale lines.
 *
 * Combo option add-on discounts are folded into the parent sale item's
 * discountAmount when the Combo line is prepared. Do not add bundle-component
 * add-on discounts here again or the same discount will be counted twice.
 */
const getSaleLineDiscountTotal = (
    items: Array<{
        discountAmount: number | string | null | undefined;
        addOns?: Array<{ discountAmount: number | string | null | undefined }>;
    }>,
) =>
    sumMoney([
        ...items.map((item) => item.discountAmount),
        ...items.flatMap((item) => (item.addOns ?? []).map((addOn) => addOn.discountAmount)),
    ]);

const getParentAndAddOnSubtotal = (
    items: Array<{
        lineSubtotal: number | string | null | undefined;
        addOns?: Array<{ lineSubtotal: number | string | null | undefined }>;
    }>,
) =>
    sumMoney([
        ...items.map((item) => item.lineSubtotal),
        ...items.flatMap((item) => (item.addOns ?? []).map((addOn) => addOn.lineSubtotal)),
    ]);

const deriveOrderDiscountAmount = (
    discountTotal: number | string | null | undefined,
    lineDiscountTotal: number | string | null | undefined,
) => roundMoney(Math.max(moneyFrom(discountTotal) - moneyFrom(lineDiscountTotal), 0));

const isWholeCount = (value: number) => Number.isInteger(value) && value > 0;

const buildConfigurationSignature = (addOns: Array<{ addOnId: string; quantity: number }>) => {
    if (addOns.length === 0) {
        return "";
    }

    return [...addOns]
        .sort((left, right) => left.addOnId.localeCompare(right.addOnId))
        .map((addOn) => `${addOn.addOnId}:${addOn.quantity}`)
        .join("|");
};

const buildComboConfigurationSignature = (
    selections: Array<{
        groupId: string;
        optionProductId: string;
        quantity: number;
        addOns: Array<{ addOnId: string; quantity: number }>;
    }>,
) =>
    [...selections]
        .sort((left, right) =>
            `${left.groupId}:${left.optionProductId}`.localeCompare(`${right.groupId}:${right.optionProductId}`),
        )
        .map(
            (selection) =>
                `${selection.groupId}:${selection.optionProductId}:${selection.quantity}:${buildConfigurationSignature(selection.addOns)}`,
        )
        .join("|");

const normalizeSelectedAddOns = (
    addOns: SaleItemInput["addOns"] | undefined,
):
    | { error: ServiceResponse<null>; addOns?: undefined }
    | {
          error?: undefined;
          addOns: Array<{ addOnId: string; quantity: number }>;
      } => {
    const selectedAddOns = (addOns ?? []).map((addOn) => ({
        addOnId: addOn.addOnId,
        quantity: Number(addOn.quantity),
    }));

    const seenAddOnIds = new Set<string>();
    for (const addOn of selectedAddOns) {
        if (!isWholeCount(addOn.quantity)) {
            return {
                error: {
                    status: "error",
                    message: "Add-on quantity must be a whole number greater than 0",
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                },
            };
        }

        if (seenAddOnIds.has(addOn.addOnId)) {
            return {
                error: {
                    status: "error",
                    message: "Duplicate add-ons are not allowed within the same configured product",
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                },
            };
        }

        seenAddOnIds.add(addOn.addOnId);
    }

    return {
        addOns: [...selectedAddOns].sort((left, right) => left.addOnId.localeCompare(right.addOnId)),
    };
};

const normalizeComboSelections = (
    selections: SaleItemInput["comboSelections"] | undefined,
):
    | { error: ServiceResponse<null>; selections?: undefined }
    | {
          error?: undefined;
          selections: Array<{
              groupId: string;
              optionProductId: string;
              quantity: number;
              addOns: Array<{ addOnId: string; quantity: number }>;
          }>;
      } => {
    const normalized = [] as Array<{
        groupId: string;
        optionProductId: string;
        quantity: number;
        addOns: Array<{ addOnId: string; quantity: number }>;
    }>;

    for (const selection of selections ?? []) {
        const quantity = Number(selection.quantity);
        if (!isWholeCount(quantity)) {
            return {
                error: {
                    status: "error",
                    message: "Combo option quantity must be a whole number greater than 0",
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                },
            };
        }

        const addOns = normalizeSelectedAddOns(selection.addOns);
        if (addOns.error) return { error: addOns.error };

        normalized.push({
            groupId: selection.groupId,
            optionProductId: selection.optionProductId,
            quantity,
            addOns: addOns.addOns,
        });
    }

    const seen = new Set<string>();
    for (const selection of normalized) {
        const key = `${selection.groupId}:${selection.optionProductId}`;
        if (seen.has(key)) {
            return {
                error: {
                    status: "error",
                    message: "The same Combo option cannot be selected twice in one configuration",
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                },
            };
        }
        seen.add(key);
    }

    return {
        selections: normalized.sort((left, right) =>
            `${left.groupId}:${left.optionProductId}`.localeCompare(`${right.groupId}:${right.optionProductId}`),
        ),
    };
};

const mergeSaleItemInputsByConfiguration = (
    items: SaleItemInput[],
): { error: ServiceResponse<null>; items?: undefined } | { error?: undefined; items: SaleItemInput[] } => {
    const mergedByKey = new Map<string, SaleItemInput>();

    for (const item of items) {
        const parentQuantity = Number(item.quantity);
        if (!isWholeCount(parentQuantity)) {
            return {
                error: {
                    status: "error",
                    message: "Product quantity must be a whole number greater than 0",
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                },
            };
        }

        const normalizedAddOns = normalizeSelectedAddOns(item.addOns);
        if (normalizedAddOns.error) {
            return { error: normalizedAddOns.error };
        }

        const normalizedComboSelections = normalizeComboSelections(item.comboSelections);
        if (normalizedComboSelections.error) return { error: normalizedComboSelections.error };

        const configurationSignature =
            normalizedComboSelections.selections.length > 0
                ? buildComboConfigurationSignature(normalizedComboSelections.selections)
                : buildConfigurationSignature(normalizedAddOns.addOns);
        const configurationKey = `${item.productId}::${configurationSignature}`;
        const existing = mergedByKey.get(configurationKey);

        if (existing) {
            mergedByKey.set(configurationKey, {
                ...existing,
                quantity: Number(existing.quantity) + parentQuantity,
            });
            continue;
        }

        mergedByKey.set(configurationKey, {
            productId: item.productId,
            quantity: parentQuantity,
            addOns: normalizedAddOns.addOns,
            comboSelections: normalizedComboSelections.selections,
        });
    }

    return { items: [...mergedByKey.values()] };
};

type SalePricingTotals = {
    subtotal: number;
    lineDiscountTotal: number;
    orderDiscountAmount: number;
    discountTotal: number;
    grandTotal: number;
};

type PreparedBundleComponent = {
    component: CreateSaleItemBundleComponentREPO;
    addOns: CreateSaleItemBundleComponentAddOnREPO[];
};

type PreparedSaleLine = {
    item: CreateSaleItemREPO;
    addOns: CreateSaleItemAddOnREPO[];
    bundleComponents: PreparedBundleComponent[];
};

const buildSalePricingTotals = (
    subtotal: number | string | null | undefined,
    lineDiscountTotal: number | string | null | undefined,
    orderDiscountAmount: number | string | null | undefined,
): { error?: ServiceResponse<null>; totals?: SalePricingTotals } => {
    const normalizedSubtotal = moneyFrom(subtotal);
    const normalizedLineDiscountTotal = moneyFrom(lineDiscountTotal);
    const normalizedOrderDiscountAmount = moneyFrom(orderDiscountAmount);
    const maxOrderDiscountAmount = roundMoney(normalizedSubtotal - normalizedLineDiscountTotal);

    if (normalizedOrderDiscountAmount > maxOrderDiscountAmount) {
        return {
            error: {
                status: "error",
                message: "Order discount cannot exceed the remaining sale subtotal after line discounts",
                data: null,
                code: STATUS_CODES.BAD_REQUEST,
            },
        };
    }

    const discountTotal = roundMoney(normalizedLineDiscountTotal + normalizedOrderDiscountAmount);
    const grandTotal = roundMoney(normalizedSubtotal - discountTotal);

    return {
        totals: {
            subtotal: normalizedSubtotal,
            lineDiscountTotal: normalizedLineDiscountTotal,
            orderDiscountAmount: normalizedOrderDiscountAmount,
            discountTotal,
            grandTotal,
        },
    };
};

const getOrganizationForUser = async (organizationId: string, userId: string) => {
    return organizationRepository.getOrganizationByIdForUser(organizationId, userId);
};

const getOrganizationById = async (organizationId: string) => {
    return organizationRepository.getOrganizationById(organizationId);
};

const getStoreForOrganization = async (organizationId: string, storeId: string) => {
    return organizationRepository.getStoreById(organizationId, storeId);
};

const getCustomerForOrganization = async (organizationId: string, customerId: string) => {
    return billingRepository.getCustomerById(organizationId, customerId);
};

const getSaleForStore = async (organizationId: string, storeId: string, saleId: string) => {
    return billingRepository.getSaleById(organizationId, storeId, saleId);
};

const verifyOrganizationAndStore = async (
    userId: string,
    organizationId: string,
    storeId?: string,
): Promise<ServiceResponse<null> | null> => {
    const organization = await getOrganizationForUser(organizationId, userId);
    if (!organization) {
        return {
            status: "error",
            message: "Organization not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    if (storeId) {
        const store = await getStoreForOrganization(organizationId, storeId);
        if (!store) {
            return {
                status: "error",
                message: "Store not found",
                data: null,
                code: STATUS_CODES.NOT_FOUND,
            };
        }
    }

    return null;
};

export const getSaleNumberSettings = async (
    userId: string,
    organizationId: string,
    storeId: string,
): Promise<ServiceResponse<SaleNumberSettingsResponse | null>> => {
    const invalid = await verifyOrganizationAndStore(userId, organizationId, storeId);
    if (invalid) {
        return invalid as ServiceResponse<SaleNumberSettingsResponse | null>;
    }

    const existing = await billingRepository.getSaleNumberSettings(organizationId, storeId);
    const settings =
        existing ??
        (await billingRepository.upsertSaleNumberSettings(
            organizationId,
            storeId,
            "never",
            DEFAULT_SALE_NUMBER_TIMEZONE,
            false,
            "daily",
        ));

    if (!settings) {
        return {
            status: "error",
            message: "Failed to load Sale Number settings",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: { settings },
        message: "Sale Number settings fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const updateSaleNumberSettings = async (
    userId: string,
    organizationId: string,
    storeId: string,
    settingsData: UpdateSaleNumberSettingsSVC,
): Promise<ServiceResponse<SaleNumberSettingsResponse | null>> => {
    const invalid = await verifyOrganizationAndStore(userId, organizationId, storeId);
    if (invalid) {
        return invalid as ServiceResponse<SaleNumberSettingsResponse | null>;
    }

    const settings = await billingRepository.upsertSaleNumberSettings(
        organizationId,
        storeId,
        settingsData.resetPeriod,
        DEFAULT_SALE_NUMBER_TIMEZONE,
        settingsData.tokenNumberEnabled,
        settingsData.tokenNumberResetPeriod,
    );

    if (!settings) {
        return {
            status: "error",
            message: "Failed to update Sale Number settings",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: { settings },
        message: "Sale Number settings updated successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

const validateSalesListCustomerFilter = async (
    organizationId: string,
    query: SalesListQuery,
): Promise<ServiceResponse<null> | null> => {
    if (!query.customerId) {
        return null;
    }

    const customer = await getCustomerForOrganization(organizationId, query.customerId);
    if (!customer) {
        return {
            status: "error",
            message: "Customer not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    return null;
};

const buildSaleDetails = async (
    organizationId: string,
    storeId: string,
    saleId: string,
    tx?: Bun.TransactionSQL,
): Promise<SaleDetailDTO | null> => {
    const sale = await billingRepository.getSaleById(organizationId, storeId, saleId, tx);
    if (!sale) {
        return null;
    }

    const [items, payments] = await Promise.all([
        billingRepository.getSaleItemsBySaleId(saleId, tx),
        billingRepository.getPaymentsBySaleId(saleId, tx),
    ]);
    const lineDiscountTotal = getSaleLineDiscountTotal(items);

    return {
        ...sale,
        items,
        payments,
        orderDiscountAmount: deriveOrderDiscountAmount(sale.discountTotal, lineDiscountTotal),
    };
};

const configurationKeyFor = (productId: string, configurationSignature: string) =>
    `${productId}::${configurationSignature}`;

const rescaleFrozenConfiguredLine = (
    frozen: SaleItemDTO,
    parentQuantity: number,
    organizationId: string,
    storeId: string,
    saleId: string,
): PreparedSaleLine => {
    const saleItemId = crypto.randomUUID();
    const unitPrice = moneyFrom(frozen.unitPriceSnapshot);
    const previousQuantity = Number(frozen.quantity);
    const unitDiscount = previousQuantity > 0 ? roundMoney(moneyFrom(frozen.discountAmount) / previousQuantity) : 0;
    const previousLineSubtotal = moneyFrom(frozen.lineSubtotal);
    const configuredExtraPerUnit =
        previousQuantity > 0 ? roundMoney(previousLineSubtotal / previousQuantity - unitPrice) : 0;
    const lineSubtotal = roundMoney(parentQuantity * (unitPrice + configuredExtraPerUnit));
    const discountAmount = roundMoney(unitDiscount * parentQuantity);

    return {
        item: {
            id: saleItemId,
            organizationId,
            storeId,
            saleId,
            productId: frozen.productId,
            quantity: parentQuantity,
            configurationSignature: frozen.configurationSignature ?? "",
            productNameSnapshot: frozen.productNameSnapshot,
            unitPriceSnapshot: unitPrice,
            discountAmount,
            lineSubtotal,
            lineTotal: roundMoney(lineSubtotal - discountAmount),
        },
        addOns: (frozen.addOns ?? []).map((addOn) => {
            const quantityPerParent = Number(addOn.quantityPerParent);
            const totalQuantity = quantityPerParent * parentQuantity;
            const addOnUnitPrice = moneyFrom(addOn.unitPriceSnapshot);
            const addOnUnitDiscount = moneyFrom(addOn.unitDiscountSnapshot);
            const addOnLineSubtotal = roundMoney(totalQuantity * addOnUnitPrice);
            const addOnDiscountAmount = roundMoney(totalQuantity * addOnUnitDiscount);

            return {
                id: crypto.randomUUID(),
                organizationId,
                storeId,
                saleId,
                saleItemId,
                addOnId: addOn.addOnId,
                quantityPerParent,
                totalQuantity,
                addOnNameSnapshot: addOn.addOnNameSnapshot,
                unitPriceSnapshot: addOnUnitPrice,
                unitDiscountSnapshot: addOnUnitDiscount,
                discountAmount: addOnDiscountAmount,
                lineSubtotal: addOnLineSubtotal,
                lineTotal: roundMoney(addOnLineSubtotal - addOnDiscountAmount),
            };
        }),
        bundleComponents: (frozen.bundleComponents ?? []).map((component) => {
            const componentId = crypto.randomUUID();
            const quantityPerBundle = Number(component.quantityPerBundle);
            const totalQuantity = quantityPerBundle * parentQuantity;

            return {
                component: {
                    id: componentId,
                    organizationId,
                    storeId,
                    saleId,
                    saleItemId,
                    choiceGroupId: component.choiceGroupId ?? null,
                    componentProductId: component.componentProductId,
                    quantityPerBundle,
                    totalQuantity,
                    productNameSnapshot: component.productNameSnapshot,
                    unitPriceSnapshot: moneyFrom(component.unitPriceSnapshot),
                    unitDiscountSnapshot: moneyFrom(component.unitDiscountSnapshot),
                    priceAdjustmentSnapshot: moneyFrom(component.priceAdjustmentSnapshot),
                },
                addOns: (component.addOns ?? []).map((addOn) => {
                    const quantityPerComponent = Number(addOn.quantityPerComponent);
                    return {
                        id: crypto.randomUUID(),
                        organizationId,
                        storeId,
                        saleId,
                        saleItemId,
                        saleItemBundleComponentId: componentId,
                        addOnId: addOn.addOnId,
                        quantityPerComponent,
                        totalQuantity: quantityPerComponent * totalQuantity,
                        addOnNameSnapshot: addOn.addOnNameSnapshot,
                        unitPriceSnapshot: moneyFrom(addOn.unitPriceSnapshot),
                        unitDiscountSnapshot: moneyFrom(addOn.unitDiscountSnapshot),
                    };
                }),
            };
        }),
    };
};

const prepareBundleSaleLine = async (
    organizationId: string,
    storeId: string,
    saleId: string,
    saleItemId: string,
    product: {
        id: string;
        name: string;
        price: number | string;
        discount: number | string;
    },
    parentQuantity: number,
): Promise<{ error: ServiceResponse<null>; line?: undefined } | { error?: undefined; line: PreparedSaleLine }> => {
    const components = await catalogRepository.getBundleProductComponentsByBundleProductId(organizationId, product.id);

    if (components.length === 0) {
        return {
            error: {
                status: "error",
                message: `Bundle product "${product.name}" has no components and cannot be sold`,
                data: null,
                code: STATUS_CODES.BAD_REQUEST,
            },
        };
    }

    const componentAddOns = await catalogRepository.getBundleProductComponentAddOnsByComponentIds(
        organizationId,
        components.map((component) => component.id),
    );
    const addOnsByComponentId = new Map<string, typeof componentAddOns>();
    for (const addOn of componentAddOns) {
        const existing = addOnsByComponentId.get(addOn.bundleProductComponentId) ?? [];
        existing.push(addOn);
        addOnsByComponentId.set(addOn.bundleProductComponentId, existing);
    }

    const preparedBundleComponents: PreparedBundleComponent[] = [];

    for (const component of components) {
        const componentProduct = await catalogRepository.getProductById(organizationId, component.componentProductId);
        if (!componentProduct) {
            return {
                error: {
                    status: "error",
                    message: `Bundle component product not found for bundle "${product.name}"`,
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                },
            };
        }

        if (componentProduct.status !== "active") {
            return {
                error: {
                    status: "error",
                    message: `Bundle component product is inactive for bundle "${product.name}"`,
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                },
            };
        }

        const componentId = crypto.randomUUID();
        const quantityPerBundle = Number(component.quantity);
        const totalQuantity = quantityPerBundle * parentQuantity;
        const preparedAddOns: CreateSaleItemBundleComponentAddOnREPO[] = [];

        for (const componentAddOn of addOnsByComponentId.get(component.id) ?? []) {
            const addOn = await catalogRepository.getAddOnById(organizationId, componentAddOn.addOnId);
            if (!addOn) {
                return {
                    error: {
                        status: "error",
                        message: `Bundle component add-on not found for bundle "${product.name}"`,
                        data: null,
                        code: STATUS_CODES.BAD_REQUEST,
                    },
                };
            }

            if (addOn.status !== "active") {
                return {
                    error: {
                        status: "error",
                        message: `Bundle component add-on is inactive for bundle "${product.name}"`,
                        data: null,
                        code: STATUS_CODES.BAD_REQUEST,
                    },
                };
            }

            const quantityPerComponent = Number(componentAddOn.quantity);
            const attachment = await catalogRepository.getSelectableProductAddOnAttachmentByProductAndAddOn(
                organizationId,
                component.componentProductId,
                componentAddOn.addOnId,
            );
            if (!attachment) {
                return {
                    error: {
                        status: "error",
                        message: `Bundle component add-on is not selectable for bundle "${product.name}"`,
                        data: null,
                        code: STATUS_CODES.BAD_REQUEST,
                    },
                };
            }

            if (quantityPerComponent > attachment.selectionCap) {
                return {
                    error: {
                        status: "error",
                        message: `Bundle component add-on quantity exceeds the selection cap for bundle "${product.name}"`,
                        data: null,
                        code: STATUS_CODES.BAD_REQUEST,
                    },
                };
            }

            preparedAddOns.push({
                id: crypto.randomUUID(),
                organizationId,
                storeId,
                saleId,
                saleItemId,
                saleItemBundleComponentId: componentId,
                addOnId: addOn.id,
                quantityPerComponent,
                totalQuantity: quantityPerComponent * totalQuantity,
                addOnNameSnapshot: addOn.name,
                unitPriceSnapshot: moneyFrom(addOn.price),
                unitDiscountSnapshot: moneyFrom(addOn.discount),
            });
        }

        preparedBundleComponents.push({
            component: {
                id: componentId,
                organizationId,
                storeId,
                saleId,
                saleItemId,
                choiceGroupId: null,
                componentProductId: componentProduct.id,
                quantityPerBundle,
                totalQuantity,
                productNameSnapshot: componentProduct.name,
                unitPriceSnapshot: moneyFrom(componentProduct.price),
                unitDiscountSnapshot: moneyFrom(componentProduct.discount),
                priceAdjustmentSnapshot: 0,
            },
            addOns: preparedAddOns,
        });
    }

    const unitPrice = moneyFrom(product.price);
    const lineSubtotal = roundMoney(parentQuantity * unitPrice);
    const discountAmount = roundMoney(moneyFrom(product.discount) * parentQuantity);

    if (discountAmount > lineSubtotal) {
        return {
            error: {
                status: "error",
                message: `Discount for product "${product.name}" cannot exceed the line subtotal`,
                data: null,
                code: STATUS_CODES.BAD_REQUEST,
            },
        };
    }

    return {
        line: {
            item: {
                id: saleItemId,
                organizationId,
                storeId,
                saleId,
                productId: product.id,
                quantity: parentQuantity,
                configurationSignature: "",
                productNameSnapshot: product.name,
                unitPriceSnapshot: unitPrice,
                discountAmount,
                lineSubtotal,
                lineTotal: roundMoney(lineSubtotal - discountAmount),
            },
            addOns: [],
            bundleComponents: preparedBundleComponents,
        },
    };
};

const prepareComboSaleLine = async (
    organizationId: string,
    storeId: string,
    saleId: string,
    saleItemId: string,
    product: {
        id: string;
        name: string;
        price: number | string;
        discount: number | string;
    },
    parentQuantity: number,
    selections: NonNullable<SaleItemInput["comboSelections"]>,
): Promise<{ error: ServiceResponse<null>; line?: undefined } | { error?: undefined; line: PreparedSaleLine }> => {
    const groups = await catalogRepository.getComboChoiceGroupsByProductId(organizationId, product.id);
    if (groups.length === 0) {
        return {
            error: {
                status: "error",
                message: `Combo product "${product.name}" has no choices and cannot be sold`,
                data: null,
                code: STATUS_CODES.BAD_REQUEST,
            },
        };
    }
    const options = await catalogRepository.getComboChoiceOptionsByGroupIds(
        organizationId,
        groups.map((group) => group.id),
    );

    if (options.length === 0) {
        return {
            error: {
                status: "error",
                message: `Combo product "${product.name}" has no choices and cannot be sold`,
                data: null,
                code: STATUS_CODES.BAD_REQUEST,
            },
        };
    }

    const optionsByKey = new Map(
        options.map((option) => [`${option.choiceGroupId}:${option.optionProductId}`, option]),
    );
    const groupIds = new Set(groups.map((group) => group.id));
    for (const selection of selections) {
        if (!groupIds.has(selection.groupId)) {
            return {
                error: {
                    status: "error",
                    message: `Invalid Combo choice group for "${product.name}"`,
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                },
            };
        }
    }
    const selectionsByGroup = new Map<string, typeof selections>();
    for (const selection of selections) {
        const groupSelections = selectionsByGroup.get(selection.groupId) ?? [];
        groupSelections.push(selection);
        selectionsByGroup.set(selection.groupId, groupSelections);
    }

    const preparedBundleComponents: PreparedBundleComponent[] = [];
    let adjustmentSubtotal = 0;
    let optionAddOnSubtotal = 0;
    let optionAddOnDiscountTotal = 0;

    for (const group of groups) {
        const groupSelections = selectionsByGroup.get(group.id) ?? [];
        const totalSelections = groupSelections.reduce((total, selection) => total + selection.quantity, 0);
        if (totalSelections < group.minSelections || totalSelections > group.maxSelections) {
            return {
                error: {
                    status: "error",
                    message: `Select between ${group.minSelections} and ${group.maxSelections} options for "${group.name}"`,
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                },
            };
        }

        for (const selection of groupSelections) {
            const option = optionsByKey.get(`${group.id}:${selection.optionProductId}`);
            if (!option || selection.quantity > option.maxQuantity) {
                return {
                    error: {
                        status: "error",
                        message: `Invalid quantity for Combo option in "${group.name}"`,
                        data: null,
                        code: STATUS_CODES.BAD_REQUEST,
                    },
                };
            }

            const optionProduct = await catalogRepository.getProductById(organizationId, option.optionProductId);
            if (!optionProduct || optionProduct.status !== "active" || optionProduct.productType !== "single") {
                return {
                    error: {
                        status: "error",
                        message: `Combo option is no longer available for "${product.name}"`,
                        data: null,
                        code: STATUS_CODES.BAD_REQUEST,
                    },
                };
            }

            const componentId = crypto.randomUUID();
            const totalQuantity = selection.quantity * parentQuantity;
            const preparedAddOns: CreateSaleItemBundleComponentAddOnREPO[] = [];
            for (const selectedAddOn of selection.addOns) {
                const attachment = await catalogRepository.getSelectableProductAddOnAttachmentByProductAndAddOn(
                    organizationId,
                    optionProduct.id,
                    selectedAddOn.addOnId,
                );
                if (!attachment || selectedAddOn.quantity > attachment.selectionCap) {
                    return {
                        error: {
                            status: "error",
                            message: `Invalid add-on selection for Combo option "${optionProduct.name}"`,
                            data: null,
                            code: STATUS_CODES.BAD_REQUEST,
                        },
                    };
                }

                if (moneyFrom(attachment.addOn.discount) > moneyFrom(attachment.addOn.price)) {
                    return {
                        error: {
                            status: "error",
                            message: `Add-on "${attachment.addOn.name}" has an invalid price configuration`,
                            data: null,
                            code: STATUS_CODES.BAD_REQUEST,
                        },
                    };
                }

                const addOnTotalQuantity = selectedAddOn.quantity * totalQuantity;
                optionAddOnSubtotal += addOnTotalQuantity * moneyFrom(attachment.addOn.price);
                optionAddOnDiscountTotal += addOnTotalQuantity * moneyFrom(attachment.addOn.discount);
                preparedAddOns.push({
                    id: crypto.randomUUID(),
                    organizationId,
                    storeId,
                    saleId,
                    saleItemId,
                    saleItemBundleComponentId: componentId,
                    addOnId: attachment.addOn.id,
                    quantityPerComponent: selectedAddOn.quantity,
                    totalQuantity: addOnTotalQuantity,
                    addOnNameSnapshot: attachment.addOn.name,
                    unitPriceSnapshot: moneyFrom(attachment.addOn.price),
                    unitDiscountSnapshot: moneyFrom(attachment.addOn.discount),
                });
            }

            adjustmentSubtotal += totalQuantity * moneyFrom(option.priceAdjustment);
            preparedBundleComponents.push({
                component: {
                    id: componentId,
                    organizationId,
                    storeId,
                    saleId,
                    saleItemId,
                    choiceGroupId: group.id,
                    componentProductId: optionProduct.id,
                    quantityPerBundle: selection.quantity,
                    totalQuantity,
                    productNameSnapshot: optionProduct.name,
                    unitPriceSnapshot: moneyFrom(optionProduct.price),
                    unitDiscountSnapshot: moneyFrom(optionProduct.discount),
                    priceAdjustmentSnapshot: moneyFrom(option.priceAdjustment),
                },
                addOns: preparedAddOns,
            });
        }
    }

    const unitPrice = moneyFrom(product.price);
    const lineSubtotal = roundMoney(parentQuantity * unitPrice + adjustmentSubtotal + optionAddOnSubtotal);
    const discountAmount = roundMoney(moneyFrom(product.discount) * parentQuantity + optionAddOnDiscountTotal);
    if (lineSubtotal < 0 || discountAmount > lineSubtotal) {
        return {
            error: {
                status: "error",
                message: `Combo price for "${product.name}" is invalid after selected options`,
                data: null,
                code: STATUS_CODES.BAD_REQUEST,
            },
        };
    }

    return {
        line: {
            item: {
                id: saleItemId,
                organizationId,
                storeId,
                saleId,
                productId: product.id,
                quantity: parentQuantity,
                configurationSignature: buildComboConfigurationSignature(selections),
                productNameSnapshot: product.name,
                unitPriceSnapshot: unitPrice,
                discountAmount,
                lineSubtotal,
                lineTotal: roundMoney(lineSubtotal - discountAmount),
            },
            addOns: [],
            bundleComponents: preparedBundleComponents,
        },
    };
};

const prepareSaleItems = async (
    organizationId: string,
    storeId: string,
    saleId: string,
    items: SaleItemInput[],
    orderDiscountAmount: number | string | null | undefined,
    existingItems: SaleItemDTO[] = [],
): Promise<
    | { error: ServiceResponse<null>; lines?: undefined; totals?: undefined }
    | {
          error?: undefined;
          lines: PreparedSaleLine[];
          totals: SalePricingTotals;
      }
> => {
    const mergedItems = mergeSaleItemInputsByConfiguration(items);
    if (mergedItems.error) {
        return { error: mergedItems.error };
    }

    const frozenByConfiguration = new Map<string, SaleItemDTO>();
    for (const existingItem of existingItems) {
        frozenByConfiguration.set(
            configurationKeyFor(existingItem.productId, existingItem.configurationSignature ?? ""),
            existingItem,
        );
    }

    const preparedLines: PreparedSaleLine[] = [];

    for (const item of mergedItems.items) {
        const selectedAddOns = item.addOns ?? [];
        const selectedComboSelections = item.comboSelections ?? [];
        const configurationSignature =
            selectedComboSelections.length > 0
                ? buildComboConfigurationSignature(
                      selectedComboSelections.map((selection) => ({
                          ...selection,
                          quantity: Number(selection.quantity),
                          addOns: (selection.addOns ?? []).map((addOn) => ({
                              ...addOn,
                              quantity: Number(addOn.quantity),
                          })),
                      })),
                  )
                : buildConfigurationSignature(selectedAddOns);
        const parentQuantity = Number(item.quantity);
        const frozen = frozenByConfiguration.get(configurationKeyFor(item.productId, configurationSignature));

        if (frozen) {
            preparedLines.push(rescaleFrozenConfiguredLine(frozen, parentQuantity, organizationId, storeId, saleId));
            continue;
        }

        const product = await catalogRepository.getProductById(organizationId, item.productId);
        if (!product) {
            return {
                error: {
                    status: "error",
                    message: `Product not found: ${item.productId}`,
                    data: null,
                    code: STATUS_CODES.NOT_FOUND,
                },
            };
        }

        if (product.status !== "active") {
            return {
                error: {
                    status: "error",
                    message: `Product "${product.name}" is not available for new sale selections`,
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                },
            };
        }

        const saleItemId = crypto.randomUUID();

        if (product.productType === "bundle") {
            return {
                error: {
                    status: "error",
                    message: `Legacy Bundle product "${product.name}" cannot be added to new sales. Use a Combo instead`,
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                },
            };
        }

        if (product.productType === "combo") {
            if (selectedAddOns.length > 0) {
                return {
                    error: {
                        status: "error",
                        message: `Combo product "${product.name}" accepts add-ons through its choice groups`,
                        data: null,
                        code: STATUS_CODES.BAD_REQUEST,
                    },
                };
            }

            const preparedCombo = await prepareComboSaleLine(
                organizationId,
                storeId,
                saleId,
                saleItemId,
                product,
                parentQuantity,
                selectedComboSelections,
            );
            if (preparedCombo.error) return { error: preparedCombo.error };
            preparedLines.push(preparedCombo.line);
            continue;
        }

        if (selectedComboSelections.length > 0) {
            return {
                error: {
                    status: "error",
                    message: `Combo selections are only valid for Combo products`,
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                },
            };
        }

        const preparedAddOns: CreateSaleItemAddOnREPO[] = [];

        for (const selectedAddOn of selectedAddOns) {
            const attachment = await catalogRepository.getSelectableProductAddOnAttachmentByProductAndAddOn(
                organizationId,
                item.productId,
                selectedAddOn.addOnId,
            );

            if (!attachment) {
                return {
                    error: {
                        status: "error",
                        message: `Add-on is not selectable for product "${product.name}"`,
                        data: null,
                        code: STATUS_CODES.BAD_REQUEST,
                    },
                };
            }

            const quantityPerParent = Number(selectedAddOn.quantity);
            if (quantityPerParent > attachment.selectionCap) {
                return {
                    error: {
                        status: "error",
                        message: `Add-on "${attachment.addOn.name}" exceeds the selection cap of ${attachment.selectionCap}`,
                        data: null,
                        code: STATUS_CODES.BAD_REQUEST,
                    },
                };
            }

            const unitPrice = moneyFrom(attachment.addOn.price);
            const unitDiscount = moneyFrom(attachment.addOn.discount);
            const totalQuantity = quantityPerParent * parentQuantity;
            const lineSubtotal = roundMoney(totalQuantity * unitPrice);
            const discountAmount = roundMoney(totalQuantity * unitDiscount);

            if (discountAmount > lineSubtotal) {
                return {
                    error: {
                        status: "error",
                        message: `Discount for add-on "${attachment.addOn.name}" cannot exceed the line subtotal`,
                        data: null,
                        code: STATUS_CODES.BAD_REQUEST,
                    },
                };
            }

            preparedAddOns.push({
                id: crypto.randomUUID(),
                organizationId,
                storeId,
                saleId,
                saleItemId,
                addOnId: attachment.addOn.id,
                quantityPerParent,
                totalQuantity,
                addOnNameSnapshot: attachment.addOn.name,
                unitPriceSnapshot: unitPrice,
                unitDiscountSnapshot: unitDiscount,
                discountAmount,
                lineSubtotal,
                lineTotal: roundMoney(lineSubtotal - discountAmount),
            });
        }

        const unitPrice = moneyFrom(product.price);
        const lineSubtotal = roundMoney(parentQuantity * unitPrice);
        const discountAmount = roundMoney(moneyFrom(product.discount) * parentQuantity);

        if (discountAmount > lineSubtotal) {
            return {
                error: {
                    status: "error",
                    message: `Discount for product "${product.name}" cannot exceed the line subtotal`,
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                },
            };
        }

        preparedLines.push({
            item: {
                id: saleItemId,
                organizationId,
                storeId,
                saleId,
                productId: product.id,
                quantity: parentQuantity,
                configurationSignature,
                productNameSnapshot: product.name,
                unitPriceSnapshot: unitPrice,
                discountAmount,
                lineSubtotal,
                lineTotal: roundMoney(lineSubtotal - discountAmount),
            },
            addOns: preparedAddOns,
            bundleComponents: [],
        });
    }

    const pricingTotals = buildSalePricingTotals(
        getParentAndAddOnSubtotal(
            preparedLines.map((line) => ({
                lineSubtotal: line.item.lineSubtotal,
                addOns: line.addOns,
            })),
        ),
        getSaleLineDiscountTotal(
            preparedLines.map((line) => ({
                discountAmount: line.item.discountAmount,
                addOns: line.addOns,
            })),
        ),
        orderDiscountAmount,
    );

    if (pricingTotals.error || !pricingTotals.totals) {
        return {
            error: pricingTotals.error ?? {
                status: "error",
                message: "Failed to calculate sale totals",
                data: null,
                code: STATUS_CODES.INTERNAL_SERVER_ERROR,
            },
        };
    }

    return {
        lines: preparedLines,
        totals: pricingTotals.totals,
    };
};

const validateCustomerAssignment = async (
    organizationId: string,
    customerId: string | null,
): Promise<ServiceResponse<null> | { customer: CustomerDTO | null }> => {
    if (!customerId) {
        return { customer: null };
    }

    const customer = await getCustomerForOrganization(organizationId, customerId);
    if (!customer) {
        return {
            status: "error",
            message: "Customer not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    return { customer };
};

const persistPreparedSaleLines = async (tx: Bun.TransactionSQL, lines: PreparedSaleLine[]) => {
    for (const line of lines) {
        const createdItem = await billingRepository.createSaleItem(line.item, tx);
        if (!createdItem) {
            throw new Error("Failed to create sale item");
        }

        for (const addOn of line.addOns) {
            const createdAddOn = await billingRepository.createSaleItemAddOn(addOn, tx);
            if (!createdAddOn) {
                throw new Error("Failed to create sale item add-on");
            }
        }

        for (const bundleComponent of line.bundleComponents) {
            const createdComponent = await billingRepository.createSaleItemBundleComponent(
                bundleComponent.component,
                tx,
            );
            if (!createdComponent) {
                throw new Error("Failed to create sale item bundle component");
            }

            for (const addOn of bundleComponent.addOns) {
                const createdAddOn = await billingRepository.createSaleItemBundleComponentAddOn(addOn, tx);
                if (!createdAddOn) {
                    throw new Error("Failed to create sale item bundle component add-on");
                }
            }
        }
    }
};

const appendCustomerLedgerEntry = async (
    tx: Bun.TransactionSQL,
    params: {
        customer: CustomerDTO;
        organizationId: string;
        amount: number;
        entryType: "sale" | "payment" | "void" | "adjustment";
        saleId?: string | null;
        paymentId?: string | null;
        notes?: string | null;
    },
) => {
    const nextBalance = roundMoney(moneyFrom(params.customer.balance) + params.amount);
    const updatedCustomer = await billingRepository.updateCustomerBalance(
        params.organizationId,
        params.customer.id,
        nextBalance,
        tx,
    );

    if (!updatedCustomer) {
        throw new Error("Failed to update customer balance");
    }

    const entry = await billingRepository.createCustomerLedgerEntry(
        {
            id: crypto.randomUUID(),
            organizationId: params.organizationId,
            customerId: params.customer.id,
            saleId: params.saleId ?? null,
            paymentId: params.paymentId ?? null,
            entryType: params.entryType,
            amount: roundMoney(params.amount),
            balanceAfter: nextBalance,
            notes: normalizeOptionalText(params.notes),
        },
        tx,
    );

    if (!entry) {
        throw new Error("Failed to create customer ledger entry");
    }

    return updatedCustomer;
};

const getCustomersInOrganization = async (
    organizationId: string,
    query: { search?: string; limit?: number },
): Promise<ServiceResponse<CustomersListResponse | null>> => {
    const customers = await billingRepository.getCustomersByOrganizationId(organizationId, query);
    return {
        status: "success",
        data: { customers },
        message: "Customers fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

const createCustomerInOrganization = async (
    organizationId: string,
    createdBy: string,
    customerData: CreateCustomerSVC,
): Promise<ServiceResponse<CustomerResponse | null>> => {
    const phone = normalizeOptionalText(customerData.phone);
    if (phone) {
        const alreadyExists = await billingRepository.customerPhoneExistsInOrganization(organizationId, phone);
        if (alreadyExists) {
            return {
                status: "error",
                message: "Customer with the same phone already exists in this organization",
                data: null,
                code: STATUS_CODES.CONFLICT,
            };
        }
    }

    const customer = await billingRepository.createCustomer({
        id: crypto.randomUUID(),
        organizationId,
        name: customerData.name,
        phone,
        balance: 0,
        isActive: customerData.isActive ?? true,
        createdBy,
    });

    if (!customer) {
        return {
            status: "error",
            message: "Failed to create customer",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: { customer },
        message: "Customer created successfully",
        code: STATUS_CODES.CREATED,
    };
};

const getSalesInStore = async (
    organizationId: string,
    storeId: string,
    query: SalesListQuery,
): Promise<ServiceResponse<SalesListResponse | null>> => {
    const invalidCustomerFilter = await validateSalesListCustomerFilter(organizationId, query);
    if (invalidCustomerFilter) {
        return invalidCustomerFilter;
    }

    const sort = query.sort ?? "newest";
    if (query.cursor) {
        const cursor = decodeSalesCursor(query.cursor);
        if (!cursor || cursor.sort !== sort) {
            return {
                status: "error",
                data: null,
                message: "Invalid sales cursor",
                code: STATUS_CODES.BAD_REQUEST,
            };
        }
    }

    const normalizedQuery = { ...query, sort };

    const [salesPage, summary] = await Promise.all([
        billingRepository.getSalesByStore(organizationId, storeId, normalizedQuery),
        query.cursor ? Promise.resolve(null) : billingRepository.getSalesSummaryByStore(organizationId, storeId, normalizedQuery),
    ]);
    return {
        status: "success",
        data: { ...salesPage, summary },
        message: "Sales fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

const getSaleDetailsInStore = async (
    organizationId: string,
    storeId: string,
    saleId: string,
): Promise<ServiceResponse<SaleResponse | null>> => {
    const sale = await buildSaleDetails(organizationId, storeId, saleId);
    if (!sale) {
        return {
            status: "error",
            message: "Sale not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    return {
        status: "success",
        data: { sale },
        message: "Sale fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

const getProductSalesSummaryInOrganization = async (
    userId: string,
    organizationId: string,
    query: ProductSalesSummaryAdminQuery,
): Promise<ServiceResponse<ProductSalesSummaryListResponse | null>> => {
    const scopeError = await verifyOrganizationAndStore(userId, organizationId, query.storeId);
    if (scopeError) {
        return scopeError;
    }

    const products = await billingRepository.getProductSalesSummary(organizationId, query.storeId, query);

    return {
        status: "success",
        data: { summary: { products } },
        message: "Product sales summary fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

type SaleWriteActor = {
    userId?: string | null;
    deviceId?: string | null;
};

const createDraftSaleInStore = async (
    actor: SaleWriteActor,
    organizationId: string,
    storeId: string,
    saleData: CreateDraftSaleSVC,
): Promise<ServiceResponse<SaleResponse | null>> => {
    const customerId = normalizeOptionalUuid(saleData.customerId);
    const customerResult = await validateCustomerAssignment(organizationId, customerId);
    if ("status" in customerResult) {
        return customerResult;
    }

    const saleId = crypto.randomUUID();
    const prepared = await prepareSaleItems(
        organizationId,
        storeId,
        saleId,
        saleData.items ?? [],
        saleData.orderDiscountAmount,
    );
    if (prepared.error) {
        return prepared.error;
    }

    await pg.begin(async (tx) => {
        const sale = await billingRepository.createSale(
            {
                id: saleId,
                organizationId,
                storeId,
                customerId,
                userId: actor.userId ?? null,
                createdByDeviceId: actor.deviceId ?? null,
                updatedByDeviceId: actor.deviceId ?? null,
                status: "draft",
                paymentStatus: "pending",
                subtotal: prepared.totals.subtotal,
                discountTotal: prepared.totals.discountTotal,
                grandTotal: prepared.totals.grandTotal,
                notes: normalizeOptionalText(saleData.notes),
            },
            tx,
        );

        if (!sale) {
            throw new Error("Failed to create draft sale");
        }

        for (const line of prepared.lines) {
            const createdItem = await billingRepository.createSaleItem(line.item, tx);
            if (!createdItem) {
                throw new Error("Failed to create sale item");
            }

            for (const addOn of line.addOns) {
                const createdAddOn = await billingRepository.createSaleItemAddOn(addOn, tx);
                if (!createdAddOn) {
                    throw new Error("Failed to create sale item add-on");
                }
            }

            for (const bundleComponent of line.bundleComponents) {
                const createdComponent = await billingRepository.createSaleItemBundleComponent(
                    bundleComponent.component,
                    tx,
                );
                if (!createdComponent) {
                    throw new Error("Failed to create sale item bundle component");
                }

                for (const addOn of bundleComponent.addOns) {
                    const createdAddOn = await billingRepository.createSaleItemBundleComponentAddOn(addOn, tx);
                    if (!createdAddOn) {
                        throw new Error("Failed to create sale item bundle component add-on");
                    }
                }
            }
        }
    });

    const sale = await buildSaleDetails(organizationId, storeId, saleId);
    if (!sale) {
        return {
            status: "error",
            message: "Failed to fetch draft sale",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: { sale },
        message: "Draft sale created successfully",
        code: STATUS_CODES.CREATED,
    };
};

const updateSaleInStore = async (
    actor: SaleWriteActor,
    organizationId: string,
    storeId: string,
    saleId: string,
    saleData: UpdateDraftSaleSVC,
): Promise<ServiceResponse<SaleResponse | null>> => {
    const existingSale = await buildSaleDetails(organizationId, storeId, saleId);
    if (!existingSale) {
        return {
            status: "error",
            message: "Sale not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    if (existingSale.status !== "draft") {
        return {
            status: "error",
            message: "Only draft sales can be updated",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    const customerId =
        saleData.customerId === undefined
            ? (existingSale.customerId ?? null)
            : normalizeOptionalUuid(saleData.customerId);

    const customerResult = await validateCustomerAssignment(organizationId, customerId);
    if ("status" in customerResult) {
        return customerResult;
    }

    const nextNotes =
        saleData.notes === undefined ? (existingSale.notes ?? null) : normalizeOptionalText(saleData.notes);
    const nextOrderDiscountAmount =
        saleData.orderDiscountAmount === undefined
            ? moneyFrom(existingSale.orderDiscountAmount)
            : moneyFrom(saleData.orderDiscountAmount);

    const preparedItems =
        saleData.items === undefined
            ? (() => {
                  const pricingTotals = buildSalePricingTotals(
                      existingSale.subtotal,
                      getSaleLineDiscountTotal(existingSale.items),
                      nextOrderDiscountAmount,
                  );

                  if (pricingTotals.error || !pricingTotals.totals) {
                      return {
                          error: pricingTotals.error ?? {
                              status: "error" as const,
                              message: "Failed to calculate sale totals",
                              data: null,
                              code: STATUS_CODES.INTERNAL_SERVER_ERROR,
                          },
                      };
                  }

                  return {
                      lines: existingSale.items.map(
                          (item): PreparedSaleLine => ({
                              item: {
                                  id: item.id,
                                  organizationId: item.organizationId,
                                  storeId: item.storeId,
                                  saleId: item.saleId,
                                  productId: item.productId,
                                  quantity: Number(item.quantity),
                                  configurationSignature: item.configurationSignature ?? "",
                                  productNameSnapshot: item.productNameSnapshot,
                                  unitPriceSnapshot: Number(item.unitPriceSnapshot),
                                  discountAmount: Number(item.discountAmount),
                                  lineSubtotal: Number(item.lineSubtotal),
                                  lineTotal: Number(item.lineTotal),
                              },
                              addOns: (item.addOns ?? []).map((addOn) => ({
                                  id: addOn.id,
                                  organizationId: addOn.organizationId,
                                  storeId: addOn.storeId,
                                  saleId: addOn.saleId,
                                  saleItemId: addOn.saleItemId,
                                  addOnId: addOn.addOnId,
                                  quantityPerParent: Number(addOn.quantityPerParent),
                                  totalQuantity: Number(addOn.totalQuantity),
                                  addOnNameSnapshot: addOn.addOnNameSnapshot,
                                  unitPriceSnapshot: Number(addOn.unitPriceSnapshot),
                                  unitDiscountSnapshot: Number(addOn.unitDiscountSnapshot),
                                  discountAmount: Number(addOn.discountAmount),
                                  lineSubtotal: Number(addOn.lineSubtotal),
                                  lineTotal: Number(addOn.lineTotal),
                              })),
                              bundleComponents: (item.bundleComponents ?? []).map((component) => ({
                                  component: {
                                      id: component.id,
                                      organizationId: component.organizationId,
                                      storeId: component.storeId,
                                      saleId: component.saleId,
                                      saleItemId: component.saleItemId,
                                      choiceGroupId: component.choiceGroupId ?? null,
                                      componentProductId: component.componentProductId,
                                      quantityPerBundle: Number(component.quantityPerBundle),
                                      totalQuantity: Number(component.totalQuantity),
                                      productNameSnapshot: component.productNameSnapshot,
                                      unitPriceSnapshot: Number(component.unitPriceSnapshot),
                                      unitDiscountSnapshot: Number(component.unitDiscountSnapshot),
                                      priceAdjustmentSnapshot: Number(component.priceAdjustmentSnapshot ?? 0),
                                  },
                                  addOns: (component.addOns ?? []).map((addOn) => ({
                                      id: addOn.id,
                                      organizationId: addOn.organizationId,
                                      storeId: addOn.storeId,
                                      saleId: addOn.saleId,
                                      saleItemId: addOn.saleItemId,
                                      saleItemBundleComponentId: addOn.saleItemBundleComponentId,
                                      addOnId: addOn.addOnId,
                                      quantityPerComponent: Number(addOn.quantityPerComponent),
                                      totalQuantity: Number(addOn.totalQuantity),
                                      addOnNameSnapshot: addOn.addOnNameSnapshot,
                                      unitPriceSnapshot: Number(addOn.unitPriceSnapshot),
                                      unitDiscountSnapshot: Number(addOn.unitDiscountSnapshot),
                                  })),
                              })),
                          }),
                      ),
                      totals: pricingTotals.totals,
                  };
              })()
            : await prepareSaleItems(
                  organizationId,
                  storeId,
                  saleId,
                  saleData.items,
                  nextOrderDiscountAmount,
                  existingSale.items,
              );

    if ("error" in preparedItems && preparedItems.error) {
        return preparedItems.error;
    }

    await pg.begin(async (tx) => {
        const updatedSale = await billingRepository.updateSale(
            {
                id: saleId,
                organizationId,
                storeId,
                customerId,
                status: "draft",
                paymentStatus: "pending",
                updatedByDeviceId: actor.deviceId ?? null,
                subtotal: preparedItems.totals.subtotal,
                discountTotal: preparedItems.totals.discountTotal,
                grandTotal: preparedItems.totals.grandTotal,
                notes: nextNotes,
                committedAt: null,
                saleNumber: null,
                voidedAt: null,
                voidReason: null,
            },
            tx,
        );

        if (!updatedSale) {
            throw new Error("Failed to update draft sale");
        }

        if (saleData.items !== undefined) {
            await billingRepository.deleteSaleItemsBySaleId(organizationId, storeId, saleId, tx);

            for (const line of preparedItems.lines) {
                const createdItem = await billingRepository.createSaleItem(line.item, tx);
                if (!createdItem) {
                    throw new Error("Failed to recreate sale item");
                }

                for (const addOn of line.addOns) {
                    const createdAddOn = await billingRepository.createSaleItemAddOn(addOn, tx);
                    if (!createdAddOn) {
                        throw new Error("Failed to recreate sale item add-on");
                    }
                }

                for (const bundleComponent of line.bundleComponents) {
                    const createdComponent = await billingRepository.createSaleItemBundleComponent(
                        bundleComponent.component,
                        tx,
                    );
                    if (!createdComponent) {
                        throw new Error("Failed to recreate sale item bundle component");
                    }

                    for (const addOn of bundleComponent.addOns) {
                        const createdAddOn = await billingRepository.createSaleItemBundleComponentAddOn(addOn, tx);
                        if (!createdAddOn) {
                            throw new Error("Failed to recreate sale item bundle component add-on");
                        }
                    }
                }
            }
        }
    });

    const sale = await buildSaleDetails(organizationId, storeId, saleId);
    if (!sale) {
        return {
            status: "error",
            message: "Failed to fetch updated draft sale",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: { sale },
        message: "Draft sale updated successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

const updateDraftSaleInStore = (
    actor: SaleWriteActor,
    organizationId: string,
    storeId: string,
    saleId: string,
    saleData: UpdateDraftSaleSVC,
) => updateSaleInStore(actor, organizationId, storeId, saleId, saleData);

const deleteDraftSaleInStore = async (
    organizationId: string,
    storeId: string,
    saleId: string,
): Promise<ServiceResponse<null>> => {
    const existingSale = await billingRepository.getSaleById(organizationId, storeId, saleId);
    if (!existingSale) {
        return {
            status: "error",
            message: "Sale not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    if (existingSale.status !== "draft") {
        return {
            status: "error",
            message: "Only draft sales can be deleted",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    const deleted = await pg.begin(async (tx) =>
        billingRepository.deleteDraftSale(organizationId, storeId, saleId, tx),
    );

    if (!deleted) {
        return {
            status: "error",
            message: "Draft sale was not found or has already been removed",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    return {
        status: "success",
        data: null,
        message: "Draft sale deleted successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

const commitSaleInStore = async (
    actor: SaleWriteActor,
    organizationId: string,
    storeId: string,
    saleId: string,
    commitData: CommitSaleSVC,
): Promise<ServiceResponse<SaleResponse | null>> => {
    const payments = commitData.payments ?? [];
    const totalPayment = sumMoney(payments.map((payment) => payment.amount));
    const transactionResult = await pg.begin(async (tx) => {
        const saleSnapshot = await billingRepository.getSaleById(organizationId, storeId, saleId, tx);
        if (!saleSnapshot) {
            return {
                committed: false as const,
                response: {
                    status: "error" as const,
                    message: "Sale not found",
                    data: null,
                    code: STATUS_CODES.NOT_FOUND,
                },
            };
        }

        if (saleSnapshot.status !== "draft") {
            return {
                committed: false as const,
                response: {
                    status: "error" as const,
                    message: "Only draft sales can be committed",
                    data: null,
                    code: STATUS_CODES.CONFLICT,
                },
            };
        }

        const draftLocked = await billingRepository.lockDraftSale(organizationId, storeId, saleId, tx);
        if (!draftLocked) {
            return {
                committed: false as const,
                response: {
                    status: "error" as const,
                    message: "Sale is already committed",
                    data: null,
                    code: STATUS_CODES.CONFLICT,
                },
            };
        }

        const existingSale = await buildSaleDetails(organizationId, storeId, saleId, tx);
        if (!existingSale) {
            throw new Error("Failed to fetch locked draft sale");
        }

        if (existingSale.items.length === 0 || moneyFrom(existingSale.grandTotal) <= 0) {
            return {
                committed: false as const,
                response: {
                    status: "error" as const,
                    message: "A sale must have at least one billable item before it can be committed",
                    data: null,
                    code: STATUS_CODES.BAD_REQUEST,
                },
            };
        }

        const customerId =
            commitData.customerId === undefined
                ? (existingSale.customerId ?? null)
                : normalizeOptionalUuid(commitData.customerId);
        const customerResult = await validateCustomerAssignment(organizationId, customerId);
        if ("status" in customerResult) {
            return {
                committed: false as const,
                response: customerResult as ServiceResponse<SaleResponse | null>,
            };
        }

        const nextOrderDiscountAmount =
            commitData.orderDiscountAmount === undefined
                ? moneyFrom(existingSale.orderDiscountAmount)
                : moneyFrom(commitData.orderDiscountAmount);
        const pricingTotals = buildSalePricingTotals(
            existingSale.subtotal,
            getSaleLineDiscountTotal(existingSale.items),
            nextOrderDiscountAmount,
        );

        if (pricingTotals.error || !pricingTotals.totals) {
            return {
                committed: false as const,
                response: pricingTotals.error ?? {
                    status: "error" as const,
                    message: "Failed to calculate sale totals",
                    data: null,
                    code: STATUS_CODES.INTERNAL_SERVER_ERROR,
                },
            };
        }

        const committedTotals = pricingTotals.totals;
        const grandTotal = committedTotals.grandTotal;
        if (totalPayment > grandTotal) {
            return {
                committed: false as const,
                response: {
                    status: "error" as const,
                    message: "Collected payment cannot exceed the sale total",
                    data: null,
                    code: STATUS_CODES.CONFLICT,
                },
            };
        }

        const paymentStatus = totalPayment === 0 ? "pending" : totalPayment === grandTotal ? "paid" : "partial";
        const nextNotes =
            commitData.notes === undefined ? (existingSale.notes ?? null) : normalizeOptionalText(commitData.notes);
        const committedAt = new Date();
        const saleNumber = await billingRepository.allocateSaleNumber(
            organizationId,
            storeId,
            committedAt,
            tx,
        );

        const updatedSale = await billingRepository.updateSale(
            {
                id: saleId,
                organizationId,
                storeId,
                customerId,
                status: "completed",
                paymentStatus,
                updatedByDeviceId: actor.deviceId ?? null,
                subtotal: committedTotals.subtotal,
                discountTotal: committedTotals.discountTotal,
                grandTotal,
                notes: nextNotes,
                committedAt,
                saleNumber: saleNumber.saleNumber,
                saleSequenceNumber: saleNumber.saleSequenceNumber,
                salePeriodKey: saleNumber.salePeriodKey,
                tokenNumber: saleNumber.tokenNumber,
                tokenSequenceNumber: saleNumber.tokenSequenceNumber,
                tokenPeriodKey: saleNumber.tokenPeriodKey,
            },
            tx,
        );

        if (!updatedSale) {
            throw new Error("Failed to commit sale");
        }

        let customer = customerResult.customer;

        if (customer) {
            customer = await appendCustomerLedgerEntry(tx, {
                customer,
                organizationId,
                amount: grandTotal,
                entryType: "sale",
                saleId,
                notes: nextNotes,
            });
        }

        for (const paymentInput of payments) {
            const createdPayment = await billingRepository.createPayment(
                {
                    id: crypto.randomUUID(),
                    organizationId,
                    storeId,
                    saleId,
                    collectedBy: actor.userId ?? null,
                    amount: roundMoney(paymentInput.amount),
                    method: paymentInput.method,
                    referenceNumber: normalizeOptionalText(paymentInput.referenceNumber),
                    notes: normalizeOptionalText(paymentInput.notes),
                    collectedAt: committedAt,
                },
                tx,
            );

            if (!createdPayment) {
                throw new Error("Failed to create payment");
            }

            if (customer) {
                customer = await appendCustomerLedgerEntry(tx, {
                    customer,
                    organizationId,
                    amount: -roundMoney(paymentInput.amount),
                    entryType: "payment",
                    saleId,
                    paymentId: createdPayment.id,
                    notes: normalizeOptionalText(paymentInput.notes),
                });
            }
        }

        return { committed: true as const };
    });

    if (!transactionResult.committed) {
        return transactionResult.response;
    }

    const sale = await buildSaleDetails(organizationId, storeId, saleId);
    if (!sale) {
        return {
            status: "error",
            message: "Failed to fetch committed sale",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: { sale },
        message: "Sale committed successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

const isUniqueViolation = (error: unknown): boolean =>
    typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "23505";

type CompletedSaleTransactionParams = {
    actor: SaleWriteActor;
    organizationId: string;
    storeId: string;
    saleId: string;
    prepared: {
        lines: PreparedSaleLine[];
        totals: SalePricingTotals;
    };
    customer: CustomerDTO | null;
    payments: CompleteSaleSVC["payments"];
    notes: string | null;
    committedAt: Date;
    requestId: string;
    replacementOfSaleId?: string | null;
};

const persistCompletedSale = async (
    tx: Bun.TransactionSQL,
    params: CompletedSaleTransactionParams,
): Promise<void> => {
    const saleNumber = await billingRepository.allocateSaleNumber(
        params.organizationId,
        params.storeId,
        params.committedAt,
        tx,
    );
    const sale = await billingRepository.createSale(
        {
            id: params.saleId,
            organizationId: params.organizationId,
            storeId: params.storeId,
            customerId: params.customer?.id ?? null,
            status: "completed",
            paymentStatus:
                params.payments.length === 0
                    ? "pending"
                    : sumMoney(params.payments.map((payment) => payment.amount)) === params.prepared.totals.grandTotal
                      ? "paid"
                      : "partial",
            subtotal: params.prepared.totals.subtotal,
            discountTotal: params.prepared.totals.discountTotal,
            grandTotal: params.prepared.totals.grandTotal,
            notes: params.notes,
            committedAt: params.committedAt,
            saleNumber: saleNumber.saleNumber,
            saleSequenceNumber: saleNumber.saleSequenceNumber,
            salePeriodKey: saleNumber.salePeriodKey,
            tokenNumber: saleNumber.tokenNumber,
            tokenSequenceNumber: saleNumber.tokenSequenceNumber,
            tokenPeriodKey: saleNumber.tokenPeriodKey,
            createdByDeviceId: params.actor.deviceId ?? null,
            updatedByDeviceId: params.actor.deviceId ?? null,
            userId: params.actor.userId ?? null,
            completionRequestId: params.requestId,
            replacementOfSaleId: params.replacementOfSaleId ?? null,
        },
        tx,
    );
    if (!sale) {
        throw new Error("Failed to create completed sale");
    }

    await persistPreparedSaleLines(tx, params.prepared.lines);

    let customer = params.customer;
    if (customer) {
        customer = await appendCustomerLedgerEntry(tx, {
            customer,
            organizationId: params.organizationId,
            amount: params.prepared.totals.grandTotal,
            entryType: "sale",
            saleId: params.saleId,
            notes: params.notes,
        });
    }

    for (const paymentInput of params.payments) {
        const createdPayment = await billingRepository.createPayment(
            {
                id: crypto.randomUUID(),
                organizationId: params.organizationId,
                storeId: params.storeId,
                saleId: params.saleId,
                collectedBy: params.actor.userId ?? null,
                amount: roundMoney(paymentInput.amount),
                method: paymentInput.method,
                referenceNumber: normalizeOptionalText(paymentInput.referenceNumber),
                notes: normalizeOptionalText(paymentInput.notes),
                collectedAt: params.committedAt,
            },
            tx,
        );
        if (!createdPayment) {
            throw new Error("Failed to create payment");
        }

        if (customer) {
            customer = await appendCustomerLedgerEntry(tx, {
                customer,
                organizationId: params.organizationId,
                amount: -roundMoney(paymentInput.amount),
                entryType: "payment",
                saleId: params.saleId,
                paymentId: createdPayment.id,
                notes: normalizeOptionalText(paymentInput.notes),
            });
        }
    }
};

const completeSaleInStore = async (
    actor: SaleWriteActor,
    organizationId: string,
    storeId: string,
    saleData: CompleteSaleSVC,
): Promise<ServiceResponse<SaleResponse | null>> => {
    const existingSaleId = await billingRepository.getSaleIdByCompletionRequestId(
        organizationId,
        storeId,
        saleData.requestId,
    );
    if (existingSaleId) {
        return getSaleDetailsInStore(organizationId, storeId, existingSaleId);
    }

    const customerId = normalizeOptionalUuid(saleData.customerId);
    const customerResult = await validateCustomerAssignment(organizationId, customerId);
    if ("status" in customerResult) {
        return customerResult;
    }

    const saleId = crypto.randomUUID();
    const prepared = await prepareSaleItems(
        organizationId,
        storeId,
        saleId,
        saleData.items,
        saleData.orderDiscountAmount,
    );
    if (prepared.error) {
        return prepared.error;
    }

    if (prepared.lines.length === 0 || prepared.totals.grandTotal <= 0) {
        return {
            status: "error",
            message: "A sale must have at least one billable item before it can be completed",
            data: null,
            code: STATUS_CODES.BAD_REQUEST,
        };
    }

    const payments = saleData.payments ?? [];
    const totalPayment = sumMoney(payments.map((payment) => payment.amount));
    const grandTotal = prepared.totals.grandTotal;
    if (totalPayment > grandTotal) {
        return {
            status: "error",
            message: "Collected payment cannot exceed the sale total",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    const paymentStatus = totalPayment === 0 ? "pending" : totalPayment === grandTotal ? "paid" : "partial";

    if (!customerId && paymentStatus !== "paid") {
        return {
            status: "error",
            message: "A customer is required when the full bill is not paid",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    const committedAt = new Date();
    const notes = normalizeOptionalText(saleData.notes);

    try {
        await pg.begin((tx) =>
            persistCompletedSale(tx, {
                actor,
                organizationId,
                storeId,
                saleId,
                prepared,
                customer: customerResult.customer,
                payments,
                notes,
                committedAt,
                requestId: saleData.requestId,
            }),
        );
    } catch (error) {
        if (isUniqueViolation(error)) {
            const completedSaleId = await billingRepository.getSaleIdByCompletionRequestId(
                organizationId,
                storeId,
                saleData.requestId,
            );
            if (completedSaleId) {
                return getSaleDetailsInStore(organizationId, storeId, completedSaleId);
            }
        }

        throw error;
    }

    return getSaleDetailsInStore(organizationId, storeId, saleId);
};

const replaceSaleInStore = async (
    actor: SaleWriteActor,
    organizationId: string,
    storeId: string,
    originalSaleId: string,
    saleData: ReplaceSaleSVC,
): Promise<ServiceResponse<SaleResponse | null>> => {
    const existingReplacementId = await billingRepository.getSaleIdByCompletionRequestId(
        organizationId,
        storeId,
        saleData.requestId,
    );
    if (existingReplacementId) {
        return getSaleDetailsInStore(organizationId, storeId, existingReplacementId);
    }

    const originalSale = await buildSaleDetails(organizationId, storeId, originalSaleId);
    if (!originalSale) {
        return {
            status: "error",
            message: "Original sale not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    if (originalSale.status !== "completed") {
        return {
            status: "error",
            message: "Only completed bills can be edited",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    if (originalSale.replacementSaleId) {
        return {
            status: "error",
            message: "This bill has already been edited",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    const customerId = normalizeOptionalUuid(saleData.customerId);
    const customerResult = await validateCustomerAssignment(organizationId, customerId);
    if ("status" in customerResult) {
        return customerResult;
    }

    const saleId = crypto.randomUUID();
    const prepared = await prepareSaleItems(
        organizationId,
        storeId,
        saleId,
        saleData.items,
        saleData.orderDiscountAmount,
    );
    if (prepared.error) {
        return prepared.error;
    }

    if (prepared.lines.length === 0 || prepared.totals.grandTotal <= 0) {
        return {
            status: "error",
            message: "A sale must have at least one billable item before it can be completed",
            data: null,
            code: STATUS_CODES.BAD_REQUEST,
        };
    }

    const payments = saleData.payments ?? [];
    const totalPayment = sumMoney(payments.map((payment) => payment.amount));
    const grandTotal = prepared.totals.grandTotal;
    if (totalPayment > grandTotal) {
        return {
            status: "error",
            message: "Collected payment cannot exceed the sale total",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    const paymentStatus = totalPayment === 0 ? "pending" : totalPayment === grandTotal ? "paid" : "partial";
    if (!customerId && paymentStatus !== "paid") {
        return {
            status: "error",
            message: "A customer is required when the full bill is not paid",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    const committedAt = new Date();
    const notes = normalizeOptionalText(saleData.notes);
    const replacementReason = normalizeOptionalText(saleData.replacementReason) ?? "Bill edited";

    try {
        await pg.begin(async (tx) => {
            await persistCompletedSale(tx, {
                actor,
                organizationId,
                storeId,
                saleId,
                prepared,
                customer: customerResult.customer,
                payments,
                notes,
                committedAt,
                requestId: saleData.requestId,
                replacementOfSaleId: originalSaleId,
            });

            const updatedOriginal = await billingRepository.updateSale(
                {
                    id: originalSaleId,
                    organizationId,
                    storeId,
                    customerId: originalSale.customerId ?? null,
                    status: "voided",
                    paymentStatus: originalSale.paymentStatus,
                    updatedByDeviceId: actor.deviceId ?? null,
                    subtotal: moneyFrom(originalSale.subtotal),
                    discountTotal: moneyFrom(originalSale.discountTotal),
                    grandTotal: moneyFrom(originalSale.grandTotal),
                    notes: originalSale.notes ?? null,
                    committedAt: originalSale.committedAt ?? null,
                    saleNumber: originalSale.saleNumber ?? null,
                    saleSequenceNumber: originalSale.saleSequenceNumber ?? null,
                    salePeriodKey: originalSale.salePeriodKey ?? null,
                    tokenNumber: originalSale.tokenNumber ?? null,
                    tokenSequenceNumber: originalSale.tokenSequenceNumber ?? null,
                    tokenPeriodKey: originalSale.tokenPeriodKey ?? null,
                    voidedAt: new Date(),
                    voidReason: replacementReason,
                },
                tx,
            );
            if (!updatedOriginal) {
                throw new Error("Failed to void original sale");
            }

            const originalCustomer = originalSale.customerId
                ? await getCustomerForOrganization(organizationId, originalSale.customerId)
                : null;
            const outstandingOriginalBalance = roundMoney(
                Math.max(moneyFrom(originalSale.grandTotal) - moneyFrom(originalSale.paidTotal), 0),
            );
            if (originalCustomer && outstandingOriginalBalance > 0) {
                await appendCustomerLedgerEntry(tx, {
                    customer: originalCustomer,
                    organizationId,
                    amount: -outstandingOriginalBalance,
                    entryType: "void",
                    saleId: originalSaleId,
                    notes: replacementReason,
                });
            }
        });
    } catch (error) {
        if (isUniqueViolation(error)) {
            const replacementSaleId = await billingRepository.getSaleIdByCompletionRequestId(
                organizationId,
                storeId,
                saleData.requestId,
            );
            if (replacementSaleId) {
                return getSaleDetailsInStore(organizationId, storeId, replacementSaleId);
            }

            const latestOriginalSale = await buildSaleDetails(organizationId, storeId, originalSaleId);
            if (latestOriginalSale?.replacementSaleId) {
                return {
                    status: "error",
                    message: "This bill has already been edited",
                    data: null,
                    code: STATUS_CODES.CONFLICT,
                };
            }
        }

        throw error;
    }

    return getSaleDetailsInStore(organizationId, storeId, saleId);
};

const collectPaymentInStore = async (
    actor: SaleWriteActor,
    organizationId: string,
    storeId: string,
    saleId: string,
    paymentData: CreatePaymentSVC,
): Promise<ServiceResponse<PaymentResponse | null>> => {
    const existingSale = await buildSaleDetails(organizationId, storeId, saleId);
    if (!existingSale) {
        return {
            status: "error",
            message: "Sale not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    if (existingSale.status !== "completed") {
        return {
            status: "error",
            message: "Payments can only be collected for completed sales",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    if (existingSale.paymentStatus === "paid") {
        return {
            status: "error",
            message: "This sale is already fully paid",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    const dueTotal = moneyFrom(existingSale.dueTotal);
    const amount = roundMoney(paymentData.amount);
    if (amount > dueTotal) {
        return {
            status: "error",
            message: "Collected payment cannot exceed the remaining due amount",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    if (!existingSale.customerId) {
        return {
            status: "error",
            message: "Payments after commit require the sale to be attached to a customer",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    const customer = await getCustomerForOrganization(organizationId, existingSale.customerId);
    if (!customer) {
        return {
            status: "error",
            message: "Customer not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    let createdPayment: Awaited<ReturnType<typeof billingRepository.createPayment>> = null;

    await pg.begin(async (tx) => {
        createdPayment = await billingRepository.createPayment(
            {
                id: crypto.randomUUID(),
                organizationId,
                storeId,
                saleId,
                collectedBy: actor.userId ?? null,
                amount,
                method: paymentData.method,
                referenceNumber: normalizeOptionalText(paymentData.referenceNumber),
                notes: normalizeOptionalText(paymentData.notes),
                collectedAt: new Date(),
            },
            tx,
        );

        if (!createdPayment) {
            throw new Error("Failed to create payment");
        }

        await appendCustomerLedgerEntry(tx, {
            customer,
            organizationId,
            amount: -amount,
            entryType: "payment",
            saleId,
            paymentId: createdPayment.id,
            notes: normalizeOptionalText(paymentData.notes),
        });

        const nextPaidTotal = roundMoney(moneyFrom(existingSale.paidTotal) + amount);
        const nextPaymentStatus = nextPaidTotal === moneyFrom(existingSale.grandTotal) ? "paid" : "partial";

        const updatedSale = await billingRepository.updateSale(
            {
                id: saleId,
                organizationId,
                storeId,
                customerId: existingSale.customerId,
                status: existingSale.status,
                paymentStatus: nextPaymentStatus,
                updatedByDeviceId: actor.deviceId ?? null,
                subtotal: moneyFrom(existingSale.subtotal),
                discountTotal: moneyFrom(existingSale.discountTotal),
                grandTotal: moneyFrom(existingSale.grandTotal),
                notes: existingSale.notes ?? null,
                committedAt: existingSale.committedAt ?? null,
                saleNumber: existingSale.saleNumber ?? null,
                saleSequenceNumber: existingSale.saleSequenceNumber ?? null,
                salePeriodKey: existingSale.salePeriodKey ?? null,
                tokenNumber: existingSale.tokenNumber ?? null,
                tokenSequenceNumber: existingSale.tokenSequenceNumber ?? null,
                tokenPeriodKey: existingSale.tokenPeriodKey ?? null,
                voidedAt: existingSale.voidedAt ?? null,
                voidReason: existingSale.voidReason ?? null,
            },
            tx,
        );

        if (!updatedSale) {
            throw new Error("Failed to update sale payment status");
        }
    });

    const sale = await buildSaleDetails(organizationId, storeId, saleId);
    if (!sale || !createdPayment) {
        return {
            status: "error",
            message: "Failed to fetch updated sale payment details",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: { payment: createdPayment, sale },
        message: "Payment collected successfully",
        code: STATUS_CODES.CREATED,
    };
};

const voidSaleInStore = async (
    actor: SaleWriteActor,
    organizationId: string,
    storeId: string,
    saleId: string,
    voidData: VoidSaleSVC,
): Promise<ServiceResponse<SaleResponse | null>> => {
    const existingSale = await buildSaleDetails(organizationId, storeId, saleId);
    if (!existingSale) {
        return {
            status: "error",
            message: "Sale not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    if (existingSale.status !== "completed") {
        return {
            status: "error",
            message: "Only completed unpaid sales can be voided",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    if (moneyFrom(existingSale.paidTotal) > 0 || existingSale.payments.length > 0) {
        return {
            status: "error",
            message: "Sales with collected payments cannot be voided",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    if (existingSale.paymentStatus !== "pending") {
        return {
            status: "error",
            message: "Only unpaid sales can be voided in billing v1",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    const customer = existingSale.customerId
        ? await getCustomerForOrganization(organizationId, existingSale.customerId)
        : null;

    await pg.begin(async (tx) => {
        const updatedSale = await billingRepository.updateSale(
            {
                id: saleId,
                organizationId,
                storeId,
                customerId: existingSale.customerId ?? null,
                status: "voided",
                paymentStatus: "pending",
                updatedByDeviceId: actor.deviceId ?? null,
                subtotal: moneyFrom(existingSale.subtotal),
                discountTotal: moneyFrom(existingSale.discountTotal),
                grandTotal: moneyFrom(existingSale.grandTotal),
                notes: existingSale.notes ?? null,
                committedAt: existingSale.committedAt ?? null,
                saleNumber: existingSale.saleNumber ?? null,
                saleSequenceNumber: existingSale.saleSequenceNumber ?? null,
                salePeriodKey: existingSale.salePeriodKey ?? null,
                tokenNumber: existingSale.tokenNumber ?? null,
                tokenSequenceNumber: existingSale.tokenSequenceNumber ?? null,
                tokenPeriodKey: existingSale.tokenPeriodKey ?? null,
                voidedAt: new Date(),
                voidReason: normalizeOptionalText(voidData.reason),
            },
            tx,
        );

        if (!updatedSale) {
            throw new Error("Failed to void sale");
        }

        if (customer) {
            await appendCustomerLedgerEntry(tx, {
                customer,
                organizationId,
                amount: -moneyFrom(existingSale.grandTotal),
                entryType: "void",
                saleId,
                notes: voidData.reason,
            });
        }
    });

    const sale = await buildSaleDetails(organizationId, storeId, saleId);
    if (!sale) {
        return {
            status: "error",
            message: "Failed to fetch voided sale",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: { sale },
        message: "Sale voided successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const getCustomers = async (
    userId: string,
    organizationId: string,
    query: { search?: string; limit?: number },
): Promise<ServiceResponse<CustomersListResponse | null>> => {
    const scopeError = await verifyOrganizationAndStore(userId, organizationId);
    if (scopeError) {
        return scopeError;
    }

    return getCustomersInOrganization(organizationId, query);
};

export const createCustomer = async (
    userId: string,
    organizationId: string,
    customerData: CreateCustomerSVC,
): Promise<ServiceResponse<CustomerResponse | null>> => {
    const scopeError = await verifyOrganizationAndStore(userId, organizationId);
    if (scopeError) {
        return scopeError;
    }

    return createCustomerInOrganization(organizationId, userId, customerData);
};

export const getCustomerDetails = async (
    userId: string,
    organizationId: string,
    customerId: string,
): Promise<ServiceResponse<CustomerResponse | null>> => {
    const scopeError = await verifyOrganizationAndStore(userId, organizationId);
    if (scopeError) {
        return scopeError;
    }

    const customer = await getCustomerForOrganization(organizationId, customerId);
    if (!customer) {
        return {
            status: "error",
            message: "Customer not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    return {
        status: "success",
        data: { customer },
        message: "Customer fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const updateCustomer = async (
    userId: string,
    organizationId: string,
    customerId: string,
    customerData: UpdateCustomerSVC,
): Promise<ServiceResponse<CustomerResponse | null>> => {
    const scopeError = await verifyOrganizationAndStore(userId, organizationId);
    if (scopeError) {
        return scopeError;
    }

    const existingCustomer = await getCustomerForOrganization(organizationId, customerId);
    if (!existingCustomer) {
        return {
            status: "error",
            message: "Customer not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const phone =
        customerData.phone === undefined ? (existingCustomer.phone ?? null) : normalizeOptionalText(customerData.phone);

    if (phone) {
        const alreadyExists = await billingRepository.customerPhoneExistsInOrganization(
            organizationId,
            phone,
            customerId,
        );
        if (alreadyExists) {
            return {
                status: "error",
                message: "Customer with the same phone already exists in this organization",
                data: null,
                code: STATUS_CODES.CONFLICT,
            };
        }
    }

    const customer = await billingRepository.updateCustomer({
        id: customerId,
        organizationId,
        name: customerData.name ?? existingCustomer.name,
        phone,
        isActive: customerData.isActive ?? existingCustomer.isActive,
        updatedBy: userId,
    });

    if (!customer) {
        return {
            status: "error",
            message: "Failed to update customer",
            data: null,
            code: STATUS_CODES.INTERNAL_SERVER_ERROR,
        };
    }

    return {
        status: "success",
        data: { customer },
        message: "Customer updated successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const getCustomerLedger = async (
    userId: string,
    organizationId: string,
    customerId: string,
): Promise<ServiceResponse<CustomerLedgerResponse | null>> => {
    const scopeError = await verifyOrganizationAndStore(userId, organizationId);
    if (scopeError) {
        return scopeError;
    }

    const customer = await getCustomerForOrganization(organizationId, customerId);
    if (!customer) {
        return {
            status: "error",
            message: "Customer not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    const ledger = await billingRepository.getCustomerLedgerByCustomerId(organizationId, customerId);
    return {
        status: "success",
        data: { customer, ledger },
        message: "Customer ledger fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const getSales = async (
    userId: string,
    organizationId: string,
    storeId: string,
    query: SalesListQuery,
): Promise<ServiceResponse<SalesListResponse | null>> => {
    const scopeError = await verifyOrganizationAndStore(userId, organizationId, storeId);
    if (scopeError) {
        return scopeError;
    }

    return getSalesInStore(organizationId, storeId, query);
};

export const getProductSalesSummary = async (
    userId: string,
    organizationId: string,
    query: ProductSalesSummaryAdminQuery,
): Promise<ServiceResponse<ProductSalesSummaryListResponse | null>> => {
    return getProductSalesSummaryInOrganization(userId, organizationId, query);
};

export const createDraftSale = async (
    userId: string,
    organizationId: string,
    storeId: string,
    saleData: CreateDraftSaleSVC,
): Promise<ServiceResponse<SaleResponse | null>> => {
    const scopeError = await verifyOrganizationAndStore(userId, organizationId, storeId);
    if (scopeError) {
        return scopeError;
    }

    return createDraftSaleInStore({ userId }, organizationId, storeId, saleData);
};

export const getSaleDetails = async (
    userId: string,
    organizationId: string,
    storeId: string,
    saleId: string,
): Promise<ServiceResponse<SaleResponse | null>> => {
    const scopeError = await verifyOrganizationAndStore(userId, organizationId, storeId);
    if (scopeError) {
        return scopeError;
    }

    return getSaleDetailsInStore(organizationId, storeId, saleId);
};

export const updateDraftSale = async (
    userId: string,
    organizationId: string,
    storeId: string,
    saleId: string,
    saleData: UpdateDraftSaleSVC,
): Promise<ServiceResponse<SaleResponse | null>> => {
    const scopeError = await verifyOrganizationAndStore(userId, organizationId, storeId);
    if (scopeError) {
        return scopeError;
    }

    return updateDraftSaleInStore({ userId }, organizationId, storeId, saleId, saleData);
};

export const commitSale = async (
    userId: string,
    organizationId: string,
    storeId: string,
    saleId: string,
    commitData: CommitSaleSVC,
): Promise<ServiceResponse<SaleResponse | null>> => {
    const scopeError = await verifyOrganizationAndStore(userId, organizationId, storeId);
    if (scopeError) {
        return scopeError;
    }

    return commitSaleInStore({ userId }, organizationId, storeId, saleId, commitData);
};

export const completeSale = async (
    userId: string,
    organizationId: string,
    storeId: string,
    saleData: CompleteSaleSVC,
): Promise<ServiceResponse<SaleResponse | null>> => {
    const scopeError = await verifyOrganizationAndStore(userId, organizationId, storeId);
    if (scopeError) {
        return scopeError;
    }

    return completeSaleInStore({ userId }, organizationId, storeId, saleData);
};

export const collectPayment = async (
    userId: string,
    organizationId: string,
    storeId: string,
    saleId: string,
    paymentData: CreatePaymentSVC,
): Promise<ServiceResponse<PaymentResponse | null>> => {
    const scopeError = await verifyOrganizationAndStore(userId, organizationId, storeId);
    if (scopeError) {
        return scopeError;
    }

    return collectPaymentInStore({ userId }, organizationId, storeId, saleId, paymentData);
};

export const voidSale = async (
    userId: string,
    organizationId: string,
    storeId: string,
    saleId: string,
    voidData: VoidSaleSVC,
): Promise<ServiceResponse<SaleResponse | null>> => {
    const scopeError = await verifyOrganizationAndStore(userId, organizationId, storeId);
    if (scopeError) {
        return scopeError;
    }

    return voidSaleInStore({ userId }, organizationId, storeId, saleId, voidData);
};

export const getAddOnSalesRollups = async (
    userId: string,
    organizationId: string,
    storeId: string,
): Promise<ServiceResponse<AddOnSalesRollupsListResponse | null>> => {
    const scopeError = await verifyOrganizationAndStore(userId, organizationId, storeId);
    if (scopeError) {
        return scopeError;
    }

    const [parentScoped, addOnScoped] = await Promise.all([
        billingRepository.getParentScopedAddOnSalesRollups(organizationId, storeId),
        billingRepository.getAddOnScopedSalesRollups(organizationId, storeId),
    ]);

    return {
        status: "success",
        data: {
            rollups: {
                parentScoped,
                addOnScoped,
            },
        },
        message: "Add-on sales rollups fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const getBundleSalesRollups = async (
    userId: string,
    organizationId: string,
    storeId: string,
): Promise<ServiceResponse<BundleSalesRollupsListResponse | null>> => {
    const scopeError = await verifyOrganizationAndStore(userId, organizationId, storeId);
    if (scopeError) {
        return scopeError;
    }

    const [commercial, componentProductUsage, componentAddOnUsage] = await Promise.all([
        billingRepository.getBundleCommercialSalesRollups(organizationId, storeId),
        billingRepository.getBundleComponentProductUsageRollups(organizationId, storeId),
        billingRepository.getBundleComponentAddOnUsageRollups(organizationId, storeId),
    ]);

    return {
        status: "success",
        data: {
            rollups: {
                commercial,
                componentProductUsage,
                componentAddOnUsage,
            },
        },
        message: "Bundle sales rollups fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const getCustomersForDevice = async (
    session: DeviceSessionDTO,
    query: { search?: string; limit?: number },
): Promise<ServiceResponse<CustomersListResponse | null>> => {
    return getCustomersInOrganization(session.organization.id, query);
};

export const createCustomerForDevice = async (
    session: DeviceSessionDTO,
    customerData: CreateCustomerSVC,
): Promise<ServiceResponse<CustomerResponse | null>> => {
    const organization = await getOrganizationById(session.organization.id);
    if (!organization) {
        return {
            status: "error",
            message: "Organization not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    return createCustomerInOrganization(session.organization.id, organization.createdBy, customerData);
};

export const updateCustomerForDevice = async (
    session: DeviceSessionDTO,
    customerId: string,
    customerData: UpdateCustomerSVC,
): Promise<ServiceResponse<CustomerResponse | null>> => {
    const organization = await getOrganizationById(session.organization.id);
    if (!organization) {
        return {
            status: "error",
            message: "Organization not found",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
        };
    }

    return updateCustomer(organization.createdBy, session.organization.id, customerId, customerData);
};

export const getSalesForDevice = async (
    session: DeviceSessionDTO,
    query: SalesListQuery,
): Promise<ServiceResponse<SalesListResponse | null>> => {
    return getSalesInStore(session.organization.id, session.store.id, query);
};

export const getProductSalesSummaryForDevice = async (
    session: DeviceSessionDTO,
    query: ProductSalesSummaryQuery,
): Promise<ServiceResponse<ProductSalesSummaryListResponse | null>> => {
    const products = await billingRepository.getProductSalesSummary(session.organization.id, session.store.id, query);

    return {
        status: "success",
        data: { summary: { products } },
        message: "Product sales summary fetched successfully",
        code: STATUS_CODES.SUCCESS,
    };
};

export const getSaleDetailsForDevice = async (
    session: DeviceSessionDTO,
    saleId: string,
): Promise<ServiceResponse<SaleResponse | null>> => {
    return getSaleDetailsInStore(session.organization.id, session.store.id, saleId);
};

export const createDraftSaleForDevice = async (
    session: DeviceSessionDTO,
    saleData: CreateDraftSaleSVC,
): Promise<ServiceResponse<SaleResponse | null>> => {
    return createDraftSaleInStore({ deviceId: session.device.id }, session.organization.id, session.store.id, saleData);
};

export const updateDraftSaleForDevice = async (
    session: DeviceSessionDTO,
    saleId: string,
    saleData: UpdateDraftSaleSVC,
): Promise<ServiceResponse<SaleResponse | null>> => {
    return updateDraftSaleInStore(
        { deviceId: session.device.id },
        session.organization.id,
        session.store.id,
        saleId,
        saleData,
    );
};

export const replaceSaleForDevice = async (
    session: DeviceSessionDTO,
    saleId: string,
    saleData: ReplaceSaleSVC,
): Promise<ServiceResponse<SaleResponse | null>> => {
    return replaceSaleInStore(
        { deviceId: session.device.id },
        session.organization.id,
        session.store.id,
        saleId,
        saleData,
    );
};

export const deleteDraftSaleForDevice = async (
    session: DeviceSessionDTO,
    saleId: string,
): Promise<ServiceResponse<null>> => {
    return deleteDraftSaleInStore(session.organization.id, session.store.id, saleId);
};

export const commitSaleForDevice = async (
    session: DeviceSessionDTO,
    saleId: string,
    commitData: CommitSaleSVC,
): Promise<ServiceResponse<SaleResponse | null>> => {
    return commitSaleInStore(
        { deviceId: session.device.id },
        session.organization.id,
        session.store.id,
        saleId,
        commitData,
    );
};

export const completeSaleForDevice = async (
    session: DeviceSessionDTO,
    saleData: CompleteSaleSVC,
): Promise<ServiceResponse<SaleResponse | null>> => {
    return completeSaleInStore({ deviceId: session.device.id }, session.organization.id, session.store.id, saleData);
};

export const collectPaymentForDevice = async (
    session: DeviceSessionDTO,
    saleId: string,
    paymentData: CreatePaymentSVC,
): Promise<ServiceResponse<PaymentResponse | null>> => {
    return collectPaymentInStore(
        { deviceId: session.device.id },
        session.organization.id,
        session.store.id,
        saleId,
        paymentData,
    );
};

export const voidSaleForDevice = async (
    session: DeviceSessionDTO,
    saleId: string,
    voidData: VoidSaleSVC,
): Promise<ServiceResponse<SaleResponse | null>> => {
    return voidSaleInStore(
        { deviceId: session.device.id },
        session.organization.id,
        session.store.id,
        saleId,
        voidData,
    );
};
