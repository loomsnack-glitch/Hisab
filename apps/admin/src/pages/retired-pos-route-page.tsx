export const RETIRED_POS_ROUTE_TITLE = "This POS address is unavailable";
export const RETIRED_POS_ROUTE_MESSAGE =
    "Ganatri POS is a separate application. This Admin URL no longer opens Device Login or the POS workspace.";

const RetiredPosRoutePage = () => {
    return (
        <main
            data-testid="retired-pos-route"
            className="flex min-h-screen items-center justify-center bg-background px-6 py-16"
        >
            <div className="max-w-lg space-y-3 text-center">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">{RETIRED_POS_ROUTE_TITLE}</h1>
                <p className="text-sm leading-relaxed text-muted-foreground">{RETIRED_POS_ROUTE_MESSAGE}</p>
            </div>
        </main>
    );
};

export default RetiredPosRoutePage;
