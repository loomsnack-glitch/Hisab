import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { register as registerUser, setAuthToken } from "@repo/services";
import {
    formatPhoneDisplay,
    RegisterFormSchema,
    type RegisterFormJSON,
} from "@repo/types";
import AuthButton from "../components/auth/auth-button";
import AuthField from "../components/auth/auth-field";
import AuthShell from "../components/auth/auth-shell";
import OtpField from "../components/auth/otp-field";
import PhoneNumberField from "../components/auth/phone-number-field";
import { adminAuthKeys } from "../lib/auth-keys";
import { getAuthErrorMessage } from "../lib/auth-errors";
import { resolveAuthSession } from "../lib/auth-session";
import { showAuthToast } from "../lib/auth-toast";
import {
    createOtpTiming,
    getRemainingSeconds,
} from "../lib/otp-timing";
import { useAdminAuthActions } from "../store/auth.store";

type RegistrationScreenProps = {
    onSwitchToLogin: () => void;
};

type RegistrationStep = "phone" | "profile" | "password" | "otp";

type RegistrationFeedback = {
    message: string;
    tone: "error" | "info" | "success";
};

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

const RegistrationScreen = ({ onSwitchToLogin }: RegistrationScreenProps) => {
    const [step, setStep] = useState<RegistrationStep>("phone");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<RegistrationFeedback | null>(null);
    const [otpTiming, setOtpTiming] = useState<{
        expiresAt: number;
        resendAvailableAt: number;
    } | null>(null);
    const [now, setNow] = useState(() => Date.now());
    const { setAuthenticated } = useAdminAuthActions();
    const queryClient = useQueryClient();
    const form = useForm<RegisterFormJSON>({
        resolver: zodResolver(RegisterFormSchema),
        defaultValues,
    });

    useEffect(() => {
        if (!otpTiming) {
            return undefined;
        }

        const timer = setInterval(() => setNow(Date.now()), 1000);
        return () => clearInterval(timer);
    }, [otpTiming]);

    useEffect(() => {
        if (feedback) {
            showAuthToast(feedback.message, feedback.tone);
        }
    }, [feedback]);

    const setFeedbackMessage = (
        message: string,
        tone: RegistrationFeedback["tone"] = "error",
    ) => setFeedback({ message, tone });

    const otpExpiresIn = otpTiming
        ? getRemainingSeconds(otpTiming.expiresAt, now)
        : 0;
    const resendAvailableIn = otpTiming
        ? getRemainingSeconds(otpTiming.resendAvailableAt, now)
        : 0;
    const otpExpired = step === "otp" && otpExpiresIn === 0;

    const validateAndAdvance = async () => {
        setFeedback(null);

        if (step === "phone") {
            if (await form.trigger("phone")) {
                setStep("profile");
            }
            return;
        }

        if (step === "profile") {
            const results = await Promise.all([
                form.trigger("firstName"),
                form.trigger("lastName"),
                form.trigger("email"),
            ]);
            if (results.every(Boolean)) {
                setStep("password");
            }
            return;
        }

        if (step !== "password") {
            return;
        }

        const results = await Promise.all([
            form.trigger("password"),
            form.trigger("confirmPassword"),
        ]);
        if (!results.every(Boolean) || isSubmitting) {
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await registerUser({
                ...form.getValues(),
                requestType: "user-info",
            });

            if (response.status === "error") {
                setFeedbackMessage(response.message || "Unable to create your account.");
                return;
            }

            if (response.data?.nextRequestType === "otp-verification") {
                const issuedAt = Date.now();
                form.setValue("requestType", "otp-verification");
                form.setValue("otp", "");
                setOtpTiming(createOtpTiming(issuedAt));
                setNow(issuedAt);
                setStep("otp");
                setFeedbackMessage(response.message || "Verification code sent on WhatsApp.", "info");
                return;
            }

            const session = resolveAuthSession(response);
            if (session) {
                await setAuthToken(session.token);
                setAuthenticated(session.user);
                queryClient.setQueryData(adminAuthKeys.me, response);
                return;
            }

            setFeedbackMessage("Registration did not start phone verification. Please try again.");
        } catch (error) {
            setFeedbackMessage(
                getAuthErrorMessage(error, "Unable to create your account. Please try again."),
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const submitOtp: SubmitHandler<RegisterFormJSON> = async (values) => {
        if (otpExpired) {
            setFeedbackMessage("This code has expired. Request a new code to continue.");
            return;
        }

        setFeedback(null);
        setIsSubmitting(true);
        try {
            const response = await registerUser({
                ...values,
                requestType: "otp-verification",
            });

            if (response.status === "error") {
                setFeedbackMessage(response.message || "The verification code could not be accepted.");
                return;
            }

            if (response.data?.nextRequestType === "otp-verification") {
                const issuedAt = Date.now();
                setOtpTiming(createOtpTiming(issuedAt));
                setNow(issuedAt);
                form.setValue("otp", "");
                setFeedbackMessage(response.message || "A new verification code was sent on WhatsApp.", "info");
                return;
            }

            const session = resolveAuthSession(response);
            if (!session) {
                setFeedbackMessage("Registration did not return a valid session. Please try again.");
                return;
            }

            await setAuthToken(session.token);
            setAuthenticated(session.user);
            queryClient.setQueryData(adminAuthKeys.me, response);
        } catch (error) {
            setFeedbackMessage(
                getAuthErrorMessage(error, "Unable to verify your account. Please try again."),
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const resendOtp = async () => {
        if (resendAvailableIn > 0 || isSubmitting) {
            return;
        }

        setFeedback(null);
        setIsSubmitting(true);
        try {
            const response = await registerUser({
                ...form.getValues(),
                requestType: "otp-verification",
                resendOTP: "phoneOTP",
            });

            if (response.status === "error") {
                setFeedbackMessage(response.message || "Unable to resend the verification code.");
                return;
            }

            const issuedAt = Date.now();
            setOtpTiming(createOtpTiming(issuedAt));
            setNow(issuedAt);
            form.setValue("otp", "");
            setFeedbackMessage(response.message || "A new verification code was sent on WhatsApp.", "info");
        } catch (error) {
            setFeedbackMessage(
                getAuthErrorMessage(error, "Unable to resend the verification code. Please try again."),
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const goBack = () => {
        setFeedback(null);
        if (step === "phone") {
            onSwitchToLogin();
            return;
        }

        if (step === "otp") {
            setOtpTiming(null);
        }

        setStep((current) => {
            if (current === "profile") return "phone";
            if (current === "password") return "profile";
            return "password";
        });
    };

    const stepLabel = `Step ${STEP_NUMBERS[step]} of ${TOTAL_STEPS}`;

    if (step === "phone") {
        return (
            <AuthShell
                title="Register for Ganatri Admin"
                subtitle="Start with the phone number you use for Ganatri."
                stepLabel={stepLabel}
                currentStep={1}
                totalSteps={TOTAL_STEPS}
            >
                <View className="gap-5">
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
                    <AuthButton label="Continue" onPress={validateAndAdvance} />
                    <Pressable
                        onPress={onSwitchToLogin}
                        accessibilityRole="button"
                        className="items-center"
                    >
                        <Text className="text-sm text-admin-muted dark:text-admin-muted-dark">
                            Already have an account?{" "}
                            <Text className="font-semibold text-admin-primary">
                                Login
                            </Text>
                        </Text>
                    </Pressable>
                </View>
            </AuthShell>
        );
    }

    if (step === "profile") {
        return (
            <AuthShell
                title="Tell us about yourself"
                subtitle="These details identify you in your Admin workspace."
                stepLabel={stepLabel}
                currentStep={2}
                totalSteps={TOTAL_STEPS}
            >
                <View className="gap-5">
                    <View className="flex-row gap-3">
                        <View className="flex-1">
                            <Controller
                                control={form.control}
                                name="firstName"
                                render={({ field, fieldState }) => (
                                    <AuthField
                                        label="First name"
                                        value={field.value}
                                        onChangeText={field.onChange}
                                        onBlur={field.onBlur}
                                        error={fieldState.error?.message}
                                        required
                                        placeholder="First name"
                                    />
                                )}
                            />
                        </View>
                        <View className="flex-1">
                            <Controller
                                control={form.control}
                                name="lastName"
                                render={({ field, fieldState }) => (
                                    <AuthField
                                        label="Last name"
                                        value={field.value}
                                        onChangeText={field.onChange}
                                        onBlur={field.onBlur}
                                        error={fieldState.error?.message}
                                        required
                                        placeholder="Last name"
                                    />
                                )}
                            />
                        </View>
                    </View>
                    <Controller
                        control={form.control}
                        name="email"
                        render={({ field, fieldState }) => (
                            <AuthField
                                label="Work email"
                                value={field.value ?? ""}
                                onChangeText={field.onChange}
                                onBlur={field.onBlur}
                                error={fieldState.error?.message}
                                placeholder="name@retail.com"
                                keyboardType="email-address"
                                autoCapitalize="none"
                                hint="Optional"
                            />
                        )}
                    />
                    <View className="flex-row gap-3">
                        <AuthButton label="Back" variant="secondary" onPress={goBack} />
                        <View className="flex-1">
                            <AuthButton label="Continue" onPress={validateAndAdvance} />
                        </View>
                    </View>
                </View>
            </AuthShell>
        );
    }

    if (step === "password") {
        return (
            <AuthShell
                title="Create a password"
                subtitle="Use 8–32 characters to protect your Admin account."
                stepLabel={stepLabel}
                currentStep={3}
                totalSteps={TOTAL_STEPS}
            >
                <View className="gap-5">
                    <Controller
                        control={form.control}
                        name="password"
                        render={({ field, fieldState }) => (
                            <AuthField
                                label="Password"
                                value={field.value}
                                onChangeText={field.onChange}
                                onBlur={field.onBlur}
                                error={fieldState.error?.message}
                                secureTextEntry
                                required
                                placeholder="Create a password"
                                autoCapitalize="none"
                            />
                        )}
                    />
                    <Controller
                        control={form.control}
                        name="confirmPassword"
                        render={({ field, fieldState }) => (
                            <AuthField
                                label="Confirm password"
                                value={field.value}
                                onChangeText={field.onChange}
                                onBlur={field.onBlur}
                                error={fieldState.error?.message}
                                secureTextEntry
                                required
                                placeholder="Repeat your password"
                                autoCapitalize="none"
                            />
                        )}
                    />
                    <View className="flex-row gap-3">
                        <AuthButton label="Back" variant="secondary" onPress={goBack} />
                        <View className="flex-1">
                            <AuthButton
                                label="Send WhatsApp code"
                                loading={isSubmitting}
                                onPress={validateAndAdvance}
                            />
                        </View>
                    </View>
                </View>
            </AuthShell>
        );
    }

    return (
        <AuthShell
            title="Verify your phone"
            subtitle={`We sent a 6-digit code to WhatsApp at ${formatPhoneDisplay(form.getValues("phone"))}.`}
            stepLabel={stepLabel}
            currentStep={4}
            totalSteps={TOTAL_STEPS}
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
                        />
                    )}
                />
                <View className="items-center">
                    {resendAvailableIn > 0 ? (
                        <Text className="text-center text-sm text-admin-muted dark:text-admin-muted-dark">
                            Didn&apos;t receive it? Resend in {resendAvailableIn}s
                        </Text>
                    ) : (
                        <Pressable
                            onPress={resendOtp}
                            accessibilityRole="button"
                            className="min-h-11 items-center justify-center px-3"
                        >
                            <Text className="text-sm font-semibold text-admin-primary">
                                Didn&apos;t receive it? Resend code
                            </Text>
                        </Pressable>
                    )}
                </View>
                <AuthButton
                    label="Register"
                    loading={isSubmitting}
                    disabled={otpExpired}
                    onPress={form.handleSubmit(submitOtp)}
                />
                <Pressable
                    onPress={goBack}
                    accessibilityRole="button"
                    className="min-h-11 items-center justify-center px-3"
                >
                    <Text className="text-sm font-semibold text-admin-muted dark:text-admin-muted-dark">
                        Use a different phone number
                    </Text>
                </Pressable>
            </View>
        </AuthShell>
    );
};

export default RegistrationScreen;
