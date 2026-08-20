import { useOutletContext } from "react-router-dom";

import BillingPage from "@/pages/billing-page";
import type { PosRouteContext } from "@/pages/pos-route-context";

const PosReportsPage = () => {
    const { session, onPanelTabChange } = useOutletContext<PosRouteContext>();

    return (
        <BillingPage
            mode="device"
            session={session}
            initialPanelTab="reports"
            onPanelTabChange={onPanelTabChange}
        />
    );
};

export default PosReportsPage;
