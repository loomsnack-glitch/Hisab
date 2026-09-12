import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { register as registerUser } from "@repo/services";
import { RegisterFormSchema, type RegisterFormJSON } from "@repo/types";
import AuthButton from "../components/auth/auth-button";
import AuthFeedback from "../components/auth/auth-feedback";
import AuthField from "../components/auth/auth-field";
import AuthShell from "../components/auth/auth-shell";
import OtpField from "../components/auth/otp-field";
import PhoneNumberField from "../components/auth/phone-number-field";

type RegistrationScreenProps = {
    onSwitchToLogin: () => void;
};

type RegistrationStep = "phone" | "profile" | "password" | "otp";

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

const RegistrationScreen = ({ onSwitchToLogin }: RegistrationScreenProps) => {
    const [step, setStep] = useState<RegistrationStep>("phone");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedback, setFeedback] = useState<string | null>(null);
    const form = useForm<RegisterFormJSON>({
        resolver: zodResolver(RegisterFormSchema),
        defaultValues,
    });

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
                setFeedback(response.message || "Unable to create your account.");
                return;
            }

            if (response.data?.nextRequestType === "otp-verification") {
                form.setValue("requestType", "otp-verification");
                form.setValue("otp", "");
                setStep("otp");
                setFeedback(response.message || "Verification code sent on WhatsApp.");
                return;
            }

            setFeedback("Registration did not start phone verification. Please try again.");
        } catch (error) {
            setFeedback(
                getErrorMessage(error, "Unable to create your account. Please try again."),
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
                title="Create an Admin account"
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
                        <Text className="text-sm font-semibold text-admin-primary">
                            Already have an account? Sign in
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
                    {feedback ? <AuthFeedback message={feedback} /> : null}
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
                    {feedback ? <AuthFeedback message={feedback} /> : null}
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
            subtitle="The WhatsApp verification step will be completed next."
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
                {feedback ? <AuthFeedback message={feedback} tone="info" /> : null}
                <AuthButton
                    label="Continue"
                    disabled
                    onPress={() => undefined}
                />
                <Pressable
                    onPress={goBack}
                    accessibilityRole="button"
                    className="items-center"
                >
                    <Text className="text-sm font-semibold text-admin-primary">
                        Back
                    </Text>
                </Pressable>
            </View>
        </AuthShell>
    );
};

export default RegistrationScreen;
