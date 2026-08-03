import { useParams } from "react-router-dom";

import CustomerDirectory from "@/components/customers/customer-directory";

const CustomersPage = () => {
    const { organizationId = "" } = useParams();

    return <CustomerDirectory mode="admin" organizationId={organizationId} />;
};

export default CustomersPage;
