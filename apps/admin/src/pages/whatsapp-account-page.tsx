import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@repo/ui/components/button";

import StoreWhatsAppLinkCard from "@/components/organizations/store-whatsapp-link-card";
import { getStoreSettingsPath } from "@/lib/store-workspace-routes";

const WhatsAppAccountPage = () => {
    const { organizationId = "", storeId = "" } = useParams();

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <Button
                variant="ghost"
                className="rounded-full"
                render={<Link to={getStoreSettingsPath(organizationId, storeId)} />}
            >
                <ArrowLeft className="size-4" />
                Back to store
            </Button>

            <StoreWhatsAppLinkCard organizationId={organizationId} storeId={storeId} />
        </div>
    );
};

export default WhatsAppAccountPage;
