import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import AuthButton from "../components/auth/auth-button";
import AuthFeedback from "../components/auth/auth-feedback";
import AuthField from "../components/auth/auth-field";
import AuthShell from "../components/auth/auth-shell";
import OtpField from "../components/auth/otp-field";
import PhoneNumberField from "../components/auth/phone-number-field";

type RegisterPreviewScreenProps = {
    onSwitchToLogin: () => void;
};

type RegistrationValues = {
    phone: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    confirmPassword: string;
};

type RegistrationStep = 1 | 2 | 3 | 4;

const TOTAL_STEPS = 4;

const RegisterPreviewScreen = ({ onSwitchToLogin }: RegisterPreviewScreenProps) => {
    const [step, setStep] = useState<RegistrationStep>(1);
    const [values, setValues] = useState<RegistrationValues>({
        phone: "",
        firstName: "",
        lastName: "",
        email: "",
        password: "",
        confirmPassword: "",
    });
    const [otp, setOtp] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);

    const updateValue = <T extends keyof RegistrationValues>(key: T, value: RegistrationValues[T]) => {
        setValues((current) => ({ ...current, [key]: value }));
        setError(null);
    };

    const continueToNextStep = () => {
        setError(null);
        setFeedback(null);

        if (step === 1 && !values.phone) {
            setError("Enter your phone number to continue.");
            return;
        }

        if (step === 2 && (!values.firstName || !values.lastName)) {
            setError("Enter your first and last name to continue.");
            return;
        }

        if (step === 3) {
            if (!values.password || !values.confirmPassword) {
                setError("Enter and confirm your password to continue.");
                return;
            }
            if (values.password !== values.confirmPassword) {
                setError("Passwords do not match.");
                return;
            }
        }

        if (step === 4) {
            if (otp.length !== 6) {
                setError("Enter the 6-digit verification code.");
                return;
            }
            setFeedback("Preview complete: real registration will be connected in a later phase.");
            return;
        }

        setStep((current) => (current + 1) as RegistrationStep);
        if (step === 3) {
            setFeedback("Preview only: the WhatsApp verification step is ready for API wiring.");
        }
    };

    const goBack = () => {
        setError(null);
        setFeedback(null);
        if (step === 1) {
            onSwitchToLogin();
            return;
        }
        setStep((current) => (current - 1) as RegistrationStep);
    };

    const renderStep = () => {
        if (step === 1) {
            return (
                <PhoneNumberField
                    value={values.phone}
                    onChangeText={(value) => updateValue("phone", value)}
                    required
                    autoFocus
                />
            );
        }

        if (step === 2) {
            return (
                <View className="gap-4">
                    <View className="flex-row gap-3">
                        <View className="flex-1">
                            <AuthField
                                label="First name"
                                value={values.firstName}
                                onChangeText={(value) => updateValue("firstName", value)}
                                required
                                placeholder="First name"
                            />
                        </View>
                        <View className="flex-1">
                            <AuthField
                                label="Last name"
                                value={values.lastName}
                                onChangeText={(value) => updateValue("lastName", value)}
                                required
                                placeholder="Last name"
                            />
                        </View>
                    </View>
                    <AuthField
                        label="Work email"
                        value={values.email}
                        onChangeText={(value) => updateValue("email", value)}
                        placeholder="name@retail.com"
                        keyboardType="email-address"
                        autoCapitalize="none"
                        hint="Optional"
                    />
                </View>
            );
        }

        if (step === 3) {
            return (
                <View className="gap-4">
                    <AuthField
                        label="Password"
                        value={values.password}
                        onChangeText={(value) => updateValue("password", value)}
                        secureTextEntry
                        required
                        placeholder="Create a password"
                        autoCapitalize="none"
                    />
                    <AuthField
                        label="Confirm password"
                        value={values.confirmPassword}
                        onChangeText={(value) => updateValue("confirmPassword", value)}
                        secureTextEntry
                        required
                        placeholder="Repeat your password"
                        autoCapitalize="none"
                    />
                    <Text className="text-sm leading-5 text-admin-muted dark:text-admin-muted-dark">
                        Use 8–32 characters. The final password rules will be enforced by the shared schema.
                    </Text>
                </View>
            );
        }

        return <OtpField value={otp} onChangeText={setOtp} error={error ?? undefined} />;
    };

    return (
        <AuthShell
            title={step === 4 ? "Verify your phone" : "Create your Admin account"}
            subtitle={step === 4 ? "Confirm the WhatsApp code to finish this preview." : "Set up your secure Ganatri Admin account."}
            stepLabel={`Step ${step} of ${TOTAL_STEPS}`}
            currentStep={step}
            totalSteps={TOTAL_STEPS}
        >
            <View className="gap-5">
                {renderStep()}
                {error && step !== 4 ? <AuthFeedback message={error} /> : null}
                {feedback ? <AuthFeedback message={feedback} tone="info" /> : null}
                <AuthButton label={step === 4 ? "Complete preview" : "Continue"} onPress={continueToNextStep} />
                <Pressable onPress={goBack} accessibilityRole="button" className="items-center">
                    <Text className="text-sm font-semibold text-admin-primary">
                        {step === 1 ? "Back to sign in" : "Back"}
                    </Text>
                </Pressable>
            </View>
        </AuthShell>
    );
};

export default RegisterPreviewScreen;
