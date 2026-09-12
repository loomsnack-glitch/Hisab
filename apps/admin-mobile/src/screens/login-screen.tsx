import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { setAuthToken, userLogin } from "@repo/services";
import {
    formatPhoneDisplay,
    LoginFormSchema,
    type LoginFormJSON,
} from "@repo/types";
import AuthButton from "../components/auth/auth-button";
import AuthFeedback from "../components/auth/auth-feedback";
import AuthField from "../components/auth/auth-field";
import AuthPreviewSwitcher from "../components/auth/auth-preview-switcher";
import AuthShell from "../components/auth/auth-shell";
import OtpField from "../components/auth/otp-field";
import PhoneNumberField from "../components/auth/phone-number-field";
import { adminAuthKeys } from "../lib/auth-keys";
import { resolveLoginSession } from "../lib/login-session";
import {
    createOtpTiming,
    formatOtpCountdown,
    getRemainingSeconds,
} from "../lib/otp-timing";
import { useAdminAuthActions } from "../store/auth.store";

type LoginScreenProps = {
    onSwitchToRegister: () => void;
};

type LoginMethod = "password" | "otp";

type Feedback = {
    message: string;
    tone: "error" | "info";
};

const defaultValues: LoginFormJSON = {
    requestType: "user-info",
    phone: "",
    password: "",
    otp: "",
};

const getErrorMessage = (error: unknown, fallback: string) => {
    if (
        error &&
        typeof error === "object" &&
        "message" in error &&
        typeof error.message === "string"
    ) {
        return error.message;
    }

    return fallback;
};

const LoginScreen = ({ onSwitchToRegister }: LoginScreenProps) => {
    const { setAuthenticated } = useAdminAuthActions();
    const queryClient = useQueryClient();
    const [method, setMethod] = useState<LoginMethod>("password");
    const [otpRequested, setOtpRequested] = useState(false);
    const [otpTiming, setOtpTiming] = useState<{
        expiresAt: number;
        resendAvailableAt: number;
    } | null>(null);
    const [now, setNow] = useState(() => Date.now());
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<Feedback | null>(null);
    const form = useForm<LoginFormJSON>({
        resolver: zodResolver(LoginFormSchema),
        defaultValues,
    });

    useEffect(() => {
        if (!otpTiming) {
            return undefined;
        }

        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [otpTiming]);

    const otpExpiresIn = otpTiming
        ? getRemainingSeconds(otpTiming.expiresAt, now)
        : 0;
    const resendAvailableIn = otpTiming
        ? getRemainingSeconds(otpTiming.resendAvailableAt, now)
        : 0;
    const otpExpired = otpRequested && otpExpiresIn === 0;

    const persistLoginSession = async (values: LoginFormJSON) => {
        const response = await userLogin(values);

        if (response.status === "error") {
            setFeedback({
                message: response.message || "Login failed.",
                tone: "error",
            });
            return;
        }

        if (response.data?.nextRequestType === "otp-verification") {
            const issuedAt = Date.now();
            form.setValue("requestType", "otp-verification");
            form.setValue("otp", "");
            setOtpRequested(true);
            setOtpTiming(createOtpTiming(issuedAt));
            setNow(issuedAt);
            setFeedback({
                message: response.message || "Verification code sent on WhatsApp.",
                tone: "info",
            });
            return;
        }

        const session = resolveLoginSession(response);
        if (!session) {
            setFeedback({
                message: "Login did not return a valid session. Please try again.",
                tone: "error",
            });
            return;
        }

        await setAuthToken(session.token);
        setAuthenticated(session.user);
        queryClient.setQueryData(adminAuthKeys.me, response);
        setFeedback(null);
    };

    const submitPassword: SubmitHandler<LoginFormJSON> = async (values) => {
        setFeedback(null);
        setIsSubmitting(true);

        try {
            await persistLoginSession({ ...values, requestType: "user-info" });
        } catch (error) {
            setFeedback({
                message: getErrorMessage(
                    error,
                    "Unable to sign in. Please try again.",
                ),
                tone: "error",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const requestOtp = async () => {
        form.setValue("requestType", "otp-info");
        const validPhone = await form.trigger("phone");
        if (!validPhone || isSubmitting) {
            return;
        }

        setFeedback(null);
        setIsSubmitting(true);

        try {
            await persistLoginSession({
                phone: form.getValues("phone"),
                requestType: "otp-info",
            });
        } catch (error) {
            setFeedback({
                message: getErrorMessage(
                    error,
                    "Unable to send the WhatsApp code. Please try again.",
                ),
                tone: "error",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const submitOtp: SubmitHandler<LoginFormJSON> = async (values) => {
        if (otpExpired) {
            setFeedback({
                message: "This code has expired. Request a new code to continue.",
                tone: "error",
            });
            return;
        }

        setFeedback(null);
        setIsSubmitting(true);

        try {
            await persistLoginSession({
                ...values,
                requestType: "otp-verification",
            });
        } catch (error) {
            setFeedback({
                message: getErrorMessage(
                    error,
                    "Unable to verify the code. Please try again.",
                ),
                tone: "error",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const switchMethod = (nextMethod: LoginMethod) => {
        setMethod(nextMethod);
        setFeedback(null);
        setOtpRequested(false);
        setOtpTiming(null);
        form.setValue("otp", "");
        form.setValue(
            "requestType",
            nextMethod === "password" ? "user-info" : "otp-info",
        );
    };

    const resetOtpFlow = () => {
        setOtpRequested(false);
        setOtpTiming(null);
        setFeedback(null);
        form.setValue("otp", "");
        form.setValue("requestType", "otp-info");
    };

    if (otpRequested) {
        const expiryFeedback = otpExpired
            ? {
                  message: "This code has expired. Request a new code to continue.",
                  tone: "error" as const,
              }
            : feedback;

        return (
            <AuthShell
                title="Enter verification code"
                subtitle={`We sent a 6-digit code to WhatsApp at ${formatPhoneDisplay(form.getValues("phone"))}.`}
            >
                <View className="gap-5">
                    <Controller
                        control={form.control}
                        name="otp"
                        render={({ field, fieldState }) => (
                            <OtpField
                                value={field.value ?? ""}
                                onChangeText={field.onChange}
                                error={fieldState.error?.message}
                                disabled={otpExpired}
                            />
                        )}
                    />
                    <Text className="text-center text-sm font-medium text-admin-muted dark:text-admin-muted-dark">
                        {otpExpired
                            ? "Code expired"
                            : `Code expires in ${formatOtpCountdown(otpExpiresIn)}`}
                    </Text>
                    {expiryFeedback ? (
                        <AuthFeedback
                            message={expiryFeedback.message}
                            tone={expiryFeedback.tone}
                        />
                    ) : null}
                    <AuthButton
                        label="Verify & sign in"
                        loading={isSubmitting}
                        disabled={otpExpired}
                        onPress={form.handleSubmit(submitOtp)}
                    />
                    <View className="items-center gap-3">
                        {resendAvailableIn > 0 ? (
                            <Text className="text-sm text-admin-muted dark:text-admin-muted-dark">
                                Resend code in {resendAvailableIn}s
                            </Text>
                        ) : (
                            <Pressable
                                onPress={requestOtp}
                                accessibilityRole="button"
                            >
                                <Text className="text-sm font-semibold text-admin-primary">
                                    Resend verification code
                                </Text>
                            </Pressable>
                        )}
                        <Pressable
                            onPress={resetOtpFlow}
                            accessibilityRole="button"
                        >
                            <Text className="text-sm font-semibold text-admin-primary">
                                Use a different phone number
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </AuthShell>
        );
    }

    return (
        <AuthShell
            title="Sign in to Ganatri Admin"
            subtitle="Manage your organization from a secure admin workspace."
        >
            <AuthPreviewSwitcher
                mode="login"
                onChange={(nextMode) =>
                    nextMode === "register" && onSwitchToRegister()
                }
            />
            <View className="gap-5">
                <View className="flex-row rounded-2xl border border-admin-border bg-admin-background p-1 dark:border-admin-border-dark dark:bg-admin-background-dark">
                    {(["password", "otp"] as const).map((option) => (
                        <Pressable
                            key={option}
                            className={`flex-1 items-center rounded-xl px-3 py-2.5 ${
                                option === method
                                    ? "bg-admin-surface shadow-sm dark:bg-admin-surface-dark"
                                    : ""
                            }`}
                            onPress={() => switchMethod(option)}
                            accessibilityRole="tab"
                            accessibilityState={{ selected: option === method }}
                        >
                            <Text
                                className={`text-sm font-semibold ${
                                    option === method
                                        ? "text-admin-foreground dark:text-admin-foreground-dark"
                                        : "text-admin-muted dark:text-admin-muted-dark"
                                }`}
                            >
                                {option === "password" ? "Password" : "WhatsApp OTP"}
                            </Text>
                        </Pressable>
                    ))}
                </View>
                <Controller
                    control={form.control}
                    name="phone"
                    render={({ field, fieldState }) => (
                        <PhoneNumberField
                            value={field.value}
                            onChangeText={field.onChange}
                            error={fieldState.error?.message}
                            required
                            autoFocus
                        />
                    )}
                />
                {method === "password" ? (
                    <Controller
                        control={form.control}
                        name="password"
                        render={({ field, fieldState }) => (
                            <AuthField
                                label="Password"
                                value={field.value ?? ""}
                                onChangeText={field.onChange}
                                onBlur={field.onBlur}
                                error={fieldState.error?.message}
                                secureTextEntry
                                required
                                placeholder="Enter your password"
                                autoCapitalize="none"
                            />
                        )}
                    />
                ) : null}
                {feedback ? (
                    <AuthFeedback message={feedback.message} tone={feedback.tone} />
                ) : null}
                <AuthButton
                    label={method === "password" ? "Sign in" : "Send WhatsApp code"}
                    loading={isSubmitting}
                    onPress={
                        method === "password"
                            ? form.handleSubmit(submitPassword)
                            : requestOtp
                    }
                />
            </View>
            <View className="mt-5 items-center">
                <Text className="text-sm text-admin-muted dark:text-admin-muted-dark">
                    New to Ganatri?{" "}
                    <Text
                        className="font-semibold text-admin-primary"
                        onPress={onSwitchToRegister}
                    >
                        Create an account
                    </Text>
                </Text>
            </View>
        </AuthShell>
    );
};

export default LoginScreen;
