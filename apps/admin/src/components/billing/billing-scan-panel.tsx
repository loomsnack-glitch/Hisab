import type { RefObject } from "react";
import { Barcode, Copy, Pause, Play } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@repo/ui/components/button";
import { Input } from "@repo/ui/components/input";
import { cn } from "@repo/ui/lib/utils";

import { formatScanDiagnostics, type ScanDiagnostic } from "@/lib/barcode-scanning";

export type BillingScanFeedback =
    | { kind: "success"; message: string }
    | { kind: "unknown"; productCode: string }
    | { kind: "inactive"; productCode: string; productName: string }
    | { kind: "ambiguous"; productCode: string }
    | { kind: "unavailable"; message: string };

export type BillingScanPanelProps = {
    scanInputRef: RefObject<HTMLInputElement | null>;
    scanValue: string;
    onScanValueChange: (value: string) => void;
    onSubmitScan: (value: string) => void;
    directScanEnabled: boolean;
    directScanPaused: boolean;
    onToggleDirectScanPaused: () => void;
    canEnableDirectScan: boolean;
    onRequestEnableDirectScan: () => void;
    onDisableDirectScan: () => void;
    directScanPending?: boolean;
    activeProductCodesCount: number;
    scanFeedback: BillingScanFeedback | null;
    onClearScanFeedback: () => void;
    onUseTopSearch: () => void;
    onSendToAdministrator: (productCode: string) => void;
    scanDiagnostics: ScanDiagnostic[];
    onClearDiagnostics: () => void;
};

export function BillingScanPanel({
    scanInputRef,
    scanValue,
    onScanValueChange,
    onSubmitScan,
    directScanEnabled,
    directScanPaused,
    onToggleDirectScanPaused,
    canEnableDirectScan,
    onRequestEnableDirectScan,
    onDisableDirectScan,
    directScanPending,
    activeProductCodesCount,
    scanFeedback,
    onClearScanFeedback,
    onUseTopSearch,
    onSendToAdministrator,
    scanDiagnostics,
    onClearDiagnostics,
}: BillingScanPanelProps) {
    return (
        <div className="mb-1 mr-4 shrink-0 rounded-lg border border-border/60 bg-card/80 p-2 shadow-sm">
            <form
                className="flex items-center gap-1.5"
                onSubmit={(event) => {
                    event.preventDefault();
                    onSubmitScan(scanValue);
                }}
            >
                <div className="relative min-w-0 flex-1">
                    <Barcode className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        ref={scanInputRef}
                        id="product-code-scan"
                        value={scanValue}
                        onChange={(event) => onScanValueChange(event.target.value)}
                        placeholder="Scan or type code"
                        autoComplete="off"
                        className="h-8 rounded-lg pl-8 text-sm"
                    />
                </div>
                <Button type="submit" size="sm" className="h-8 shrink-0 rounded-lg px-3 text-xs">
                    Add
                </Button>
                {directScanEnabled ? (
                    <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="size-8 shrink-0 rounded-lg"
                        aria-label={directScanPaused ? "Resume direct scan" : "Pause direct scan"}
                        aria-pressed={!directScanPaused}
                        onClick={onToggleDirectScanPaused}
                    >
                        {directScanPaused ? <Play className="size-3.5" /> : <Pause className="size-3.5" />}
                    </Button>
                ) : (
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 shrink-0 rounded-lg px-2 text-xs"
                        disabled={!canEnableDirectScan || directScanPending}
                        onClick={onRequestEnableDirectScan}
                    >
                        <Play className="size-3.5" />
                        <span className="hidden sm:inline">Direct</span>
                    </Button>
                )}
            </form>

            <details className="mt-1.5 text-xs text-muted-foreground">
                <summary className="cursor-pointer select-none hover:text-foreground">Scanner settings</summary>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span>
                        {activeProductCodesCount} active code{activeProductCodesCount === 1 ? "" : "s"} · Direct scan{" "}
                        {directScanEnabled ? (directScanPaused ? "paused" : "on") : "off"}
                    </span>
                    {directScanEnabled ? (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 rounded-md px-2"
                            disabled={directScanPending}
                            onClick={onDisableDirectScan}
                        >
                            Turn off direct scan
                        </Button>
                    ) : null}
                </div>
            </details>
            {scanFeedback ? (
                <div
                    className={cn(
                        "mt-3 flex flex-wrap items-center gap-2 rounded-lg px-3 py-2 text-sm",
                        scanFeedback.kind === "success"
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                            : "bg-amber-500/10 text-amber-800 dark:text-amber-200",
                    )}
                    role="status"
                >
                    {scanFeedback.kind === "success" || scanFeedback.kind === "unavailable" ? (
                        <span>{scanFeedback.message}</span>
                    ) : scanFeedback.kind === "inactive" ? (
                        <span>
                            {scanFeedback.productName} is inactive. Product Code: <code>{scanFeedback.productCode}</code>
                        </span>
                    ) : scanFeedback.kind === "ambiguous" ? (
                        <span>
                            Product Code <code>{scanFeedback.productCode}</code> has conflicting catalog assignments.
                            Ask an administrator to resolve it.
                        </span>
                    ) : (
                        <span>
                            No Product is linked to <code>{scanFeedback.productCode}</code>.
                        </span>
                    )}
                    {scanFeedback.kind === "unknown" ? (
                        <>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 rounded-md bg-background/70"
                                onClick={async () => {
                                    try {
                                        await navigator.clipboard.writeText(scanFeedback.productCode);
                                        toast.success("Product Code copied for your administrator");
                                    } catch {
                                        toast.error("Could not copy the Product Code");
                                    }
                                }}
                            >
                                <Copy className="size-3" /> Copy for administrator
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 rounded-md bg-background/70"
                                onClick={() => onSendToAdministrator(scanFeedback.productCode)}
                            >
                                Send to administrator
                            </Button>
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 rounded-md"
                                onClick={() => {
                                    onClearScanFeedback();
                                    onUseTopSearch();
                                }}
                            >
                                Use top search
                            </Button>
                        </>
                    ) : null}
                </div>
            ) : null}
            {scanDiagnostics.length > 0 ? (
                <div className="mt-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                            <p className="text-sm font-semibold text-foreground">Scan diagnostics for this browser session</p>
                            <p className="text-xs text-muted-foreground">
                                Unknown codes, duplicate assignments, and add-to-cart failures are kept here for follow-up on this
                                device.
                            </p>
                        </div>
                        <div className="flex items-center gap-1">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 rounded-md bg-background/70"
                                onClick={async () => {
                                    try {
                                        await navigator.clipboard.writeText(formatScanDiagnostics(scanDiagnostics));
                                        toast.success("Scan diagnostics copied");
                                    } catch {
                                        toast.error("Could not copy scan diagnostics");
                                    }
                                }}
                            >
                                <Copy className="size-3" /> Copy log
                            </Button>
                            <Button type="button" variant="ghost" size="sm" className="h-7 rounded-md" onClick={onClearDiagnostics}>
                                Clear
                            </Button>
                        </div>
                    </div>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground" aria-label="Barcode scan diagnostics">
                        {[...scanDiagnostics].reverse().map((diagnostic, index) => (
                            <li key={`${diagnostic.occurredAt}-${index}`}>
                                <span className="font-medium text-foreground">{diagnostic.kind.replaceAll("-", " ")}</span>
                                {": "} <code>{diagnostic.productCode}</code> — {diagnostic.message}
                            </li>
                        ))}
                    </ul>
                </div>
            ) : null}
        </div>
    );
}
