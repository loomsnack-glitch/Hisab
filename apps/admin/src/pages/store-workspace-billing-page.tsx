import StoreWorkspacePageGate from "@/components/dashboard/store-workspace-page-gate";
import BillingPage from "@/pages/billing-page";

const StoreWorkspaceBillingPage = () => (
    <StoreWorkspacePageGate testId="store-billing-page">
        {({ storeId }) => <BillingPage fixedStoreId={storeId} hideStoreSwitcher />}
    </StoreWorkspacePageGate>
);

export default StoreWorkspaceBillingPage;
