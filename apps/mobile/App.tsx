import { configureMobileApi } from "./src/lib/api-config";
import "./src/lib/auth-storage";
import "./src/lib/device-storage";
import "./global.css";

import { StatusBar } from "expo-status-bar";

import Providers from "./src/providers";
import RootNavigator from "./src/navigation/root-navigator";

export default function App() {
    configureMobileApi();

    return (
        <Providers>
            <RootNavigator />
            <StatusBar style="dark" />
        </Providers>
    );
}
