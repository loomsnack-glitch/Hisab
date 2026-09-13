import UnderDevelopment from "@/components/under-development";
import { adminWorkspacePageHeightClass } from "@/lib/workspace-page-layout";

const PurchasesPage = () => {
    return (
        <div className={adminWorkspacePageHeightClass} data-testid="purchases-page">
            <UnderDevelopment className="h-full min-h-0" title="Purchases" />
        </div>
    );
};

export default PurchasesPage;
