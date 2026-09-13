import UnderDevelopment from "@/components/under-development";
import { adminWorkspacePageHeightClass } from "@/lib/workspace-page-layout";

const StoreVendorAvailabilitiesPage = () => {
    return (
        <div className={adminWorkspacePageHeightClass} data-testid="store-vendor-availabilities-page">
            <UnderDevelopment className="h-full min-h-0" title="Vendors" />
        </div>
    );
};

export default StoreVendorAvailabilitiesPage;
