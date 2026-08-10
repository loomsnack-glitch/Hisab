import { useCallback, useEffect, useState } from "react";
import { Navigate, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { deviceAuthenticate } from "@repo/services";
import type { DeviceSessionDTO } from "@repo/types";
import { Spinner } from "@repo/ui/components/spinner";

import PosLayout from "@/components/pos/pos-layout";
import { deviceAuthKeys } from "@/lib/query-keys";
import {
    getPosLoginPath,
    getPosPanelPath,
    getPosPanelTabFromPath,
    posPanelConfig,
    type PosPanelTab,
    type PosComposerHandoff,
    type PosRouteContext,
} from "@/pages/pos-route-context";
import { PosPrinterProvider } from "@/providers/pos-printer-provider";

const PosPage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [headerSearch, setHeaderSearch] = useState("");
    const [pendingComposerHandoff, setPendingComposerHandoff] = useState<PosComposerHandoff | null>(null);
    const activePanelTab = getPosPanelTabFromPath(location.pathname);
    const legacyPanel = searchParams.get("panel");

    const handlePanelTabChange = useCallback(
        (tab: PosPanelTab, composerHandoff?: PosComposerHandoff) => {
            if (composerHandoff) {
                setPendingComposerHandoff(composerHandoff);
            } else if (tab !== "products") {
                setPendingComposerHandoff(null);
            }

            const nextPath = getPosPanelPath(tab);
            if (location.pathname !== nextPath) {
                navigate(nextPath);
            }
        },
        [location.pathname, navigate],
    );

    const clearPendingComposerHandoff = useCallback(() => {
        setPendingComposerHandoff(null);
    }, []);

    useEffect(() => {
        setHeaderSearch("");
    }, [activePanelTab]);

    const deviceAuthQuery = useQuery({
        queryKey: deviceAuthKeys.me,
        queryFn: deviceAuthenticate,
        retry: false,
    });

    const session: DeviceSessionDTO | null =
        deviceAuthQuery.data?.status === "success" ? (deviceAuthQuery.data.data?.session ?? null) : null;

    if (deviceAuthQuery.isPending) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-background">
                <Spinner className="size-6 text-primary" />
            </div>
        );
    }

    if (deviceAuthQuery.isError || deviceAuthQuery.data?.status === "error" || !session) {
        const returnTo = `${location.pathname}${location.search}${location.hash}`;
        return <Navigate to={getPosLoginPath(returnTo)} replace />;
    }

    if (location.pathname === "/pos" && (legacyPanel === "bills" || legacyPanel === "customers" || legacyPanel === "purchases")) {
        return <Navigate to={getPosPanelPath(legacyPanel as PosPanelTab)} replace />;
    }

    const context: PosRouteContext = {
        session,
        searchValue: headerSearch,
        onSearchChange: setHeaderSearch,
        onPanelTabChange: handlePanelTabChange,
        pendingComposerHandoff,
        clearPendingComposerHandoff,
    };

    return (
        <PosPrinterProvider>
            <PosLayout
                session={session}
                searchValue={headerSearch}
                searchPlaceholder={posPanelConfig[activePanelTab].searchPlaceholder}
                onSearchChange={setHeaderSearch}
                showSearch={activePanelTab !== "products"}
            >
                <Outlet context={context} />
            </PosLayout>
        </PosPrinterProvider>
    );
};

export default PosPage;
