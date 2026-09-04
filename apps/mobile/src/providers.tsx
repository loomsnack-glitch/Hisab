import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { I18nextProvider } from "react-i18next";
import { i18n } from "./lib/i18n";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: false,
        },
    },
});

type ProvidersProps = {
    children: ReactNode;
};

const Providers = ({ children }: ProvidersProps) => {
    return (
        <I18nextProvider i18n={i18n}>
            <SafeAreaProvider>
                <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
            </SafeAreaProvider>
        </I18nextProvider>
    );
};

export default Providers;
