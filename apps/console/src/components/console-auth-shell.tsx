import type { ReactNode } from "react";
import { ArrowRight, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import logo from "@repo/assets/logo.png";
import { Badge } from "@repo/ui/components/badge";

import ThemeToggle from "@/components/theme-toggle";

type ConsoleAuthShellProps = {
    title: string;
    subtitle: string;
    children: ReactNode;
};

const featureItems = [
    {
        icon: LockKeyhole,
        title: "Isolated access",
        description: "Owner User sessions stay separate from customer administration and Store Device sign-in.",
    },
    {
        icon: ShieldCheck,
        title: "Active verification",
        description: "Active status is checked on every Console request before platform data is returned.",
    },
] as const;

const ConsoleAuthShell = ({ title, subtitle, children }: ConsoleAuthShellProps) => {
    return (
        <div className="relative min-h-[100dvh] w-full bg-background flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8">
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute inset-0 bg-secondary/10 dark:bg-secondary/5" />
                <div className="grid-bg absolute inset-0 opacity-20 dark:opacity-10" />
            </div>

            <div className="w-full max-w-md lg:max-w-7xl lg:rounded-3xl lg:border lg:border-border/70 lg:bg-card lg:shadow-2xl grid lg:grid-cols-[1.05fr_0.95fr] overflow-hidden">
                <div className="relative hidden overflow-hidden bg-slate-950 p-10 text-slate-100 lg:flex lg:flex-col lg:justify-between border-r border-border/10">
                    <div className="absolute -left-20 -top-20 w-80 h-80 rounded-full bg-primary/15 blur-[100px] pointer-events-none" />
                    <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
                    <div className="absolute left-1/4 top-1/3 w-80 h-80 rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

                    <div className="auth-panel-pattern absolute inset-0 opacity-20" />

                    <div className="relative z-10 flex items-center justify-between">
                        <div className="flex animate-in fade-in slide-in-from-left-4 items-center gap-3 duration-700">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/20">
                                <img src={logo} alt="Ganatri" className="h-7 w-7 object-contain brightness-0 invert" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Ganatri internal</p>
                                <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-50">Ganatri Console</h1>
                            </div>
                        </div>
                        <ThemeToggle />
                    </div>

                    <div className="relative z-10 animate-in fade-in slide-in-from-left-6 space-y-8 duration-700 delay-150 fill-mode-both">
                        <Badge variant="outline" className="rounded-full border-white/10 bg-white/5 text-slate-300 w-fit px-4 py-1.5 backdrop-blur-sm">
                            Platform operations
                        </Badge>
                        <div className="space-y-4">
                            <h2 className="max-w-xl font-display text-4xl xl:text-5xl font-semibold leading-tight tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-50 via-slate-100 to-slate-300">
                                A separate doorway for platform oversight.
                            </h2>
                            <p className="max-w-lg text-sm leading-7 text-slate-300/80">
                                Monitor adoption, manage Console Users, and review organization health from an
                                isolated owner workspace.
                            </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            {featureItems.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div
                                        key={item.title}
                                        className="auth-feature-card rounded-[2rem] border border-white/10 bg-white/5 p-5 transition-all duration-300 hover:bg-white/10 hover:border-white/20 hover:shadow-lg hover:shadow-black/20"
                                    >
                                        <div className="auth-feature-icon flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 border border-white/10 text-primary">
                                            <Icon className="size-4" />
                                        </div>
                                        <p className="mt-4 font-semibold text-slate-200">{item.title}</p>
                                        <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="relative z-10 flex animate-in fade-in items-center gap-2 text-sm text-slate-400 duration-700 delay-300 fill-mode-both">
                        <Sparkles className="auth-feature-icon size-4 text-primary animate-spin" style={{ animationDuration: "4s" }} />
                        Console access is verified on every request.
                    </div>
                </div>

                <div className="flex flex-col justify-center p-0 lg:p-8 w-full">
                    <div className="w-full max-w-md mx-auto py-2">
                        <div className="flex items-center justify-between lg:hidden mb-4">
                            <div className="inline-flex items-center gap-2.5">
                                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                                    <img src={logo} alt="Ganatri" className="h-5.5 w-5.5 object-contain brightness-0 invert" />
                                </div>
                                <div>
                                    <p className="text-[9px] font-bold uppercase tracking-[0.25em] text-primary">Ganatri internal</p>
                                    <p className="font-display text-lg font-bold tracking-tight text-foreground">Ganatri Console</p>
                                </div>
                            </div>
                            <ThemeToggle />
                        </div>

                        <div className="mb-3 space-y-1">
                            <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">{title}</h2>
                            <p className="text-xs text-muted-foreground leading-relaxed">{subtitle}</p>
                        </div>

                        <div className="my-auto">{children}</div>

                        <div className="mt-3 flex items-center justify-center gap-1.5 text-xs text-muted-foreground border-t border-border/40 pt-2.5">
                            <ArrowRight className="size-3 shrink-0 text-primary" />
                            <span>Secure cookies keep your Console session ready.</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConsoleAuthShell;
