import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, type SubmitHandler } from "react-hook-form";
import { toast } from "sonner";
import { ChevronLeft, KeyRound, MessageSquareText } from "lucide-react";
import { userLogin } from "@repo/services";
import { LoginSchema, type LoginJSON } from "@repo/types";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Field, FieldContent, FieldError, FieldGroup, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { PasswordInput } from "@repo/ui/components/password-input";

import AuthShell from "@/components/auth/auth-shell";
import OtpField from "@/components/auth/otp-field";
import { useAuthActions } from "@/store/auth.store";

const AUTH_QUERY_KEY = ["auth", "me"] as const;

const defaultValues: LoginJSON = {
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

    const form = useForm<LoginJSON>({
        resolver: zodResolver(LoginSchema),
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
                queryClient.setQueryData(AUTH_QUERY_KEY, response);
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

    const submitForm: SubmitHandler<LoginJSON> = (values) => {
        loginMutation.mutate(values);
    };

    const startOtpFlow = () => {
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
            <Card className="border-amber-100 shadow-none">
                <CardContent className="space-y-6 p-6 sm:p-8">
                    <div className="grid grid-cols-2 gap-3 rounded-2xl bg-amber-50 p-2">
                        <Button
                            type="button"
                            variant={method === "password" ? "default" : "ghost"}
                            className={method === "password" ? "bg-slate-950 text-white hover:bg-slate-900" : "text-slate-700"}
                            onClick={() => {
                                setMethod("password");
                                form.reset({ phone: form.getValues("phone"), requestType: "user-info", password: "" });
                            }}
                        >
                            <KeyRound className="mr-2 size-4" />
                            Password
                        </Button>
                        <Button
                            type="button"
                            variant={method === "otp" ? "default" : "ghost"}
                            className={method === "otp" ? "bg-slate-950 text-white hover:bg-slate-900" : "text-slate-700"}
                            onClick={() => {
                                setMethod("otp");
                                form.reset({ phone: form.getValues("phone"), requestType: "otp-info" });
                            }}
                        >
                            <MessageSquareText className="mr-2 size-4" />
                            OTP
                        </Button>
                    </div>

                    <form className="space-y-5" onSubmit={form.handleSubmit(submitForm)}>
                        <Field data-invalid={!!form.formState.errors.phone}>
                            <FieldLabel required>Phone number</FieldLabel>
                            <FieldContent>
                                <Input className="h-11 rounded-xl" placeholder="+919876543210" {...form.register("phone")} />
                                <FieldError errors={[form.formState.errors.phone]} />
                            </FieldContent>
                        </Field>

                        {method === "password" ? (
                            <>
                                <Field data-invalid={!!form.formState.errors.password}>
                                    <FieldLabel required>Password</FieldLabel>
                                    <FieldContent>
                                        <PasswordInput className="h-11 rounded-xl" {...form.register("password")} />
                                        <FieldError errors={[form.formState.errors.password]} />
                                    </FieldContent>
                                </Field>

                                <Button
                                    type="submit"
                                    className="h-11 w-full rounded-xl bg-slate-950 text-white hover:bg-slate-900"
                                    disabled={loginMutation.isPending}
                                >
                                    {loginMutation.isPending ? "Logging in..." : "Login"}
                                </Button>
                            </>
                        ) : form.watch("requestType") === "otp-verification" ? (
                            <>
                                <div className="flex items-center justify-between border-b border-dashed border-amber-200 pb-4">
                                    <div className="flex items-center gap-3">
                                        <Button type="button" variant="ghost" size="icon" onClick={backToOtpStart}>
                                            <ChevronLeft className="size-4" />
                                        </Button>
                                        <div>
                                            <p className="text-sm font-medium text-slate-900">{form.getValues("phone")}</p>
                                            <p className="text-xs text-slate-500">OTP verification</p>
                                        </div>
                                    </div>

                                    {cooldown > 0 ? (
                                        <p className="text-xs font-medium text-slate-500">Resend in {cooldown}s</p>
                                    ) : (
                                        <Button type="button" variant="link" className="px-0 text-amber-700" onClick={startOtpFlow}>
                                            Resend OTP
                                        </Button>
                                    )}
                                </div>

                                <OtpField control={form.control} name="otp" />

                                <Button
                                    type="submit"
                                    className="h-11 w-full rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400"
                                    disabled={loginMutation.isPending || form.watch("otp")?.length !== 6}
                                >
                                    Verify and login
                                </Button>
                            </>
                        ) : (
                            <>
                                <FieldGroup className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 p-4">
                                    <p className="text-sm leading-6 text-slate-600">
                                        Use WhatsApp OTP if you want a quick login without typing your password.
                                    </p>
                                </FieldGroup>

                                <Button
                                    type="button"
                                    className="h-11 w-full rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400"
                                    disabled={loginMutation.isPending}
                                    onClick={startOtpFlow}
                                >
                                    {loginMutation.isPending ? "Sending OTP..." : "Send OTP"}
                                </Button>
                            </>
                        )}

                        <p className="text-center text-sm text-slate-500">
                            Need a new account?{" "}
                            <Link to="/register" className="font-medium text-amber-700 hover:text-amber-800">
                                Register here
                            </Link>
                        </p>
                    </form>
                </CardContent>
            </Card>
        </AuthShell>
    );
};

export default LoginPage;
