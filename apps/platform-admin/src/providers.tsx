import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@repo/ui/components/sonner";

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, refetchOnWindowFocus: false } },
});

const Providers = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
        {children}
        <Toaster position="top-right" closeButton />
    </QueryClientProvider>
);

export default Providers;
