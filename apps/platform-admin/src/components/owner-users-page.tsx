import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, UserPlus } from "lucide-react";
import {
    createOwnerUser as createOwnerUserRequest,
    listOwnerUsers as listOwnerUsersRequest,
    setOwnerUserActiveState as setOwnerUserActiveStateRequest,
} from "@repo/services";
import {
    CreateOwnerUserSchema,
    formatPhoneDisplay,
    type CreateOwnerUserJSON,
    type OwnerUserDTO,
} from "@repo/types";
import { Alert, AlertDescription, AlertTitle } from "@repo/ui/components/alert";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { PasswordInput } from "@repo/ui/components/password-input";
import { PhoneInput } from "@repo/ui/components/phone-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@repo/ui/components/table";

const ownerUsersQueryKey = ["platform-owner", "owner-users"] as const;

type OwnerUsersPageProps = {
    currentOwnerUser: OwnerUserDTO;
    onBack: () => void;
    listOwnerUsers?: typeof listOwnerUsersRequest;
    createOwnerUser?: typeof createOwnerUserRequest;
    setOwnerUserActiveState?: typeof setOwnerUserActiveStateRequest;
    initialCreateValues?: CreateOwnerUserJSON;
};

type PendingAccessChange = {
    ownerUser: OwnerUserDTO;
    isActive: boolean;
};

const ownerDisplayName = (ownerUser: OwnerUserDTO) => `${ownerUser.firstName} ${ownerUser.lastName}`;

const OwnerUsersPage = ({
    currentOwnerUser,
    onBack,
    listOwnerUsers = listOwnerUsersRequest,
    createOwnerUser = createOwnerUserRequest,
    setOwnerUserActiveState = setOwnerUserActiveStateRequest,
    initialCreateValues,
}: OwnerUsersPageProps) => {
    const queryClient = useQueryClient();
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [firstName, setFirstName] = useState(initialCreateValues?.firstName ?? "");
    const [lastName, setLastName] = useState(initialCreateValues?.lastName ?? "");
    const [phone, setPhone] = useState(initialCreateValues?.phone ?? "");
    const [password, setPassword] = useState(initialCreateValues?.password ?? "");
    const [formError, setFormError] = useState<string | null>(null);
    const [pendingChange, setPendingChange] = useState<PendingAccessChange | null>(null);
    const [accessError, setAccessError] = useState<string | null>(null);

    const ownerUsersQuery = useQuery({
        queryKey: ownerUsersQueryKey,
        queryFn: listOwnerUsers,
        retry: false,
    });
    const ownerUsers = ownerUsersQuery.data?.status === "success" ? ownerUsersQuery.data.data?.ownerUsers ?? [] : [];
    const activeCount = ownerUsers.filter((ownerUser) => ownerUser.isActive).length;

    const resetCreateForm = () => {
        setFirstName(initialCreateValues?.firstName ?? "");
        setLastName(initialCreateValues?.lastName ?? "");
        setPhone(initialCreateValues?.phone ?? "");
        setPassword(initialCreateValues?.password ?? "");
        setFormError(null);
    };

    const createMutation = useMutation({
        mutationFn: createOwnerUser,
        onMutate: () => setFormError(null),
        onSuccess: async (response) => {
            if (response.status === "error") {
                setFormError(response.message);
                return;
            }
            resetCreateForm();
            setShowCreateForm(false);
            await queryClient.invalidateQueries({ queryKey: ownerUsersQueryKey });
        },
        onError: (error: { message?: string }) => {
            setFormError(error.message ?? "Owner User was not created");
        },
    });

    const accessMutation = useMutation({
        mutationFn: ({ ownerUser, isActive }: PendingAccessChange) => setOwnerUserActiveState(ownerUser.id, { isActive }),
        onMutate: () => setAccessError(null),
        onSuccess: async (response) => {
            if (response.status === "error") {
                setAccessError(response.message);
                return;
            }
            setPendingChange(null);
            await queryClient.invalidateQueries({ queryKey: ownerUsersQueryKey });
        },
        onError: (error: { message?: string }) => {
            setAccessError(error.message ?? "Owner User access was not updated");
        },
    });

    const submitCreate = (event: FormEvent) => {
        event.preventDefault();
        const parsed = CreateOwnerUserSchema.safeParse({ firstName, lastName, phone, password });
        if (!parsed.success) {
            setFormError(parsed.error.issues[0]?.message ?? "Check the Owner User details");
            return;
        }
        createMutation.mutate({ firstName, lastName, phone, password });
    };

    const accessControl = (ownerUser: OwnerUserDTO) => {
        if (ownerUser.id === currentOwnerUser.id) {
            return <p className="text-sm text-slate-500">You cannot deactivate yourself</p>;
        }
        if (ownerUser.isActive && activeCount <= 1) {
            return <p className="text-sm text-slate-500">The final active Owner User cannot be deactivated</p>;
        }
        return (
            <Button
                type="button"
                variant={ownerUser.isActive ? "outline" : "default"}
                size="sm"
                onClick={() => {
                    setAccessError(null);
                    setPendingChange({ ownerUser, isActive: !ownerUser.isActive });
                }}
            >
                {ownerUser.isActive ? "Deactivate" : "Reactivate"} {ownerDisplayName(ownerUser)}
            </Button>
        );
    };

    return (
        <section className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                    <Button type="button" variant="ghost" className="-ml-3" onClick={onBack}>
                        <ArrowLeft className="size-4" /> Back to console
                    </Button>
                    <h1 className="text-3xl font-semibold tracking-tight">Owner Users</h1>
                    <p className="text-slate-600">Manage internal Ganatri access. This screen cannot change Organizations, Stores, Sales, or other tenant data.</p>
                </div>
                <Button type="button" onClick={() => { setShowCreateForm(true); setFormError(null); }}>
                    <UserPlus className="size-4" /> Add Owner User
                </Button>
            </div>

            {showCreateForm ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Create Owner User</CardTitle>
                        <CardDescription>The new Owner User can sign in immediately with this phone number and password.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form className="grid gap-4 md:grid-cols-2" onSubmit={submitCreate}>
                            <label className="block space-y-2 text-sm font-medium">
                                First name
                                <Input value={firstName} onChange={(event) => setFirstName(event.target.value)} autoComplete="given-name" />
                            </label>
                            <label className="block space-y-2 text-sm font-medium">
                                Last name
                                <Input value={lastName} onChange={(event) => setLastName(event.target.value)} autoComplete="family-name" />
                            </label>
                            <label className="block space-y-2 text-sm font-medium">
                                WhatsApp phone
                                <PhoneInput value={phone || undefined} onChange={(value: string | undefined) => setPhone(value ?? "")} className="h-11 rounded-xl border px-3" />
                            </label>
                            <label className="block space-y-2 text-sm font-medium">
                                Initial password
                                <PasswordInput value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" />
                            </label>
                            {formError ? (
                                <div className="md:col-span-2">
                                    <Alert variant="destructive" role="alert">
                                        <AlertTitle>Owner User was not created</AlertTitle>
                                        <AlertDescription>{formError}</AlertDescription>
                                    </Alert>
                                </div>
                            ) : null}
                            <div className="flex gap-2 md:col-span-2">
                                <Button type="submit" disabled={createMutation.isPending}>
                                    {createMutation.isPending ? "Creating..." : "Create Owner User"}
                                </Button>
                                <Button type="button" variant="outline" onClick={() => { setShowCreateForm(false); resetCreateForm(); }}>
                                    Cancel
                                </Button>
                            </div>
                        </form>
                    </CardContent>
                </Card>
            ) : null}

            {pendingChange ? (
                <div role="alertdialog" aria-labelledby="owner-access-confirm-title" className="rounded-xl border bg-white p-4 shadow-sm">
                    <h2 id="owner-access-confirm-title" className="text-lg font-semibold">
                        {pendingChange.isActive ? "Reactivate Owner User?" : "Deactivate Owner User?"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                        {pendingChange.isActive
                            ? `${ownerDisplayName(pendingChange.ownerUser)} will regain Platform Operations Console access.`
                            : `${ownerDisplayName(pendingChange.ownerUser)} will lose console access on their next request.`}
                    </p>
                    {accessError ? (
                        <Alert variant="destructive" className="mt-3" role="alert">
                            <AlertTitle>Access was not updated</AlertTitle>
                            <AlertDescription>{accessError}</AlertDescription>
                        </Alert>
                    ) : null}
                    <div className="mt-4 flex gap-2">
                        <Button
                            type="button"
                            variant={pendingChange.isActive ? "default" : "destructive"}
                            disabled={accessMutation.isPending}
                            onClick={() => accessMutation.mutate(pendingChange)}
                        >
                            {accessMutation.isPending
                                ? "Updating..."
                                : pendingChange.isActive
                                    ? `Confirm reactivation of ${ownerDisplayName(pendingChange.ownerUser)}`
                                    : `Confirm deactivation of ${ownerDisplayName(pendingChange.ownerUser)}`}
                        </Button>
                        <Button type="button" variant="outline" onClick={() => { setPendingChange(null); setAccessError(null); }}>
                            Cancel
                        </Button>
                    </div>
                </div>
            ) : null}

            {ownerUsersQuery.isPending ? (
                <p aria-busy="true">Loading Owner Users…</p>
            ) : ownerUsersQuery.isError || ownerUsersQuery.data?.status === "error" ? (
                <Alert variant="destructive" role="alert">
                    <AlertTitle>Owner Users could not be loaded</AlertTitle>
                    <AlertDescription>
                        {(ownerUsersQuery.error as { message?: string } | null)?.message
                            ?? ownerUsersQuery.data?.message
                            ?? "The Owner Users list is unavailable."}
                    </AlertDescription>
                </Alert>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Access roster</CardTitle>
                        <CardDescription>Every Owner User and whether they may enter the console.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {ownerUsers.length === 0 ? (
                            <p>No Owner Users were found.</p>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Access</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {ownerUsers.map((ownerUser) => (
                                        <TableRow key={ownerUser.id}>
                                            <TableCell>{ownerDisplayName(ownerUser)}</TableCell>
                                            <TableCell>{formatPhoneDisplay(ownerUser.phone)}</TableCell>
                                            <TableCell>
                                                <Badge variant={ownerUser.isActive ? "secondary" : "outline"}>
                                                    {ownerUser.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>{accessControl(ownerUser)}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            )}
        </section>
    );
};

export default OwnerUsersPage;
export type { OwnerUsersPageProps };
