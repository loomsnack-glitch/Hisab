import { Text, View } from "react-native";
import AuthButton from "../components/auth/auth-button";
import { useAdminLogout } from "../hooks/use-admin-logout";
import { useAdminAuthUser } from "../store/auth.store";

const AdminWorkspacePlaceholderScreen = () => {
    const user = useAdminAuthUser();
    const logoutMutation = useAdminLogout();
    const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || "Admin";

    return (
        <View className="flex-1 bg-admin-background px-5 py-8 dark:bg-admin-background-dark">
            <View className="flex-1 justify-center">
                <View className="mb-6 h-12 w-12 items-center justify-center rounded-2xl bg-admin-primary">
                    <Text className="text-2xl font-bold text-admin-primary-foreground">G</Text>
                </View>
                <Text className="text-3xl font-bold text-admin-foreground dark:text-admin-foreground-dark">
                    Welcome, {displayName}
                </Text>
                <Text className="mt-3 text-base leading-6 text-admin-muted dark:text-admin-muted-dark">
                    Your Admin session is protected. Organization workspaces will be connected after the authentication foundation.
                </Text>
            </View>
            <AuthButton
                label="Sign out"
                variant="secondary"
                loading={logoutMutation.isPending}
                onPress={() => logoutMutation.mutate()}
            />
        </View>
    );
};

export default AdminWorkspacePlaceholderScreen;
