import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MessageSquareText, ShieldCheck, Sparkles } from "lucide-react";
import logo from "@repo/assets/logo.png";
import { Badge } from "@repo/ui/components/badge";

type AuthShellProps = {
    title: string;
    subtitle: string;
    children: ReactNode;
};

const AuthShell = ({ title, subtitle, children }: AuthShellProps) => {
    return (
        <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.16),_transparent_26%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.12),_transparent_28%),linear-gradient(180deg,_transparent,_rgba(148,163,184,0.06))]" />
                <div className="grid-bg absolute inset-0 opacity-40 dark:opacity-20" />
            </div>

            <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-7xl overflow-hidden rounded-[2rem] border border-border/60 bg-card/80 shadow-[0_32px_120px_rgba(15,23,42,0.12)] backdrop-blur lg:grid-cols-[1.05fr_0.95fr]">
                <div className="relative hidden overflow-hidden border-r border-border/60 bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between dark:bg-slate-900">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.20),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(16,185,129,0.18),_transparent_26%)]" />

                    <div className="relative z-10 flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 shadow-lg shadow-black/20">
                            <img src={logo} alt="Ganatri" className="h-7 w-7 object-contain brightness-0 invert" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-amber-300">Loomsnack</p>
                            <h1 className="font-display text-2xl font-semibold tracking-tight">Ganatri</h1>
                        </div>
                    </div>

                    <div className="relative z-10 space-y-8">
                        <Badge variant="outline" className="rounded-full border-white/15 bg-white/5 text-amber-200">
                            Retail command center
                        </Badge>
                        <div className="space-y-4">
                            <h2 className="max-w-xl font-display text-5xl font-semibold leading-tight">
                                A cleaner SaaS experience for stores, staff, and device onboarding.
                            </h2>
                            <p className="max-w-lg text-sm leading-7 text-slate-300">
                                Phone-first access, WhatsApp OTP fallback, and a workspace designed to feel intentional
                                from the first screen to the last setup step.
                            </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            {[
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
                            ].map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div key={item.title} className="rounded-3xl border border-white/10 bg-white/5 p-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">
                                            <Icon className="size-4" />
                                        </div>
                                        <p className="mt-4 font-medium">{item.title}</p>
                                        <p className="mt-2 text-sm leading-6 text-slate-300">{item.description}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="relative z-10 flex items-center gap-2 text-sm text-slate-300">
                        <Sparkles className="size-4 text-amber-300" />
                        Session UX focus is active for this build.
                    </div>
                </div>

                <div className="flex items-center justify-center p-6 sm:p-10 lg:p-12">
                    <div className="w-full max-w-xl">
                        <div className="mb-10 flex items-center justify-between lg:hidden">
                            <Link to="/" className="inline-flex items-center gap-3">
                                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary via-amber-400 to-orange-500">
                                    <img src={logo} alt="Ganatri" className="h-7 w-7 object-contain brightness-0 invert" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase tracking-[0.28em] text-primary/80">Loomsnack</p>
                                    <p className="font-display text-2xl font-semibold tracking-tight text-foreground">Ganatri</p>
                                </div>
                            </Link>
                            <Badge variant="outline" className="rounded-full">
                                Auth flow
                            </Badge>
                        </div>

                        <div className="mb-8 space-y-3">
                            <h2 className="font-display text-3xl font-semibold tracking-tight text-foreground">{title}</h2>
                            <p className="text-sm leading-7 text-muted-foreground">{subtitle}</p>
                        </div>

                        {children}

                        <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
                            <ArrowRight className="size-4 text-primary" />
                            Secure cookies keep your authenticated workspace session ready after verification.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthShell;
