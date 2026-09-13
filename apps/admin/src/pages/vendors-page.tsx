import UnderDevelopment from "@/components/under-development";
import { adminWorkspacePageHeightClass } from "@/lib/workspace-page-layout";

const VendorsPage = () => {
    return (
        <div className={adminWorkspacePageHeightClass} data-testid="vendors-page">
            <UnderDevelopment className="h-full min-h-0" title="Vendors" />
        </div>
    );
};

export default VendorsPage;
