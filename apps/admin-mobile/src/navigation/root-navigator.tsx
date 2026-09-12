import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAdminAuthBootstrap } from "../hooks/use-admin-auth-bootstrap";
import AuthPreviewScreen from "../screens/auth-preview-screen";
import SessionStatusScreen from "../screens/session-status-screen";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
    const auth = useAdminAuthBootstrap();

    if (auth.isPending) {
        return <SessionStatusScreen title="Checking your session" subtitle="Preparing Ganatri Admin securely." loading />;
    }

    if (auth.status === "signed-in" || auth.status === "logging-out") {
        return (
            <SessionStatusScreen
                title="Session restored"
                subtitle="Your Admin session is ready. The protected workspace will be connected in the next infrastructure slice."
            />
        );
    }

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                <Stack.Screen name="AuthPreview" component={AuthPreviewScreen} />
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default RootNavigator;
