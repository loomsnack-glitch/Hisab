const AppLoader = ({ label = "Loading Hisab..." }: { label?: string }) => {
    return (
        <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_35%),linear-gradient(180deg,_#fffaf0,_#fff)] px-6">
            <div className="rounded-3xl border border-amber-100 bg-white/90 px-8 py-6 text-center shadow-[0_24px_80px_rgba(120,53,15,0.12)] backdrop-blur">
                <div className="mx-auto mb-4 h-3 w-24 overflow-hidden rounded-full bg-amber-100">
                    <div className="h-full w-1/2 animate-pulse rounded-full bg-amber-500" />
                </div>
                <p className="text-sm font-medium text-slate-600">{label}</p>
            </div>
        </div>
    );
};

export default AppLoader;
