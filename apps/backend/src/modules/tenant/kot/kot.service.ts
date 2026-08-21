import { pg } from "@/config/db";
import * as billingService from "@/modules/tenant/billing/billing.service";
import * as organizationRepository from "@/modules/tenant/organization/organization.repository";
import * as kotRepository from "./kot.repository";
import {
    STATUS_CODES,
    type CreateKotItemREPO,
    type CreateParcelKotSVC,
    type DeviceSessionDTO,
    type KotDTO,
    type ParcelKotResponse,
    type SaleDetailDTO,
    type ServiceResponse,
} from "@repo/types";

const moneyFrom = (value: number | string | null | undefined) => Number(value ?? 0);

const mapSaleItemsToKotItems = (sale: SaleDetailDTO, kotId: string): CreateKotItemREPO[] =>
    sale.items.map((item) => {
        const kotItemId = crypto.randomUUID();
        return {
            id: kotItemId,
            organizationId: sale.organizationId,
            storeId: sale.storeId,
            kotId,
            productId: item.productId,
            quantity: Number(item.quantity),
            configurationSignature: item.configurationSignature ?? "",
            productNameSnapshot: item.productNameSnapshot,
            unitPriceSnapshot: moneyFrom(item.unitPriceSnapshot),
            discountAmount: moneyFrom(item.discountAmount),
            lineSubtotal: moneyFrom(item.lineSubtotal),
            lineTotal: moneyFrom(item.lineTotal),
            addOns: (item.addOns ?? []).map((addOn) => ({
                id: crypto.randomUUID(),
                organizationId: sale.organizationId,
                storeId: sale.storeId,
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
            bundleComponents: (item.bundleComponents ?? []).map((component) => {
                const kotItemBundleComponentId = crypto.randomUUID();
                return {
                    id: kotItemBundleComponentId,
                    organizationId: sale.organizationId,
                    storeId: sale.storeId,
                    kotId,
                    kotItemId,
                    choiceGroupId: component.choiceGroupId ?? null,
                    componentProductId: component.componentProductId,
                    quantityPerBundle: Number(component.quantityPerBundle),
                    totalQuantity: Number(component.totalQuantity),
                    productNameSnapshot: component.productNameSnapshot,
                    unitPriceSnapshot: moneyFrom(component.unitPriceSnapshot),
                    unitDiscountSnapshot: moneyFrom(component.unitDiscountSnapshot),
                    priceAdjustmentSnapshot: moneyFrom(component.priceAdjustmentSnapshot),
                    addOns: (component.addOns ?? []).map((addOn) => ({
                        id: crypto.randomUUID(),
                        organizationId: sale.organizationId,
                        storeId: sale.storeId,
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

const parcelKotResponse = (
    kot: KotDTO,
    sale: SaleDetailDTO,
    created: boolean,
): ServiceResponse<ParcelKotResponse> => ({
    status: "success",
    data: { kot, sale },
    message: created ? "Parcel KOT generated successfully" : "Parcel KOT fetched successfully",
    code: created ? STATUS_CODES.CREATED : STATUS_CODES.SUCCESS,
});

export const createParcelKotForDevice = async (
    session: DeviceSessionDTO,
    kotData: CreateParcelKotSVC,
): Promise<ServiceResponse<ParcelKotResponse | null>> => {
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

    if (!store.kotSystemEnabled) {
        return {
            status: "error",
            message: "Parcel KOT is available only when the KOT System is enabled",
            data: null,
            code: STATUS_CODES.FORBIDDEN,
        };
    }

    const saleResponse = await billingService.completeSaleForDevice(session, {
        ...kotData,
        payments: [],
    });
    if (saleResponse.status !== "success" || !saleResponse.data?.sale) {
        return saleResponse as ServiceResponse<ParcelKotResponse | null>;
    }

    const sale = saleResponse.data.sale;
    if (sale.serviceTableId) {
        return {
            status: "error",
            message: "A Parcel KOT cannot be linked to a Service Table",
            data: null,
            code: STATUS_CODES.CONFLICT,
        };
    }

    const existingKot = await kotRepository.getKotBySaleId(
        session.organization.id,
        session.store.id,
        sale.id,
    );
    if (existingKot) {
        return parcelKotResponse(existingKot, sale, false);
    }

    const generatedAt = sale.committedAt ? new Date(sale.committedAt) : new Date();
    const kotId = crypto.randomUUID();

    try {
        const kot = await pg.begin(async (tx) => {
            const allocated = await kotRepository.allocateKotNumber(
                session.organization.id,
                session.store.id,
                generatedAt,
                tx,
            );
            const created = await kotRepository.createKot(
                {
                    id: kotId,
                    organizationId: session.organization.id,
                    storeId: session.store.id,
                    saleId: sale.id,
                    kotType: "parcel",
                    kotNumber: allocated.kotNumber,
                    kotSequenceNumber: allocated.kotSequenceNumber,
                    kotPeriodKey: allocated.kotPeriodKey,
                    createdByDeviceId: session.device.id,
                    updatedByDeviceId: session.device.id,
                    items: mapSaleItemsToKotItems(sale, kotId),
                },
                tx,
            );
            if (!created) {
                throw new Error("Failed to create Parcel KOT");
            }
            return created;
        });

        return parcelKotResponse(kot, sale, true);
    } catch (error) {
        const racedKot = await kotRepository.getKotBySaleId(
            session.organization.id,
            session.store.id,
            sale.id,
        );
        if (racedKot) {
            return parcelKotResponse(racedKot, sale, false);
        }
        throw error;
    }
};
