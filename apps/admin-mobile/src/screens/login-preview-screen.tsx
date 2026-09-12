import { useState } from "react";
import { Pressable, Text, View } from "react-native";
import { formatPhoneDisplay } from "@repo/types";
import AuthButton from "../components/auth/auth-button";
import AuthFeedback from "../components/auth/auth-feedback";
import AuthField from "../components/auth/auth-field";
import AuthShell from "../components/auth/auth-shell";
import AuthPreviewSwitcher from "../components/auth/auth-preview-switcher";
import OtpField from "../components/auth/otp-field";
import PhoneNumberField from "../components/auth/phone-number-field";
import type { AuthPreviewMode } from "../components/auth/auth-preview-switcher";

type LoginPreviewScreenProps = {
    onSwitchToRegister: () => void;
};

type LoginMethod = "password" | "otp";

const LoginPreviewScreen = ({ onSwitchToRegister }: LoginPreviewScreenProps) => {
    const [method, setMethod] = useState<LoginMethod>("password");
    const [phone, setPhone] = useState("");
    const [password, setPassword] = useState("");
    const [otp, setOtp] = useState("");
    const [otpRequested, setOtpRequested] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [feedback, setFeedback] = useState<string | null>(null);

    const switchPreviewMode = (nextMode: AuthPreviewMode) => {
        if (nextMode === "register") {
            onSwitchToRegister();
        }
    };

    const submit = () => {
        setError(null);
        setFeedback(null);

        if (!phone) {
            setError("Enter your phone number to continue.");
            return;
        }

        if (method === "password" && !password) {
            setError("Enter your password to continue.");
            return;
        }

        if (method === "otp" && !otpRequested) {
            setOtpRequested(true);
            setFeedback("Preview only: the WhatsApp verification step is ready for API wiring.");
            return;
        }

        if (method === "otp" && otp.length !== 6) {
            setError("Enter the 6-digit verification code.");
            return;
        }

        setFeedback("Preview complete: real sign-in will be connected in a later phase.");
    };

    const resendPreviewCode = () => {
        setOtp("");
        setError(null);
        setFeedback("Preview only: resend is ready for API wiring.");
    };

    if (otpRequested) {
        return (
            <AuthShell
                title="Enter verification code"
                subtitle={`We sent a 6-digit code to WhatsApp at ${formatPhoneDisplay(phone)}.`}
            >
                <View className="gap-5">
                    <OtpField value={otp} onChangeText={setOtp} error={error ?? undefined} />
                    {feedback ? <AuthFeedback message={feedback} tone="info" /> : null}
                    <AuthButton label="Verify preview" onPress={submit} />
                    <View className="items-center gap-3">
                        <Pressable
                            onPress={() => {
                                setOtpRequested(false);
                                setOtp("");
                                setError(null);
                                setFeedback(null);
                            }}
                            accessibilityRole="button"
                        >
                            <Text className="text-sm font-semibold text-admin-primary">Use a different phone number</Text>
                        </Pressable>
                        <Pressable onPress={resendPreviewCode} accessibilityRole="button">
                            <Text className="text-sm font-semibold text-admin-primary">Resend verification code</Text>
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
            <AuthPreviewSwitcher mode="login" onChange={switchPreviewMode} />
            <View className="gap-5">
                <View className="flex-row rounded-2xl border border-admin-border bg-admin-background p-1 dark:border-admin-border-dark dark:bg-admin-background-dark">
                    {(["password", "otp"] as const).map((option) => (
                        <Pressable
                            key={option}
                            className={`flex-1 items-center rounded-xl px-3 py-2.5 ${option === method ? "bg-admin-surface shadow-sm dark:bg-admin-surface-dark" : ""}`}
                            onPress={() => {
                                setMethod(option);
                                setError(null);
                                setFeedback(null);
                            }}
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

                <PhoneNumberField value={phone} onChangeText={setPhone} required autoFocus />
                {method === "password" ? (
                    <AuthField
                        label="Password"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                        required
                        placeholder="Enter your password"
                        autoCapitalize="none"
                    />
                ) : null}
                {error ? <AuthFeedback message={error} /> : null}
                {feedback ? <AuthFeedback message={feedback} tone="info" /> : null}
                <AuthButton
                    label={method === "otp" ? "Send WhatsApp code" : "Sign in preview"}
                    onPress={submit}
                />
                <View className="items-center">
                    <Text className="text-sm text-admin-muted dark:text-admin-muted-dark">
                        New to Ganatri?{" "}
                        <Text className="font-semibold text-admin-primary" onPress={onSwitchToRegister}>
                            Create an account
                        </Text>
                    </Text>
                </View>
            </View>
        </AuthShell>
    );
};

export default LoginPreviewScreen;
