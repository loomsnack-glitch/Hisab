import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import AuthPreviewScreen from "../screens/auth-preview-screen";
import type { RootStackParamList } from "./types";

const Stack = createNativeStackNavigator<RootStackParamList>();

const RootNavigator = () => (
    <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="AuthPreview" component={AuthPreviewScreen} />
        </Stack.Navigator>
    </NavigationContainer>
);

export default RootNavigator;
