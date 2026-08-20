import { useOutletContext } from "react-router-dom";

import BillingPage from "@/pages/billing-page";
import type { PosRouteContext } from "@/pages/pos-route-context";

const PosBillsPage = () => {
    const { session, searchValue, onPanelTabChange } = useOutletContext<PosRouteContext>();

    return (
        <BillingPage
            mode="device"
            session={session}
            initialPanelTab="bills"
            salesSearch={searchValue}
            onPanelTabChange={onPanelTabChange}
        />
    );
};

export default PosBillsPage;
