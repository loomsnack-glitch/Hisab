import { DefaultTheme, NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { useCSSVariable, useUniwind } from "uniwind";

import { useAdminAuthBootstrap } from "../hooks/use-admin-auth-bootstrap";
import AuthPreviewScreen from "../screens/auth-preview-screen";
import OrganizationLandingScreen from "../screens/organization-landing-screen";
import SessionStatusScreen from "../screens/session-status-screen";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
    const auth = useAdminAuthBootstrap();
    const { theme } = useUniwind();
    const backgroundVariable = theme === "dark" ? "--color-admin-background-dark" : "--color-admin-background";
    const navigationBackground = useCSSVariable(backgroundVariable);
    const navigationBackgroundColor =
        typeof navigationBackground === "string" ? navigationBackground : "transparent";

    if (auth.isPending) {
        return <SessionStatusScreen title="Checking your session" subtitle="Preparing Ganatri Admin securely." loading />;
    }

    const isAuthenticated = auth.status === "signed-in" || auth.status === "logging-out";

    return (
        <NavigationContainer
            key={isAuthenticated ? "protected" : "public"}
            theme={{
                ...DefaultTheme,
                dark: theme === "dark",
                colors: {
                    ...DefaultTheme.colors,
                    background: navigationBackgroundColor,
                    card: navigationBackgroundColor,
                },
            }}
        >
            <Stack.Navigator screenOptions={{ headerShown: false }}>
                {isAuthenticated ? (
                    <Stack.Screen
                        name="AdminWorkspace"
                        component={OrganizationLandingScreen}
                    />
                ) : (
                    <Stack.Screen name="AuthPreview" component={AuthPreviewScreen} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default RootNavigator;
