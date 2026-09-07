import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, Controller, type SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { ArrowLeft, KeyRound, MonitorSmartphone, RotateCcw } from "lucide-react";
import whatsAppIcon from "@repo/assets/services/whatsapp.webp";
import { userLogin } from "@repo/services";
import { LoginFormSchema, formatPhoneDisplay, type LoginFormJSON } from "@repo/types";
import { Button } from "@repo/ui/components/button";
import { Field, FieldContent, FieldError, FieldLabel } from "@repo/ui/components/field";
import { PasswordInput } from "@repo/ui/components/password-input";
import { Spinner } from "@repo/ui/components/spinner";

import AuthShell from "@/components/auth/auth-shell";
import OtpField from "@/components/auth/otp-field";
import PhoneNumberField from "@/components/auth/phone-number-field";
import { getPosLoginUrl } from "@/lib/pos-origin";
import { authKeys } from "@/lib/query-keys";
import { useAuthActions } from "@/store/auth.store";

const defaultValues: LoginFormJSON = {
    requestType: "otp-info",
    phone: "",
    password: "",
};

const LoginPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { setUser } = useAuthActions();
    const [method, setMethod] = useState<"password" | "otp">("otp");
    const [cooldown, setCooldown] = useState(0);

    const form = useForm<LoginFormJSON>({
        resolver: zodResolver(LoginFormSchema),
        defaultValues,
    });
    const requestType = useWatch({ control: form.control, name: "requestType" });
    const otp = useWatch({ control: form.control, name: "otp" });

    const loginMutation = useMutation({
        mutationFn: userLogin,
        onSuccess: (response, variables) => {
            if (response.status === "success" && response.data?.nextRequestType === "otp-verification") {
                form.setValue("requestType", "otp-verification");
                form.setValue("otp", "");
                setCooldown(30);
                toast.success(response.message);
                return;
            }

            if (response.status === "success" && response.data?.user) {
                setUser(response.data.user);
                queryClient.setQueryData(authKeys.me, response);
                toast.success(response.message);
                navigate("/", { replace: true });
                return;
            }

            if (variables.requestType === "otp-info") {
                toast.success(response.message);
            }
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Login failed");
        },
    });

    useEffect(() => {
        if (cooldown <= 0) return undefined;
        const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [cooldown]);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            form.setFocus("phone");
            const phoneInput = (document.querySelector('input[type="tel"]') ?? document.getElementById("phone")) as HTMLInputElement | null;
            phoneInput?.focus();
        }, 80);
        return () => window.clearTimeout(timer);
    }, [form]);

    const submitForm: SubmitHandler<LoginFormJSON> = (values) => {
        if (method === "otp") {
            startOtpFlow();
            return;
        }
        loginMutation.mutate(values);
    };

    const startOtpFlow = async () => {
        const isPhoneValid = await form.trigger("phone");
        if (!isPhoneValid) {
            return;
        }

        const values = form.getValues();
        loginMutation.mutate({
            phone: values.phone,
            requestType: "otp-info",
        });
    };

    const backToOtpStart = () => {
        form.setValue("requestType", "otp-info");
        form.setValue("otp", "");
        setCooldown(0);
    };

    /* ── OTP verification view ── */
    if (requestType === "otp-verification") {
        return (
            <AuthShell
                title="Enter code"
                subtitle={`We sent a 6-digit code to WhatsApp at ${formatPhoneDisplay(form.getValues("phone"))}.`}
            >
                <form className="auth-tab-enter space-y-5 pt-2" onSubmit={form.handleSubmit(submitForm)}>
                    <OtpField key="otp-verification" control={form.control} name="otp" />

                    <Button
                        type="submit"
                        className="h-11 sm:h-12 w-full rounded-2xl text-sm sm:text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/20 active:scale-[0.98] transition-all duration-150 cursor-pointer"
                        disabled={loginMutation.isPending || otp?.length !== 6}
                    >
                        {loginMutation.isPending ? (
                            <span className="flex items-center justify-center gap-2">
                                <Spinner className="size-4" />
                                Verifying…
                            </span>
                        ) : (
                            "Verify & Sign in"
                        )}
                    </Button>

                    <div className="flex flex-col items-center gap-2.5 pt-1 text-xs text-muted-foreground">
                        {cooldown > 0 ? (
                            <span>
                                Resend code in <strong className="text-foreground">{String(cooldown).padStart(2, "0")}s</strong>
                            </span>
                        ) : (
                            <button
                                type="button"
                                onClick={startOtpFlow}
                                className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline active:scale-95 transition-transform duration-150 cursor-pointer"
                            >
                                <RotateCcw className="size-3" />
                                Resend verification code
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={backToOtpStart}
                            className="inline-flex items-center gap-1 hover:text-foreground active:scale-95 transition-all duration-150 cursor-pointer"
                        >
                            <ArrowLeft className="size-3" />
                            Use different phone number
                        </button>
                    </div>
                </form>
            </AuthShell>
        );
    }

    /* ── Main login view (Smooth Sliding Pill & Instantaneous Transitions) ── */
    return (
        <AuthShell>
            {/* Sliding Pill Method Switcher */}
            <div className="relative grid grid-cols-2 p-1 bg-muted/60 rounded-2xl border border-border/50 mb-3.5 sm:mb-5 select-none">
                {/* Animated sliding background indicator */}
                <div
                    className="absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-xl bg-card border border-border/60 shadow-xs auth-pill-slider pointer-events-none"
                    style={{
                        left: "4px",
                        transform: method === "otp" ? "translateX(calc(100% + 0px))" : "translateX(0)",
                    }}
                />
                <button
                    type="button"
                    className={`relative z-10 flex items-center justify-center gap-2 py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-colors duration-200 cursor-pointer ${
                        method === "password"
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => {
                        setMethod("password");
                        form.setValue("requestType", "user-info");
                        setTimeout(() => form.setFocus("password"), 60);
                    }}
                >
                    <KeyRound className={`size-3.5 transition-all duration-200 ${
                        method === "password" ? "text-primary scale-105" : "text-muted-foreground scale-100"
                    }`} />
                    <span>Password</span>
                </button>
                <button
                    type="button"
                    className={`relative z-10 flex items-center justify-center gap-2 py-2 px-3 text-xs sm:text-sm font-semibold rounded-xl transition-colors duration-200 cursor-pointer ${
                        method === "otp"
                            ? "text-foreground"
                            : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => {
                        setMethod("otp");
                        form.setValue("requestType", "otp-info");
                        setTimeout(() => {
                            try {
                                const el = (document.querySelector('input[type="tel"]') ?? document.getElementById("phone")) as HTMLInputElement | null;
                                el?.focus({ preventScroll: true });
                            } catch {
                                const el = (document.querySelector('input[type="tel"]') ?? document.getElementById("phone")) as HTMLInputElement | null;
                                el?.focus();
                            }
                        }, 50);
                    }}
                >
                    <img 
                        src={whatsAppIcon} 
                        alt="" 
                        className={`size-3.5 transition-all duration-200 ${
                            method === "otp" ? "scale-110 opacity-100" : "scale-100 opacity-70"
                        }`} 
                    />
                    <span>WhatsApp OTP</span>
                </button>
            </div>

            <form className="space-y-3 sm:space-y-4" onSubmit={form.handleSubmit(submitForm)}>
                {/* Phone number */}
                <Controller
                    control={form.control}
                    name="phone"
                    render={({ field, fieldState }) => (
                        <PhoneNumberField
                            ref={field.ref}
                            value={field.value}
                            onChange={field.onChange}
                            onBlur={field.onBlur}
                            error={fieldState.error}
                            required
                            autoFocus
                        />
                    )}
                />

                {/* Collapsible Password Field (Smooth 280ms collapse without layout snap) */}
                <div className={`auth-collapse ${method === "password" ? "auth-collapse-expanded" : "auth-collapse-collapsed"}`}>
                    <div className="auth-collapse-content">
                        <Field data-invalid={!!form.formState.errors.password} className="space-y-1.5 pb-0.5 sm:pb-1">
                            <div className="flex items-center justify-between">
                                <FieldLabel required className="text-xs sm:text-sm font-medium">Password</FieldLabel>
                                <a
                                    href="#"
                                    className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors duration-150"
                                    onClick={(e) => {
                                        e.preventDefault();
                                        toast.info("Switch to WhatsApp OTP to verify and sign in instantly without password.");
                                    }}
                                >
                                    Forgot password?
                                </a>
                            </div>
                            <FieldContent>
                                <PasswordInput
                                    className="h-11 sm:h-12 rounded-xl text-base border-input focus-within:border-ring focus-within:ring-ring/50 transition-all duration-150"
                                    placeholder="Enter your password"
                                    {...form.register("password")}
                                />
                                <FieldError errors={[form.formState.errors.password]} className="text-xs" />
                            </FieldContent>
                        </Field>
                    </div>
                </div>

                {/* Morphing Action Button with smooth content transition */}
                <div className="pt-0.5 sm:pt-1">
                    {method === "password" ? (
                        <Button
                            key="btn-password"
                            type="submit"
                            className="h-11 sm:h-12 w-full rounded-2xl text-sm sm:text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] transition-all duration-200 cursor-pointer auth-tab-enter flex items-center justify-center gap-2"
                            disabled={loginMutation.isPending}
                        >
                            {loginMutation.isPending ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Spinner className="size-4" />
                                    Signing in…
                                </span>
                            ) : (
                                "Login"
                            )}
                        </Button>
                    ) : (
                        <Button
                            key="btn-otp"
                            type="button"
                            className="h-11 sm:h-12 w-full rounded-2xl text-sm sm:text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] transition-all duration-200 cursor-pointer flex items-center justify-center gap-2 auth-tab-enter"
                            disabled={loginMutation.isPending}
                            onClick={startOtpFlow}
                        >
                            {loginMutation.isPending ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Spinner className="size-4" />
                                    Sending code…
                                </span>
                            ) : (
                                <>
                                    <img src={whatsAppIcon} alt="" className="size-4" />
                                    <span>Send WhatsApp Code</span>
                                </>
                            )}
                        </Button>
                    )}
                </div>

                {/* POS Quick Launcher */}
                <div className="pt-1 sm:pt-2">
                    <a
                        href={getPosLoginUrl()}
                        className="w-full flex items-center justify-between px-3.5 py-2 sm:py-2.5 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 active:scale-[0.99] text-xs text-muted-foreground hover:text-foreground transition-all duration-150 group"
                    >
                        <span className="flex items-center gap-2 font-medium">
                            <MonitorSmartphone className="size-3.5 text-primary transition-transform duration-200 group-hover:scale-110" />
                            <span>Cashier or store terminal?</span>
                        </span>
                        <span className="text-primary font-semibold group-hover:underline inline-flex items-center gap-1">
                            <span>Launch POS</span>
                            <span className="transition-transform duration-150 group-hover:translate-x-0.5">→</span>
                        </span>
                    </a>
                </div>

                {/* Footer link */}
                <div className="text-center text-xs sm:text-sm text-muted-foreground pt-2 sm:pt-3">
                    Not a member?{" "}
                    <Link to="/register" className="font-semibold text-primary hover:underline">
                        Register now
                    </Link>
                </div>
            </form>
        </AuthShell>
    );
};

export default LoginPage;
