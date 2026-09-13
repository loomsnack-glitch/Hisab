import UnderDevelopment from "@/components/under-development";
import { adminWorkspacePageHeightClass } from "@/lib/workspace-page-layout";

const MoneyAccountsPage = () => {
    return (
        <div className={adminWorkspacePageHeightClass} data-testid="money-accounts-page">
            <UnderDevelopment className="h-full min-h-0" title="Money Accounts" />
        </div>
    );
};

export default MoneyAccountsPage;
