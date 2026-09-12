import { useState } from "react";
import { Text, View } from "react-native";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { userLogin, setAuthToken } from "@repo/services";
import { LoginFormSchema, type LoginFormJSON } from "@repo/types";
import AuthButton from "../components/auth/auth-button";
import AuthFeedback from "../components/auth/auth-feedback";
import AuthField from "../components/auth/auth-field";
import AuthPreviewSwitcher from "../components/auth/auth-preview-switcher";
import AuthShell from "../components/auth/auth-shell";
import PhoneNumberField from "../components/auth/phone-number-field";
import { adminAuthKeys } from "../lib/auth-keys";
import { resolveLoginSession } from "../lib/login-session";
import { useAdminAuthActions } from "../store/auth.store";

type LoginScreenProps = {
    onSwitchToRegister: () => void;
};

const defaultValues: LoginFormJSON = {
    requestType: "user-info",
    phone: "",
    password: "",
    otp: "",
};

const getErrorMessage = (error: unknown, fallback: string) => {
    if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
        return error.message;
    }

    return fallback;
};

const LoginScreen = ({ onSwitchToRegister }: LoginScreenProps) => {
    const { setAuthenticated } = useAdminAuthActions();
    const queryClient = useQueryClient();
    const [feedback, setFeedback] = useState<{ message: string; tone: "error" | "info" } | null>(null);
    const form = useForm<LoginFormJSON>({
        resolver: zodResolver(LoginFormSchema),
        defaultValues,
    });

    const submit: SubmitHandler<LoginFormJSON> = async (values) => {
        setFeedback(null);

        try {
            const response = await userLogin(values);
            if (response.status === "error") {
                setFeedback({ message: response.message || "Login failed.", tone: "error" });
                return;
            }

            const session = resolveLoginSession(response);
            if (!session) {
                setFeedback({ message: "Login did not return a valid session. Please try again.", tone: "error" });
                return;
            }

            await setAuthToken(session.token);
            setAuthenticated(session.user);
            queryClient.setQueryData(adminAuthKeys.me, response);
            setFeedback(null);
        } catch (error) {
            setFeedback({ message: getErrorMessage(error, "Unable to sign in. Please try again."), tone: "error" });
        }
    };

    return (
        <AuthShell
            title="Sign in to Ganatri Admin"
            subtitle="Manage your organization from a secure admin workspace."
        >
            <AuthPreviewSwitcher mode="login" onChange={(mode) => mode === "register" && onSwitchToRegister()} />
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
                {feedback ? <AuthFeedback message={feedback.message} tone={feedback.tone} /> : null}
                <AuthButton
                    label="Sign in"
                    loading={form.formState.isSubmitting}
                    onPress={form.handleSubmit(submit)}
                />
            </View>
            <View className="mt-5 items-center">
                <Text className="text-sm text-admin-muted dark:text-admin-muted-dark">
                    New to Ganatri?{" "}
                    <Text className="font-semibold text-admin-primary" onPress={onSwitchToRegister}>
                        Create an account
                    </Text>
                </Text>
            </View>
        </AuthShell>
    );
};

export default LoginScreen;
