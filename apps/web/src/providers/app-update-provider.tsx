import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogMedia, AlertDialogTitle } from "@repo/ui/components/alert-dialog";
import logo from "@repo/assets/logo.png";

import { fetchAppVersion, localAppVersion, type AppVersionInfo } from "@/lib/app-version";

const VERSION_CHECK_INTERVAL_MS = 60_000;

const getVersionKey = (version: AppVersionInfo) => `${version.version}:${version.build}:${version.builtAt}`;

type AppUpdateProviderProps = {
    children: ReactNode;
};

const AppUpdateProvider = ({ children }: AppUpdateProviderProps) => {
    const [latestVersion, setLatestVersion] = useState<AppVersionInfo | null>(null);
    const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
    const dismissedVersionKeyRef = useRef<string | null>(null);

    const checkForUpdate = useCallback(async (signal?: AbortSignal) => {
        try {
            const nextVersion = await fetchAppVersion(signal);
            if (
                nextVersion.version === localAppVersion.version &&
                nextVersion.build === localAppVersion.build &&
                nextVersion.builtAt === localAppVersion.builtAt
            ) {
                return;
            }

            setLatestVersion(nextVersion);
            if (dismissedVersionKeyRef.current !== getVersionKey(nextVersion)) {
                setIsUpdateDialogOpen(true);
            }
        } catch {
            // Version checks are best-effort and must not interrupt app usage.
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();
        void checkForUpdate(controller.signal);

        const intervalId = window.setInterval(() => {
            void checkForUpdate();
        }, VERSION_CHECK_INTERVAL_MS);

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                void checkForUpdate();
            }
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        return () => {
            controller.abort();
            window.clearInterval(intervalId);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, [checkForUpdate]);

    const handleDialogChange = (open: boolean) => {
        if (!open && latestVersion) {
            dismissedVersionKeyRef.current = getVersionKey(latestVersion);
        }
        setIsUpdateDialogOpen(open);
    };

    return (
        <>
            {children}
            <AlertDialog open={isUpdateDialogOpen} onOpenChange={handleDialogChange}>
                <AlertDialogContent className="sm:max-w-md">
                    <AlertDialogHeader className="flex flex-col items-stretch gap-3 text-left">
                        <div className="flex items-center gap-3">
                            <AlertDialogMedia className="size-12 shrink-0 rounded-2xl bg-primary/10 text-primary">
                                <img src={logo} alt="Ganatri" className="size-7 object-contain" />
                            </AlertDialogMedia>
                            <AlertDialogTitle className="text-left text-base font-semibold">
                                A new Ganatri update is ready
                            </AlertDialogTitle>
                        </div>
                        <AlertDialogDescription
                            className="w-full max-w-none text-left text-base leading-6"
                            style={{ textWrap: "wrap" }}
                        >
                            Reload when convenient to start using the latest improvements. Your current bill will stay open until you choose to reload.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    {latestVersion ? (
                        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 rounded-xl border border-border/60 bg-muted/35 px-3 py-3">
                            <div className="min-w-0">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Current</p>
                                <p className="mt-1 truncate text-sm font-semibold text-foreground">v{localAppVersion.version}</p>
                            </div>
                            <span className="text-sm text-muted-foreground" aria-hidden="true">→</span>
                            <div className="min-w-0 text-right">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">Latest</p>
                                <p className="mt-1 truncate text-sm font-semibold text-primary">v{latestVersion.version}</p>
                            </div>
                        </div>
                    ) : null}
                    <AlertDialogFooter>
                        <AlertDialogCancel>Later</AlertDialogCancel>
                        <AlertDialogAction onClick={() => window.location.reload()}>
                            Reload now
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export { AppUpdateProvider };
