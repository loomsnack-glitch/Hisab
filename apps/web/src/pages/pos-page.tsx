import { Navigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { deviceAuthenticate } from "@repo/services";
import { Spinner } from "@repo/ui/components/spinner";

import PosLayout from "@/components/pos/pos-layout";
import { deviceAuthKeys } from "@/lib/query-keys";
import BillingPage from "@/pages/billing-page";

const PosPage = () => {
    const deviceAuthQuery = useQuery({
        queryKey: deviceAuthKeys.me,
        queryFn: deviceAuthenticate,
        retry: false,
    });

    const session =
        deviceAuthQuery.data?.status === "success"
            ? deviceAuthQuery.data.data?.session ?? null
            : null;

    if (deviceAuthQuery.isPending) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <Spinner className="size-6 text-primary" />
            </div>
        );
    }

    if (deviceAuthQuery.isError || deviceAuthQuery.data?.status === "error" || !session) {
        return <Navigate to="/pos/login" replace />;
    }

    return (
        <PosLayout session={session}>
            <BillingPage mode="device" session={session} />
        </PosLayout>
    );
};

export default PosPage;
