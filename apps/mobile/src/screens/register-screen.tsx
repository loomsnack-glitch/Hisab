import { useEffect, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import { register as registerUser, setAuthToken } from "@repo/services";
import { RegisterFormSchema, SALUTATION_OPTIONS, formatIndianPhoneDisplay, type RegisterFormJSON } from "@repo/types";

import AuthShell from "../components/auth-shell";
import OtpField from "../components/otp-field";
import PhoneNumberField from "../components/phone-number-field";
import PrimaryButton from "../components/primary-button";
import TextField from "../components/text-field";
import { AUTH_QUERY_KEY } from "../hooks/use-auth-bootstrap";
import { createZodResolver } from "../lib/zod-form";
import type { RootStackParamList } from "../navigation/types";
import { useAuthActions } from "../store/auth.store";

type RegisterScreenProps = NativeStackScreenProps<RootStackParamList, "Register">;

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

const RegisterScreen = ({ navigation }: RegisterScreenProps) => {
    const queryClient = useQueryClient();
    const { setUser } = useAuthActions();
    const [step, setStep] = useState<"user-info" | "otp-verification">("user-info");
    const [cooldown, setCooldown] = useState(0);

    const form = useForm<RegisterFormJSON>({
        resolver: createZodResolver(RegisterFormSchema),
        defaultValues,
    });

    const registerMutation = useMutation({
        mutationFn: registerUser,
        onSuccess: async (response) => {
            if (response.status === "success" && response.data?.nextRequestType === "otp-verification") {
                setStep("otp-verification");
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
            }
        },
        onError: (error: { message?: string }) => {
            Alert.alert("Registration failed", error.message ?? "Please try again.");
        },
    });

    useEffect(() => {
        if (cooldown <= 0) return undefined;
        const timer = setTimeout(() => setCooldown((value) => value - 1), 1000);
        return () => clearTimeout(timer);
    }, [cooldown]);

    const onSubmit: SubmitHandler<RegisterFormJSON> = (values) => {
        registerMutation.mutate(values);
    };

    const resendOtp = () => {
        const values = form.getValues();
        registerMutation.mutate({
            ...values,
            requestType: "otp-verification",
            resendOTP: "phoneOTP",
        });
        setCooldown(30);
    };

    return (
        <AuthShell
            title="Create your Ganatri account"
            subtitle="Register with your phone number, verify the OTP on WhatsApp, and you will be logged in immediately."
        >
            {step === "otp-verification" ? (
                <>
                    <View className="flex-row items-center justify-between border-b border-dashed border-secondary pb-4">
                        <Pressable
                            onPress={() => {
                                setStep("user-info");
                                form.setValue("requestType", "user-info");
                            }}
                        >
                            <Text className="text-sm font-medium text-primary">Back</Text>
                        </Pressable>
                        <View className="items-end">
                            <Text className="text-sm font-medium text-secondary-foreground">
                                {formatIndianPhoneDisplay(form.getValues("phone"))}
                            </Text>
                            <Text className="text-xs text-secondary-foreground/60">Verification in progress</Text>
                        </View>
                    </View>

                    <OtpField key="otp-verification" control={form.control} name="otp" />

                    {cooldown > 0 ? (
                        <Text className="text-center text-xs text-secondary-foreground/60">Resend in {cooldown}s</Text>
                    ) : (
                        <Pressable onPress={resendOtp}>
                            <Text className="text-center text-sm font-medium text-primary">Resend OTP</Text>
                        </Pressable>
                    )}

                    <PrimaryButton
                        label="Verify and continue"
                        loading={registerMutation.isPending}
                        disabled={form.watch("otp")?.length !== 6}
                        onPress={form.handleSubmit(onSubmit)}
                    />
                </>
            ) : (
                <>
                    <View className="gap-2">
                        <Text className="text-sm font-medium text-secondary-foreground">
                            Salutation <Text className="text-primary">*</Text>
                        </Text>
                        <View className="flex-row gap-2">
                            {SALUTATION_OPTIONS.map((option) => (
                                <Controller
                                    key={option.value}
                                    control={form.control}
                                    name="salutation"
                                    render={({ field: { onChange, value } }) => (
                                        <Pressable
                                            className={`rounded-xl border px-4 py-3 ${
                                                value === option.value
                                                    ? "border-primary bg-primary"
                                                    : "border-secondary bg-white"
                                            }`}
                                            onPress={() => onChange(option.value)}
                                        >
                                            <Text
                                                className={`text-sm font-medium ${
                                                    value === option.value ? "text-primary-foreground" : "text-secondary-foreground"
                                                }`}
                                            >
                                                {option.label}
                                            </Text>
                                        </Pressable>
                                    )}
                                />
                            ))}
                        </View>
                    </View>

                    <Controller
                        control={form.control}
                        name="firstName"
                        render={({ field: { onChange, value }, fieldState }) => (
                            <TextField
                                label="First name"
                                value={value}
                                onChangeText={onChange}
                                error={fieldState.error?.message}
                                required
                            />
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="lastName"
                        render={({ field: { onChange, value }, fieldState }) => (
                            <TextField
                                label="Last name"
                                value={value}
                                onChangeText={onChange}
                                error={fieldState.error?.message}
                                required
                            />
                        )}
                    />

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

                    <Controller
                        control={form.control}
                        name="email"
                        render={({ field: { onChange, value }, fieldState }) => (
                            <TextField
                                label="Email"
                                value={value ?? ""}
                                onChangeText={onChange}
                                placeholder="Optional"
                                error={fieldState.error?.message}
                                keyboardType="email-address"
                                autoCapitalize="none"
                            />
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="password"
                        render={({ field: { onChange, value }, fieldState }) => (
                            <TextField
                                label="Password"
                                value={value}
                                onChangeText={onChange}
                                error={fieldState.error?.message}
                                required
                                secureTextEntry
                                autoCapitalize="none"
                            />
                        )}
                    />

                    <Controller
                        control={form.control}
                        name="confirmPassword"
                        render={({ field: { onChange, value }, fieldState }) => (
                            <TextField
                                label="Confirm password"
                                value={value}
                                onChangeText={onChange}
                                error={fieldState.error?.message}
                                required
                                secureTextEntry
                                autoCapitalize="none"
                            />
                        )}
                    />

                    <PrimaryButton
                        label={registerMutation.isPending ? "Sending OTP..." : "Send OTP"}
                        loading={registerMutation.isPending}
                        onPress={form.handleSubmit(onSubmit)}
                    />
                </>
            )}

            <Pressable onPress={() => navigation.navigate("Login")}>
                <Text className="text-center text-sm text-secondary-foreground/70">
                    Already have an account? <Text className="font-medium text-primary">Login here</Text>
                </Text>
            </Pressable>
        </AuthShell>
    );
};

export default RegisterScreen;
