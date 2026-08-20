import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import type { OwnerUserDTO } from "@repo/types";

import { getCurrentOwnerUser, PlatformAppView } from "./App";
import { OwnerLoginError } from "./components/owner-login-page";

const ownerUser: OwnerUserDTO = {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    firstName: "Asha",
    lastName: "Shah",
    phone: "+919876543210",
    isActive: true,
    createdAt: "2026-08-20T00:00:00.000Z",
    updatedAt: "2026-08-20T00:00:00.000Z",
};

const render = (node: React.ReactNode) => renderToStaticMarkup(
    <QueryClientProvider client={new QueryClient()}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
            {node}
        </ThemeProvider>
    </QueryClientProvider>,
);

describe("Ganatri Console entry", () => {
    test("shows a dedicated loading state while the owner session is checked", () => {
        expect(render(<PlatformAppView state="loading" />)).toContain("Checking owner session");
    });

    test("keeps API failures distinct from an expired owner session", () => {
        const markup = render(<PlatformAppView state="error" message="Cannot reach the API" onRetry={async () => {}} />);
        expect(markup).toContain("Console connection failed");
        expect(markup).toContain("Cannot reach the API");
        expect(markup).not.toContain("Your owner session expired");
    });

    test("ignores cached Owner User data after the live entry check is unauthorized", () => {
        expect(getCurrentOwnerUser(true, {
            status: "success",
            data: { ownerUser },
            message: "Platform entry authorized",
            code: 200,
        })).toBeUndefined();
    });

    test("shows password and WhatsApp OTP owner login choices", () => {
        const markup = render(<PlatformAppView state="unauthenticated" sessionExpired={false} onAuthenticated={async () => {}} />);
        expect(markup).toContain("Welcome back");
        expect(markup).toContain("Password");
        expect(markup).toContain("OTP");
        expect(markup).not.toContain("Your owner session expired");
    });

    test("explains an expired session and an invalid-credential outcome", () => {
        const expiredMarkup = render(<PlatformAppView state="unauthenticated" sessionExpired onAuthenticated={async () => {}} />);
        const invalidMarkup = render(<OwnerLoginError message="Invalid credentials" />);
        expect(expiredMarkup).toContain("Your owner session expired");
        expect(invalidMarkup).toContain("Sign-in failed");
        expect(invalidMarkup).toContain("Invalid credentials");
    });

    test("enters the console with Dashboard, Organizations, and Console Users available", () => {
        const markup = render(<PlatformAppView state="authenticated" ownerUser={ownerUser} onLogout={async () => {}} onUnauthorized={async () => {}} />);
        expect(markup).toContain("Welcome, Asha");
        expect(markup).toContain("Dashboard");
        expect(markup).toContain("Organizations");
        expect(markup).toContain("Console Users");
        expect(markup).toContain("Ganatri Console");
        expect(markup).not.toContain("Later ticket");
    });
});
