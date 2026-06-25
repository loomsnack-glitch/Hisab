import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuthBootstrap } from "../hooks/use-auth-bootstrap";
import type { RootStackParamList } from "./types";
import { useAuthUser } from "../store/auth.store";
import DashboardScreen from "../screens/dashboard-screen";
import LoadingScreen from "../screens/loading-screen";
import LoginScreen from "../screens/login-screen";
import RegisterScreen from "../screens/register-screen";

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => {
    const authUser = useAuthUser();
    const { isPending } = useAuthBootstrap();

    if (isPending) {
        return <LoadingScreen />;
    }

    return (
        <NavigationContainer>
            <Stack.Navigator key={authUser ? "app" : "auth"} screenOptions={{ headerShown: false }}>
                {authUser ? (
                    <Stack.Screen name="Dashboard" component={DashboardScreen} />
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
