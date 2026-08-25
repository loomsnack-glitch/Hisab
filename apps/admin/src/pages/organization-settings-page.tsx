import { Badge } from "@repo/ui/components/badge";
import { Card, CardContent } from "@repo/ui/components/card";
import { useParams } from "react-router-dom";

import GoogleContactsSyncStatusCard from "@/components/organizations/google-contacts-sync-status-card";

const OrganizationSettingsPage = () => {
    const { organizationId = "" } = useParams();

    return (
        <div className="space-y-6">
            <Card className="overflow-hidden border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardContent className="relative p-6 sm:p-8">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.10),_transparent_25%),radial-gradient(circle_at_bottom_right,_rgba(251,191,36,0.10),_transparent_30%)]" />
                    <div className="relative max-w-xl space-y-2">
                        <Badge variant="outline" className="rounded-full border-primary/20 bg-primary/10 text-primary">
                            Organization
                        </Badge>
                        <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                            Organization settings
                        </h2>
                        <p className="text-sm leading-relaxed text-muted-foreground">
                            Manage Organization-wide integrations. Ganatri POS cannot connect or change Google Contacts.
                        </p>
                    </div>
                </CardContent>
            </Card>

            {organizationId ? (
                <GoogleContactsSyncStatusCard organizationId={organizationId} />
            ) : null}
        </div>
    );
};

export default OrganizationSettingsPage;
