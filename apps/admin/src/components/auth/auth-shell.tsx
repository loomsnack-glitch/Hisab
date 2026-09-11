import { useState, useEffect, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import logo from "@repo/assets/logo.png";
import authArtLight from "@repo/assets/ganatri-auth-art-light.jpg";
import authArtDark from "@repo/assets/ganatri-auth-art-dark.jpg";
import authBannerLight from "@repo/assets/ganatri-auth-banner-light.jpg";
import authBannerDark from "@repo/assets/ganatri-auth-banner-dark.jpg";
import "./auth.css";

type AuthShellProps = {
    title?: string;
    subtitle?: string;
    /** Optional step indicator like "Step 1 of 4" */
    stepLabel?: string;
    currentStep?: number;
    totalSteps?: number;
    showFooter?: boolean;
    children: ReactNode;
};

const AuthShell = ({ 
    title, 
    subtitle, 
    stepLabel, 
    currentStep, 
    totalSteps, 
    showFooter = false,
    children 
}: AuthShellProps) => {
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // iOS Safari Keyboard dismissal & Scroll position reset
    useEffect(() => {
        const resetScroll = () => {
            window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
            if (document.documentElement) {
                document.documentElement.scrollTop = 0;
            }
            if (document.body) {
                document.body.scrollTop = 0;
            }
        };

        const handleFocusOut = (e: FocusEvent) => {
            // Check if focus moved to another input field
            const nextTarget = e.relatedTarget as HTMLElement | null;
            if (
                nextTarget &&
                (nextTarget.tagName === "INPUT" ||
                 nextTarget.tagName === "TEXTAREA" ||
                 nextTarget.tagName === "SELECT" ||
                 nextTarget.isContentEditable)
            ) {
                return;
            }

            // When focus leaves all inputs (clicking outside), dismiss keyboard & restore scroll position
            setTimeout(resetScroll, 60);
            setTimeout(resetScroll, 220);
        };

        const handleViewportChange = () => {
            const active = document.activeElement;
            const isInputFocused =
                active &&
                (active.tagName === "INPUT" ||
                 active.tagName === "TEXTAREA" ||
                 active.tagName === "SELECT");

            if (!isInputFocused) {
                resetScroll();
            }
        };

        document.addEventListener("focusout", handleFocusOut);
        if (window.visualViewport) {
            window.visualViewport.addEventListener("resize", handleViewportChange);
        }

        return () => {
            document.removeEventListener("focusout", handleFocusOut);
            if (window.visualViewport) {
                window.visualViewport.removeEventListener("resize", handleViewportChange);
            }
        };
    }, []);

    const toggleTheme = () => {
        setTheme(resolvedTheme === "dark" ? "light" : "dark");
    };

    // When tapping on non-interactive areas (outside fields), blur the active input to close the keyboard
    const handleContainerPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
        const target = e.target as HTMLElement | null;
        const isInteractive = target?.closest(
            'input, textarea, select, button, a, [role="button"], [role="tab"], [tabindex]:not([tabindex="-1"])'
        );
        if (!isInteractive && document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
    };

    return (
        <div 
            tabIndex={-1}
            onPointerDown={handleContainerPointerDown}
            className="min-h-dvh w-full bg-background text-foreground flex flex-col justify-center sm:justify-between items-center p-2.5 sm:p-6 lg:p-8 relative selection:bg-primary/20 selection:text-primary overflow-x-hidden outline-none"
        >
            {/* Ambient background glows */}
            <div 
                className="absolute -top-32 -left-32 size-[420px] rounded-full bg-primary/10 blur-[100px] pointer-events-none transition-colors duration-500" 
                aria-hidden="true" 
            />
            <div 
                className="absolute -bottom-32 -right-32 size-[420px] rounded-full bg-primary/5 blur-[100px] pointer-events-none transition-colors duration-500" 
                aria-hidden="true" 
            />

            {/* ── Main Unified Card (1 SINGLE BOX with smooth hardware-accelerated entrance) ── */}
            <div className="auth-card-enter auth-card-container relative w-full max-w-5xl rounded-2xl sm:rounded-[36px] bg-card border border-border/70 shadow-2xl shadow-primary/5 p-4 sm:p-8 lg:p-10 my-auto z-10">
                
                {/* ── Top Hero Banner for Mobile & iPad (Full-bleed 16:9 illustration like user's reference) ── */}
                <div className="auth-mobile-hero-banner hidden relative w-full h-[155px] sm:h-[230px] md:h-[270px] overflow-hidden select-none">
                    {/* Background Illustration with crossfade */}
                    <img
                        src={authBannerLight}
                        alt="Ganatri POS Retail Cashier & Billing Terminal Banner"
                        className={`absolute inset-0 w-full h-full object-cover object-center transition-all duration-300 ${
                            mounted && resolvedTheme === "dark"
                                ? "opacity-0 scale-[0.99]"
                                : "opacity-100 scale-100"
                        }`}
                    />
                    <img
                        src={authBannerDark}
                        alt="Ganatri POS Retail Cashier & Billing Terminal Dark Banner"
                        className={`absolute inset-0 w-full h-full object-cover object-center transition-all duration-300 ${
                            mounted && resolvedTheme === "dark"
                                ? "opacity-100 scale-100"
                                : "opacity-0 scale-[0.99]"
                        }`}
                    />
                    
                    {/* Subtle bottom gradient fade into the card content */}
                    <div className="absolute inset-x-0 bottom-0 h-14 sm:h-20 bg-gradient-to-t from-card via-card/50 to-transparent pointer-events-none" />

                    {/* Top-Right floating controls over the hero banner (No top-left logo, cleanly placed on top of welcome text instead) */}
                    <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 flex items-center gap-2">
                        <Link
                            to="/"
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/85 backdrop-blur-md hover:bg-background border border-border/50 text-xs font-medium text-foreground transition-all group shadow-xs"
                        >
                            <ArrowLeft className="size-3.5 transition-transform group-hover:-translate-x-0.5" />
                            <span className="hidden sm:inline">Back to website</span>
                        </Link>
                        {mounted && (
                            <button
                                type="button"
                                onClick={toggleTheme}
                                aria-label="Toggle light and dark mode"
                                className="size-8 rounded-full bg-background/85 backdrop-blur-md hover:bg-background border border-border/50 flex items-center justify-center text-foreground shadow-xs transition-all cursor-pointer group"
                            >
                                {resolvedTheme === "dark" ? (
                                    <Sun className="size-3.5 text-amber-400" />
                                ) : (
                                    <Moon className="size-3.5 text-slate-700" />
                                )}
                            </button>
                        )}
                    </div>
                </div>

                {/* ── Desktop Corner Controls: Back link and Dark/Light Mode toggle in the corner of the card ── */}
                <div className="auth-desktop-corner-controls absolute top-4 right-4 sm:top-5 sm:right-5 z-20 flex items-center gap-2">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-muted/50 hover:bg-muted active:scale-95 border border-border/60 text-xs font-medium text-muted-foreground hover:text-foreground transition-all duration-200 group shadow-2xs"
                    >
                        <ArrowLeft className="size-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
                        <span className="hidden sm:inline">Back to website</span>
                    </Link>

                    {mounted && (
                        <button
                            type="button"
                            onClick={toggleTheme}
                            aria-label="Toggle light and dark mode"
                            title={resolvedTheme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
                            className="size-8 sm:size-9 rounded-full bg-muted/50 hover:bg-muted active:scale-90 border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground shadow-2xs transition-all duration-200 cursor-pointer group"
                        >
                            {resolvedTheme === "dark" ? (
                                <Sun className="size-4 text-amber-400 transition-transform duration-300 group-hover:rotate-45" />
                            ) : (
                                <Moon className="size-4 text-slate-600 transition-transform duration-300 group-hover:-rotate-12" />
                            )}
                        </button>
                    )}
                </div>

                {/* ── Content Grid: Left Illustration + Right Form ── */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
                    
                    {/* ── Desktop Left Column: 3D Character & Billing POS Illustration with smooth crossfade ── */}
                    <div className="auth-desktop-side-art hidden lg:flex lg:col-span-6 h-full flex-col justify-center items-center select-none py-1 px-2 xl:px-4">
                        <div className="relative w-full max-w-[430px] xl:max-w-[460px] flex items-center justify-center">
                            <img
                                src={authArtLight}
                                alt="Ganatri POS Retail Cashier & Billing Terminal"
                                className={`w-full h-auto max-h-[580px] xl:max-h-[620px] rounded-3xl object-contain shadow-lg shadow-primary/10 transition-all duration-300 ease-out hover:scale-[1.01] ${
                                    mounted && resolvedTheme === "dark"
                                        ? "opacity-0 absolute pointer-events-none scale-[0.99]"
                                        : "opacity-100 relative scale-100"
                                }`}
                            />
                            <img
                                src={authArtDark}
                                alt="Ganatri POS Retail Cashier & Billing Terminal Dark"
                                className={`w-full h-auto max-h-[580px] xl:max-h-[620px] rounded-3xl object-contain shadow-lg shadow-primary/10 transition-all duration-300 ease-out hover:scale-[1.01] ${
                                    mounted && resolvedTheme === "dark"
                                        ? "opacity-100 relative scale-100"
                                        : "opacity-0 absolute pointer-events-none scale-[0.99]"
                                }`}
                            />
                        </div>
                    </div>

                    {/* ── Right Column: Clean & Attractive Auth Form ── */}
                    <div className="auth-form-column lg:col-span-6 flex flex-col justify-center pr-0 lg:pr-4 pt-1 sm:pt-4 lg:pt-0">
                        <div className="auth-card-content">
                            {title ? (
                                <>
                                    {/* Brand Logo & Title on top of the Welcome text */}
                                    <div className="flex items-center gap-2.5 mb-3 sm:mb-3.5">
                                        <div className="size-8 sm:size-9 rounded-xl bg-card border border-border/80 shadow-xs flex items-center justify-center p-1.5 transition-transform duration-200 hover:scale-105">
                                            <img src={logo} alt="Ganatri Logo" className="size-full object-contain" />
                                        </div>
                                        <span className="font-display text-lg font-bold tracking-tight text-foreground">
                                            Ganatri
                                        </span>
                                    </div>

                                    {/* Header & Subtitle */}
                                    <div className="space-y-1 mb-4 sm:mb-6">
                                        {stepLabel && (
                                            <div className="flex items-center justify-between mb-1.5">
                                                <span className="text-[11px] font-semibold text-primary uppercase tracking-wider">
                                                    {stepLabel}
                                                </span>
                                                {currentStep && totalSteps && (
                                                    <div className="flex items-center gap-1">
                                                        {Array.from({ length: totalSteps }, (_, i) => (
                                                            <span
                                                                key={i}
                                                                className={`h-1.5 rounded-full transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                                                                    i + 1 <= currentStep
                                                                        ? "w-5 bg-primary shadow-xs shadow-primary/30"
                                                                        : "w-1.5 bg-muted"
                                                                }`}
                                                            />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
                                            {title}
                                        </h2>
                                        {subtitle && (
                                            <p className="text-xs sm:text-sm text-muted-foreground">
                                                {subtitle}
                                            </p>
                                        )}
                                    </div>
                                </>
                            ) : (
                                /* Prominent Brand Logo Lockup replacing the Welcome back text */
                                <div className="flex items-center gap-3.5 mb-4 sm:mb-6">
                                    <div className="size-11 sm:size-12 rounded-2xl bg-card border border-border/80 shadow-md shadow-primary/10 flex items-center justify-center p-2 transition-transform duration-200 hover:scale-105">
                                        <img src={logo} alt="Ganatri Logo" className="size-full object-contain" />
                                    </div>
                                    <span className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground">
                                        Ganatri
                                    </span>
                                </div>
                            )}

                            {/* Form Body */}
                            <div>
                                {children}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Page Footer ── */}
            {showFooter && (
                <div className="hidden sm:block w-full max-w-5xl py-2 text-center text-[11px] text-muted-foreground z-10">
                    © {new Date().getFullYear()} Loomsnack Technologies • Ganatri Retail Command Center
                </div>
            )}
        </div>
    );
};

export default AuthShell;
