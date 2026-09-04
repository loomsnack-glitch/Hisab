import { Alert, ScrollView, Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { clearAuthToken, userLogout } from "@repo/services";

import PrimaryButton from "../components/primary-button";
import { AUTH_QUERY_KEY } from "../hooks/use-auth-bootstrap";
import { useAuthActions } from "../store/auth.store";

const PosShellScreen = () => {
    const insets = useSafeAreaInsets();
    const { clearUser } = useAuthActions();
    const queryClient = useQueryClient();

    const logoutMutation = useMutation({
        mutationFn: userLogout,
        onSuccess: async () => {
            await clearAuthToken();
            clearUser();
            queryClient.removeQueries({ queryKey: AUTH_QUERY_KEY });
            Alert.alert("Logged out", "You have been logged out successfully.");
        },
        onError: (error: { message?: string }) => {
            Alert.alert("Logout failed", error.message ?? "Please try again.");
        },
    });

    return (
        <ScrollView
            className="flex-1 bg-stone-100"
            contentContainerClassName="gap-5 px-5 py-6"
            contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
        >
            <View className="gap-3 rounded-[28px] border border-amber-100 bg-white p-5">
                <Text className="text-xs font-bold uppercase tracking-[2px] text-amber-800">Ganatri POS</Text>
                <Text className="text-2xl font-semibold text-stone-950">POS workspace</Text>
                <Text className="text-sm leading-6 text-stone-600">
                    The POS application boundary is ready. Product selection, Cart, and checkout will be added in
                    their planned phases.
                </Text>
                <PrimaryButton
                    label={logoutMutation.isPending ? "Logging out..." : "Logout"}
                    loading={logoutMutation.isPending}
                    onPress={() => logoutMutation.mutate()}
                />
            </View>
        </ScrollView>
    );
};

export default PosShellScreen;
