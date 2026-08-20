import { Type } from "lucide-react";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuRadioGroup,
    DropdownMenuRadioItem,
    DropdownMenuTrigger,
} from "@repo/ui/components/dropdown-menu";
import { Button } from "@repo/ui/components/button";

import {
    DISPLAY_SCALE_OPTIONS,
    getDisplayScaleOption,
    isDisplayScale,
} from "@/lib/display-scale";
import { useDisplayScale } from "@/hooks/use-display-scale";

const DisplayScaleControl = () => {
    const { scale, setScale } = useDisplayScale();
    const selectedOption = getDisplayScaleOption(scale);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger
                render={
                    <Button
                        type="button"
                        variant="outline"
                        size="icon-sm"
                        className="rounded-full border-border/70 bg-background/80 backdrop-blur"
                        aria-label={`Display size: ${selectedOption.label}`}
                        title={`Display size: ${selectedOption.label}`}
                    >
                        <Type className="size-4" />
                    </Button>
                }
            />
            <DropdownMenuContent align="end" className="w-44">
                <div className="px-1.5 py-1 text-xs font-medium text-muted-foreground">Display size</div>
                <DropdownMenuRadioGroup
                    value={scale}
                    onValueChange={(value) => {
                        if (isDisplayScale(value)) {
                            setScale(value);
                        }
                    }}
                >
                    {DISPLAY_SCALE_OPTIONS.map((option) => (
                        <DropdownMenuRadioItem key={option.value} value={option.value}>
                            {option.label} ({option.percentage}%)
                        </DropdownMenuRadioItem>
                    ))}
                </DropdownMenuRadioGroup>
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

export default DisplayScaleControl;
