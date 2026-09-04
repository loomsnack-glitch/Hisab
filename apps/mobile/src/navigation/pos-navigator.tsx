import { createNativeStackNavigator } from "@react-navigation/native-stack";

import PosShellScreen from "../screens/pos-shell-screen";

export type PosStackParamList = {
    PosHome: undefined;
};

const Stack = createNativeStackNavigator<PosStackParamList>();

const PosNavigator = () => {
    return (
        <Stack.Navigator initialRouteName="PosHome" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="PosHome" component={PosShellScreen} />
        </Stack.Navigator>
    );
};

export default PosNavigator;
