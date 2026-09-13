import UnderDevelopment from "@/components/under-development";
import { adminWorkspacePageHeightClass } from "@/lib/workspace-page-layout";

const ExpensesPage = () => {
    return (
        <div className={adminWorkspacePageHeightClass} data-testid="expenses-page">
            <UnderDevelopment className="h-full min-h-0" title="Expenses" />
        </div>
    );
};

export default ExpensesPage;
