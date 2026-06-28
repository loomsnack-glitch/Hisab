import { useMemo } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, type SubmitHandler } from "react-hook-form";
import { deviceAuthenticate, deviceLogin } from "@repo/services";
import { DeviceLoginSchema, type DeviceLoginJSON } from "@repo/types";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Field, FieldContent, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Spinner } from "@repo/ui/components/spinner";
import { ArrowLeft, Building2, KeyRound, MonitorSmartphone, Store } from "lucide-react";
import { toast } from "sonner";

import { deviceAuthKeys } from "@/lib/query-keys";

const PosLoginPage = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [searchParams] = useSearchParams();

    const initialDeviceId = useMemo(() => searchParams.get("deviceId") ?? "", [searchParams]);

    const deviceAuthQuery = useQuery({
        queryKey: deviceAuthKeys.me,
        queryFn: deviceAuthenticate,
        retry: false,
    });

    const form = useForm<DeviceLoginJSON>({
        resolver: zodResolver(DeviceLoginSchema),
        defaultValues: {
            deviceId: initialDeviceId,
            deviceSecret: "",
        },
    });

    const loginMutation = useMutation({
        mutationFn: (payload: DeviceLoginJSON) => deviceLogin(payload),
        onSuccess: async (response) => {
            if (response.status !== "success" || !response.data?.session) {
                toast.error(response.message || "Unable to start POS session");
                return;
            }

            queryClient.setQueryData(deviceAuthKeys.me, {
                status: "success",
                data: { session: response.data.session },
                message: "Device authenticated successfully",
                code: 200,
            });

            toast.success("POS unlocked");
            navigate("/pos", { replace: true });
        },
        onError: (error: { message?: string }) => {
            toast.error(error?.message || "Unable to start POS session");
        },
    });

    const onSubmit: SubmitHandler<DeviceLoginJSON> = (values) => {
        loginMutation.mutate(values);
    };

    const activeSession =
        deviceAuthQuery.data?.status === "success"
            ? deviceAuthQuery.data.data?.session ?? null
            : null;

    if (!deviceAuthQuery.isPending && activeSession) {
        return <Navigate to="/pos" replace />;
    }

    return (
        <div className="min-h-screen bg-background px-4 py-8 text-foreground sm:px-6 lg:px-8">
            <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.12),_transparent_30%),radial-gradient(circle_at_bottom_right,_rgba(245,158,11,0.12),_transparent_30%)]" />
            </div>

            <div className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[0.9fr_1.1fr]">
                <div className="space-y-6">
                    <Button
                        variant="ghost"
                        className="rounded-full px-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
                        render={<Link to="/login" />}
                    >
                        <ArrowLeft className="mr-2 size-4" />
                        Back to admin login
                    </Button>

                    <div className="space-y-4">
                        <Badge className="rounded-full border-primary/20 bg-primary/10 text-primary">
                            POS route tree
                        </Badge>
                        <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">
                            Open a device-authenticated POS session.
                        </h1>
                        <p className="max-w-xl text-sm leading-7 text-muted-foreground">
                            Enter the store device id and secret exactly as provisioned by the organization admin. This
                            session stays isolated from the admin dashboard and stays locked to one store.
                        </p>
                    </div>

                    <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                        <CardHeader>
                            <CardTitle className="font-display text-2xl">What this unlocks</CardTitle>
                            <CardDescription>
                                The POS session uses the new backend device-auth and device-scoped billing APIs.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {[
                                {
                                    icon: Store,
                                    title: "Store-scoped workflow",
                                    description: "Products, customers, drafts, and bills stay bound to one store.",
                                },
                                {
                                    icon: MonitorSmartphone,
                                    title: "Device attribution",
                                    description: "Bill creation and updates are stamped with the active store device.",
                                },
                                {
                                    icon: Building2,
                                    title: "Isolated from admin auth",
                                    description: "Management login and POS login can coexist in the same browser.",
                                },
                            ].map((item) => {
                                const Icon = item.icon;
                                return (
                                    <div
                                        key={item.title}
                                        className="rounded-3xl border border-border/60 bg-background/70 p-4"
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                                                <Icon className="size-4" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-foreground">{item.title}</p>
                                                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                                    {item.description}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </CardContent>
                    </Card>
                </div>

                <Card className="border-border/60 bg-card/85 shadow-2xl shadow-black/10 backdrop-blur-xl">
                    <CardHeader className="space-y-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <KeyRound className="size-5" />
                        </div>
                        <CardTitle className="font-display text-3xl">Device login</CardTitle>
                        <CardDescription>
                            Use the credentials from the device onboarding flow. Secrets remain hidden on the admin side
                            until revealed intentionally.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {deviceAuthQuery.isPending ? (
                            <div className="flex min-h-40 items-center justify-center">
                                <Spinner className="size-6 text-primary" />
                            </div>
                        ) : (
                            <form className="space-y-5" onSubmit={form.handleSubmit(onSubmit)}>
                                <Field data-invalid={!!form.formState.errors.deviceId}>
                                    <FieldLabel required>Device id</FieldLabel>
                                    <FieldContent>
                                        <Input
                                            className="h-12 rounded-2xl"
                                            placeholder="Store device UUID"
                                            {...form.register("deviceId")}
                                        />
                                        <FieldError errors={[form.formState.errors.deviceId]} />
                                    </FieldContent>
                                </Field>

                                <Field data-invalid={!!form.formState.errors.deviceSecret}>
                                    <FieldLabel required>Device secret</FieldLabel>
                                    <FieldContent>
                                        <Input
                                            type="password"
                                            className="h-12 rounded-2xl"
                                            placeholder="Enter the store device secret"
                                            {...form.register("deviceSecret")}
                                        />
                                        <FieldError errors={[form.formState.errors.deviceSecret]} />
                                    </FieldContent>
                                </Field>

                                <div className="rounded-3xl border border-border/60 bg-background/60 p-4 text-sm text-muted-foreground">
                                    This login does not switch stores later. If you need a different counter, log out and
                                    authenticate with a different device.
                                </div>

                                <Button
                                    type="submit"
                                    className="h-12 w-full rounded-2xl text-base font-semibold"
                                    disabled={loginMutation.isPending}
                                >
                                    {loginMutation.isPending ? "Opening POS..." : "Start POS session"}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default PosLoginPage;
