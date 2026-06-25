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
        <div className="relative min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
            <div className="absolute right-4 top-4 z-20 sm:right-6 lg:right-8">
                <ThemeToggle />
            </div>

            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute inset-0 bg-secondary/40" />
                <div className="grid-bg absolute inset-0 opacity-30 dark:opacity-15" />
            </div>

            <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl overflow-hidden rounded-[2rem] border border-border/70 bg-card shadow-lg lg:grid-cols-[1.05fr_0.95fr]">
                <div className="relative hidden overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
                    <div className="auth-panel-pattern absolute inset-0" />

                    <div className="relative z-10 flex animate-in fade-in slide-in-from-left-4 items-center gap-3 duration-700">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 transition-transform duration-300 hover:scale-105">
                            <img src={logo} alt="Ganatri" className="h-7 w-7 object-contain brightness-0 invert" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary-foreground/70">Loomsnack</p>
                            <h1 className="font-display text-2xl font-semibold tracking-tight">Ganatri</h1>
                        </div>
                    </div>

                    <div className="relative z-10 animate-in fade-in slide-in-from-left-6 space-y-8 duration-700 delay-150 fill-mode-both">
                        <Badge variant="outline" className="rounded-full border-white/20 bg-white/10 text-primary-foreground">
                            Retail command center
                        </Badge>
                        <div className="space-y-4">
                            <h2 className="max-w-xl font-display text-5xl font-semibold leading-tight">
                                A cleaner SaaS experience for stores, staff, and device onboarding.
                            </h2>
                            <p className="max-w-lg text-sm leading-7 text-primary-foreground/80">
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
                                        className="auth-feature-card rounded-3xl border border-white/15 bg-white/10 p-4 transition-colors duration-300 hover:bg-white/15"
                                    >
                                        <div className="auth-feature-icon flex h-10 w-10 items-center justify-center rounded-2xl bg-white/15">
                                            <Icon className="size-4" />
                                        </div>
                                        <p className="mt-4 font-medium">{item.title}</p>
                                        <p className="mt-2 text-sm leading-6 text-primary-foreground/75">{item.description}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="relative z-10 flex animate-in fade-in items-center gap-2 text-sm text-primary-foreground/75 duration-700 delay-300 fill-mode-both">
                        <Sparkles className="auth-feature-icon size-4" />
                        Session UX focus is active for this build.
                    </div>
                </div>

                <div className="flex items-center justify-center p-6 sm:p-10 lg:p-12">
                    <div className="w-full max-w-xl animate-in fade-in slide-in-from-bottom-4 duration-700 fill-mode-both">
                        <div className="mb-10 flex items-center justify-between lg:hidden">
                            <Link to="/" className="inline-flex items-center gap-3 transition-opacity duration-200 hover:opacity-90">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary">
                                    <img src={logo} alt="Ganatri" className="h-7 w-7 object-contain brightness-0 invert" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary">Loomsnack</p>
                                    <p className="font-display text-2xl font-semibold tracking-tight text-foreground">Ganatri</p>
                                </div>
                            </Link>
                            <Badge variant="secondary" className="rounded-full">
                                Auth flow
                            </Badge>
                        </div>

                        <div className="mb-8 space-y-3">
                            <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground">{title}</h2>
                            <p className="text-sm leading-7 text-muted-foreground">{subtitle}</p>
                        </div>

                        {children}

                        <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
                            <ArrowRight className="auth-feature-icon size-4 text-primary" />
                            Secure cookies keep your authenticated workspace session ready after verification.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthShell;
