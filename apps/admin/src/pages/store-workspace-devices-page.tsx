import StoreWorkspacePageGate from "@/components/dashboard/store-workspace-page-gate";
import StoreDevicesSection from "@/components/organizations/store-devices-section";

const StoreWorkspaceDevicesPage = () => (
    <StoreWorkspacePageGate testId="store-devices-page">
        {({ organizationId, organization, store }) => (
            <StoreDevicesSection
                organizationId={organizationId}
                organizationUsername={organization.username}
                store={store}
            />
        )}
    </StoreWorkspacePageGate>
);

export default StoreWorkspaceDevicesPage;
