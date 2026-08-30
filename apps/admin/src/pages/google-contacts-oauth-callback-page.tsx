import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { completeGoogleContactsOAuth } from "@repo/services";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Spinner } from "@repo/ui/components/spinner";

import {
    googleContactsSettingsPath,
    readGoogleContactsOAuthOrganization,
    settleGoogleContactsOAuthCallback,
} from "@/lib/google-contacts-oauth";

const GoogleContactsOAuthCallbackPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        const settle = async () => {
            const result = await settleGoogleContactsOAuthCallback({
                organizationId: readGoogleContactsOAuthOrganization(),
                searchParams,
                completeOAuth: completeGoogleContactsOAuth,
            });
            if (cancelled) return;
            if (result.ok) {
                navigate(googleContactsSettingsPath(result.organizationId), { replace: true });
                return;
            }
            setErrorMessage(result.message);
        };
        void settle();
        return () => {
            cancelled = true;
        };
    }, [navigate, searchParams]);

    if (errorMessage) {
        return (
            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardHeader>
                    <CardTitle className="font-display text-2xl">Google Contacts connection failed</CardTitle>
                    <CardDescription>{errorMessage}</CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="outline" className="rounded-full" render={<Link to="/organizations" />}>
                        Return to organizations
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="flex min-h-[40vh] items-center justify-center">
            <Spinner className="size-6 text-primary" />
        </div>
    );
};

export default GoogleContactsOAuthCallbackPage;
