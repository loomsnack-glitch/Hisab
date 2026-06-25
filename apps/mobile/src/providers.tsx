import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SafeAreaProvider } from "react-native-safe-area-context";

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
        <SafeAreaProvider>
            <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
        </SafeAreaProvider>
    );
};

export default Providers;
