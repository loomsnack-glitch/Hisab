import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MessageSquareText, ShieldCheck, Sparkles } from "lucide-react";
import logo from "@repo/assets/logo.png";
import { Badge } from "@repo/ui/components/badge";

import ThemeToggle from "@/components/dashboard/theme-toggle";

type AuthShellProps = {
    title: string;
    subtitle: string;
    children: ReactNode;
};

const featureItems = [
    {
        icon: MessageSquareText,
        title: "Fast verification",
        description: "Use WhatsApp OTP when password entry is inconvenient on the move.",
    },
    {
        icon: ShieldCheck,
        title: "Operational clarity",
        description: "Move from sign-in into a structured workspace for organizations and devices.",
    },
] as const;

const AuthShell = ({ title, subtitle, children }: AuthShellProps) => {
    return (
        <div className="relative h-screen w-screen bg-background overflow-hidden flex items-center justify-center p-4 sm:p-6 lg:p-8">
            <div className="absolute right-4 top-4 z-20 sm:right-6 lg:right-8">
                <ThemeToggle />
            </div>

            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute inset-0 bg-secondary/10 dark:bg-secondary/5" />
                <div className="grid-bg absolute inset-0 opacity-20 dark:opacity-10" />
            </div>

            <div className="w-full h-full max-w-7xl overflow-hidden rounded-[2.5rem] border border-border/70 bg-card shadow-2xl grid lg:grid-cols-[1.05fr_0.95fr]">
                {/* Left Panel - Hidden on small screens, premium gradient and glows on large screens */}
                <div className="relative hidden overflow-hidden bg-slate-950 p-10 text-slate-100 lg:flex lg:flex-col lg:justify-between border-r border-border/10">
                    <div className="absolute -left-20 -top-20 w-80 h-80 rounded-full bg-primary/15 blur-[100px] pointer-events-none" />
                    <div className="absolute -right-20 -bottom-20 w-96 h-96 rounded-full bg-primary/10 blur-[100px] pointer-events-none" />
                    <div className="absolute left-1/4 top-1/3 w-80 h-80 rounded-full bg-primary/5 blur-[100px] pointer-events-none" />
                    
                    <div className="auth-panel-pattern absolute inset-0 opacity-20" />

                    <div className="relative z-10 flex animate-in fade-in slide-in-from-left-4 items-center gap-3 duration-700">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 transition-transform duration-300 hover:scale-105 shadow-md shadow-primary/20">
                            <img src={logo} alt="Ganatri" className="h-7 w-7 object-contain brightness-0 invert" />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-primary">Loomsnack</p>
                            <h1 className="font-display text-2xl font-semibold tracking-tight text-slate-50 animate-pulse">Ganatri</h1>
                        </div>
                    </div>

                    <div className="relative z-10 animate-in fade-in slide-in-from-left-6 space-y-8 duration-700 delay-150 fill-mode-both">
                        <Badge variant="outline" className="rounded-full border-white/10 bg-white/5 text-slate-300 w-fit px-4 py-1.5 backdrop-blur-sm">
                            Retail command center
                        </Badge>
                        <div className="space-y-4">
                            <h2 className="max-w-xl font-display text-4xl xl:text-5xl font-semibold leading-tight tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-slate-50 via-slate-100 to-slate-300">
                                A cleaner SaaS experience for stores, staff, and device onboarding.
                            </h2>
                            <p className="max-w-lg text-sm leading-7 text-slate-300/80">
                                Phone-first access, WhatsApp OTP fallback, and a workspace designed to feel intentional
                                from the first screen to the last setup step.
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
                        <Sparkles className="auth-feature-icon size-4 text-primary animate-spin" style={{ animationDuration: '4s' }} />
                        Session UX focus is active for this build.
                    </div>
                </div>

                {/* Right Panel - Fits perfectly on one page without scrollbars */}
                <div className="flex flex-col justify-center p-4 sm:p-6 lg:p-8 h-full overflow-hidden">
                    <div className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both py-2">
                        <div className="mb-6 flex items-center justify-between lg:hidden">
                            <Link to="/" className="inline-flex items-center gap-3 transition-opacity duration-200 hover:opacity-90">
                                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80">
                                    <img src={logo} alt="Ganatri" className="h-6 w-6 object-contain brightness-0 invert" />
                                </div>
                                <div>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-primary">Loomsnack</p>
                                    <p className="font-display text-xl font-semibold tracking-tight text-foreground">Ganatri</p>
                                </div>
                            </Link>
                            <Badge variant="secondary" className="rounded-full text-xs">
                                Auth flow
                            </Badge>
                        </div>

                        <div className="mb-5 space-y-1.5">
                            <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
                            <p className="text-xs leading-5 text-muted-foreground">{subtitle}</p>
                        </div>

                        {children}

                        <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground border-t border-border/40 pt-4">
                            <ArrowRight className="auth-feature-icon size-3.5 text-primary" />
                            Secure cookies keep your authenticated workspace session ready after verification.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthShell;
