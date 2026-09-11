import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch, type SubmitHandler, Controller } from "react-hook-form";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Circle, RotateCcw } from "lucide-react";
import { register as registerUser } from "@repo/services";
import { RegisterFormSchema, formatPhoneDisplay, type RegisterFormJSON } from "@repo/types";
import { Button } from "@repo/ui/components/button";
import { Field, FieldContent, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { PasswordInput } from "@repo/ui/components/password-input";
import { Spinner } from "@repo/ui/components/spinner";

import AuthShell from "@/components/auth/auth-shell";
import OtpField from "@/components/auth/otp-field";
import PhoneNumberField from "@/components/auth/phone-number-field";
import { authKeys } from "@/lib/query-keys";
import { useAuthActions } from "@/store/auth.store";

type RegistrationStep = "phone" | "profile" | "password" | "otp";

const STEP_NUMBERS: Record<RegistrationStep, number> = {
    phone: 1,
    profile: 2,
    password: 3,
    otp: 4,
};

const TOTAL_STEPS = 4;

const defaultValues: RegisterFormJSON = {
    requestType: "user-info",
    salutation: "mr.",
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    password: "",
    confirmPassword: "",
};

const usePasswordChecks = (password: string) => {
    return useMemo(() => ({
        minLength: password.length >= 8,
        hasUppercase: /[A-Z]/.test(password),
        hasNumber: /[0-9]/.test(password),
    }), [password]);
};

const RegisterPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { setUser } = useAuthActions();
    const [step, setStep] = useState<RegistrationStep>("phone");
    const [cooldown, setCooldown] = useState(0);

    const form = useForm<RegisterFormJSON>({
        resolver: zodResolver(RegisterFormSchema),
        defaultValues,
    });
    const otp = useWatch({ control: form.control, name: "otp" });
    const password = useWatch({ control: form.control, name: "password" }) ?? "";
    const checks = usePasswordChecks(password);

    const registerMutation = useMutation({
        mutationFn: registerUser,
        onSuccess: (response) => {
            if (response.status === "success" && response.data?.nextRequestType === "otp-verification") {
                setStep("otp");
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
            }
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Failed to register");
        },
    });

    useEffect(() => {
        if (cooldown <= 0) return undefined;
        const timer = window.setTimeout(() => setCooldown((value) => value - 1), 1000);
        return () => window.clearTimeout(timer);
    }, [cooldown]);

    useEffect(() => {
        const focusMap: Record<RegistrationStep, () => void> = {
            phone: () => form.setFocus("phone"),
            otp: () => {},
            profile: () => form.setFocus("firstName"),
            password: () => form.setFocus("password"),
        };
        const timer = window.setTimeout(focusMap[step], 50);
        return () => window.clearTimeout(timer);
    }, [form, step]);

    const onSubmit: SubmitHandler<RegisterFormJSON> = (values) => {
        registerMutation.mutate(values);
    };

    const resendOtp = () => {
        const values = form.getValues();
        registerMutation.mutate({
            ...values,
            requestType: "otp-verification",
            resendOTP: "phoneOTP",
        });
        setCooldown(30);
    };

    const handlePhoneStep = async () => {
        const valid = await form.trigger("phone");
        if (valid) setStep("profile");
    };

    const handleProfileStep = async () => {
        const results = await Promise.all([
            form.trigger("firstName"),
            form.trigger("lastName"),
            form.trigger("email"),
        ]);
        if (results.every(Boolean)) setStep("password");
    };

    const handlePasswordStep = async () => {
        const results = await Promise.all([
            form.trigger("password"),
            form.trigger("confirmPassword"),
        ]);
        if (!results.every(Boolean)) return;

        const values = form.getValues();
        registerMutation.mutate({
            ...values,
            requestType: "user-info",
        });
    };

    const stepLabel = `Step ${STEP_NUMBERS[step]} of ${TOTAL_STEPS}`;

    /* ─────────── Step 1: Phone Number ─────────── */
    if (step === "phone") {
        return (
            <AuthShell
                title="Create an account"
                stepLabel={stepLabel}
                currentStep={1}
                totalSteps={TOTAL_STEPS}
            >
                <form
                    key="step-phone"
                    className="auth-step-enter space-y-3.5 sm:space-y-4 pt-1"
                    onSubmit={(e) => {
                        e.preventDefault();
                        handlePhoneStep();
                    }}
                >
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

                    <Button
                        type="submit"
                        className="h-11 sm:h-12 w-full rounded-2xl text-sm sm:text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] transition-all duration-150 cursor-pointer mt-1 sm:mt-2"
                    >
                        Continue →
                    </Button>

                    <div className="text-center text-xs sm:text-sm text-muted-foreground pt-2.5 sm:pt-3">
                        Already have an account?{" "}
                        <Link to="/login" className="font-semibold text-primary hover:underline">
                            Sign in
                        </Link>
                    </div>
                </form>
            </AuthShell>
        );
    }

    /* ─────────── Step 2: Profile Information ─────────── */
    if (step === "profile") {
        return (
            <AuthShell
                title="Tell us about yourself"
                stepLabel={stepLabel}
                currentStep={2}
                totalSteps={TOTAL_STEPS}
            >
                <form
                    key="step-profile"
                    className="auth-step-enter space-y-3 sm:space-y-4 pt-1"
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleProfileStep();
                    }}
                >
                    <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                        <Field data-invalid={!!form.formState.errors.firstName} className="space-y-1.5">
                            <FieldLabel required className="text-xs sm:text-sm font-medium">First name</FieldLabel>
                            <FieldContent>
                                <Input
                                    className="h-11 sm:h-12 rounded-xl text-base border-input transition-all duration-150"
                                    placeholder="First name"
                                    {...form.register("firstName")}
                                />
                                <FieldError errors={[form.formState.errors.firstName]} className="text-xs" />
                            </FieldContent>
                        </Field>

                        <Field data-invalid={!!form.formState.errors.lastName} className="space-y-1.5">
                            <FieldLabel required className="text-xs sm:text-sm font-medium">Last name</FieldLabel>
                            <FieldContent>
                                <Input
                                    className="h-11 sm:h-12 rounded-xl text-base border-input transition-all duration-150"
                                    placeholder="Last name"
                                    {...form.register("lastName")}
                                />
                                <FieldError errors={[form.formState.errors.lastName]} className="text-xs" />
                            </FieldContent>
                        </Field>
                    </div>

                    <Field data-invalid={!!form.formState.errors.email} className="space-y-1.5">
                        <FieldLabel className="text-xs sm:text-sm font-medium">
                            Work email <span className="text-muted-foreground font-normal text-xs ml-1">(Optional)</span>
                        </FieldLabel>
                        <FieldContent>
                            <Input
                                className="h-11 sm:h-12 rounded-xl text-base border-input transition-all duration-150"
                                placeholder="name@retail.com"
                                type="email"
                                {...form.register("email")}
                            />
                            <FieldError errors={[form.formState.errors.email]} className="text-xs" />
                        </FieldContent>
                    </Field>

                    <div className="flex items-center gap-2.5 sm:gap-3 pt-1 sm:pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setStep("phone")}
                            className="h-11 sm:h-12 px-4 rounded-2xl text-xs sm:text-sm font-medium border-border/80 hover:bg-muted active:scale-90 transition-all duration-150 cursor-pointer"
                        >
                            <ArrowLeft className="size-3.5" />
                        </Button>
                        <Button
                            type="submit"
                            className="h-11 sm:h-12 flex-1 rounded-2xl text-sm sm:text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] transition-all duration-150 cursor-pointer"
                        >
                            Continue →
                        </Button>
                    </div>
                </form>
            </AuthShell>
        );
    }

    /* ─────────── Step 3: Create Password ─────────── */
    if (step === "password") {
        return (
            <AuthShell
                title="Create a password"
                stepLabel={stepLabel}
                currentStep={3}
                totalSteps={TOTAL_STEPS}
            >
                <form
                    key="step-password"
                    className="auth-step-enter space-y-3 sm:space-y-4 pt-1"
                    onSubmit={(e) => {
                        e.preventDefault();
                        handlePasswordStep();
                    }}
                >
                    <Field data-invalid={!!form.formState.errors.password} className="space-y-1.5">
                        <FieldLabel required className="text-xs sm:text-sm font-medium">Password</FieldLabel>
                        <FieldContent>
                            <PasswordInput
                                className="h-11 sm:h-12 rounded-xl text-base border-input transition-all duration-150"
                                placeholder="Create password"
                                {...form.register("password")}
                            />
                            <FieldError errors={[form.formState.errors.password]} className="text-xs" />
                        </FieldContent>
                    </Field>

                    <div className={`rounded-2xl border p-2.5 sm:p-3 space-y-1 sm:space-y-1.5 text-xs transition-all duration-200 ${
                        checks.minLength && checks.hasUppercase && checks.hasNumber
                            ? "border-emerald-500/40 bg-emerald-500/5"
                            : "border-border/60 bg-muted/40"
                    }`}>
                        <PasswordReq met={checks.minLength}>At least 8 characters</PasswordReq>
                        <PasswordReq met={checks.hasUppercase}>One uppercase letter</PasswordReq>
                        <PasswordReq met={checks.hasNumber}>One number</PasswordReq>
                    </div>

                    <Field data-invalid={!!form.formState.errors.confirmPassword} className="space-y-1.5">
                        <FieldLabel required className="text-xs sm:text-sm font-medium">Confirm password</FieldLabel>
                        <FieldContent>
                            <PasswordInput
                                className="h-11 sm:h-12 rounded-xl text-sm sm:text-base border-input transition-all duration-150"
                                placeholder="Re-enter password"
                                {...form.register("confirmPassword")}
                            />
                            <FieldError errors={[form.formState.errors.confirmPassword]} className="text-xs" />
                        </FieldContent>
                    </Field>

                    <div className="flex items-center gap-2.5 sm:gap-3 pt-1 sm:pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setStep("profile")}
                            className="h-11 sm:h-12 px-4 rounded-2xl text-xs sm:text-sm font-medium border-border/80 hover:bg-muted active:scale-90 transition-all duration-150 cursor-pointer"
                        >
                            <ArrowLeft className="size-3.5" />
                        </Button>
                        <Button
                            type="submit"
                            className="h-11 sm:h-12 flex-1 rounded-2xl text-sm sm:text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] transition-all duration-150 cursor-pointer"
                            disabled={registerMutation.isPending}
                        >
                            {registerMutation.isPending ? (
                                <span className="flex items-center justify-center gap-2">
                                    <Spinner className="size-4" />
                                    Sending code…
                                </span>
                            ) : (
                                "Send WhatsApp Code →"
                            )}
                        </Button>
                    </div>
                </form>
            </AuthShell>
        );
    }

    /* ─────────── Step 4: OTP Verification ─────────── */
    return (
        <AuthShell
            title="Verify WhatsApp"
            subtitle={`We sent a 6-digit code to ${formatPhoneDisplay(form.getValues("phone"))}.`}
            stepLabel={stepLabel}
            currentStep={4}
            totalSteps={TOTAL_STEPS}
        >
            <form
                key="step-otp"
                className="auth-step-enter space-y-4 sm:space-y-5 pt-1 sm:pt-2"
                onSubmit={form.handleSubmit(onSubmit)}
            >
                <OtpField key="otp-verification" control={form.control} name="otp" />

                <Button
                    type="submit"
                    className="h-11 sm:h-12 w-full rounded-2xl text-sm sm:text-base font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md shadow-primary/25 hover:shadow-lg hover:shadow-primary/30 active:scale-[0.98] transition-all duration-150 cursor-pointer"
                    disabled={registerMutation.isPending || otp?.length !== 6}
                >
                    {registerMutation.isPending ? (
                        <span className="flex items-center justify-center gap-2">
                            <Spinner className="size-4" />
                            Creating account…
                        </span>
                    ) : (
                        "Create Account"
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
                            onClick={resendOtp}
                            className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline active:scale-95 transition-transform duration-150 cursor-pointer"
                        >
                            <RotateCcw className="size-3" />
                            Resend verification code
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={() => {
                            setStep("phone");
                            form.setValue("requestType", "user-info");
                        }}
                        className="inline-flex items-center gap-1 hover:text-foreground active:scale-95 transition-all duration-150 cursor-pointer"
                    >
                        <ArrowLeft className="size-3" />
                        Use different phone number
                    </button>
                </div>
            </form>
        </AuthShell>
    );
};

const PasswordReq = ({ met, children }: { met: boolean; children: React.ReactNode }) => (
    <div className={`flex items-center gap-2 text-xs transition-colors duration-200 ${
        met ? "text-emerald-600 dark:text-emerald-400 font-medium" : "text-muted-foreground"
    }`}>
        <div className="transition-transform duration-200">
            {met ? (
                <CheckCircle2 className="size-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 transition-transform duration-200 scale-100" />
            ) : (
                <Circle className="size-3.5 text-muted-foreground/60 shrink-0 transition-transform duration-200 scale-95" />
            )}
        </div>
        <span>{children}</span>
    </div>
);

export default RegisterPage;
