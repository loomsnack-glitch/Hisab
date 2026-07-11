import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { ChevronLeft, MonitorSmartphone } from "lucide-react";
import { register as registerUser } from "@repo/services";
import { RegisterFormSchema, SALUTATION_OPTIONS, formatIndianPhoneDisplay, type RegisterFormJSON } from "@repo/types";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { PasswordInput } from "@repo/ui/components/password-input";
import ReactSelect from "@repo/ui/components/react-select/react-select";
import { Controller } from "react-hook-form";

import AuthShell from "@/components/auth/auth-shell";
import OtpField from "@/components/auth/otp-field";
import PhoneNumberField from "@/components/auth/phone-number-field";
import { useAuthActions } from "@/store/auth.store";

import { authKeys } from "@/lib/query-keys";

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

const RegisterPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { setUser } = useAuthActions();
    const [step, setStep] = useState<"user-info" | "otp-verification">("user-info");
    const [cooldown, setCooldown] = useState(0);

    const form = useForm<RegisterFormJSON>({
        resolver: zodResolver(RegisterFormSchema),
        defaultValues,
    });

    const registerMutation = useMutation({
        mutationFn: registerUser,
        onSuccess: (response) => {
            if (response.status === "success" && response.data?.nextRequestType === "otp-verification") {
                setStep("otp-verification");
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
                navigate("/dashboard", { replace: true });
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
        if (step === "user-info") {
            form.setFocus("firstName");
        }
    }, [step, form.setFocus]);

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

    return (
        <AuthShell
            title="Create your Ganatri account"
            subtitle="Register with your phone number, verify the OTP on WhatsApp, and you will be logged in immediately."
        >
            <div className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <MonitorSmartphone className="size-4 shrink-0 text-amber-500" />
                    <span>Looking for cashier/device access?</span>
                </div>
                <Link to="/pos/login" className="font-semibold text-amber-600 dark:text-amber-400 hover:underline shrink-0">
                    Device POS login &rarr;
                </Link>
            </div>

            <Card className="border-border/70 shadow-sm">
                <CardContent className="p-4 sm:p-5">
                    <form className="space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
                        {step === "otp-verification" ? (
                            <>
                                <div className="flex items-center justify-between border-b border-dashed border-border pb-3">
                                    <div className="flex items-center gap-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="rounded-lg size-8"
                                            onClick={() => {
                                                setStep("user-info");
                                                form.setValue("requestType", "user-info");
                                            }}
                                        >
                                            <ChevronLeft className="size-3.5" />
                                        </Button>
                                        <div>
                                            <p className="text-xs font-semibold text-foreground">{formatIndianPhoneDisplay(form.getValues("phone"))}</p>
                                            <p className="text-[10px] text-muted-foreground">Verification in progress</p>
                                        </div>
                                    </div>

                                    {cooldown > 0 ? (
                                        <p className="text-[10px] font-medium text-muted-foreground">Resend in {cooldown}s</p>
                                    ) : (
                                        <Button type="button" variant="link" className="px-0 text-xs h-auto" onClick={resendOtp}>
                                            Resend OTP
                                        </Button>
                                    )}
                                </div>

                                <OtpField key="otp-verification" control={form.control} name="otp" />

                                <Button
                                    type="submit"
                                    className="h-10 w-full rounded-xl transition-all duration-200 text-sm"
                                    disabled={registerMutation.isPending || form.watch("otp")?.length !== 6}
                                >
                                    Verify and continue
                                </Button>
                            </>
                        ) : (
                            <>
                                <FieldGroup className="grid gap-3.5 sm:grid-cols-3">
                                    <Controller
                                        control={form.control}
                                        name="salutation"
                                        render={({ field, fieldState }) => (
                                            <Field data-invalid={fieldState.invalid} className="space-y-1">
                                                <FieldLabel required className="text-xs">Salutation</FieldLabel>
                                                <FieldContent>
                                                    <ReactSelect
                                                        options={SALUTATION_OPTIONS}
                                                        value={SALUTATION_OPTIONS.find((option) => option.value === field.value) ?? null}
                                                        onChange={(option) => field.onChange(option?.value ?? "mr.")}
                                                        classNames={{
                                                            control: () => "!min-h-10 rounded-xl text-sm",
                                                        }}
                                                    />
                                                    <FieldError errors={[fieldState.error]} className="text-[10px]" />
                                                </FieldContent>
                                            </Field>
                                        )}
                                    />

                                    <Field data-invalid={!!form.formState.errors.firstName} className="sm:col-span-1 space-y-1">
                                        <FieldLabel required className="text-xs">First name</FieldLabel>
                                        <FieldContent>
                                            <Input className="h-10 rounded-xl transition-colors duration-200 text-sm" {...form.register("firstName")} />
                                            <FieldError errors={[form.formState.errors.firstName]} className="text-[10px]" />
                                        </FieldContent>
                                    </Field>

                                    <Field data-invalid={!!form.formState.errors.lastName} className="sm:col-span-1 space-y-1">
                                        <FieldLabel required className="text-xs">Last name</FieldLabel>
                                        <FieldContent>
                                            <Input className="h-10 rounded-xl transition-colors duration-200 text-sm" {...form.register("lastName")} />
                                            <FieldError errors={[form.formState.errors.lastName]} className="text-[10px]" />
                                        </FieldContent>
                                    </Field>
                                </FieldGroup>

                                <FieldGroup className="grid gap-3.5 sm:grid-cols-2">
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
                                            />
                                        )}
                                    />

                                    <Field data-invalid={!!form.formState.errors.email} className="space-y-1">
                                        <FieldLabel className="text-xs">Email</FieldLabel>
                                        <FieldContent>
                                            <Input className="h-10 rounded-xl transition-colors duration-200 text-sm" placeholder="Optional" {...form.register("email")} />
                                            <FieldError errors={[form.formState.errors.email]} className="text-[10px]" />
                                        </FieldContent>
                                    </Field>
                                </FieldGroup>

                                <FieldGroup className="grid gap-3.5 sm:grid-cols-2">
                                    <Field data-invalid={!!form.formState.errors.password} className="space-y-1">
                                        <FieldLabel required className="text-xs">Password</FieldLabel>
                                        <FieldContent>
                                            <PasswordInput className="h-10 rounded-xl transition-colors duration-200 text-sm" {...form.register("password")} />
                                            <FieldError errors={[form.formState.errors.password]} className="text-[10px]" />
                                        </FieldContent>
                                    </Field>

                                    <Field data-invalid={!!form.formState.errors.confirmPassword} className="space-y-1">
                                        <FieldLabel required className="text-xs">Confirm password</FieldLabel>
                                        <FieldContent>
                                            <PasswordInput className="h-10 rounded-xl transition-colors duration-200 text-sm" {...form.register("confirmPassword")} />
                                            <FieldError errors={[form.formState.errors.confirmPassword]} className="text-[10px]" />
                                        </FieldContent>
                                    </Field>
                                </FieldGroup>

                                <Button
                                    type="submit"
                                    className="h-10 w-full rounded-xl transition-all duration-200 text-sm"
                                    disabled={registerMutation.isPending}
                                >
                                    {registerMutation.isPending ? "Sending OTP..." : "Send OTP"}
                                </Button>
                            </>
                        )}

                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2.5 border-t border-border/40">
                            <p>
                                Already have an account?{" "}
                                <Link to="/login" className="font-semibold text-primary hover:underline">
                                    Login
                                </Link>
                            </p>
                            <p>
                                <Link to="/pos/login" className="font-semibold text-primary hover:underline">
                                    Open POS login
                                </Link>
                            </p>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </AuthShell>
    );
};

export default RegisterPage;
