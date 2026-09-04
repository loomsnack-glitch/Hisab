import { createNativeStackNavigator } from "@react-navigation/native-stack";

import PosShellScreen from "../screens/pos-shell-screen";
import PosDestinationScreen from "../screens/pos-destination-screen";
import NewSaleScreen from "../screens/new-sale-screen";
import CartShellScreen from "../screens/cart-shell-screen";

export type PosStackParamList = {
    PosHome: undefined;
    NewSale: undefined;
    Cart: undefined;
    Bills: undefined;
    Customers: undefined;
    Reports: undefined;
    Settings: undefined;
    Tables: undefined;
};

const Stack = createNativeStackNavigator<PosStackParamList>();

const PosNavigator = () => {
    return (
        <Stack.Navigator initialRouteName="PosHome" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="PosHome" component={PosShellScreen} />
            <Stack.Screen name="NewSale" component={NewSaleScreen} />
            <Stack.Screen name="Cart" component={CartShellScreen} />
            <Stack.Screen name="Bills" component={PosDestinationScreen} />
            <Stack.Screen name="Customers" component={PosDestinationScreen} />
            <Stack.Screen name="Reports" component={PosDestinationScreen} />
            <Stack.Screen name="Settings" component={PosDestinationScreen} />
            <Stack.Screen name="Tables" component={PosDestinationScreen} />
        </Stack.Navigator>
    );
};

export default PosNavigator;
