import { useOutletContext } from "react-router-dom";

import BillingPage from "@/pages/billing-page";
import type { PosRouteContext } from "@/pages/pos-route-context";

const PosCustomersPage = () => {
    const { session, searchValue, onSearchChange, onPanelTabChange } = useOutletContext<PosRouteContext>();

    return (
        <BillingPage
            mode="device"
            session={session}
            initialPanelTab="customers"
            customerSearch={searchValue}
            onCustomerSearchChange={onSearchChange}
            onPanelTabChange={onPanelTabChange}
        />
    );
};

export default PosCustomersPage;
