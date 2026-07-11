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

    useEffect(() => {
        form.setFocus("phone");
    }, [form.setFocus]);

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
            <div className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <MonitorSmartphone className="size-4 shrink-0 text-amber-500" />
                    <span>Need to open the cashier POS instead?</span>
                </div>
                <Link to="/pos/login" className="font-semibold text-amber-600 dark:text-amber-400 hover:underline shrink-0">
                    Device POS login &rarr;
                </Link>
            </div>

            <Card className="border-border/70 shadow-sm">
                <CardContent className="space-y-4 p-5 sm:p-6">
                    <div className="grid grid-cols-2 gap-1.5 rounded-xl bg-secondary p-1">
                        <Button
                            type="button"
                            variant={method === "password" ? "default" : "ghost"}
                            className={`h-9 rounded-lg text-xs transition-all duration-200 ${
                                method === "password" ? "" : "text-secondary-foreground hover:bg-secondary/80"
                            }`}
                            onClick={() => {
                                setMethod("password");
                                form.reset({ phone: form.getValues("phone"), requestType: "user-info", password: "" });
                                setTimeout(() => form.setFocus("phone"), 0);
                            }}
                        >
                            <KeyRound className="mr-1.5 size-3.5" />
                            Password
                        </Button>
                        <Button
                            type="button"
                            variant={method === "otp" ? "default" : "ghost"}
                            className={`h-9 rounded-lg text-xs transition-all duration-200 ${
                                method === "otp" ? "" : "text-secondary-foreground hover:bg-secondary/80"
                            }`}
                            onClick={() => {
                                setMethod("otp");
                                form.reset({ phone: form.getValues("phone"), requestType: "otp-info" });
                                setTimeout(() => form.setFocus("phone"), 0);
                            }}
                        >
                            <MessageSquareText className="mr-1.5 size-3.5" />
                            OTP
                        </Button>
                    </div>

                    <form className="space-y-3.5" onSubmit={form.handleSubmit(submitForm)}>
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

                        {method === "password" ? (
                            <>
                                <Field data-invalid={!!form.formState.errors.password} className="space-y-1">
                                    <FieldLabel required className="text-xs">Password</FieldLabel>
                                    <FieldContent>
                                        <PasswordInput className="h-10 rounded-xl transition-colors duration-200 text-sm" {...form.register("password")} />
                                        <FieldError errors={[form.formState.errors.password]} className="text-[10px]" />
                                    </FieldContent>
                                </Field>

                                <Button
                                    type="submit"
                                    className="h-10 w-full rounded-xl transition-all duration-200 text-sm"
                                    disabled={loginMutation.isPending}
                                >
                                    {loginMutation.isPending ? "Logging in..." : "Login"}
                                </Button>
                            </>
                        ) : form.watch("requestType") === "otp-verification" ? (
                            <>
                                <div className="flex items-center justify-between border-b border-dashed border-border pb-3">
                                    <div className="flex items-center gap-2">
                                        <Button type="button" variant="ghost" size="icon" className="rounded-lg size-8" onClick={backToOtpStart}>
                                            <ChevronLeft className="size-3.5" />
                                        </Button>
                                        <div>
                                            <p className="text-xs font-semibold text-foreground">{formatIndianPhoneDisplay(form.getValues("phone"))}</p>
                                            <p className="text-[10px] text-muted-foreground">OTP verification</p>
                                        </div>
                                    </div>

                                    {cooldown > 0 ? (
                                        <p className="text-[10px] font-medium text-muted-foreground">Resend in {cooldown}s</p>
                                    ) : (
                                        <Button type="button" variant="link" className="px-0 text-xs h-auto" onClick={startOtpFlow}>
                                            Resend OTP
                                        </Button>
                                    )}
                                </div>

                                <OtpField key="otp-verification" control={form.control} name="otp" />

                                <Button
                                    type="submit"
                                    className="h-10 w-full rounded-xl transition-all duration-200 text-sm"
                                    disabled={loginMutation.isPending || form.watch("otp")?.length !== 6}
                                >
                                    Verify and login
                                </Button>
                            </>
                        ) : (
                            <Button
                                type="button"
                                className="h-10 w-full rounded-xl transition-all duration-200 text-sm"
                                disabled={loginMutation.isPending}
                                onClick={startOtpFlow}
                            >
                                {loginMutation.isPending ? (
                                    "Sending OTP..."
                                ) : (
                                    <>
                                        <img src={whatsAppIcon} alt="" className="mr-1.5 size-3.5" />
                                        Send OTP on WhatsApp
                                    </>
                                )}
                            </Button>
                        )}

                        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2.5 border-t border-border/40">
                            <p>
                                Need a new account?{" "}
                                <Link to="/register" className="font-semibold text-primary hover:underline">
                                    Register
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

export default LoginPage;
