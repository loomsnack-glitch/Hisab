import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getPlatformEntry, ownerLogout } from "@repo/services";
import type { OwnerUserDTO } from "@repo/types";
import { Button } from "@repo/ui/components/button";

import ConsoleEntry from "@/components/console-entry";
import OwnerLoginPage from "@/components/owner-login-page";

const ownerEntryKey = ["platform-owner", "entry"] as const;
const sessionMarker = "ganatri_platform_owner_session";

export const getCurrentOwnerUser = (
    isError: boolean,
    response?: Awaited<ReturnType<typeof getPlatformEntry>>,
): OwnerUserDTO | undefined => {
    if (isError) return undefined;
    return response?.status === "success" ? response.data?.ownerUser : undefined;
};

type PlatformAppViewProps =
    | { state: "loading" }
    | { state: "error"; message: string; onRetry: () => Promise<void> }
    | { state: "unauthenticated"; sessionExpired: boolean; onAuthenticated: () => Promise<void> }
    | { state: "authenticated"; ownerUser: OwnerUserDTO; onLogout: () => Promise<void> };

export const PlatformAppView = (props: PlatformAppViewProps) => {
    if (props.state === "loading") {
        return <main className="grid min-h-screen place-items-center bg-slate-950 text-slate-200" aria-busy="true">Checking owner session…</main>;
    }
    if (props.state === "error") {
        return (
            <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-slate-100">
                <div className="max-w-md space-y-4 text-center" role="alert">
                    <h1 className="text-2xl font-semibold">Console connection failed</h1>
                    <p className="text-slate-300">{props.message}</p>
                    <Button onClick={() => void props.onRetry()}>Try again</Button>
                </div>
            </main>
        );
    }
    if (props.state === "authenticated") {
        return <ConsoleEntry ownerUser={props.ownerUser} onLogout={props.onLogout} />;
    }
    return <OwnerLoginPage sessionExpired={props.sessionExpired} onAuthenticated={props.onAuthenticated} />;
};

const App = () => {
    const queryClient = useQueryClient();
    const entryQuery = useQuery({ queryKey: ownerEntryKey, queryFn: getPlatformEntry, retry: false });
    const ownerUser = getCurrentOwnerUser(entryQuery.isError, entryQuery.data);

    useEffect(() => {
        if (ownerUser) {
            localStorage.setItem(sessionMarker, "active");
        }
    }, [ownerUser]);

    const onAuthenticated = async () => {
        localStorage.setItem(sessionMarker, "active");
        await entryQuery.refetch();
    };

    const onLogout = async () => {
        await ownerLogout();
        localStorage.removeItem(sessionMarker);
        queryClient.removeQueries({ queryKey: ownerEntryKey });
        await queryClient.invalidateQueries({ queryKey: ownerEntryKey });
    };

    if (entryQuery.isPending) {
        return <PlatformAppView state="loading" />;
    }

    const entryError = entryQuery.error as { code?: number; message?: string } | null;
    if (entryQuery.isError && entryError?.code !== 401) {
        return (
            <PlatformAppView
                state="error"
                message={entryError?.message ?? "The Platform Operations API is unavailable."}
                onRetry={async () => { await entryQuery.refetch(); }}
            />
        );
    }

    if (ownerUser) {
        return <PlatformAppView state="authenticated" ownerUser={ownerUser} onLogout={onLogout} />;
    }

    const sessionExpired = entryError?.code === 401 && localStorage.getItem(sessionMarker) === "active";
    return <PlatformAppView state="unauthenticated" sessionExpired={sessionExpired} onAuthenticated={onAuthenticated} />;
};

export default App;
