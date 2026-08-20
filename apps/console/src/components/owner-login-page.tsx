import { useState, type FormEvent } from "react";
import { useMutation } from "@tanstack/react-query";
import { KeyRound, MessageSquareText, ShieldCheck } from "lucide-react";
import logo from "@repo/assets/logo.png";
import whatsAppIcon from "@repo/assets/services/whatsapp.webp";
import { ownerLogin } from "@repo/services";
import { formatPhoneDisplay, OwnerLoginSchema, type OwnerLoginJSON } from "@repo/types";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@repo/ui/components/input-otp";
import { PasswordInput } from "@repo/ui/components/password-input";
import { PhoneInput } from "@repo/ui/components/phone-input";

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

    return (
        <main className="min-h-screen bg-slate-950 px-4 py-10 text-slate-100 sm:px-6">
            <div className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-5xl items-center gap-10 lg:grid-cols-[1fr_420px]">
                <section className="space-y-6">
                    <div className="flex items-center gap-3">
                        <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-500">
                            <img src={logo} alt="Ganatri" className="size-7 brightness-0 invert" />
                        </div>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-blue-300">Ganatri internal</p>
                            <h1 className="text-2xl font-semibold">Ganatri Console</h1>
                        </div>
                    </div>
                    <div className="max-w-xl space-y-3">
                        <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">A separate doorway for platform oversight.</h2>
                        <p className="text-base leading-7 text-slate-300">
                            Owner User access is isolated from customer administration and Store Device sessions.
                        </p>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-slate-300">
                        <ShieldCheck className="size-5 text-emerald-400" />
                        Active status is verified on every Console request.
                    </div>
                </section>

                <Card className="border-slate-700 bg-white text-slate-950 shadow-2xl">
                    <CardHeader>
                        <CardTitle>Owner User sign in</CardTitle>
                        <CardDescription>Use your password or a WhatsApp OTP.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {sessionExpired ? (
                            <Alert>
                                <AlertTitle>Your owner session expired</AlertTitle>
                                <AlertDescription>Sign in again to continue to the console.</AlertDescription>
                            </Alert>
                        ) : null}
                        {errorMessage ? <OwnerLoginError message={errorMessage} /> : null}

                        <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-100 p-1">
                            <Button type="button" variant={method === "password" ? "default" : "ghost"} onClick={() => switchMethod("password")}>
                                <KeyRound className="size-4" /> Password
                            </Button>
                            <Button type="button" variant={method === "otp" ? "default" : "ghost"} onClick={() => switchMethod("otp")}>
                                <MessageSquareText className="size-4" /> WhatsApp OTP
                            </Button>
                        </div>

                        {!otpRequested ? (
                            <label className="block space-y-2 text-sm font-medium">
                                Phone number
                                <PhoneInput value={phone || undefined} onChange={(value: string | undefined) => setPhone(value ?? "")} className="h-11 rounded-xl border px-3" />
                            </label>
                        ) : (
                            <p className="text-sm text-slate-600">Code sent to {formatPhoneDisplay(phone)}</p>
                        )}

                        {method === "password" ? (
                            <form className="space-y-4" onSubmit={handlePasswordLogin}>
                                <label className="block space-y-2 text-sm font-medium">
                                    Password
                                    <PasswordInput value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" />
                                </label>
                                <Button className="w-full" disabled={loginMutation.isPending} type="submit">
                                    {loginMutation.isPending ? "Signing in..." : "Enter console"}
                                </Button>
                            </form>
                        ) : (
                            <form className="space-y-4" onSubmit={handleOtp}>
                                {otpRequested ? (
                                    <div className="flex justify-center">
                                        <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                                            <InputOTPGroup>
                                                {[0, 1, 2, 3, 4, 5].map((index) => <InputOTPSlot key={index} index={index} />)}
                                            </InputOTPGroup>
                                        </InputOTP>
                                    </div>
                                ) : null}
                                <Button className="w-full" disabled={loginMutation.isPending || (otpRequested && otp.length !== 6)} type="submit">
                                    <img src={whatsAppIcon} alt="" className="size-4" />
                                    {loginMutation.isPending ? "Please wait..." : otpRequested ? "Verify and enter" : "Send OTP on WhatsApp"}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </main>
    );
};

export default OwnerLoginPage;
