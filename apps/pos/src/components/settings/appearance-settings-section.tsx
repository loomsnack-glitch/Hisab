import { useEffect, useState, type ReactNode } from "react";
import { MoonStar, SunMedium, Type } from "lucide-react";
import { useTheme } from "next-themes";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Label } from "@repo/ui/components/label";
import { RadioGroup, RadioGroupItem } from "@repo/ui/components/radio-group";
import { cn } from "@repo/ui/lib/utils";

import {
    DISPLAY_SCALE_OPTIONS,
    isDisplayScale,
} from "@/lib/display-scale";
import { useDisplayScale } from "@/hooks/use-display-scale";

const themeOptions = [
    { value: "light", label: "Light", icon: SunMedium },
    { value: "dark", label: "Dark", icon: MoonStar },
] as const;

type AppearanceOptionProps = {
    id: string;
    value: string;
    selected: boolean;
    children: ReactNode;
};

const AppearanceOption = ({ id, value, selected, children }: AppearanceOptionProps) => (
    <Label
        htmlFor={id}
        className={cn(
            "inline-flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium shadow-xs transition-colors",
            selected
                ? "border-primary/35 bg-primary/8 text-foreground"
                : "border-border/70 bg-background/70 text-foreground hover:border-border hover:bg-muted/40",
        )}
    >
        <RadioGroupItem value={value} id={id} />
        {children}
    </Label>
);

const sectionCardClassName = "h-full border-border/60 bg-card/80 shadow-xs";

const AppearanceSettingsSection = () => {
    const { resolvedTheme, setTheme } = useTheme();
    const { scale, setScale } = useDisplayScale();
    const [mounted, setMounted] = useState(false);
    const activeTheme = resolvedTheme === "dark" ? "dark" : "light";

    useEffect(() => {
        setMounted(true);
    }, []);

    return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card className={sectionCardClassName}>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <SunMedium className="size-4" />
                        </span>
                        Theme
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    {!mounted ? (
                        <div className="h-10 w-40 animate-pulse rounded-xl bg-muted/50" />
                    ) : (
                        <RadioGroup
                            value={activeTheme}
                            onValueChange={(value) => {
                                if (value === "light" || value === "dark") {
                                    setTheme(value);
                                }
                            }}
                            className="flex flex-wrap gap-2"
                        >
                            {themeOptions.map((option) => {
                                const Icon = option.icon;

                                return (
                                    <AppearanceOption
                                        key={option.value}
                                        id={`theme-${option.value}`}
                                        value={option.value}
                                        selected={activeTheme === option.value}
                                    >
                                        <Icon className="size-4 text-muted-foreground" />
                                        <span>{option.label}</span>
                                    </AppearanceOption>
                                );
                            })}
                        </RadioGroup>
                    )}
                </CardContent>
            </Card>

            <Card className={sectionCardClassName}>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base font-semibold">
                        <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Type className="size-4" />
                        </span>
                        Display size
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <RadioGroup
                        value={scale}
                        onValueChange={(value) => {
                            if (isDisplayScale(value)) {
                                setScale(value);
                            }
                        }}
                        className="flex flex-wrap gap-2"
                    >
                        {DISPLAY_SCALE_OPTIONS.map((option) => (
                            <AppearanceOption
                                key={option.value}
                                id={`display-scale-${option.value}`}
                                value={option.value}
                                selected={scale === option.value}
                            >
                                <span>{option.label}</span>
                                <span className="text-xs text-muted-foreground">({option.percentage}%)</span>
                            </AppearanceOption>
                        ))}
                    </RadioGroup>
                </CardContent>
            </Card>
        </div>
    );
};

export default AppearanceSettingsSection;
