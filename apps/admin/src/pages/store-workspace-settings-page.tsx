import { Navigate, Outlet, useOutletContext } from "react-router-dom";
import type { StoreWithDevicesDTO } from "@repo/types";

import StoreWorkspacePageGate from "@/components/dashboard/store-workspace-page-gate";
import StoreGeneralSettingsSection from "@/components/organizations/store-general-settings-section";
import InvoiceAppearanceSettingsForm from "@/components/organizations/invoice-appearance-settings-form";
import SaleNumberSettingsForm from "@/components/organizations/sale-number-settings-form";
import StoreFeatureSettingsForm from "@/components/organizations/store-feature-settings-form";
import StorePaymentRoutingForm from "@/components/organizations/store-payment-routing-form";
import StoreSettingsTabs from "@/components/organizations/store-settings-tabs";
import StoreWhatsAppLinkCard from "@/components/organizations/store-whatsapp-link-card";

type StoreSettingsOutletContext = {
    organizationId: string;
    store: StoreWithDevicesDTO;
};

const useStoreSettingsContext = () => useOutletContext<StoreSettingsOutletContext>();

export const StoreSettingsIndexRedirect = () => <Navigate to="general" replace />;

export const StoreSettingsGeneralPage = () => {
    const { organizationId, store } = useStoreSettingsContext();

    return <StoreGeneralSettingsSection organizationId={organizationId} store={store} />;
};

export const StoreSettingsWhatsAppPage = () => {
    const { organizationId, store } = useStoreSettingsContext();

    return <StoreWhatsAppLinkCard organizationId={organizationId} storeId={store.id} />;
};

export const StoreSettingsFeaturesPage = () => {
    const { organizationId, store } = useStoreSettingsContext();

    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-start lg:gap-6">
            <StoreFeatureSettingsForm organizationId={organizationId} store={store} />
            <SaleNumberSettingsForm organizationId={organizationId} store={store} />
        </div>
    );
};

export const StoreSettingsPaymentsPage = () => {
    const { organizationId, store } = useStoreSettingsContext();

    return <StorePaymentRoutingForm organizationId={organizationId} store={store} />;
};

export const StoreSettingsInvoicePage = () => {
    const { organizationId, store } = useStoreSettingsContext();

    return <InvoiceAppearanceSettingsForm organizationId={organizationId} store={store} />;
};

const StoreWorkspaceSettingsPage = () => (
    <StoreWorkspacePageGate testId="store-settings-page">
        {({ organizationId, store }) => (
            <>
                <StoreSettingsTabs organizationId={organizationId} storeId={store.id} />
                <Outlet context={{ organizationId, store } satisfies StoreSettingsOutletContext} />
            </>
        )}
    </StoreWorkspacePageGate>
);

export default StoreWorkspaceSettingsPage;
