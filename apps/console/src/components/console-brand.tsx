import logo from "@repo/assets/logo.png";

type ConsoleBrandProps = {
    showLabel?: boolean;
};

const ConsoleBrand = ({ showLabel = true }: ConsoleBrandProps) => (
    <>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-gradient-to-br from-primary to-primary/80 shadow-sm shadow-primary/20">
            <img src={logo} alt="Ganatri" className="h-5 w-5 object-contain brightness-0 invert" />
        </div>
        {showLabel ? (
            <div className="min-w-0 flex flex-col justify-center">
                <p className="truncate text-[9px] font-bold uppercase tracking-[0.25em] text-primary leading-tight">
                    Ganatri internal
                </p>
                <p className="truncate font-display text-[15px] font-semibold tracking-tight text-foreground leading-tight mt-0.5">
                    Ganatri Console
                </p>
            </div>
        ) : null}
    </>
);

export default ConsoleBrand;
