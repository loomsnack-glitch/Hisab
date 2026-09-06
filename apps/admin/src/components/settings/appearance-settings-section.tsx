import { useEffect, useState } from "react";
import { MoonStar, Printer, SunMedium, Type } from "lucide-react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Label } from "@repo/ui/components/label";
import { RadioGroup, RadioGroupItem } from "@repo/ui/components/radio-group";
import { cn } from "@repo/ui/lib/utils";

import {
    DISPLAY_SCALE_OPTIONS,
    getDisplayScaleOption,
    isDisplayScale,
} from "@/lib/display-scale";
import {
    isReceiptPaperSize,
    persistReceiptPaperSize,
    readReceiptPaperSize,
    RECEIPT_PAPER_SIZE_OPTIONS,
    type ReceiptPaperSize,
} from "@/lib/receipt-paper-size";
import { useDisplayScale } from "@/hooks/use-display-scale";

const themeOptions = [
    { value: "light", label: "Light", icon: SunMedium },
    { value: "dark", label: "Dark", icon: MoonStar },
] as const;

const AppearanceSettingsSection = () => {
    const { resolvedTheme, setTheme } = useTheme();
    const { scale, setScale } = useDisplayScale();
    const [paperSize, setPaperSizeState] = useState<ReceiptPaperSize>(() =>
        readReceiptPaperSize("admin"),
    );
    const [mounted, setMounted] = useState(false);
    const selectedScale = getDisplayScaleOption(scale);
    const activeTheme = resolvedTheme === "dark" ? "dark" : "light";
    const setPaperSize = (nextPaperSize: ReceiptPaperSize) => {
        persistReceiptPaperSize("admin", nextPaperSize);
        setPaperSizeState(nextPaperSize);
    };

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <div className="space-y-6">
            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-display text-xl">
                        <SunMedium className="size-5 text-primary" />
                        Theme
                    </CardTitle>
                    <CardDescription>Choose light or dark mode for this workspace.</CardDescription>
                </CardHeader>
                <CardContent>
                    {!mounted ? (
                        <div className="h-20 animate-pulse rounded-xl bg-muted/50" />
                    ) : (
                        <RadioGroup
                            value={activeTheme}
                            onValueChange={(value) => {
                                if (value === "light" || value === "dark") {
                                    setTheme(value);
                                }
                            }}
                            className="grid gap-3 sm:grid-cols-2"
                        >
                            {themeOptions.map((option) => {
                                const Icon = option.icon;

                                return (
                                    <Label
                                        key={option.value}
                                        htmlFor={`theme-${option.value}`}
                                        className={cn(
                                            "flex cursor-pointer items-center gap-3 rounded-xl border border-border/70 bg-background/70 p-4 transition-colors hover:bg-muted/40",
                                            activeTheme === option.value && "border-primary/40 bg-primary/5",
                                        )}
                                    >
                                        <RadioGroupItem value={option.value} id={`theme-${option.value}`} />
                                        <Icon className="size-4 text-muted-foreground" />
                                        <span className="text-sm font-medium text-foreground">{option.label}</span>
                                    </Label>
                                );
                            })}
                        </RadioGroup>
                    )}
                </CardContent>
            </Card>

            <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 font-display text-xl">
                        <Type className="size-5 text-primary" />
                        Display size
                    </CardTitle>
                    <CardDescription>
                        Adjust text size across the interface. Current size: {selectedScale.label} ({selectedScale.percentage}%).
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <RadioGroup
                        value={scale}
                        onValueChange={(value) => {
                            if (isDisplayScale(value)) {
                                setScale(value);
                            }
                        }}
                        className="grid gap-3 sm:grid-cols-2"
                    >
                        {DISPLAY_SCALE_OPTIONS.map((option) => (
                            <Label
                                key={option.value}
                                htmlFor={`display-scale-${option.value}`}
                                className={cn(
                                    "flex cursor-pointer items-center gap-3 rounded-xl border border-border/70 bg-background/70 p-4 transition-colors hover:bg-muted/40",
                                    scale === option.value && "border-primary/40 bg-primary/5",
                                )}
                            >
                                <RadioGroupItem value={option.value} id={`display-scale-${option.value}`} />
                                <span className="text-sm font-medium text-foreground">
                                    {option.label} ({option.percentage}%)
                                </span>
                            </Label>
                        ))}
                    </RadioGroup>
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
                        value={paperSize}
                        onValueChange={(value) => {
                            if (isReceiptPaperSize(value)) {
                                setPaperSize(value);
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
                                    paperSize === option.value && "border-primary/40 bg-primary/5",
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

export default AppearanceSettingsSection;
