import { afterEach, describe, expect, mock, test } from "bun:test";
import { Window } from "happy-dom";

const testWindow = new Window({ url: "http://localhost" });
const requestAnimationFrame = (callback: FrameRequestCallback) =>
    Number(setTimeout(() => callback(Date.now()), 16));
const cancelAnimationFrame = (id: number) => clearTimeout(id);

Object.assign(globalThis, {
    Element: testWindow.Element,
    Event: testWindow.Event,
    document: testWindow.document,
    HTMLElement: testWindow.HTMLElement,
    HTMLInputElement: testWindow.HTMLInputElement,
    Node: testWindow.Node,
    MutationObserver: testWindow.MutationObserver,
    ResizeObserver: testWindow.ResizeObserver,
    getComputedStyle: testWindow.getComputedStyle.bind(testWindow),
    navigator: testWindow.navigator,
    window: testWindow,
    requestAnimationFrame,
    cancelAnimationFrame,
});

const { act, cleanup, fireEvent, render, waitFor } = await import("@testing-library/react");
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import type { LoginAuthResponse, LoginFormJSON, ServiceResponse } from "@repo/types";

import LoginPage from "./login-page";

afterEach(cleanup);

const mockUser = {
    id: "user-123",
    phone: "+919876543210",
    firstName: "Himank",
    lastName: "Khaptawala",
    salutation: "mr.",
    status: "active",
};

const renderLogin = ({
    login,
    initialPhone = "+919876543210",
    initialMethod = "otp",
    initialRequestType = "otp-info",
    initialOtp = "",
}: {
    login: (data: LoginFormJSON) => Promise<ServiceResponse<LoginAuthResponse | null>>;
    initialPhone?: string;
    initialMethod?: "password" | "otp";
    initialRequestType?: "user-info" | "otp-info" | "otp-verification";
    initialOtp?: string;
}) => {
    const queryClient = new QueryClient({
        defaultOptions: { mutations: { retry: false } },
    });

    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={["/login"]}>
                <Routes>
                    <Route
                        path="/login"
                        element={
                            <LoginPage
                                login={login}
                                initialPhone={initialPhone}
                                initialMethod={initialMethod}
                                initialRequestType={initialRequestType}
                                initialOtp={initialOtp}
                            />
                        }
                    />
                    <Route path="/" element={<div data-testid="authenticated-home">Home Dashboard</div>} />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
};

describe("LoginPage OTP verification", () => {
    test("submits otp-verification with the 6-digit code and navigates home on success", async () => {
        let submittedPayload: LoginFormJSON | null = null;
        const loginFn = mock(async (data: LoginFormJSON) => {
            submittedPayload = data;
            return {
                status: "success" as const,
                data: {
                    user: mockUser,
                    token: "jwt-token-123",
                },
                message: "Login successful",
                code: 200,
            };
        });

        const view = renderLogin({
            login: loginFn,
            initialPhone: "+919876543210",
            initialRequestType: "otp-verification",
            initialOtp: "123456",
        });

        expect(view.getByText("Enter code")).toBeTruthy();
        const verifyButton = view.getByRole("button", { name: "Verify & Sign in" });
        expect(verifyButton).toBeTruthy();
        expect(verifyButton.hasAttribute("disabled")).toBe(false);

        await act(async () => {
            fireEvent.click(verifyButton);
        });

        await waitFor(() => expect(loginFn).toHaveBeenCalledTimes(1));

        expect(submittedPayload).toEqual({
            phone: "+919876543210",
            otp: "123456",
            requestType: "otp-verification",
        });

        await waitFor(() => expect(view.queryByTestId("authenticated-home")).toBeTruthy());
    });

    test("requests OTP from WhatsApp OTP start screen", async () => {
        let submittedPayload: LoginFormJSON | null = null;
        const loginFn = mock(async (data: LoginFormJSON) => {
            submittedPayload = data;
            return {
                status: "success" as const,
                data: { nextRequestType: "otp-verification" as const },
                message: "OTP sent successfully",
                code: 200,
            };
        });

        const view = renderLogin({
            login: loginFn,
            initialPhone: "+919876543210",
            initialMethod: "otp",
            initialRequestType: "otp-info",
        });

        const sendButton = view.getByRole("button", { name: /Send WhatsApp Code/i });
        await act(async () => {
            fireEvent.click(sendButton);
        });

        await waitFor(() => expect(loginFn).toHaveBeenCalledTimes(1));
        expect(submittedPayload).toEqual({
            phone: "+919876543210",
            requestType: "otp-info",
        });

        await waitFor(() => expect(view.getByText("Enter code")).toBeTruthy());
    });

    test("handles invalid OTP without navigating", async () => {
        const loginFn = mock(async () => {
            throw { message: "Invalid OTP" };
        });

        const view = renderLogin({
            login: loginFn,
            initialPhone: "+919876543210",
            initialRequestType: "otp-verification",
            initialOtp: "999999",
        });

        const verifyButton = view.getByRole("button", { name: "Verify & Sign in" });
        await act(async () => {
            fireEvent.click(verifyButton);
        });

        await waitFor(() => expect(loginFn).toHaveBeenCalledTimes(1));
        expect(view.queryByTestId("authenticated-home")).toBeNull();
        expect(view.getByText("Enter code")).toBeTruthy();
    });
});
