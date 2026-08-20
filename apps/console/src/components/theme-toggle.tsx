import { useEffect, useState } from "react";
import { MoonStar, SunMedium } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@repo/ui/components/button";

const ThemeToggle = () => {
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const nextTheme = resolvedTheme === "dark" ? "light" : "dark";

    return (
        <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="rounded-full border-border/70 bg-background/80 backdrop-blur"
            aria-label={mounted ? `Switch to ${nextTheme} mode` : "Toggle theme"}
            onClick={() => setTheme(nextTheme)}
        >
            {!mounted ? (
                <span className="h-4 w-4 animate-pulse rounded-full bg-muted" />
            ) : resolvedTheme === "dark" ? (
                <SunMedium className="size-4" />
            ) : (
                <MoonStar className="size-4" />
            )}
        </Button>
    );
};

export default ThemeToggle;
