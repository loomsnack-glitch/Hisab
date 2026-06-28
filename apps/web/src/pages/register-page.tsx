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
            <div className="mb-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-foreground">Looking for cashier/device access?</p>
                        <p className="text-xs text-muted-foreground">
                            POS devices should use the separate device login flow, not admin account registration.
                        </p>
                    </div>
                    <Button variant="outline" className="rounded-xl" render={<Link to="/pos/login" />}>
                        <MonitorSmartphone className="mr-2 size-4" />
                        Device POS login
                    </Button>
                </div>
            </div>

            <Card className="border-border/70 shadow-sm transition-shadow duration-300 hover:shadow-md">
                <CardContent className="p-6 sm:p-8">
                    <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
                        {step === "otp-verification" ? (
                            <>
                                <div className="flex items-center justify-between border-b border-dashed border-border pb-4">
                                    <div className="flex items-center gap-3">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="rounded-xl"
                                            onClick={() => {
                                                setStep("user-info");
                                                form.setValue("requestType", "user-info");
                                            }}
                                        >
                                            <ChevronLeft className="size-4 transition-transform duration-200 group-hover/button:-translate-x-0.5" />
                                        </Button>
                                        <div>
                                            <p className="text-sm font-medium text-foreground">{formatIndianPhoneDisplay(form.getValues("phone"))}</p>
                                            <p className="text-xs text-muted-foreground">Verification in progress</p>
                                        </div>
                                    </div>

                                    {cooldown > 0 ? (
                                        <p className="text-xs font-medium text-muted-foreground">Resend in {cooldown}s</p>
                                    ) : (
                                        <Button type="button" variant="link" className="px-0" onClick={resendOtp}>
                                            Resend OTP
                                        </Button>
                                    )}
                                </div>

                                <OtpField key="otp-verification" control={form.control} name="otp" />

                                <Button
                                    type="submit"
                                    className="h-11 w-full rounded-xl transition-all duration-200"
                                    disabled={registerMutation.isPending || form.watch("otp")?.length !== 6}
                                >
                                    Verify and continue
                                </Button>
                            </>
                        ) : (
                            <>
                                <FieldGroup className="grid gap-5 sm:grid-cols-3">
                                    <Controller
                                        control={form.control}
                                        name="salutation"
                                        render={({ field, fieldState }) => (
                                            <Field data-invalid={fieldState.invalid}>
                                                <FieldLabel required>Salutation</FieldLabel>
                                                <FieldContent>
                                                    <ReactSelect
                                                        options={SALUTATION_OPTIONS}
                                                        value={SALUTATION_OPTIONS.find((option) => option.value === field.value) ?? null}
                                                        onChange={(option) => field.onChange(option?.value ?? "mr.")}
                                                        classNames={{
                                                            control: () => "!min-h-11 rounded-xl",
                                                        }}
                                                    />
                                                    <FieldError errors={[fieldState.error]} />
                                                </FieldContent>
                                            </Field>
                                        )}
                                    />

                                    <Field data-invalid={!!form.formState.errors.firstName} className="sm:col-span-1">
                                        <FieldLabel required>First name</FieldLabel>
                                        <FieldContent>
                                            <Input className="h-11 rounded-xl transition-colors duration-200" {...form.register("firstName")} />
                                            <FieldError errors={[form.formState.errors.firstName]} />
                                        </FieldContent>
                                    </Field>

                                    <Field data-invalid={!!form.formState.errors.lastName} className="sm:col-span-1">
                                        <FieldLabel required>Last name</FieldLabel>
                                        <FieldContent>
                                            <Input className="h-11 rounded-xl transition-colors duration-200" {...form.register("lastName")} />
                                            <FieldError errors={[form.formState.errors.lastName]} />
                                        </FieldContent>
                                    </Field>
                                </FieldGroup>

                                <Controller
                                    control={form.control}
                                    name="phone"
                                    render={({ field, fieldState }) => (
                                        <PhoneNumberField
                                            value={field.value}
                                            onChange={field.onChange}
                                            onBlur={field.onBlur}
                                            error={fieldState.error}
                                            required
                                        />
                                    )}
                                />

                                <Field data-invalid={!!form.formState.errors.email}>
                                    <FieldLabel>Email</FieldLabel>
                                    <FieldContent>
                                        <Input className="h-11 rounded-xl transition-colors duration-200" placeholder="Optional" {...form.register("email")} />
                                        <FieldError errors={[form.formState.errors.email]} />
                                    </FieldContent>
                                </Field>

                                <FieldGroup className="grid gap-5 sm:grid-cols-2">
                                    <Field data-invalid={!!form.formState.errors.password}>
                                        <FieldLabel required>Password</FieldLabel>
                                        <FieldContent>
                                            <PasswordInput className="h-11 rounded-xl transition-colors duration-200" {...form.register("password")} />
                                            <FieldError errors={[form.formState.errors.password]} />
                                        </FieldContent>
                                    </Field>

                                    <Field data-invalid={!!form.formState.errors.confirmPassword}>
                                        <FieldLabel required>Confirm password</FieldLabel>
                                        <FieldContent>
                                            <PasswordInput className="h-11 rounded-xl transition-colors duration-200" {...form.register("confirmPassword")} />
                                            <FieldError errors={[form.formState.errors.confirmPassword]} />
                                        </FieldContent>
                                    </Field>
                                </FieldGroup>

                                <Button
                                    type="submit"
                                    className="h-11 w-full rounded-xl transition-all duration-200"
                                    disabled={registerMutation.isPending}
                                >
                                    {registerMutation.isPending ? "Sending OTP..." : "Send OTP"}
                                </Button>
                            </>
                        )}

                        <p className="text-center text-sm text-muted-foreground">
                            Already have an account?{" "}
                            <Link to="/login" className="font-medium text-primary transition-colors duration-200 hover:text-primary/80">
                                Login here
                            </Link>
                        </p>
                        <p className="text-center text-sm text-muted-foreground">
                            Need the device route instead?{" "}
                            <Link to="/pos/login" className="font-medium text-primary transition-colors duration-200 hover:text-primary/80">
                                Open POS login
                            </Link>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </AuthShell>
    );
};

export default RegisterPage;
