import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { Controller, useForm, type SubmitHandler } from "react-hook-form";
import type { DeviceLoginJSON } from "@repo/types";
import { DeviceLoginSchema } from "@repo/types";
import { deviceLogin, setAuthToken } from "@repo/services";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { PosButton, PosCard, PosTextField } from "../components/pos-ui";
import { createZodResolver } from "../lib/zod-form";
import { setAppLanguage, i18n } from "../lib/i18n";
import { APP_LANGUAGES, resolveAppLanguage, type AppLanguage } from "../lib/localization-boundary";
import { posStorage } from "../lib/storage";
import { usePosSessionDispatch } from "../store/pos-session.store";

const defaultValues: DeviceLoginJSON = {
    organizationUsername: "",
    deviceUsername: "",
    deviceSecret: "",
};

const getErrorCode = (error: unknown): number | undefined => {
    if (!error || typeof error !== "object" || !("code" in error)) {
        return undefined;
    }

    const code = (error as { code?: unknown }).code;
    return typeof code === "number" ? code : undefined;
};

const isNetworkError = (error: unknown) => {
    if (!error || typeof error !== "object" || !("message" in error)) {
        return false;
    }

    const message = (error as { message?: unknown }).message;
    return typeof message === "string" && message.toLowerCase().includes("cannot reach");
};

const PosUnlockScreen = () => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation(["common", "pos"]);
    const dispatch = usePosSessionDispatch();
    const [selectedLanguage, setSelectedLanguage] = useState<AppLanguage>(
        resolveAppLanguage(i18n.resolvedLanguage),
    );
    const form = useForm<DeviceLoginJSON>({
        resolver: createZodResolver(DeviceLoginSchema),
        defaultValues,
    });

    const setUnlockError = (message: string) => {
        form.setError("root", { type: "server", message });
        dispatch({ type: "UNLOCK_FAILED", message });
    };

    const unlockMutation = useMutation({
        mutationFn: deviceLogin,
        onMutate: () => {
            form.clearErrors("root");
            dispatch({ type: "UNLOCK_STARTED" });
        },
        onSuccess: async (response) => {
            if (response.status !== "success" || !response.data?.session) {
                const message = response.code === 403 ? t("inactiveDevice", { ns: "pos" }) : t("invalidCredentials", { ns: "pos" });
                setUnlockError(message);
                return;
            }

            if (!response.data.token) {
                setUnlockError(t("unlockFailed", { ns: "pos" }));
                return;
            }

            await setAuthToken(response.data.token);
            await posStorage.setDeviceSession(response.data.session);
            dispatch({ type: "UNLOCK_SUCCEEDED", session: response.data.session });
        },
        onError: (error: unknown) => {
            const message = isNetworkError(error)
                ? t("networkFailure", { ns: "pos" })
                : getErrorCode(error) === 403
                  ? t("inactiveDevice", { ns: "pos" })
                  : t("unlockFailed", { ns: "pos" });
            setUnlockError(message);
        },
    });

    const onSubmit: SubmitHandler<DeviceLoginJSON> = (values) => {
        unlockMutation.mutate(values);
    };

    const changeLanguage = (language: AppLanguage) => {
        setSelectedLanguage(language);
        void setAppLanguage(language);
    };

    return (
        <ScrollView
            className="flex-1 bg-pos-background dark:bg-pos-background-dark"
            contentContainerClassName="gap-6 px-5 py-6"
            contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
            keyboardShouldPersistTaps="handled"
        >
            <View className="gap-2">
                <Text className="text-xs font-bold uppercase tracking-[2px] text-pos-primary dark:text-pos-primary-dark">
                    {t("appName")}
                </Text>
                <Text className="text-3xl font-bold text-pos-foreground dark:text-pos-foreground-dark">
                    {t("unlockTitle", { ns: "pos" })}
                </Text>
                <Text className="text-sm leading-6 text-pos-muted dark:text-pos-muted-dark">
                    {t("unlockSubtitle", { ns: "pos" })}
                </Text>
            </View>

            <PosCard>
                <View className="gap-4">
                    <Controller
                        control={form.control}
                        name="organizationUsername"
                        render={({ field, fieldState }) => (
                            <PosTextField
                                label={t("organizationUsername", { ns: "pos" })}
                                value={field.value}
                                onChangeText={field.onChange}
                                autoCapitalize="none"
                                error={fieldState.error ? t("invalidField", { ns: "pos" }) : undefined}
                            />
                        )}
                    />
                    <Controller
                        control={form.control}
                        name="deviceUsername"
                        render={({ field, fieldState }) => (
                            <PosTextField
                                label={t("deviceUsername", { ns: "pos" })}
                                value={field.value}
                                onChangeText={field.onChange}
                                autoCapitalize="none"
                                error={fieldState.error ? t("invalidField", { ns: "pos" }) : undefined}
                            />
                        )}
                    />
                    <Controller
                        control={form.control}
                        name="deviceSecret"
                        render={({ field, fieldState }) => (
                            <PosTextField
                                label={t("deviceSecret", { ns: "pos" })}
                                value={field.value}
                                onChangeText={field.onChange}
                                autoCapitalize="none"
                                secureTextEntry
                                error={fieldState.error ? t("invalidField", { ns: "pos" }) : undefined}
                            />
                        )}
                    />
                    {form.formState.errors.root?.message ? (
                        <Text className="text-sm leading-5 text-pos-danger dark:text-pos-danger-dark">
                            {form.formState.errors.root.message}
                        </Text>
                    ) : null}
                    <PosButton
                        label={unlockMutation.isPending ? t("unlockingPos", { ns: "pos" }) : t("unlockPos", { ns: "pos" })}
                        loading={unlockMutation.isPending}
                        onPress={form.handleSubmit(onSubmit)}
                    />
                </View>
            </PosCard>

            <View className="gap-3">
                <Text className="text-sm font-medium text-pos-foreground dark:text-pos-foreground-dark">
                    {t("language")}
                </Text>
                <View className="flex-row gap-2">
                    {APP_LANGUAGES.map((language) => {
                        const selected = selectedLanguage === language;
                        const label = t(language === "en" ? "english" : language === "gu" ? "gujarati" : "hindi");
                        return (
                            <Pressable
                                key={language}
                                className={`min-h-12 flex-1 items-center justify-center rounded-2xl border px-2 ${
                                    selected
                                        ? "border-pos-primary bg-pos-primary/10 dark:border-pos-primary-dark dark:bg-pos-primary-dark/10"
                                        : "border-pos-border bg-pos-surface dark:border-pos-border-dark dark:bg-pos-surface-dark"
                                }`}
                                onPress={() => changeLanguage(language)}
                                accessibilityRole="button"
                                accessibilityState={{ selected }}
                            >
                                <Text className="text-sm font-semibold text-pos-foreground dark:text-pos-foreground-dark">
                                    {label}
                                </Text>
                            </Pressable>
                        );
                    })}
                </View>
            </View>
        </ScrollView>
    );
};

export default PosUnlockScreen;
