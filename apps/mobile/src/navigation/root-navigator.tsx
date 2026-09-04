import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { usePosSession } from "../hooks/use-pos-session";
import type { RootStackParamList } from "./types";
import LoadingScreen from "../screens/loading-screen";
import PosUnlockScreen from "../screens/pos-unlock-screen";
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
                    <Stack.Screen name="PosUnlock" component={PosUnlockScreen} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};

export default RootNavigator;
