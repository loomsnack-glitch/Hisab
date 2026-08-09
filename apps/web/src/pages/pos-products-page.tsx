import { useOutletContext } from "react-router-dom";

import BillingPage from "@/pages/billing-page";
import type { PosRouteContext } from "@/pages/pos-route-context";

const PosProductsPage = () => {
    const {
        session,
        searchValue,
        onPanelTabChange,
        pendingComposerHandoff,
        clearPendingComposerHandoff,
    } = useOutletContext<PosRouteContext>();

    return (
        <BillingPage
            mode="device"
            session={session}
            initialPanelTab="products"
            productSearch={searchValue}
            onPanelTabChange={onPanelTabChange}
            pendingComposerHandoff={pendingComposerHandoff}
            onComposerHandoffConsumed={clearPendingComposerHandoff}
        />
    );
};

export default PosProductsPage;
