import { Bluetooth, Cable, LoaderCircle, Printer, Usb } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
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

const PrinterSettingsSection = () => {
    const posPrinter = useOptionalPosPrinter();
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
        <div className="space-y-6">
            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-display text-xl">
                        <Printer className="size-5 text-primary" />
                        Connection
                    </CardTitle>
                    <CardDescription>
                        Connect this POS device to a thermal receipt printer over USB, Bluetooth, or a COM port.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="rounded-xl border border-border/70 bg-background/70 p-4">
                        <p className="text-sm font-medium text-foreground">
                            {statusTitle}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
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
                        <pre className="max-h-48 overflow-auto rounded-xl border border-border/70 bg-background/80 p-3 font-mono text-[11px] leading-5 text-muted-foreground whitespace-pre-wrap">
                            {posPrinter.debugLines.join("\n")}
                        </pre>
                    ) : null}

                    {posPrinter?.connected ? (
                        <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl"
                            onClick={() => void disconnect()}
                            disabled={printerIsBusy}
                        >
                            Disconnect printer
                        </Button>
                    ) : null}

                    {showUsbHelp ? (
                        <ol className="list-decimal space-y-2 rounded-xl border border-destructive/30 bg-destructive/5 p-4 pl-8 text-sm text-muted-foreground">
                            <li>Download Zadig from zadig.akeo.ie and run it as Administrator.</li>
                            <li>Open Options and turn on List All Devices.</li>
                            <li>Select 58Printer or USB Printing Support. Do not pick Bluetooth or audio devices.</li>
                            <li>Set the target driver to WinUSB and click Replace Driver.</li>
                            <li>Close Chrome completely, reopen POS, then try USB again.</li>
                        </ol>
                    ) : null}

                    <div className="grid gap-3">
                        <Button
                            type="button"
                            variant="outline"
                            className="h-auto justify-start gap-3 py-3"
                            disabled={!posPrinter?.usbSupported || printerIsBusy}
                            onClick={() =>
                                void connect(
                                    () => posPrinter!.connectUsb(),
                                    "USB printer connected",
                                    "Could not connect to USB printer",
                                )
                            }
                        >
                            {printerIsBusy && posPrinter?.status === "connecting" ? (
                                <LoaderCircle className="size-4 shrink-0 animate-spin" />
                            ) : (
                                <Usb className="size-4 shrink-0" />
                            )}
                            <span className="text-left">
                                <span className="block font-medium">USB</span>
                                <span className="block text-xs font-normal text-muted-foreground">
                                    {posPrinter?.usbSupported
                                        ? "Best for a printer plugged into this computer. Pick 58Printer, or Unknown device if Windows hides the name."
                                        : "USB needs Chrome or Edge on this computer."}
                                </span>
                            </span>
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            className="h-auto justify-start gap-3 py-3"
                            disabled={!posPrinter?.bluetoothSupported || printerIsBusy}
                            onClick={() =>
                                void connect(
                                    () => posPrinter!.connectBluetooth(),
                                    "Bluetooth printer connected",
                                    "Could not connect to Bluetooth printer",
                                )
                            }
                        >
                            <Bluetooth className="size-4 shrink-0" />
                            <span className="text-left">
                                <span className="block font-medium">Bluetooth</span>
                                <span className="block text-xs font-normal text-muted-foreground">
                                    {posPrinter?.bluetoothSupported
                                        ? "Use this on a phone or computer. After reload, tap Reconnect — this Chrome cannot keep Bluetooth by itself."
                                        : "Bluetooth needs Chrome or Edge with Bluetooth turned on. iPhone Safari cannot connect a receipt printer."}
                                </span>
                            </span>
                        </Button>

                        <Button
                            type="button"
                            variant="outline"
                            className="h-auto justify-start gap-3 py-3"
                            disabled={!posPrinter?.serialSupported || printerIsBusy}
                            onClick={() =>
                                void connect(
                                    () => posPrinter!.connectSerial(),
                                    "COM printer connected",
                                    "Could not connect to COM printer",
                                )
                            }
                        >
                            <Cable className="size-4 shrink-0" />
                            <span className="text-left">
                                <span className="block font-medium">COM port</span>
                                <span className="block text-xs font-normal text-muted-foreground">
                                    {posPrinter?.serialSupported
                                        ? "Use this when Windows lists the printer under Ports (COM & LPT), including some Bluetooth Classic printers already paired on this computer."
                                        : "COM ports are available in Chrome or Edge on a computer, not on a phone."}
                                </span>
                            </span>
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-display text-xl">
                        <Printer className="size-5 text-primary" />
                        Receipt paper
                    </CardTitle>
                    <CardDescription>
                        Choose 58 mm or 80 mm so receipts fit this device&apos;s thermal printer.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <RadioGroup
                        value={posPrinter?.paperSize ?? "80mm"}
                        onValueChange={(value) => {
                            if (posPrinter && isReceiptPaperSize(value)) {
                                posPrinter.setPaperSize(value);
                            }
                        }}
                        className="grid gap-3 sm:grid-cols-2"
                    >
                        {RECEIPT_PAPER_SIZE_OPTIONS.map((option) => (
                            <Label
                                key={option.value}
                                htmlFor={`receipt-paper-${option.value}`}
                                className={cn(
                                    "flex cursor-pointer items-center gap-3 rounded-xl border border-border/70 bg-background/70 p-4 transition-colors hover:bg-muted/40",
                                    posPrinter?.paperSize === option.value && "border-primary/40 bg-primary/5",
                                )}
                            >
                                <RadioGroupItem value={option.value} id={`receipt-paper-${option.value}`} />
                                <span className="space-y-0.5">
                                    <span className="block text-sm font-medium text-foreground">{option.label}</span>
                                    <span className="block text-xs text-muted-foreground">{option.description}</span>
                                </span>
                            </Label>
                        ))}
                    </RadioGroup>
                </CardContent>
            </Card>
        </div>
    );
};

export default PrinterSettingsSection;
