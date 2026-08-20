import "../test-setup";
import { afterEach, describe, expect, test } from "bun:test";
import { act, cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import type { OwnerAuthResponse, OwnerLoginJSON, ServiceResponse } from "@repo/types";

import OwnerLoginPage from "./owner-login-page";

afterEach(cleanup);

const renderLogin = (
    login: (data: OwnerLoginJSON) => Promise<ServiceResponse<OwnerAuthResponse | null>>,
    onAuthenticated: () => Promise<void> = async () => {},
    initialPassword = "correct horse battery staple",
    initialOtp = "",
) => render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
            <OwnerLoginPage
                sessionExpired={false}
                login={login}
                onAuthenticated={onAuthenticated}
                initialPhone="+919876543210"
                initialPassword={initialPassword}
                initialOtp={initialOtp}
            />
        </ThemeProvider>
    </QueryClientProvider>,
);

describe("Owner User login behavior", () => {
    test("submits password credentials and enters the console", async () => {
        let submitted: OwnerLoginJSON | null = null;
        let authenticated = false;
        const view = renderLogin(
            async (data) => {
                submitted = data;
                return {
                    status: "success",
                    data: {
                        ownerUser: {
                            id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
                            firstName: "Asha",
                            lastName: "Shah",
                            phone: "+919876543210",
                            isActive: true,
                            createdAt: "2026-08-20T00:00:00.000Z",
                            updatedAt: "2026-08-20T00:00:00.000Z",
                        },
                    },
                    message: "Login successful",
                    code: 200,
                };
            },
            async () => {
                authenticated = true;
            },
        );

        fireEvent.click(view.getByRole("button", { name: "Enter console" }));

        await waitFor(() => expect(authenticated).toBe(true));
        expect(submitted as unknown).toEqual({
            requestType: "user-info",
            phone: "+919876543210",
            password: "correct horse battery staple",
        });
    });

    test("shows invalid credentials after a rejected password action", async () => {
        const view = renderLogin(
            async () => { throw { message: "Invalid credentials" }; },
            async () => {},
            "incorrect password",
        );
        fireEvent.click(view.getByRole("button", { name: "Enter console" }));

        expect(await view.findByText("Invalid credentials")).toBeTruthy();
        expect(view.getByText("Sign-in failed")).toBeTruthy();
    });

    test("requests WhatsApp OTP and moves to code verification", async () => {
        let submitted: OwnerLoginJSON | null = null;
        const view = renderLogin(async (data) => {
            submitted = data;
            return {
                status: "success",
                data: { nextRequestType: "otp-verification" },
                message: "If the Owner User is active, an OTP has been sent",
                code: 200,
            };
        });

        fireEvent.click(view.getByRole("button", { name: "OTP" }));
        fireEvent.click(view.getByRole("button", { name: "Send OTP on WhatsApp" }));

        expect(await view.findByText("OTP verification")).toBeTruthy();
        await act(async () => { await new Promise((resolve) => setTimeout(resolve, 60)); });
        expect(view.getByRole("button", { name: "Verify and enter" })).toBeTruthy();
        expect(submitted as unknown).toEqual({ requestType: "otp-info", phone: "+919876543210" });
    });

    test("shows invalid credentials after an invalid OTP action", async () => {
        let requestCount = 0;
        const view = renderLogin(
            async () => {
                requestCount += 1;
                if (requestCount === 1) {
                    return {
                        status: "success",
                        data: { nextRequestType: "otp-verification" },
                        message: "If the Owner User is active, an OTP has been sent",
                        code: 200,
                    };
                }
                throw { message: "Invalid credentials" };
            },
            async () => {},
            "",
            "123456",
        );

        fireEvent.click(view.getByRole("button", { name: "OTP" }));
        fireEvent.click(view.getByRole("button", { name: "Send OTP on WhatsApp" }));
        await view.findByText("OTP verification");
        await act(async () => { await new Promise((resolve) => setTimeout(resolve, 60)); });
        fireEvent.click(view.getByRole("button", { name: "Verify and enter" }));

        expect(await view.findByText("Invalid credentials")).toBeTruthy();
        expect(requestCount).toBe(2);
    });
});
