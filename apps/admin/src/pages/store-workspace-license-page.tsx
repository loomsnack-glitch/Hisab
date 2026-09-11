import StoreWorkspacePageGate from "@/components/dashboard/store-workspace-page-gate";
import StoreCommercialStatus from "@/components/organizations/store-commercial-status";

const StoreWorkspaceLicensePage = () => (
    <StoreWorkspacePageGate testId="store-license-page">
        {({ organizationId, store }) => (
            <StoreCommercialStatus organizationId={organizationId} storeId={store.id} />
        )}
    </StoreWorkspacePageGate>
);

export default StoreWorkspaceLicensePage;
