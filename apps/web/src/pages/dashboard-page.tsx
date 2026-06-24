import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createColumnHelper, flexRender, getCoreRowModel, useReactTable } from "@tanstack/react-table";
import { LogOut } from "lucide-react";
import { userLogout } from "@repo/services";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@repo/ui/components/table";
import { toast } from "sonner";

import { useAuthActions, useAuthUser } from "@/store/auth.store";

type ProfileRow = {
    label: string;
    value: string;
};

const columnHelper = createColumnHelper<ProfileRow>();

const columns = [
    columnHelper.accessor("label", {
        header: "Field",
        cell: (info) => info.getValue(),
    }),
    columnHelper.accessor("value", {
        header: "Value",
        cell: (info) => info.getValue(),
    }),
];

const DashboardPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const authUser = useAuthUser();
    const { clearUser } = useAuthActions();

    const rows = useMemo<ProfileRow[]>(() => {
        if (!authUser) return [];

        return [
            { label: "Salutation", value: authUser.salutation.toUpperCase() },
            { label: "First name", value: authUser.firstName },
            { label: "Last name", value: authUser.lastName },
            { label: "Phone", value: authUser.phone },
            { label: "Email", value: authUser.email ?? "Not provided" },
        ];
    }, [authUser]);

    const table = useReactTable({
        data: rows,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    const logoutMutation = useMutation({
        mutationFn: userLogout,
        onSuccess: () => {
            clearUser();
            queryClient.removeQueries({ queryKey: ["auth", "me"] });
            toast.success("Logged out successfully");
            navigate("/login", { replace: true });
        },
        onError: (error: { message?: string }) => {
            toast.error(error.message ?? "Failed to logout");
        },
    });

    return (
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_30%),linear-gradient(180deg,_#fffbf5,_#ffffff)] px-4 py-8 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-5xl space-y-6">
                <Card className="overflow-hidden border-amber-100 bg-white shadow-[0_24px_80px_rgba(120,53,15,0.12)]">
                    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
                        <CardHeader className="space-y-4 p-8">
                            <div className="inline-flex w-fit rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs uppercase tracking-[0.24em] text-amber-700">
                                Demo dashboard
                            </div>
                            <CardTitle className="text-3xl tracking-tight text-slate-950">
                                Welcome, {authUser?.salutation} {authUser?.firstName} {authUser?.lastName}
                            </CardTitle>
                            <CardDescription className="max-w-xl text-sm leading-7 text-slate-600">
                                This is the placeholder screen after authentication. It confirms the user is logged in,
                                the cookie session is working, and shared data can be rendered through TanStack Table.
                            </CardDescription>
                            <div className="flex flex-wrap gap-3">
                                <Button
                                    className="rounded-xl bg-slate-950 text-white hover:bg-slate-900"
                                    onClick={() => logoutMutation.mutate()}
                                    disabled={logoutMutation.isPending}
                                >
                                    <LogOut className="mr-2 size-4" />
                                    {logoutMutation.isPending ? "Logging out..." : "Logout"}
                                </Button>
                            </div>
                        </CardHeader>

                        <div className="bg-slate-950 p-8 text-white">
                            <p className="text-xs uppercase tracking-[0.24em] text-amber-300">Session snapshot</p>
                            <div className="mt-6 space-y-4">
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <p className="text-xs text-slate-400">Phone login identifier</p>
                                    <p className="mt-1 text-lg font-medium">{authUser?.phone}</p>
                                </div>
                                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                                    <p className="text-xs text-slate-400">Optional email</p>
                                    <p className="mt-1 text-lg font-medium">{authUser?.email ?? "Not provided"}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>

                <Card className="border-amber-100 bg-white shadow-[0_24px_80px_rgba(120,53,15,0.08)]">
                    <CardHeader>
                        <CardTitle className="text-xl text-slate-950">User profile table</CardTitle>
                        <CardDescription>
                            A small TanStack Table example using the authenticated user payload.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table className="min-w-full">
                            <TableHeader>
                                {table.getHeaderGroups().map((headerGroup) => (
                                    <TableRow key={headerGroup.id}>
                                        {headerGroup.headers.map((header) => (
                                            <TableHead key={header.id}>
                                                {header.isPlaceholder
                                                    ? null
                                                    : flexRender(header.column.columnDef.header, header.getContext())}
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableHeader>
                            <TableBody>
                                {table.getRowModel().rows.map((row) => (
                                    <TableRow key={row.id}>
                                        {row.getVisibleCells().map((cell) => (
                                            <TableCell key={cell.id}>
                                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                            </TableCell>
                                        ))}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default DashboardPage;
