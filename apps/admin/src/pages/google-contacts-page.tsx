import { Contact } from "lucide-react";
import { useParams } from "react-router-dom";

import GoogleContactsSyncStatusCard from "@/components/organizations/google-contacts-sync-status-card";

const GoogleContactsPage = () => {
    const { organizationId = "" } = useParams();

    return (
        <div className="mx-auto w-full max-w-2xl space-y-4">
            <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                    <Contact className="size-5" />
                </div>
                <div>
                    <h1 className="font-display text-2xl font-semibold tracking-tight text-foreground">Google Contacts</h1>
                    <p className="text-sm text-muted-foreground">Sync customer names and phone numbers to one Google account.</p>
                </div>
            </div>

            {organizationId ? <GoogleContactsSyncStatusCard organizationId={organizationId} /> : null}
        </div>
    );
};

export default GoogleContactsPage;
