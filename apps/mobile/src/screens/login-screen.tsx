import { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { setAuthToken, userLogin } from "@repo/services";
import { LoginSchema, type LoginJSON } from "@repo/types";

import AuthShell from "../components/auth-shell";
import OtpField from "../components/otp-field";
import PrimaryButton from "../components/primary-button";
import TextField from "../components/text-field";
import { AUTH_QUERY_KEY } from "../hooks/use-auth-bootstrap";
import { getConfiguredApiBaseUrl, getMobileApiSetupHint } from "../lib/api-config";
import { createZodResolver } from "../lib/zod-form";
import type { RootStackParamList } from "../navigation/types";
import { useAuthActions } from "../store/auth.store";

type LoginScreenProps = NativeStackScreenProps<RootStackParamList, "Login">;

const defaultValues: LoginJSON = {
    requestType: "user-info",
    phone: "",
    password: "",
};

const LoginScreen = ({ navigation }: LoginScreenProps) => {
    const queryClient = useQueryClient();
    const { setUser } = useAuthActions();
    const [method, setMethod] = useState<"password" | "otp">("password");
    const [cooldown, setCooldown] = useState(0);

    const form = useForm<LoginJSON>({
        resolver: createZodResolver(LoginSchema),
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

    const submitForm: SubmitHandler<LoginJSON> = (values) => {
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
            <View className="flex-row gap-2 rounded-2xl bg-amber-50 p-2">
                <Pressable
                    className={`flex-1 items-center rounded-xl px-3 py-3 ${method === "password" ? "bg-stone-950" : ""}`}
                    onPress={() => {
                        setMethod("password");
                        form.reset({ phone: form.getValues("phone"), requestType: "user-info", password: "" });
                    }}
                >
                    <Text className={`text-sm font-semibold ${method === "password" ? "text-white" : "text-stone-700"}`}>
                        Password
                    </Text>
                </Pressable>
                <Pressable
                    className={`flex-1 items-center rounded-xl px-3 py-3 ${method === "otp" ? "bg-stone-950" : ""}`}
                    onPress={() => {
                        setMethod("otp");
                        form.reset({ phone: form.getValues("phone"), requestType: "otp-info" });
                    }}
                >
                    <Text className={`text-sm font-semibold ${method === "otp" ? "text-white" : "text-stone-700"}`}>
                        OTP
                    </Text>
                </Pressable>
            </View>

            <Controller
                control={form.control}
                name="phone"
                render={({ field: { onChange, value }, fieldState }) => (
                    <TextField
                        label="Phone number"
                        value={value}
                        onChangeText={onChange}
                        placeholder="+919876543210"
                        error={fieldState.error?.message}
                        required
                        keyboardType="phone-pad"
                        autoCapitalize="none"
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
                    <View className="flex-row items-center justify-between border-b border-dashed border-amber-200 pb-4">
                        <Pressable onPress={backToOtpStart}>
                            <Text className="text-sm font-medium text-amber-800">Back</Text>
                        </Pressable>
                        <View className="items-end">
                            <Text className="text-sm font-medium text-stone-900">{form.getValues("phone")}</Text>
                            <Text className="text-xs text-stone-500">OTP verification</Text>
                        </View>
                    </View>

                    <OtpField control={form.control} name="otp" />

                    {cooldown > 0 ? (
                        <Text className="text-center text-xs text-stone-500">Resend in {cooldown}s</Text>
                    ) : (
                        <Pressable onPress={startOtpFlow}>
                            <Text className="text-center text-sm font-medium text-amber-700">Resend OTP</Text>
                        </Pressable>
                    )}

                    <PrimaryButton
                        label="Verify and login"
                        variant="accent"
                        loading={loginMutation.isPending}
                        disabled={form.watch("otp")?.length !== 6}
                        onPress={form.handleSubmit(submitForm)}
                    />
                </>
            ) : (
                <>
                    <View className="rounded-2xl border border-dashed border-amber-200 bg-amber-50/60 p-4">
                        <Text className="text-sm leading-6 text-stone-600">
                            Use WhatsApp OTP if you want a quick login without typing your password.
                        </Text>
                    </View>

                    <PrimaryButton
                        label={loginMutation.isPending ? "Sending OTP..." : "Send OTP"}
                        variant="accent"
                        loading={loginMutation.isPending}
                        onPress={startOtpFlow}
                    />
                </>
            )}

            <Pressable onPress={() => navigation.navigate("Register")}>
                <Text className="text-center text-sm text-stone-500">
                    Need a new account? <Text className="font-medium text-amber-700">Register here</Text>
                </Text>
            </Pressable>

            {__DEV__ ? (
                <View className="gap-1 border-t border-stone-200 pt-4">
                    <Text className="text-center text-xs text-stone-500">Dev API: {getConfiguredApiBaseUrl()}</Text>
                    {getMobileApiSetupHint() ? (
                        <Text className="text-center text-xs leading-5 text-amber-800">{getMobileApiSetupHint()}</Text>
                    ) : null}
                </View>
            ) : null}
        </AuthShell>
    );
};

export default LoginScreen;
