import { useState, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { deviceLogout } from "@repo/services";
import type { DeviceSessionDTO } from "@repo/types";
import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
import { BarChart3, Expand, LoaderCircle, LogOut, MessageCircle, Minimize, Printer, Search, X } from "lucide-react";
import { toast } from "sonner";

import ThemeToggle from "@/components/dashboard/theme-toggle";
import DisplayScaleControl from "@/components/display-scale-control";
import { formatLongDate } from "@/lib/format";
import { deviceAuthKeys } from "@/lib/query-keys";
import { useFullscreen } from "@/hooks/use-fullscreen";
import WorkspaceBrand from "@/components/workspace/workspace-brand";
import { useOptionalPosPrinter } from "@/providers/pos-printer-provider";

type PrinterButtonVisualState =
    | "connected"
    | "disconnected"
    | "connecting"
    | "printing"
    | "error"
    | "unsupported";

const getPrinterButtonClassName = (state: PrinterButtonVisualState) => {
    switch (state) {
        case "connected":
            return "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400";
        case "connecting":
        case "printing":
            return "border-sky-500/40 bg-sky-500/10 text-sky-600 dark:text-sky-400";
        case "error":
            return "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20";
        case "unsupported":
            return "border-muted-foreground/30 bg-muted/30 text-muted-foreground hover:bg-muted/50";
        default:
            return "border-border bg-muted/30 text-muted-foreground hover:bg-muted";
    }
};

const getPrinterStatusDotClassName = (state: PrinterButtonVisualState) => {
    switch (state) {
        case "connected":
            return "bg-emerald-500";
        case "connecting":
        case "printing":
            return "bg-sky-500";
        case "error":
            return "bg-destructive";
        case "unsupported":
            return "bg-muted-foreground/50";
        default:
            return "bg-muted-foreground/60";
    }
};

type PosLayoutProps = {
    children: ReactNode;
    session: DeviceSessionDTO;
  searchValue: string;
  searchPlaceholder: string;
  onSearchChange: (value: string) => void;
  showSearch?: boolean;
};

const PosLayout = ({
  children,
  session,
  searchValue,
  searchPlaceholder,
  onSearchChange,
  showSearch = true,
}: PosLayoutProps) => {
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const { isFullscreen, isSupported, toggleFullscreen } = useFullscreen();
    const posPrinter = useOptionalPosPrinter();
    const [logoutConfirmationOpen, setLogoutConfirmationOpen] = useState(false);
    const printerButtonState: PrinterButtonVisualState | null = posPrinter
        ? !posPrinter.supported
            ? "unsupported"
            : posPrinter.status === "error"
            ? "error"
            : posPrinter.status === "connecting"
            ? "connecting"
            : posPrinter.status === "printing"
            ? "printing"
            : posPrinter.connected
            ? "connected"
            : "disconnected"
        : null;
    const printerIsBusy = printerButtonState === "connecting" || printerButtonState === "printing";

    const handleFullscreenToggle = async () => {
        try {
            await toggleFullscreen();
        } catch {
            toast.error("Fullscreen could not be enabled");
        }
    };

    const handlePrinterToggle = async () => {
        if (!posPrinter) return;

        if (!posPrinter.supported) {
            toast.error("WebUSB is unavailable; use Chrome or Edge on localhost or HTTPS");
            return;
        }

        if (posPrinter.connected) {
            await posPrinter.disconnect();
            toast.success("USB printer disconnected");
            return;
        }

        try {
            await posPrinter.connect();
            toast.success("USB printer connected");
        } catch (error) {
            toast.error((error as { message?: string })?.message || "Could not connect to USB printer");
        }
    };

    const handleLogout = async () => {
        try {
            const response = await deviceLogout();
            if (response.status !== "success") {
                toast.error(response.message || "Failed to logout from POS");
                return;
            }

            queryClient.removeQueries({ queryKey: deviceAuthKeys.me });
            toast.success("POS session closed");
            navigate("/pos/login", { replace: true });
        } catch (error) {
      toast.error(
        (error as { message?: string })?.message || "Failed to logout from POS",
      );
        }
    };

    return (
    <div className="min-h-dvh bg-background text-foreground [--pos-header-height:6.5rem] sm:[--pos-header-height:3.5rem]">
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(139,92,246,0.12),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.1),_transparent_28%)]" />
            </div>

      <header className="sticky top-0 z-20 flex min-h-14 flex-wrap items-center gap-2 border-b border-border/50 bg-background/90 px-4 pt-[calc(0.5rem+env(safe-area-inset-top))] pb-2 backdrop-blur-xl sm:flex-nowrap sm:px-6">
                <Link to="/pos" className="flex min-w-0 items-center gap-2.5 transition-opacity hover:opacity-90">
                    <WorkspaceBrand workspace="pos" />
                </Link>

        {showSearch ? (
          <div className="order-3 flex w-full min-w-0 items-center sm:order-none sm:flex-1 sm:px-4 lg:max-w-xl">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="h-9 rounded-xl bg-background/80 pl-10 pr-10 text-sm"
                placeholder={searchPlaceholder}
                value={searchValue}
                onChange={(event) => onSearchChange(event.target.value)}
                aria-label={searchPlaceholder}
              />
              {searchValue ? (
                <button
                  type="button"
                  onClick={() => onSearchChange("")}
                  className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label="Clear search"
                >
                  <X className="size-4" />
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="ml-auto flex min-w-0 max-w-full flex-wrap items-center justify-end gap-2 sm:flex-nowrap sm:gap-3">
                    <div className="hidden min-w-0 max-w-[min(100vw-12rem,280px)] text-right sm:block">
                        <p className="truncate text-sm font-medium text-foreground">
                            {session.organization.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                            {session.store.name} · {formatLongDate()}
                        </p>
                    </div>

                    <Button
                        variant="outline"
                        className={`h-9 shrink-0 rounded-full px-3 ${location.pathname === "/pos/reports" ? "border-primary/50 bg-primary/10 text-primary" : ""}`}
                        aria-label="Product sales reports"
                        title="Product sales reports"
                        render={<Link to="/pos/reports" />}
                    >
                        <BarChart3 className="size-4" />
                        <span className="hidden text-xs font-semibold sm:inline">Reports</span>
                    </Button>

                    <Button
                        variant="outline"
                        className={`h-9 shrink-0 rounded-full px-3 ${location.pathname === "/pos/whatsapp" ? "border-primary/50 bg-primary/10 text-primary" : ""}`}
                        aria-label="WhatsApp conversations"
                        title="WhatsApp conversations"
                        render={<Link to="/pos/whatsapp" />}
                    >
                        <MessageCircle className="size-4" />
                        <span className="hidden text-xs font-semibold sm:inline">WhatsApp</span>
                    </Button>

                    <DisplayScaleControl />
                    <ThemeToggle />

                    {posPrinter ? (
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className={`relative size-9 rounded-full transition-colors ${getPrinterButtonClassName(printerButtonState!)}`}
                            aria-label={posPrinter.connected ? "Disconnect receipt printer" : "Connect receipt printer"}
                            aria-busy={printerIsBusy}
                            title={
                                !posPrinter.supported
                                    ? "WebUSB unavailable"
                                    : printerButtonState === "error"
                                    ? `Printer error: ${posPrinter.error || "Try connecting again"}`
                                    : printerIsBusy
                                    ? posPrinter.status === "printing"
                                        ? "Printing invoice"
                                        : "Connecting printer"
                                    : posPrinter.connected
                                    ? `Connected: ${posPrinter.printerName || "USB printer"}`
                                    : "Connect 80mm receipt printer"
                            }
                            disabled={printerIsBusy}
                            onClick={() => void handlePrinterToggle()}
                        >
                            {printerIsBusy ? <LoaderCircle className="size-4 animate-spin" /> : <Printer className="size-4" />}
                            <span
                                aria-hidden="true"
                                className={`absolute top-0 right-0 size-2.5 rounded-full border-2 border-background ${getPrinterStatusDotClassName(printerButtonState!)}`}
                            />
                        </Button>
                    ) : null}

                    {isSupported ? (
                        <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="size-9 rounded-full"
                            aria-label={isFullscreen ? "Exit full screen" : "Enter full screen"}
                            aria-pressed={isFullscreen}
                            title={isFullscreen ? "Exit full screen" : "Full screen"}
                            onClick={handleFullscreenToggle}
                        >
                            {isFullscreen ? <Minimize className="size-4" /> : <Expand className="size-4" />}
                        </Button>
                    ) : null}

                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        className="size-9 rounded-full"
                        aria-label="Logout"
                        title="Logout"
                        onClick={() => setLogoutConfirmationOpen(true)}
                    >
                        <LogOut className="size-4" />
                    </Button>
                </div>
            </header>

            <AlertDialog open={logoutConfirmationOpen} onOpenChange={setLogoutConfirmationOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure you want to logout?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You will need to sign in again on this POS device.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => void handleLogout()}
                        >
                            Logout
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <main className="w-full px-0">{children}</main>
        </div>
    );
};

export default PosLayout;
