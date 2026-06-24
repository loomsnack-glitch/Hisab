import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import logo from "@repo/assets/logo.png";

type AuthShellProps = {
    title: string;
    subtitle: string;
    children: ReactNode;
};

const AuthShell = ({ title, subtitle, children }: AuthShellProps) => {
    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(251,191,36,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(15,118,110,0.12),_transparent_30%),linear-gradient(180deg,_#fffdf7,_#fff7ed)] px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto grid min-h-[calc(100vh-4rem)] max-w-6xl overflow-hidden rounded-[2rem] border border-amber-100 bg-white shadow-[0_30px_100px_rgba(120,53,15,0.16)] lg:grid-cols-[1.05fr_0.95fr]">
                <div className="relative hidden overflow-hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.22),_transparent_35%),radial-gradient(circle_at_bottom_left,_rgba(20,184,166,0.24),_transparent_30%)]" />
                    <div className="relative z-10 flex items-center gap-3">
                        <img src={logo} alt="Hisab" className="h-11 w-11 rounded-2xl bg-white/10 p-2" />
                        <div>
                            <p className="text-xs uppercase tracking-[0.28em] text-amber-300">Loomsnack</p>
                            <h1 className="text-2xl font-semibold tracking-tight">Hisab</h1>
                        </div>
                    </div>

                    <div className="relative z-10 space-y-8">
                        <div className="space-y-3">
                            <p className="inline-flex rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.24em] text-amber-200">
                                Storefront Access
                            </p>
                            <h2 className="max-w-md text-4xl font-semibold leading-tight">
                                Register fast, verify by WhatsApp, and get into the app in one flow.
                            </h2>
                            <p className="max-w-lg text-sm leading-7 text-slate-300">
                                This starter auth experience keeps things simple for Hisab: phone-first onboarding,
                                password login, OTP fallback, and a clean dashboard once the session is ready.
                            </p>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Register</p>
                                <p className="mt-2 text-sm text-slate-200">Salutation, first name, last name, phone, optional email, and password.</p>
                            </div>
                            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Verify</p>
                                <p className="mt-2 text-sm text-slate-200">OTP is sent with the existing WhatsApp service and verified before account creation.</p>
                            </div>
                        </div>
                    </div>

                    <p className="relative z-10 text-xs text-slate-400">
                        Secure cookies keep the session active after registration or login.
                    </p>
                </div>

                <div className="flex items-center justify-center p-6 sm:p-10 lg:p-12">
                    <div className="w-full max-w-xl">
                        <div className="mb-10 lg:hidden">
                            <Link to="/" className="inline-flex items-center gap-3">
                                <img src={logo} alt="Hisab" className="h-11 w-11 rounded-2xl border border-amber-100 bg-amber-50 p-2" />
                                <div>
                                    <p className="text-xs uppercase tracking-[0.28em] text-amber-600">Loomsnack</p>
                                    <p className="text-xl font-semibold tracking-tight text-slate-900">Hisab</p>
                                </div>
                            </Link>
                        </div>

                        <div className="mb-8 space-y-2">
                            <h2 className="text-3xl font-semibold tracking-tight text-slate-950">{title}</h2>
                            <p className="text-sm leading-6 text-slate-600">{subtitle}</p>
                        </div>

                        {children}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AuthShell;
