import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { usePosSession } from "../hooks/use-pos-session";
import type { RootStackParamList } from "./types";
import LoadingScreen from "../screens/loading-screen";
import LoginScreen from "../screens/login-screen";
import RegisterScreen from "../screens/register-screen";
import PosNavigator from "./pos-navigator";

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
    const posSession = usePosSession();

    if (posSession.state === "starting") {
        return <LoadingScreen message={posSession.message ?? undefined} onRetry={posSession.canRetry ? posSession.retry : undefined} />;
    }

    return (
        <NavigationContainer>
            <Stack.Navigator key={posSession.state === "active" ? "app" : "auth"} screenOptions={{ headerShown: false }}>
                {posSession.state === "active" ? (
                    <Stack.Screen name="Pos" component={PosNavigator} />
                ) : (
                    <>
                        <Stack.Screen name="Login" component={LoginScreen} />
                        <Stack.Screen name="Register" component={RegisterScreen} />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default RootNavigator;
