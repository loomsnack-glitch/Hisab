import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { ChevronLeft, KeyRound, MessageSquareText } from "lucide-react";
import whatsAppIcon from "@repo/assets/services/whatsapp.webp";
import { ownerLogin } from "@repo/services";
import { formatPhoneDisplay, OwnerLoginSchema, type OwnerLoginJSON } from "@repo/types";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Field, FieldContent, FieldError, FieldLabel } from "@repo/ui/components/field";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@repo/ui/components/input-otp";
import { PasswordInput } from "@repo/ui/components/password-input";
import { PhoneInput } from "@repo/ui/components/phone-input";

import ConsoleAuthShell from "@/components/console-auth-shell";

export const OwnerLoginError = ({ message }: { message: string }) => (
    <Alert variant="destructive" role="alert">
        <AlertTitle>Sign-in failed</AlertTitle>
        <AlertDescription>{message}</AlertDescription>
    </Alert>
);

type OwnerLoginPageProps = {
    sessionExpired: boolean;
    onAuthenticated: () => Promise<void>;
    login?: typeof ownerLogin;
    initialPhone?: string;
    initialPassword?: string;
    initialOtp?: string;
};

const OwnerLoginPage = ({
    sessionExpired,
    onAuthenticated,
    login = ownerLogin,
    initialPhone = "",
    initialPassword = "",
    initialOtp = "",
}: OwnerLoginPageProps) => {
    const [method, setMethod] = useState<"password" | "otp">("password");
    const [phone, setPhone] = useState(initialPhone);
    const [password, setPassword] = useState(initialPassword);
    const [otp, setOtp] = useState(initialOtp);
    const [otpRequested, setOtpRequested] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const loginMutation = useMutation({
        mutationFn: login,
        onMutate: () => setErrorMessage(null),
        onSuccess: async (response) => {
            if (response.data?.nextRequestType === "otp-verification") {
                setOtpRequested(true);
                return;
            }
            if (response.data?.ownerUser) {
                await onAuthenticated();
            }
        },
        onError: (error: { message?: string }) => setErrorMessage(error.message ?? "Unable to sign in"),
    });

    const submit = (data: OwnerLoginJSON) => {
        const parsed = OwnerLoginSchema.safeParse(data);
        if (!parsed.success) {
            setErrorMessage(parsed.error.issues[0]?.message ?? "Check your sign-in details");
            return;
        }
        loginMutation.mutate(data);
    };

    const handlePasswordLogin = (event: FormEvent) => {
        event.preventDefault();
        submit({ requestType: "user-info", phone, password });
    };

    const handleOtp = (event: FormEvent) => {
        event.preventDefault();
        submit(otpRequested
            ? { requestType: "otp-verification", phone, otp }
            : { requestType: "otp-info", phone });
    };

    const switchMethod = (nextMethod: "password" | "otp") => {
        setMethod(nextMethod);
        setOtpRequested(false);
        setOtp(nextMethod === "otp" ? initialOtp : "");
        setErrorMessage(null);
    };

    const backToOtpStart = () => {
        setOtpRequested(false);
        setOtp("");
        setErrorMessage(null);
    };

    return (
        <ConsoleAuthShell
            title="Welcome back"
            subtitle="Sign in with your password or request a WhatsApp OTP for quick Console access."
        >
            <Card className="border-border/70 shadow-sm">
                <CardContent className="space-y-4 p-4 sm:p-6">
                    {sessionExpired ? (
                        <Alert>
                            <AlertTitle>Your owner session expired</AlertTitle>
                            <AlertDescription>Sign in again to continue to the console.</AlertDescription>
                        </Alert>
                    ) : null}
                    {errorMessage ? <OwnerLoginError message={errorMessage} /> : null}

                    <div className="grid grid-cols-2 gap-1 rounded-xl bg-secondary p-1">
                        <Button
                            type="button"
                            variant={method === "password" ? "default" : "ghost"}
                            className={`h-9 rounded-lg text-xs transition-all duration-200 ${
                                method === "password" ? "" : "text-secondary-foreground hover:bg-secondary/80"
                            }`}
                            onClick={() => switchMethod("password")}
                        >
                            <KeyRound className="size-3.5" />
                            Password
                        </Button>
                        <Button
                            type="button"
                            variant={method === "otp" ? "default" : "ghost"}
                            className={`h-9 rounded-lg text-xs transition-all duration-200 ${
                                method === "otp" ? "" : "text-secondary-foreground hover:bg-secondary/80"
                            }`}
                            onClick={() => switchMethod("otp")}
                        >
                            <MessageSquareText className="size-3.5" />
                            OTP
                        </Button>
                    </div>

                    {method === "password" ? (
                        <form className="space-y-3.5" onSubmit={handlePasswordLogin}>
                            <Field className="space-y-1">
                                <FieldLabel required className="text-xs">Phone number</FieldLabel>
                                <FieldContent>
                                    <PhoneInput
                                        className="h-10 w-full rounded-xl border border-input bg-transparent transition-colors duration-200 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50"
                                        value={phone || undefined}
                                        onChange={(value: string | undefined) => setPhone(value ?? "")}
                                        autoComplete="tel"
                                        placeholder="9876543210"
                                    />
                                </FieldContent>
                            </Field>

                            <Field className="space-y-1">
                                <FieldLabel required className="text-xs">Password</FieldLabel>
                                <FieldContent>
                                    <PasswordInput
                                        className="h-10 rounded-xl transition-colors duration-200 text-sm"
                                        placeholder="Enter your password"
                                        value={password}
                                        onChange={(event) => setPassword(event.target.value)}
                                        autoComplete="current-password"
                                    />
                                </FieldContent>
                            </Field>

                            <Button
                                type="submit"
                                className="h-10 w-full rounded-xl transition-all duration-200 text-sm font-semibold"
                                disabled={loginMutation.isPending}
                            >
                                {loginMutation.isPending ? "Signing in..." : "Enter console"}
                            </Button>
                        </form>
                    ) : (
                        <form className="space-y-3.5" onSubmit={handleOtp}>
                            {!otpRequested ? (
                                <Field className="space-y-1">
                                    <FieldLabel required className="text-xs">Phone number</FieldLabel>
                                    <FieldContent>
                                        <PhoneInput
                                            className="h-10 w-full rounded-xl border border-input bg-transparent transition-colors duration-200 focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50"
                                            value={phone || undefined}
                                            onChange={(value: string | undefined) => setPhone(value ?? "")}
                                            autoComplete="tel"
                                            placeholder="9876543210"
                                        />
                                    </FieldContent>
                                </Field>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between border-b border-dashed border-border/60 pb-3">
                                        <div className="flex items-center gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="icon"
                                                className="rounded-xl size-8 border-border/70 shrink-0"
                                                onClick={backToOtpStart}
                                                title="Change phone number"
                                            >
                                                <ChevronLeft className="size-4" />
                                            </Button>
                                            <div>
                                                <p className="text-xs font-semibold text-foreground">{formatPhoneDisplay(phone)}</p>
                                                <p className="text-[10px] text-muted-foreground">OTP verification</p>
                                            </div>
                                        </div>
                                    </div>

                                    <Field data-invalid={otp.length > 0 && otp.length !== 6}>
                                        <div className="flex justify-center w-full">
                                            <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                                                <InputOTPGroup className="gap-1.5 sm:gap-2.5">
                                                    <InputOTPSlot index={0} className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl text-base sm:text-lg font-semibold" />
                                                    <InputOTPSlot index={1} className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl text-base sm:text-lg font-semibold" />
                                                    <InputOTPSlot index={2} className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl text-base sm:text-lg font-semibold" />
                                                </InputOTPGroup>
                                                <InputOTPSeparator className="w-3 sm:w-6 flex justify-center shrink-0 text-muted-foreground" />
                                                <InputOTPGroup className="gap-1.5 sm:gap-2.5">
                                                    <InputOTPSlot index={3} className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl text-base sm:text-lg font-semibold" />
                                                    <InputOTPSlot index={4} className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl text-base sm:text-lg font-semibold" />
                                                    <InputOTPSlot index={5} className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl text-base sm:text-lg font-semibold" />
                                                </InputOTPGroup>
                                            </InputOTP>
                                        </div>
                                        <FieldError errors={otp.length > 0 && otp.length !== 6 ? [{ message: "Enter the 6-digit code" }] : []} />
                                    </Field>
                                </div>
                            )}

                            <Button
                                type="submit"
                                className="h-10 w-full rounded-xl transition-all duration-200 text-sm font-semibold"
                                disabled={loginMutation.isPending || (otpRequested && otp.length !== 6)}
                            >
                                {loginMutation.isPending ? (
                                    "Please wait..."
                                ) : otpRequested ? (
                                    "Verify and enter"
                                ) : (
                                    <>
                                        <img src={whatsAppIcon} alt="" className="size-3.5" />
                                        Send OTP on WhatsApp
                                    </>
                                )}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </ConsoleAuthShell>
    );
};

export default OwnerLoginPage;
