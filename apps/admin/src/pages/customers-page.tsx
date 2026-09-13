import { useParams } from "react-router-dom";

import CustomerDirectory from "@/components/customers/customer-directory";
import { adminWorkspacePageHeightClass } from "@/lib/workspace-page-layout";

const CustomersPage = () => {
    const { organizationId = "" } = useParams();

    return (
        <div className={adminWorkspacePageHeightClass} data-testid="customers-page">
            <CustomerDirectory mode="admin" organizationId={organizationId} />
        </div>
    );
};

export default CustomersPage;
