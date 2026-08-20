import "../test-setup";
import { afterEach, describe, expect, test } from "bun:test";
import { cleanup, fireEvent, render, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { CreateOwnerUserJSON, OwnerUserDTO, OwnerUserListResponse, OwnerUserResponse, ServiceResponse } from "@repo/types";

import ConsoleEntry from "./console-entry";
import OwnerUsersPage from "./owner-users-page";

afterEach(cleanup);

const asha: OwnerUserDTO = {
    id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    firstName: "Asha",
    lastName: "Shah",
    phone: "+919876543210",
    isActive: true,
    createdAt: "2026-08-20T00:00:00.000Z",
    updatedAt: "2026-08-20T00:00:00.000Z",
};

const ravi: OwnerUserDTO = {
    id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    firstName: "Ravi",
    lastName: "Mehta",
    phone: "+919111111111",
    isActive: true,
    createdAt: "2026-08-20T01:00:00.000Z",
    updatedAt: "2026-08-20T01:00:00.000Z",
};

const neel: OwnerUserDTO = {
    id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    firstName: "Neel",
    lastName: "Iyer",
    phone: "+919222222222",
    isActive: true,
    createdAt: "2026-08-21T00:00:00.000Z",
    updatedAt: "2026-08-21T00:00:00.000Z",
};

const successList = (ownerUsers: OwnerUserDTO[]): ServiceResponse<OwnerUserListResponse> => ({
    status: "success",
    data: { ownerUsers },
    message: "Owner Users retrieved successfully",
    code: 200,
});

const renderPage = (props: Partial<Parameters<typeof OwnerUsersPage>[0]> & { currentOwnerUser?: OwnerUserDTO } = {}) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
    return render(
        <QueryClientProvider client={client}>
            <OwnerUsersPage
                currentOwnerUser={props.currentOwnerUser ?? asha}
                onBack={props.onBack ?? (() => {})}
                listOwnerUsers={props.listOwnerUsers ?? (async () => successList([asha, ravi]))}
                createOwnerUser={props.createOwnerUser ?? (async () => ({
                    status: "success",
                    data: { ownerUser: neel },
                    message: "Owner User created successfully",
                    code: 201,
                }))}
                setOwnerUserActiveState={props.setOwnerUserActiveState ?? (async () => ({
                    status: "success",
                    data: { ownerUser: { ...ravi, isActive: false } },
                    message: "Owner User deactivated successfully",
                    code: 200,
                }))}
                initialCreateValues={props.initialCreateValues}
                onUnauthorized={props.onUnauthorized}
            />
        </QueryClientProvider>,
    );
};

describe("Console Users console destination", () => {
    test("opens the Console Users destination from the console home", async () => {
        const view = render(
            <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
                <ConsoleEntry
                    ownerUser={asha}
                    onLogout={async () => {}}
                    ownerUsersPageProps={{
                        listOwnerUsers: async () => successList([asha, ravi]),
                    }}
                />
            </QueryClientProvider>,
        );

        fireEvent.click(view.getByRole("button", { name: "Open Console Users" }));
        expect(await view.findByRole("heading", { name: "Console Users" })).toBeTruthy();
        expect(view.queryByText("Create Organization")).toBeNull();
        expect(view.queryByText("Create Sale")).toBeNull();
        expect(view.getByText(/cannot change Organizations, Stores, Sales/)).toBeTruthy();
    });

    test("shows each Owner User identity and active status", async () => {
        const view = renderPage();

        expect(await view.findByText("Asha Shah")).toBeTruthy();
        expect(view.getByText("Ravi Mehta")).toBeTruthy();
        expect(view.getByText("+91 98765 43210")).toBeTruthy();
        expect(view.getByText("+91 91111 11111")).toBeTruthy();
        expect(view.getAllByText("Active", { exact: true })).toHaveLength(2);
        expect(view.getByText("You cannot deactivate yourself")).toBeTruthy();
        expect(view.getByRole("button", { name: "Deactivate Ravi Mehta" })).toBeTruthy();
    });

    test("creates another Owner User with the required identity fields", async () => {
        let roster = [asha, ravi];
        let created: CreateOwnerUserJSON | null = null;
        const view = renderPage({
            listOwnerUsers: async () => successList(roster),
            createOwnerUser: async (data) => {
                created = data;
                roster = [...roster, neel];
                return {
                    status: "success",
                    data: { ownerUser: neel },
                    message: "Owner User created successfully",
                    code: 201,
                } satisfies ServiceResponse<OwnerUserResponse>;
            },
            initialCreateValues: {
                firstName: "Neel",
                lastName: "Iyer",
                phone: "+919222222222",
                password: "created horse battery",
            },
        });

        await view.findByText("Asha Shah");
        fireEvent.click(view.getByRole("button", { name: "Add Owner User" }));
        fireEvent.click(view.getByRole("button", { name: "Create Owner User" }));

        await waitFor(() => expect(created).toEqual({
            firstName: "Neel",
            lastName: "Iyer",
            phone: "+919222222222",
            password: "created horse battery",
        }));
        expect(await view.findByText("Neel Iyer")).toBeTruthy();
    });

    test("shows a safe duplicate-phone rejection", async () => {
        const view = renderPage({
            createOwnerUser: async () => {
                throw { message: "An Owner User with that phone already exists" };
            },
            initialCreateValues: {
                firstName: "Copy",
                lastName: "Cat",
                phone: "+919876543210",
                password: "created horse battery",
            },
        });

        await view.findByText("Asha Shah");
        fireEvent.click(view.getByRole("button", { name: "Add Owner User" }));
        fireEvent.click(view.getByRole("button", { name: "Create Owner User" }));

        expect(await view.findByText("An Owner User with that phone already exists")).toBeTruthy();
        expect(view.getByText("Owner User was not created")).toBeTruthy();
    });

    test("requires confirmation before deactivating another Owner User", async () => {
        let requested: { ownerUserId: string; isActive: boolean } | null = null;
        const view = renderPage({
            setOwnerUserActiveState: async (ownerUserId, data) => {
                requested = { ownerUserId, isActive: data.isActive };
                return {
                    status: "success",
                    data: { ownerUser: { ...ravi, isActive: false } },
                    message: "Owner User deactivated successfully",
                    code: 200,
                };
            },
        });

        fireEvent.click(await view.findByRole("button", { name: "Deactivate Ravi Mehta" }));
        expect(view.getByRole("alertdialog")).toBeTruthy();
        expect(requested).toBeNull();

        fireEvent.click(view.getByRole("button", { name: "Confirm deactivation of Ravi Mehta" }));
        await waitFor(() => expect(requested).toEqual({ ownerUserId: ravi.id, isActive: false }));
    });

    test("does not offer a self-deactivation control", async () => {
        const view = renderPage();
        await view.findByText("Asha Shah");
        expect(view.queryByRole("button", { name: /Deactivate Asha Shah/ })).toBeNull();
        expect(view.getByText("You cannot deactivate yourself")).toBeTruthy();
    });

    test("does not offer deactivation of the final active Owner User", async () => {
        const view = renderPage({
            listOwnerUsers: async () => successList([asha, { ...ravi, isActive: false }]),
        });

        await view.findByText("Ravi Mehta");
        expect(view.queryByRole("button", { name: /Deactivate Asha Shah/ })).toBeNull();
        expect(view.getByText("You cannot deactivate yourself")).toBeTruthy();
        expect(view.getByRole("button", { name: "Reactivate Ravi Mehta" })).toBeTruthy();
        expect(view.queryByText("Create Store")).toBeNull();
        expect(view.queryByText("Void Sale")).toBeNull();
    });

    test("returns the operator to sign-in when the Console session is unauthorized", async () => {
        let unauthorized = false;
        renderPage({
            listOwnerUsers: async () => ({
                status: "error",
                data: null,
                message: "Owner session is no longer active",
                code: 401,
            }),
            onUnauthorized: async () => { unauthorized = true; },
        });

        await waitFor(() => expect(unauthorized).toBe(true));
    });
});
