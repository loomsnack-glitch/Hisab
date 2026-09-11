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
            className="rounded-full border-border/70 bg-background/80 backdrop-blur relative overflow-hidden"
            aria-label={mounted ? `Switch to ${nextTheme} mode` : "Toggle theme"}
            onClick={() => setTheme(nextTheme)}
        >
            <SunMedium className={`size-4 transition-all duration-150 ${mounted && resolvedTheme === "dark" ? "scale-100 rotate-0 opacity-100" : "scale-0 rotate-90 opacity-0 absolute"}`} />
            <MoonStar className={`size-4 transition-all duration-150 ${mounted && resolvedTheme === "dark" ? "scale-0 -rotate-90 opacity-0 absolute" : "scale-100 rotate-0 opacity-100"}`} />
        </Button>
    );
};

export default ThemeToggle;
