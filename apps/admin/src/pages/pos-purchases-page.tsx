import { useOutletContext } from "react-router-dom";

import BillingPage from "@/pages/billing-page";
import type { PosRouteContext } from "@/pages/pos-route-context";

const PosPurchasesPage = () => {
    const { session, searchValue, onPanelTabChange } = useOutletContext<PosRouteContext>();

    return (
        <BillingPage
            mode="device"
            session={session}
            initialPanelTab="purchases"
            purchaseSearch={searchValue}
            onPanelTabChange={onPanelTabChange}
        />
    );
};

export default PosPurchasesPage;
