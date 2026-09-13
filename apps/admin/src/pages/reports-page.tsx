import UnderDevelopment from "@/components/under-development";
import { adminWorkspacePageHeightClass } from "@/lib/workspace-page-layout";

const ReportsPage = () => {
    return (
        <div className={adminWorkspacePageHeightClass} data-testid="reports-page">
            <UnderDevelopment className="h-full min-h-0" title="Reports" />
        </div>
    );
};

export default ReportsPage;
