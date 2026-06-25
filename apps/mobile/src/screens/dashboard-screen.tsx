import { Alert, ScrollView, Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { clearAuthToken, userLogout } from "@repo/services";

import PrimaryButton from "../components/primary-button";
import { AUTH_QUERY_KEY } from "../hooks/use-auth-bootstrap";
import { useAuthActions, useAuthUser } from "../store/auth.store";

const DashboardScreen = () => {
    const insets = useSafeAreaInsets();
    const authUser = useAuthUser();
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

    const profileRows = authUser
        ? [
              { label: "Salutation", value: authUser.salutation.toUpperCase() },
              { label: "First name", value: authUser.firstName },
              { label: "Last name", value: authUser.lastName },
              { label: "Phone", value: authUser.phone },
              { label: "Email", value: authUser.email ?? "Not provided" },
          ]
        : [];

    return (
        <ScrollView
            className="flex-1 bg-stone-100"
            contentContainerClassName="gap-5 px-5 py-6"
            contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
        >
            <View className="gap-2 rounded-[28px] border border-amber-100 bg-white p-5">
                <Text className="text-xs font-bold uppercase tracking-[2px] text-amber-800">Demo dashboard</Text>
                <Text className="text-2xl font-semibold text-stone-950">
                    Welcome, {authUser?.salutation} {authUser?.firstName} {authUser?.lastName}
                </Text>
                <Text className="text-sm leading-6 text-stone-600">
                    You are signed in on mobile. The JWT is stored securely and sent with each API request.
                </Text>
                <PrimaryButton
                    label={logoutMutation.isPending ? "Logging out..." : "Logout"}
                    loading={logoutMutation.isPending}
                    onPress={() => logoutMutation.mutate()}
                />
            </View>

            <View className="gap-3 rounded-[28px] border border-stone-300 bg-white p-5">
                <Text className="text-lg font-semibold text-stone-950">User profile</Text>
                {profileRows.map((row) => (
                    <View key={row.label} className="flex-row justify-between border-b border-stone-100 py-3">
                        <Text className="text-sm text-stone-500">{row.label}</Text>
                        <Text className="max-w-[60%] text-right text-sm font-medium text-stone-900">{row.value}</Text>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
};

export default DashboardScreen;
