import "./global.css";
import "./src/lib/admin-storage";

import { StatusBar } from "expo-status-bar";

import { AppToast } from "./src/components/ui/app-toast";
import { configureAdminApi } from "./src/lib/api-config";
import Providers from "./src/providers";
import RootNavigator from "./src/navigation/root-navigator";

export default function App() {
    configureAdminApi();

    return (
        <Providers>
            <RootNavigator />
            <StatusBar style="auto" />
            <AppToast />
        </Providers>
    );
}
