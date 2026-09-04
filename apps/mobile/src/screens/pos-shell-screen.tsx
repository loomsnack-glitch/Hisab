import { Alert, ScrollView, Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { clearAuthToken, userLogout } from "@repo/services";

import PrimaryButton from "../components/primary-button";
import { AUTH_QUERY_KEY } from "../hooks/use-auth-bootstrap";
import { useAuthActions } from "../store/auth.store";

const PosShellScreen = () => {
    const insets = useSafeAreaInsets();
    const { t } = useTranslation(["common", "pos"]);
    const { clearUser } = useAuthActions();
    const queryClient = useQueryClient();

    const logoutMutation = useMutation({
        mutationFn: userLogout,
        onSuccess: async () => {
            await clearAuthToken();
            clearUser();
            queryClient.removeQueries({ queryKey: AUTH_QUERY_KEY });
            Alert.alert(t("loggedOutTitle"), t("loggedOutMessage"));
        },
        onError: (error: { message?: string }) => {
            Alert.alert(t("logoutFailedTitle"), error.message ?? t("genericError"));
        },
    });

    return (
        <ScrollView
            className="flex-1 bg-stone-100"
            contentContainerClassName="gap-5 px-5 py-6"
            contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
        >
            <View className="gap-3 rounded-[28px] border border-amber-100 bg-white p-5">
                <Text className="text-xs font-bold uppercase tracking-[2px] text-amber-800">{t("appName")}</Text>
                <Text className="text-2xl font-semibold text-stone-950">{t("workspaceTitle", { ns: "pos" })}</Text>
                <Text className="text-sm leading-6 text-stone-600">
                    {t("foundationMessage", { ns: "pos" })}
                </Text>
                <PrimaryButton
                    label={logoutMutation.isPending ? t("loggingOut") : t("logout")}
                    loading={logoutMutation.isPending}
                    onPress={() => logoutMutation.mutate()}
                />
            </View>
        </ScrollView>
    );
};

export default PosShellScreen;
