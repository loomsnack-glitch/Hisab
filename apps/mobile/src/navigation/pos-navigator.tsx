import { createNativeStackNavigator } from "@react-navigation/native-stack";
import type { CustomerDTO } from "@repo/types";

import PosShellScreen from "../screens/pos-shell-screen";
import PosDestinationScreen from "../screens/pos-destination-screen";
import NewSaleScreen from "../screens/new-sale-screen";
import CartShellScreen from "../screens/cart-shell-screen";
import PaymentScreen from "../screens/payment-screen";
import SaleCompleteScreen from "../screens/sale-complete-screen";
import BillsScreen from "../screens/bills-screen";
import SaleDetailsScreen from "../screens/sale-details-screen";
import CustomersScreen from "../screens/customers-screen";
import CustomerDetailsScreen from "../screens/customer-details-screen";
import ReportsScreen from "../screens/reports-screen";
import SettingsScreen from "../screens/settings-screen";
import PrinterSettingsScreen from "../screens/printer-settings-screen";
import TablesScreen from "../screens/tables-screen";
import type { PosTableContext } from "../lib/pos-service-mode-boundary";

export type PosStackParamList = {
    PosHome: undefined;
    NewSale: { table?: PosTableContext } | undefined;
    Cart: undefined;
    Payment: undefined;
    SaleComplete: undefined;
    Bills: undefined;
    SaleDetails: { saleId: string };
    Customers: undefined;
    CustomerDetails: { customer: CustomerDTO };
    Reports: undefined;
    Settings: undefined;
    PrinterSettings: undefined;
    Tables: undefined;
};

const Stack = createNativeStackNavigator<PosStackParamList>();

const PosNavigator = () => {
    return (
        <Stack.Navigator initialRouteName="PosHome" screenOptions={{ headerShown: false }}>
            <Stack.Screen name="PosHome" component={PosShellScreen} />
            <Stack.Screen name="NewSale" component={NewSaleScreen} />
            <Stack.Screen name="Cart" component={CartShellScreen} />
            <Stack.Screen name="Payment" component={PaymentScreen} />
            <Stack.Screen name="SaleComplete" component={SaleCompleteScreen} />
            <Stack.Screen name="Bills" component={BillsScreen} />
            <Stack.Screen name="SaleDetails" component={SaleDetailsScreen} />
            <Stack.Screen name="Customers" component={CustomersScreen} />
            <Stack.Screen name="CustomerDetails" component={CustomerDetailsScreen} />
            <Stack.Screen name="Reports" component={ReportsScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="PrinterSettings" component={PrinterSettingsScreen} />
            <Stack.Screen name="Tables" component={TablesScreen} />
        </Stack.Navigator>
    );
};

export default PosNavigator;
