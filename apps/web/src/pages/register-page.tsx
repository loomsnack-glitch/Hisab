import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { ChevronLeft } from "lucide-react";
import { register as registerUser } from "@repo/services";
import { RegisterSchema, SALUTATION_OPTIONS, type RegisterJSON } from "@repo/types";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { PasswordInput } from "@repo/ui/components/password-input";
import { Controller } from "react-hook-form";

import AuthShell from "@/components/auth/auth-shell";
import OtpField from "@/components/auth/otp-field";
import { useAuthActions } from "@/store/auth.store";

import { authKeys } from "@/lib/query-keys";

const defaultValues: RegisterJSON = {
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

    const form = useForm<RegisterJSON>({
        resolver: zodResolver(RegisterSchema),
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

    const onSubmit: SubmitHandler<RegisterJSON> = (values) => {
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
            title="Create your Hisab account"
            subtitle="Register with your phone number, verify the OTP on WhatsApp, and you will be logged in immediately."
        >
            <Card className="border-amber-100 shadow-none">
                <CardContent className="p-6 sm:p-8">
                    <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
                        {step === "otp-verification" ? (
                            <>
                                <div className="flex items-center justify-between border-b border-dashed border-amber-200 pb-4">
                                    <div className="flex items-center gap-3">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => {
                                                setStep("user-info");
                                                form.setValue("requestType", "user-info");
                                            }}
                                        >
                                            <ChevronLeft className="size-4" />
                                        </Button>
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">{form.getValues("phone")}</p>
                                            <p className="text-xs text-slate-500">Verification in progress</p>
                                        </div>
                                    </div>

                                    {cooldown > 0 ? (
                                        <p className="text-xs font-medium text-slate-500">Resend in {cooldown}s</p>
                                    ) : (
                                        <Button type="button" variant="link" className="px-0 text-amber-700" onClick={resendOtp}>
                                            Resend OTP
                                        </Button>
                                    )}
                                </div>

                                <OtpField control={form.control} name="otp" />

                                <Button
                                    type="submit"
                                    className="h-11 w-full rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400"
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
                                                    <select
                                                        value={field.value}
                                                        onChange={field.onChange}
                                                        className="border-input focus-visible:border-ring focus-visible:ring-ring/50 h-11 w-full rounded-xl border bg-transparent px-3 text-sm outline-none focus-visible:ring-[3px]"
                                                    >
                                                        {SALUTATION_OPTIONS.map((option) => (
                                                            <option key={option.value} value={option.value}>
                                                                {option.label}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <FieldError errors={[fieldState.error]} />
                                                </FieldContent>
                                            </Field>
                                        )}
                                    />

                                    <Field data-invalid={!!form.formState.errors.firstName} className="sm:col-span-1">
                                        <FieldLabel required>First name</FieldLabel>
                                        <FieldContent>
                                            <Input className="h-11 rounded-xl" {...form.register("firstName")} />
                                            <FieldError errors={[form.formState.errors.firstName]} />
                                        </FieldContent>
                                    </Field>

                                    <Field data-invalid={!!form.formState.errors.lastName} className="sm:col-span-1">
                                        <FieldLabel required>Last name</FieldLabel>
                                        <FieldContent>
                                            <Input className="h-11 rounded-xl" {...form.register("lastName")} />
                                            <FieldError errors={[form.formState.errors.lastName]} />
                                        </FieldContent>
                                    </Field>
                                </FieldGroup>

                                <Field data-invalid={!!form.formState.errors.phone}>
                                    <FieldLabel required>Phone number</FieldLabel>
                                    <FieldContent>
                                        <Input className="h-11 rounded-xl" placeholder="+919876543210" {...form.register("phone")} />
                                        <FieldError errors={[form.formState.errors.phone]} />
                                    </FieldContent>
                                </Field>

                                <Field data-invalid={!!form.formState.errors.email}>
                                    <FieldLabel>Email</FieldLabel>
                                    <FieldContent>
                                        <Input className="h-11 rounded-xl" placeholder="Optional" {...form.register("email")} />
                                        <FieldError errors={[form.formState.errors.email]} />
                                    </FieldContent>
                                </Field>

                                <FieldGroup className="grid gap-5 sm:grid-cols-2">
                                    <Field data-invalid={!!form.formState.errors.password}>
                                        <FieldLabel required>Password</FieldLabel>
                                        <FieldContent>
                                            <PasswordInput className="h-11 rounded-xl" {...form.register("password")} />
                                            <FieldError errors={[form.formState.errors.password]} />
                                        </FieldContent>
                                    </Field>

                                    <Field data-invalid={!!form.formState.errors.confirmPassword}>
                                        <FieldLabel required>Confirm password</FieldLabel>
                                        <FieldContent>
                                            <PasswordInput className="h-11 rounded-xl" {...form.register("confirmPassword")} />
                                            <FieldError errors={[form.formState.errors.confirmPassword]} />
                                        </FieldContent>
                                    </Field>
                                </FieldGroup>

                                <Button
                                    type="submit"
                                    className="h-11 w-full rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400"
                                    disabled={registerMutation.isPending}
                                >
                                    {registerMutation.isPending ? "Sending OTP..." : "Send OTP"}
                                </Button>
                            </>
                        )}

                        <p className="text-center text-sm text-slate-500">
                            Already have an account?{" "}
                            <Link to="/login" className="font-medium text-amber-700 hover:text-amber-800">
                                Login here
                            </Link>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </AuthShell>
    );
};

export default RegisterPage;
