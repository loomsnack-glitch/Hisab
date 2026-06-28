import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, Controller, type SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { ChevronLeft, KeyRound, MessageSquareText, MonitorSmartphone } from "lucide-react";
import whatsAppIcon from "@repo/assets/services/whatsapp.webp";
import { userLogin } from "@repo/services";
import { LoginFormSchema, formatIndianPhoneDisplay, type LoginFormJSON } from "@repo/types";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Field, FieldContent, FieldError, FieldLabel } from "@repo/ui/components/field";
import { PasswordInput } from "@repo/ui/components/password-input";

import AuthShell from "@/components/auth/auth-shell";
import OtpField from "@/components/auth/otp-field";
import PhoneNumberField from "@/components/auth/phone-number-field";
import { authKeys } from "@/lib/query-keys";
import { useAuthActions } from "@/store/auth.store";

const defaultValues: LoginFormJSON = {
    requestType: "user-info",
    phone: "",
    password: "",
};

const LoginPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { setUser } = useAuthActions();
    const [method, setMethod] = useState<"password" | "otp">("password");
    const [cooldown, setCooldown] = useState(0);

    const form = useForm<LoginFormJSON>({
        resolver: zodResolver(LoginFormSchema),
        defaultValues,
    });

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
                navigate("/dashboard", { replace: true });
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

    const submitForm: SubmitHandler<LoginFormJSON> = (values) => {
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

    return (
        <AuthShell
            title="Welcome back"
            subtitle="Login with your password or request an OTP on WhatsApp when you need a quick sign-in."
        >
            <div className="mb-5 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-sm font-semibold text-foreground">Need to open the cashier POS instead?</p>
                        <p className="text-xs text-muted-foreground">
                            Store devices use a separate login flow with device id and device secret.
                        </p>
                    </div>
                    <Button variant="outline" className="rounded-xl" render={<Link to="/pos/login" />}>
                        <MonitorSmartphone className="mr-2 size-4" />
                        Device POS login
                    </Button>
                </div>
            </div>

            <Card className="border-border/70 shadow-sm transition-shadow duration-300 hover:shadow-md">
                <CardContent className="space-y-6 p-6 sm:p-8">
                    <div className="grid grid-cols-2 gap-2 rounded-2xl bg-secondary p-1.5">
                        <Button
                            type="button"
                            variant={method === "password" ? "default" : "ghost"}
                            className={`h-11 rounded-xl transition-all duration-200 ${
                                method === "password" ? "" : "text-secondary-foreground hover:bg-secondary/80"
                            }`}
                            onClick={() => {
                                setMethod("password");
                                form.reset({ phone: form.getValues("phone"), requestType: "user-info", password: "" });
                            }}
                        >
                            <KeyRound className="mr-2 size-4 transition-transform duration-200 group-hover/button:-translate-y-0.5" />
                            Password
                        </Button>
                        <Button
                            type="button"
                            variant={method === "otp" ? "default" : "ghost"}
                            className={`h-11 rounded-xl transition-all duration-200 ${
                                method === "otp" ? "" : "text-secondary-foreground hover:bg-secondary/80"
                            }`}
                            onClick={() => {
                                setMethod("otp");
                                form.reset({ phone: form.getValues("phone"), requestType: "otp-info" });
                            }}
                        >
                            <MessageSquareText className="mr-2 size-4 transition-transform duration-200 group-hover/button:-translate-y-0.5" />
                            OTP
                        </Button>
                    </div>

                    <form className="space-y-5" onSubmit={form.handleSubmit(submitForm)}>
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

                        {method === "password" ? (
                            <>
                                <Field data-invalid={!!form.formState.errors.password}>
                                    <FieldLabel required>Password</FieldLabel>
                                    <FieldContent>
                                        <PasswordInput className="h-11 rounded-xl transition-colors duration-200" {...form.register("password")} />
                                        <FieldError errors={[form.formState.errors.password]} />
                                    </FieldContent>
                                </Field>

                                <Button
                                    type="submit"
                                    className="h-11 w-full rounded-xl transition-all duration-200"
                                    disabled={loginMutation.isPending}
                                >
                                    {loginMutation.isPending ? "Logging in..." : "Login"}
                                </Button>
                            </>
                        ) : form.watch("requestType") === "otp-verification" ? (
                            <>
                                <div className="flex items-center justify-between border-b border-dashed border-border pb-4">
                                    <div className="flex items-center gap-3">
                                        <Button type="button" variant="ghost" size="icon" className="rounded-xl" onClick={backToOtpStart}>
                                            <ChevronLeft className="size-4 transition-transform duration-200 group-hover/button:-translate-x-0.5" />
                                        </Button>
                                        <div>
                                            <p className="text-sm font-medium text-foreground">{formatIndianPhoneDisplay(form.getValues("phone"))}</p>
                                            <p className="text-xs text-muted-foreground">OTP verification</p>
                                        </div>
                                    </div>

                                    {cooldown > 0 ? (
                                        <p className="text-xs font-medium text-muted-foreground">Resend in {cooldown}s</p>
                                    ) : (
                                        <Button type="button" variant="link" className="px-0" onClick={startOtpFlow}>
                                            Resend OTP
                                        </Button>
                                    )}
                                </div>

                                <OtpField key="otp-verification" control={form.control} name="otp" />

                                <Button
                                    type="submit"
                                    className="h-11 w-full rounded-xl transition-all duration-200"
                                    disabled={loginMutation.isPending || form.watch("otp")?.length !== 6}
                                >
                                    Verify and login
                                </Button>
                            </>
                        ) : (
                            <Button
                                type="button"
                                className="h-11 w-full rounded-xl transition-all duration-200"
                                disabled={loginMutation.isPending}
                                onClick={startOtpFlow}
                            >
                                {loginMutation.isPending ? (
                                    "Sending OTP..."
                                ) : (
                                    <>
                                        <img src={whatsAppIcon} alt="" className="mr-2 size-4" />
                                        Send OTP on WhatsApp
                                    </>
                                )}
                            </Button>
                        )}

                        <p className="text-center text-sm text-muted-foreground">
                            Need a new account?{" "}
                            <Link to="/register" className="font-medium text-primary transition-colors duration-200 hover:text-primary/80">
                                Register here
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

export default LoginPage;
