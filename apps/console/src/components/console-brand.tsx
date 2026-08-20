import logo from "@repo/assets/logo.png";
import { cn } from "@repo/ui/lib/utils";

import AppVersionBadge from "@/components/app-version-badge";

type ConsoleBrandProps = {
    showLabel?: boolean;
    size?: "sidebar" | "hero";
    tone?: "default" | "inverse";
};

const ConsoleBrand = ({ showLabel = true, size = "sidebar", tone = "default" }: ConsoleBrandProps) => {
    const logoClass = size === "hero" ? "h-12 w-12 rounded-2xl shadow-md shadow-primary/20" : "h-8 w-8 rounded-lg shadow-sm shadow-primary/20";
    const logoImageClass = size === "hero" ? "h-7 w-7" : "h-5 w-5";
    const titleClass = size === "hero" ? "text-2xl" : "text-[15px]";
    const titleToneClass = tone === "inverse" ? "text-slate-50" : "text-foreground";

    return (
        <>
            <div className={cn("flex shrink-0 items-center justify-center overflow-hidden bg-gradient-to-br from-primary to-primary/80 text-primary-foreground", logoClass)}>
                <img src={logo} alt="Ganatri" className={cn(logoImageClass, "object-contain brightness-0 invert")} />
            </div>
            {showLabel ? (
                <div className="min-w-0 flex flex-col justify-center">
                    <div className="flex min-w-0 items-center gap-1">
                        <p className="truncate text-[9px] font-bold uppercase tracking-[0.25em] text-primary leading-tight">
                            Loomsnack
                        </p>
                        <AppVersionBadge className="shrink-0 border-0 bg-transparent p-0 text-[9px] uppercase tracking-[0.12em]" />
                    </div>
                    <p className={cn("truncate font-display font-semibold tracking-tight leading-tight mt-0.5", titleClass, titleToneClass)}>
                        Ganatri Console
                    </p>
                </div>
            ) : null}
        </>
    );
};

export default ConsoleBrand;
