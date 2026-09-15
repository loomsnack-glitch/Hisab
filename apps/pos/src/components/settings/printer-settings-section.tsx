import { useState, type ReactNode } from "react";
import { Bluetooth, Cable, ChevronDown, LoaderCircle, Printer, ScrollText, Usb } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui/components/button";
import CopyToClipboard from "@repo/ui/components/copy-to-clipboard";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@repo/ui/components/collapsible";
import { Label } from "@repo/ui/components/label";
import { RadioGroup, RadioGroupItem } from "@repo/ui/components/radio-group";
import { cn } from "@repo/ui/lib/utils";

import { isUsbAccessDeniedError } from "@/lib/pos-printer";
import {
    isReceiptPaperSize,
    RECEIPT_PAPER_SIZE_OPTIONS,
} from "@/lib/receipt-paper-size";
import { useOptionalPosPrinter, type PosPrinterTransport } from "@/providers/pos-printer-provider";

const transportLabel: Record<PosPrinterTransport, string> = {
    usb: "USB",
    serial: "COM port",
    bluetooth: "Bluetooth",
};

const sectionCardClassName = "border-border/60 bg-card/80 shadow-xs";

type PrinterOptionProps = {
    id: string;
    value: string;
    selected: boolean;
    children: ReactNode;
};

const PrinterOption = ({ id, value, selected, children }: PrinterOptionProps) => (
    <Label
        htmlFor={id}
        className={cn(
            "flex w-full cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-xs transition-colors",
            selected
                ? "border-primary/35 bg-primary/8 text-foreground"
                : "border-border/70 bg-background/70 text-foreground hover:border-border hover:bg-muted/40",
        )}
    >
        <RadioGroupItem value={value} id={id} className="mt-0.5" />
        <span className="min-w-0 flex-1">{children}</span>
    </Label>
);

type ConnectionMethodProps = {
    icon: ReactNode;
    title: string;
    description: string;
    disabled?: boolean;
    onClick: () => void;
};

const ConnectionMethod = ({ icon, title, description, disabled, onClick }: ConnectionMethodProps) => (
    <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className={cn(
            "flex w-full items-start gap-3 rounded-xl border border-border/70 bg-background/70 p-4 text-left shadow-xs transition-colors",
            "hover:border-border hover:bg-muted/40 disabled:cursor-not-allowed disabled:opacity-50",
        )}
    >
        <span className="mt-0.5 shrink-0 text-muted-foreground">{icon}</span>
        <span className="min-w-0 flex-1">
            <span className="block font-medium text-foreground">{title}</span>
            <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span>
        </span>
    </button>
);

const PrinterSettingsSection = () => {
    const posPrinter = useOptionalPosPrinter();
    const [logsOpen, setLogsOpen] = useState(false);
    const printerIsBusy = posPrinter?.status === "connecting" || posPrinter?.status === "printing";
    const showUsbHelp = Boolean(posPrinter?.error && isUsbAccessDeniedError(posPrinter.error));
    const rememberedBluetooth =
        !posPrinter?.connected &&
        posPrinter?.transport === "bluetooth" &&
        Boolean(posPrinter.printerName);

    const statusTitle = posPrinter?.connected
        ? `Connected${posPrinter.printerName ? `: ${posPrinter.printerName}` : ""}`
        : posPrinter?.status === "connecting"
          ? "Connecting..."
          : posPrinter?.status === "error"
            ? "Printer error"
            : rememberedBluetooth
              ? `Remembered: ${posPrinter?.printerName}`
              : "Not connected";

    const statusDetail = posPrinter?.connected && posPrinter.transport
        ? `${transportLabel[posPrinter.transport]} · ${posPrinter.paperSize} paper`
        : posPrinter?.error ||
          (rememberedBluetooth
              ? "This Chrome cannot keep Bluetooth after reload. Tap Reconnect and pick the printer again."
              : posPrinter?.supported
                ? "Choose USB, Bluetooth, or COM port below."
                : "Printer connection needs Chrome or Edge on localhost or HTTPS.");

    const connect = async (
        method: () => Promise<boolean>,
        successMessage: string,
        fallbackMessage: string,
    ) => {
        if (!posPrinter) return;
        try {
            const connected = await method();
            if (!connected) return;
            toast.success(successMessage);
        } catch (error) {
            toast.error((error as { message?: string })?.message || fallbackMessage);
        }
    };

    const disconnect = async () => {
        if (!posPrinter) return;
        await posPrinter.disconnect();
        toast.success("Receipt printer disconnected");
    };

    return (
        <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
            <Card className={sectionCardClassName}>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Printer className="size-4" />
                        </span>
                        Connection
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-xl border border-border/70 bg-background/70 p-4 shadow-xs">
                        <p className="text-sm font-medium text-foreground">
                            {statusTitle}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                            {statusDetail}
                        </p>
                        {rememberedBluetooth ? (
                            <Button
                                type="button"
                                className="mt-3 rounded-xl"
                                disabled={!posPrinter?.bluetoothSupported || printerIsBusy}
                                onClick={() =>
                                    void connect(
                                        () => posPrinter!.connectBluetooth(),
                                        "Bluetooth printer connected",
                                        "Could not connect to Bluetooth printer",
                                    )
                                }
                            >
                                Reconnect {posPrinter?.printerName}
                            </Button>
                        ) : null}
                    </div>

                    {posPrinter?.debugLines.length ? (
                        <Collapsible open={logsOpen} onOpenChange={setLogsOpen}>
                            <div className="overflow-hidden rounded-xl border border-border/70 bg-background/70 shadow-xs">
                                <div className="flex items-center gap-1 px-3 py-2.5">
                                    <CollapsibleTrigger
                                        className="flex min-w-0 flex-1 items-center justify-between gap-2 bg-transparent text-left text-sm font-medium text-foreground hover:bg-transparent focus-visible:outline-none"
                                    >
                                        <span className="inline-flex items-center gap-2">
                                            <ScrollText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                            Logs ({posPrinter.debugLines.length})
                                        </span>
                                        <ChevronDown
                                            className={cn(
                                                "size-4 shrink-0 text-muted-foreground transition-transform",
                                                logsOpen && "rotate-180",
                                            )}
                                            aria-hidden="true"
                                        />
                                    </CollapsibleTrigger>
                                    <CopyToClipboard
                                        getValue={() => posPrinter.debugLines.join("\n")}
                                        variant="ghost"
                                        size="icon-sm"
                                        tooltip="Copy logs"
                                        showTooltip={false}
                                        className="shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
                                    />
                                </div>
                                <CollapsibleContent>
                                    <pre className="max-h-52 overflow-auto border-t border-zinc-800 bg-zinc-950 p-3 font-mono text-[11px] leading-5 text-emerald-400 whitespace-pre-wrap">
                                        {posPrinter.debugLines.join("\n")}
                                    </pre>
                                </CollapsibleContent>
                            </div>
                        </Collapsible>
                    ) : null}

                    {posPrinter?.connected ? (
                        <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl shadow-xs"
                            onClick={() => void disconnect()}
                            disabled={printerIsBusy}
                        >
                            Disconnect printer
                        </Button>
                    ) : null}

                    {showUsbHelp ? (
                        <ol className="list-decimal space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4 pl-8 text-sm leading-relaxed text-muted-foreground">
                            <li>Download Zadig from zadig.akeo.ie and run it as Administrator.</li>
                            <li>Open Options and turn on List All Devices.</li>
                            <li>Select 58Printer or USB Printing Support. Do not pick Bluetooth or audio devices.</li>
                            <li>Set the target driver to WinUSB and click Replace Driver.</li>
                            <li>Close Chrome completely, reopen POS, then try USB again.</li>
                        </ol>
                    ) : null}

                    <div className="grid gap-2">
                        <ConnectionMethod
                            icon={printerIsBusy && posPrinter?.status === "connecting"
                                ? <LoaderCircle className="size-4 animate-spin" />
                                : <Usb className="size-4" />}
                            title="USB"
                            description={posPrinter?.usbSupported
                                ? "Best for a printer plugged into this computer. Pick 58Printer, or Unknown device if Windows hides the name."
                                : "USB needs Chrome or Edge on this computer."}
                            disabled={!posPrinter?.usbSupported || printerIsBusy}
                            onClick={() =>
                                void connect(
                                    () => posPrinter!.connectUsb(),
                                    "USB printer connected",
                                    "Could not connect to USB printer",
                                )
                            }
                        />

                        <ConnectionMethod
                            icon={<Bluetooth className="size-4" />}
                            title="Bluetooth"
                            description={posPrinter?.bluetoothSupported
                                ? "Use this on a phone or computer. After reload, tap Reconnect — this Chrome cannot keep Bluetooth by itself."
                                : "Bluetooth needs Chrome or Edge with Bluetooth turned on. iPhone Safari cannot connect a receipt printer."}
                            disabled={!posPrinter?.bluetoothSupported || printerIsBusy}
                            onClick={() =>
                                void connect(
                                    () => posPrinter!.connectBluetooth(),
                                    "Bluetooth printer connected",
                                    "Could not connect to Bluetooth printer",
                                )
                            }
                        />

                        <ConnectionMethod
                            icon={<Cable className="size-4" />}
                            title="COM port"
                            description={posPrinter?.serialSupported
                                ? "Use this when Windows lists the printer under Ports (COM & LPT), including some Bluetooth Classic printers already paired on this computer."
                                : "COM ports are available in Chrome or Edge on a computer, not on a phone."}
                            disabled={!posPrinter?.serialSupported || printerIsBusy}
                            onClick={() =>
                                void connect(
                                    () => posPrinter!.connectSerial(),
                                    "COM printer connected",
                                    "Could not connect to COM printer",
                                )
                            }
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className={sectionCardClassName}>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Printer className="size-4" />
                        </span>
                        Receipt paper
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <RadioGroup
                        value={posPrinter?.paperSize ?? "80mm"}
                        onValueChange={(value) => {
                            if (posPrinter && isReceiptPaperSize(value)) {
                                posPrinter.setPaperSize(value);
                            }
                        }}
                        className="grid gap-2"
                    >
                        {RECEIPT_PAPER_SIZE_OPTIONS.map((option) => (
                            <PrinterOption
                                key={option.value}
                                id={`receipt-paper-${option.value}`}
                                value={option.value}
                                selected={posPrinter?.paperSize === option.value}
                            >
                                <span className="block font-medium">{option.label}</span>
                                <span className="mt-0.5 block text-xs font-normal leading-relaxed text-muted-foreground">
                                    {option.description}
                                </span>
                            </PrinterOption>
                        ))}
                    </RadioGroup>
                </CardContent>
            </Card>
        </div>
    );
};

export default PrinterSettingsSection;
