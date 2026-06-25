import { useEffect, useState } from "react";
import { Alert, Image, Pressable, Text, View } from "react-native";
import whatsAppIcon from "@repo/assets/services/whatsapp.webp";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { setAuthToken, userLogin } from "@repo/services";
import { LoginFormSchema, formatIndianPhoneDisplay, type LoginFormJSON } from "@repo/types";

import AuthShell from "../components/auth-shell";
import OtpField from "../components/otp-field";
import PhoneNumberField from "../components/phone-number-field";
import PrimaryButton from "../components/primary-button";
import TextField from "../components/text-field";
import { AUTH_QUERY_KEY } from "../hooks/use-auth-bootstrap";
import { getConfiguredApiBaseUrl, getMobileApiSetupHint } from "../lib/api-config";
import { createZodResolver } from "../lib/zod-form";
import type { RootStackParamList } from "../navigation/types";
import { useAuthActions } from "../store/auth.store";

type LoginScreenProps = NativeStackScreenProps<RootStackParamList, "Login">;

const defaultValues: LoginFormJSON = {
    requestType: "user-info",
    phone: "",
    password: "",
};

const LoginScreen = ({ navigation }: LoginScreenProps) => {
    const queryClient = useQueryClient();
    const { setUser } = useAuthActions();
    const [method, setMethod] = useState<"password" | "otp">("password");
    const [cooldown, setCooldown] = useState(0);

    const form = useForm<LoginFormJSON>({
        resolver: createZodResolver(LoginFormSchema),
        defaultValues,
    });

    const loginMutation = useMutation({
        mutationFn: userLogin,
        onSuccess: async (response, variables) => {
            if (response.status === "success" && response.data?.nextRequestType === "otp-verification") {
                form.setValue("requestType", "otp-verification");
                form.setValue("otp", "");
                setCooldown(30);
                Alert.alert("OTP sent", response.message);
                return;
            }

            if (response.status === "success" && response.data?.user) {
                if (response.data.token) {
                    await setAuthToken(response.data.token);
                }
                setUser(response.data.user);
                queryClient.setQueryData(AUTH_QUERY_KEY, response);
                Alert.alert("Success", response.message);
                return;
            }

            if (variables.requestType === "otp-info") {
                Alert.alert("OTP sent", response.message);
            }
        },
        onError: (error: { message?: string }) => {
            Alert.alert("Login failed", error.message ?? "Please try again.");
        },
    });

    useEffect(() => {
        if (cooldown <= 0) return undefined;
        const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

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

    const requestType = form.watch("requestType");

    return (
        <AuthShell
            title="Welcome back"
            subtitle="Login with your password or request an OTP on WhatsApp for a quick sign-in."
        >
            <View className="flex-row gap-2 rounded-2xl bg-secondary p-2">
                <Pressable
                    className={`flex-1 items-center rounded-xl px-3 py-3 ${method === "password" ? "bg-primary" : ""}`}
                    onPress={() => {
                        setMethod("password");
                        form.reset({ phone: form.getValues("phone"), requestType: "user-info", password: "" });
                    }}
                >
                    <Text className={`text-sm font-semibold ${method === "password" ? "text-primary-foreground" : "text-secondary-foreground"}`}>
                        Password
                    </Text>
                </Pressable>
                <Pressable
                    className={`flex-1 items-center rounded-xl px-3 py-3 ${method === "otp" ? "bg-primary" : ""}`}
                    onPress={() => {
                        setMethod("otp");
                        form.reset({ phone: form.getValues("phone"), requestType: "otp-info" });
                    }}
                >
                    <Text className={`text-sm font-semibold ${method === "otp" ? "text-primary-foreground" : "text-secondary-foreground"}`}>
                        OTP
                    </Text>
                </Pressable>
            </View>

            <Controller
                control={form.control}
                name="phone"
                render={({ field: { onChange, value }, fieldState }) => (
                    <PhoneNumberField
                        label="Phone number"
                        value={value}
                        onChangeText={onChange}
                        error={fieldState.error?.message}
                        required
                    />
                )}
            />

            {method === "password" ? (
                <>
                    <Controller
                        control={form.control}
                        name="password"
                        render={({ field: { onChange, value }, fieldState }) => (
                            <TextField
                                label="Password"
                                value={value ?? ""}
                                onChangeText={onChange}
                                error={fieldState.error?.message}
                                required
                                secureTextEntry
                                autoCapitalize="none"
                            />
                        )}
                    />

                    <PrimaryButton
                        label={loginMutation.isPending ? "Logging in..." : "Login"}
                        loading={loginMutation.isPending}
                        onPress={form.handleSubmit(submitForm)}
                    />
                </>
            ) : requestType === "otp-verification" ? (
                <>
                    <View className="flex-row items-center justify-between border-b border-dashed border-secondary pb-4">
                        <Pressable onPress={backToOtpStart}>
                            <Text className="text-sm font-medium text-primary">Back</Text>
                        </Pressable>
                        <View className="items-end">
                            <Text className="text-sm font-medium text-secondary-foreground">
                                {formatIndianPhoneDisplay(form.getValues("phone"))}
                            </Text>
                            <Text className="text-xs text-secondary-foreground/60">OTP verification</Text>
                        </View>
                    </View>

                    <OtpField key="otp-verification" control={form.control} name="otp" />

                    {cooldown > 0 ? (
                        <Text className="text-center text-xs text-secondary-foreground/60">Resend in {cooldown}s</Text>
                    ) : (
                        <Pressable onPress={startOtpFlow}>
                            <Text className="text-center text-sm font-medium text-primary">Resend OTP</Text>
                        </Pressable>
                    )}

                    <PrimaryButton
                        label="Verify and login"
                        loading={loginMutation.isPending}
                        disabled={form.watch("otp")?.length !== 6}
                        onPress={form.handleSubmit(submitForm)}
                    />
                </>
            ) : (
                <PrimaryButton
                    label={loginMutation.isPending ? "Sending OTP..." : "Send OTP on WhatsApp"}
                    loading={loginMutation.isPending}
                    onPress={startOtpFlow}
                    icon={<Image source={whatsAppIcon} style={{ width: 16, height: 16 }} />}
                />
            )}

            <Pressable onPress={() => navigation.navigate("Register")}>
                <Text className="text-center text-sm text-secondary-foreground/70">
                    Need a new account? <Text className="font-medium text-primary">Register here</Text>
                </Text>
            </Pressable>

            {__DEV__ ? (
                <View className="gap-1 border-t border-secondary pt-4">
                    <Text className="text-center text-xs text-secondary-foreground/60">Dev API: {getConfiguredApiBaseUrl()}</Text>
                    {getMobileApiSetupHint() ? (
                        <Text className="text-center text-xs leading-5 text-primary">{getMobileApiSetupHint()}</Text>
                    ) : null}
                </View>
            ) : null}
        </AuthShell>
    );
};

export default LoginScreen;
