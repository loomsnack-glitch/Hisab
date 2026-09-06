import { randomUUID } from "node:crypto";
import { pg } from "@/config/db";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import type {
  AddOnDTO,
  AddOnStatus,
  ApplyCatalogCommercialOperationSVC,
  CatalogCommercialOperationApplyResponse,
  CatalogCommercialOperationAuditsListResponse,
  CatalogCommercialOperationChange,
  CatalogCommercialOperationPreviewResponse,
  CatalogCommercialOperationType,
  PreviewCatalogCommercialOperationSVC,
  ProductDTO,
  ProductStatus,
  ServiceResponse,
  StoreAddOnOfferingDTO,
  StoreProductOfferingDTO,
} from "@repo/types";
import { STATUS_CODES } from "@repo/types";
import * as catalogRepository from "./catalog.repository";

type OfferingState = CatalogCommercialOperationChange["before"];

type CatalogDefaults = {
  price: number;
  discount: number;
};

type ScopedOffering = {
  offeringId: string;
  storeId: string;
  storeName: string;
  itemId: string;
  itemName: string;
  offering: StoreProductOfferingDTO | StoreAddOnOfferingDTO;
  defaults: CatalogDefaults;
};

const toOfferingState = (
  offering: StoreProductOfferingDTO | StoreAddOnOfferingDTO,
): OfferingState => ({
  priceOverride: offering.priceOverride,
  discountOverride: offering.discountOverride,
  effectivePrice: offering.effectivePrice,
  effectiveDiscount: offering.effectiveDiscount,
  isPriceInherited: offering.isPriceInherited,
  isDiscountInherited: offering.isDiscountInherited,
  status: offering.status,
});

const offeringStatesEqual = (left: OfferingState, right: OfferingState): boolean =>
  left.priceOverride === right.priceOverride &&
  left.discountOverride === right.discountOverride &&
  left.effectivePrice === right.effectivePrice &&
  left.effectiveDiscount === right.effectiveDiscount &&
  left.isPriceInherited === right.isPriceInherited &&
  left.isDiscountInherited === right.isDiscountInherited &&
  left.status === right.status;

const computeAfterState = (
  before: OfferingState,
  defaults: CatalogDefaults,
  operation: CatalogCommercialOperationType,
  value?: number | ProductStatus | AddOnStatus,
): OfferingState | { error: string } => {
  let priceOverride = before.priceOverride;
  let discountOverride = before.discountOverride;
  let status = before.status;

  switch (operation) {
    case "set_price_override":
      priceOverride = value as number;
      break;
    case "set_discount_override":
      discountOverride = value as number;
      break;
    case "clear_price_override":
      priceOverride = null;
      break;
    case "clear_discount_override":
      discountOverride = null;
      break;
    case "set_local_status":
      status = value as ProductStatus | AddOnStatus;
      break;
  }

  const effectivePrice = priceOverride ?? defaults.price;
  const effectiveDiscount = discountOverride ?? defaults.discount;

  if (effectiveDiscount > effectivePrice) {
    return {
      error: "Discount cannot be greater than price",
    };
  }

  return {
    priceOverride,
    discountOverride,
    effectivePrice,
    effectiveDiscount,
    isPriceInherited: priceOverride === null,
    isDiscountInherited: discountOverride === null,
    status,
  };
};

const affectsOverride = (
  before: OfferingState,
  after: OfferingState,
  operation: CatalogCommercialOperationType,
): boolean => {
  switch (operation) {
    case "set_price_override":
      return before.priceOverride !== after.priceOverride;
    case "set_discount_override":
      return before.discountOverride !== after.discountOverride;
    case "clear_price_override":
      return before.priceOverride !== null;
    case "clear_discount_override":
      return before.discountOverride !== null;
    default:
      return false;
  }
};

const validateOrganizationStores = async (
  organizationId: string,
  storeIds: string[],
): Promise<ServiceResponse<null> | null> => {
  const stores = await organizationRepository.getStoresByOrganizationId(organizationId);
  const storeIdsInOrganization = new Set(stores.map((store) => store.id));
  const invalidStoreIds = storeIds.filter((storeId) => !storeIdsInOrganization.has(storeId));

  if (invalidStoreIds.length > 0) {
    return {
      status: "error",
      message: "One or more Stores do not belong to this Organization",
      data: null,
      code: STATUS_CODES.BAD_REQUEST,
    };
  }

  return null;
};

const loadScopedProductOfferings = async (
  organizationId: string,
  storeIds: string[],
  productIds: string[],
): Promise<
  | { error: ServiceResponse<null> }
  | { offerings: ScopedOffering[]; storeNameById: Map<string, string> }
> => {
  const stores = await organizationRepository.getStoresByOrganizationId(organizationId);
  const storeNameById = new Map(stores.map((store) => [store.id, store.name]));
  const products = await catalogRepository.getProductsByIds(organizationId, productIds);
  const productById = new Map(products.map((product) => [product.id, product]));

  const missingProductIds = productIds.filter((productId) => !productById.has(productId));
  if (missingProductIds.length > 0) {
    return {
      error: {
        status: "error",
        message: "One or more Products do not belong to this Organization",
        data: null,
        code: STATUS_CODES.BAD_REQUEST,
      },
    };
  }

  const offerings = await catalogRepository.getStoreProductOfferingsForStoresAndProducts(
    organizationId,
    storeIds,
    productIds,
  );
  const offeringByKey = new Map(
    offerings.map((offering) => [`${offering.storeId}:${offering.productId}`, offering]),
  );

  const scopedOfferings: ScopedOffering[] = [];
  for (const storeId of storeIds) {
    for (const productId of productIds) {
      const offering = offeringByKey.get(`${storeId}:${productId}`);
      const product = productById.get(productId) as ProductDTO;
      if (!offering) {
        return {
          error: {
            status: "error",
            message: "Store Product Offering not found for the selected Store and Product",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
          },
        };
      }

      scopedOfferings.push({
        offeringId: offering.id,
        storeId,
        storeName: storeNameById.get(storeId) ?? storeId,
        itemId: productId,
        itemName: offering.productName || product.name,
        offering,
        defaults: {
          price: product.price,
          discount: product.discount,
        },
      });
    }
  }

  return { offerings: scopedOfferings, storeNameById };
};

const loadScopedAddOnOfferings = async (
  organizationId: string,
  storeIds: string[],
  addOnIds: string[],
): Promise<
  | { error: ServiceResponse<null> }
  | { offerings: ScopedOffering[]; storeNameById: Map<string, string> }
> => {
  const stores = await organizationRepository.getStoresByOrganizationId(organizationId);
  const storeNameById = new Map(stores.map((store) => [store.id, store.name]));
  const addOns = await catalogRepository.getAddOnsByIds(organizationId, addOnIds);
  const addOnById = new Map(addOns.map((addOn) => [addOn.id, addOn]));

  const missingAddOnIds = addOnIds.filter((addOnId) => !addOnById.has(addOnId));
  if (missingAddOnIds.length > 0) {
    return {
      error: {
        status: "error",
        message: "One or more Add-Ons do not belong to this Organization",
        data: null,
        code: STATUS_CODES.BAD_REQUEST,
      },
    };
  }

  const offerings = await catalogRepository.getStoreAddOnOfferingsForStoresAndAddOns(
    organizationId,
    storeIds,
    addOnIds,
  );
  const offeringByKey = new Map(
    offerings.map((offering) => [`${offering.storeId}:${offering.addOnId}`, offering]),
  );

  const scopedOfferings: ScopedOffering[] = [];
  for (const storeId of storeIds) {
    for (const addOnId of addOnIds) {
      const offering = offeringByKey.get(`${storeId}:${addOnId}`);
      const addOn = addOnById.get(addOnId) as AddOnDTO;
      if (!offering) {
        return {
          error: {
            status: "error",
            message: "Store Add-On Offering not found for the selected Store and Add-On",
            data: null,
            code: STATUS_CODES.NOT_FOUND,
          },
        };
      }

      scopedOfferings.push({
        offeringId: offering.id,
        storeId,
        storeName: storeNameById.get(storeId) ?? storeId,
        itemId: addOnId,
        itemName: offering.addOnName || addOn.name,
        offering,
        defaults: {
          price: addOn.price,
          discount: addOn.discount,
        },
      });
    }
  }

  return { offerings: scopedOfferings, storeNameById };
};

const buildPreview = async (
  organizationId: string,
  operationData: PreviewCatalogCommercialOperationSVC,
): Promise<
  | { error: ServiceResponse<null> }
  | { preview: CatalogCommercialOperationPreviewResponse["preview"] }
> => {
  const storeValidation = await validateOrganizationStores(organizationId, operationData.storeIds);
  if (storeValidation) {
    return { error: storeValidation };
  }

  const scoped =
    operationData.itemType === "product"
      ? await loadScopedProductOfferings(
          organizationId,
          operationData.storeIds,
          operationData.itemIds,
        )
      : await loadScopedAddOnOfferings(
          organizationId,
          operationData.storeIds,
          operationData.itemIds,
        );

  if ("error" in scoped) {
    return scoped;
  }

  const changes: CatalogCommercialOperationChange[] = [];

  for (const scopedOffering of scoped.offerings) {
    const before = toOfferingState(scopedOffering.offering);
    const afterResult = computeAfterState(
      before,
      scopedOffering.defaults,
      operationData.operation,
      operationData.value,
    );

    if ("error" in afterResult) {
      return {
        error: {
          status: "error",
          message: `${scopedOffering.storeName} / ${scopedOffering.itemName}: ${afterResult.error}`,
          data: null,
          code: STATUS_CODES.BAD_REQUEST,
        },
      };
    }

    changes.push({
      storeId: scopedOffering.storeId,
      storeName: scopedOffering.storeName,
      itemId: scopedOffering.itemId,
      itemName: scopedOffering.itemName,
      offeringId: scopedOffering.offeringId,
      before,
      after: afterResult,
      affectsOverride: affectsOverride(before, afterResult, operationData.operation),
      hasChange: !offeringStatesEqual(before, afterResult),
    });
  }

  return {
    preview: {
      itemType: operationData.itemType,
      operation: operationData.operation,
      storeIds: operationData.storeIds,
      itemIds: operationData.itemIds,
      requiresConfirmation: changes.some((change) => change.affectsOverride),
      changes,
    },
  };
};

const getOrganizationForUser = organizationRepository.getOrganizationByIdForUser;

export const previewCatalogCommercialOperation = async (
  userId: string,
  organizationId: string,
  operationData: PreviewCatalogCommercialOperationSVC,
): Promise<ServiceResponse<CatalogCommercialOperationPreviewResponse | null>> => {
  const organization = await getOrganizationForUser(organizationId, userId);
  if (!organization) {
    return {
      status: "error",
      message: "Organization not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }

  const result = await buildPreview(organizationId, operationData);
  if ("error" in result) {
    return result.error;
  }

  return {
    status: "success",
    data: { preview: result.preview },
    message: "Catalog commercial operation preview generated successfully",
    code: STATUS_CODES.SUCCESS,
  };
};

export const applyCatalogCommercialOperation = async (
  userId: string,
  organizationId: string,
  operationData: ApplyCatalogCommercialOperationSVC,
): Promise<ServiceResponse<CatalogCommercialOperationApplyResponse | null>> => {
  const organization = await getOrganizationForUser(organizationId, userId);
  if (!organization) {
    return {
      status: "error",
      message: "Organization not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }

  const previewResult = await buildPreview(organizationId, operationData);
  if ("error" in previewResult) {
    return previewResult.error;
  }

  const preview = previewResult.preview;
  const applicableChanges = preview.changes.filter((change) => change.hasChange);

  if (preview.requiresConfirmation && operationData.confirmed !== true) {
    return {
      status: "error",
      message:
        "Explicit confirmation is required before replacing or clearing Store Commercial Overrides",
      data: null,
      code: STATUS_CODES.BAD_REQUEST,
    };
  }

  if (applicableChanges.length === 0) {
    return {
      status: "error",
      message: "The selected operation would not change any Store offerings",
      data: null,
      code: STATUS_CODES.BAD_REQUEST,
    };
  }

  const auditId = randomUUID();

  const audit = await pg.begin(async (tx) => {
    for (const change of applicableChanges) {
      if (operationData.itemType === "product") {
        await catalogRepository.updateStoreProductOffering({
          id: change.offeringId,
          organizationId,
          storeId: change.storeId,
          priceOverride: change.after.priceOverride,
          discountOverride: change.after.discountOverride,
          status: change.after.status as ProductStatus,
          updatedBy: userId,
        }, tx);
      } else {
        await catalogRepository.updateStoreAddOnOffering({
          id: change.offeringId,
          organizationId,
          storeId: change.storeId,
          priceOverride: change.after.priceOverride,
          discountOverride: change.after.discountOverride,
          status: change.after.status as AddOnStatus,
          updatedBy: userId,
        }, tx);
      }
    }

    return catalogRepository.createCatalogCommercialOperationAudit(
      {
        id: auditId,
        organizationId,
        itemType: operationData.itemType,
        operation: operationData.operation,
        storeIds: operationData.storeIds,
        itemIds: operationData.itemIds,
        actorId: userId,
        details: {
          changes: applicableChanges,
        },
      },
      tx,
    );
  });

  if (!audit) {
    return {
      status: "error",
      message: "Failed to record catalog commercial operation audit",
      data: null,
      code: STATUS_CODES.INTERNAL_SERVER_ERROR,
    };
  }

  return {
    status: "success",
    data: {
      result: {
        audit,
        appliedChangeCount: applicableChanges.length,
      },
    },
    message: "Catalog commercial operation applied successfully",
    code: STATUS_CODES.SUCCESS,
  };
};

export const getCatalogCommercialOperationAudits = async (
  userId: string,
  organizationId: string,
): Promise<ServiceResponse<CatalogCommercialOperationAuditsListResponse | null>> => {
  const organization = await getOrganizationForUser(organizationId, userId);
  if (!organization) {
    return {
      status: "error",
      message: "Organization not found",
      data: null,
      code: STATUS_CODES.NOT_FOUND,
    };
  }

  const audits = await catalogRepository.getCatalogCommercialOperationAudits(organizationId);

  return {
    status: "success",
    data: { audits },
    message: "Catalog commercial operation audits fetched successfully",
    code: STATUS_CODES.SUCCESS,
  };
};
