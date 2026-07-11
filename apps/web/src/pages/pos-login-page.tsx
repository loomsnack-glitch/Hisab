import { useMemo } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, type SubmitHandler } from "react-hook-form";
import { deviceAuthenticate, deviceLogin } from "@repo/services";
import { DeviceLoginSchema, type DeviceLoginJSON } from "@repo/types";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Field, FieldContent, FieldError, FieldLabel } from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";
import { Spinner } from "@repo/ui/components/spinner";
import { toast } from "sonner";

import AuthShell from "@/components/auth/auth-shell";
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
        <AuthShell
            title="Device login"
            subtitle="Use the credentials from the device onboarding flow. Secrets remain hidden on the admin side until revealed intentionally."
        >
            <div className="mb-3 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 flex items-center justify-between gap-4 text-xs">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <span>Want to manage the store instead?</span>
                </div>
                <Link to="/login" className="font-semibold text-amber-600 dark:text-amber-400 hover:underline shrink-0">
                    Admin login &rarr;
                </Link>
            </div>

            <Card className="border-border/70 shadow-sm">
                <CardContent className="space-y-4 p-5 sm:p-6">
                    {deviceAuthQuery.isPending ? (
                        <div className="flex min-h-40 items-center justify-center">
                            <Spinner className="size-6 text-primary" />
                        </div>
                    ) : (
                        <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                            <Field data-invalid={!!form.formState.errors.deviceId} className="space-y-1">
                                <FieldLabel required className="text-xs">Device id</FieldLabel>
                                <FieldContent>
                                    <Input
                                        className="h-10 rounded-xl transition-colors duration-200 text-sm"
                                        placeholder="Store device UUID"
                                        {...form.register("deviceId")}
                                    />
                                    <FieldError errors={[form.formState.errors.deviceId]} className="text-[10px]" />
                                </FieldContent>
                            </Field>

                            <Field data-invalid={!!form.formState.errors.deviceSecret} className="space-y-1">
                                <FieldLabel required className="text-xs">Device secret</FieldLabel>
                                <FieldContent>
                                    <Input
                                        type="password"
                                        className="h-10 rounded-xl transition-colors duration-200 text-sm"
                                        placeholder="Enter the store device secret"
                                        {...form.register("deviceSecret")}
                                    />
                                    <FieldError errors={[form.formState.errors.deviceSecret]} className="text-[10px]" />
                                </FieldContent>
                            </Field>

                            <div className="rounded-xl border border-border bg-muted/30 p-3 text-[11px] text-muted-foreground leading-relaxed">
                                This login does not switch stores later. If you need a different counter, log out and
                                authenticate with a different device.
                            </div>

                            <Button
                                type="submit"
                                className="h-10 w-full rounded-xl transition-all duration-200 text-sm font-semibold"
                                disabled={loginMutation.isPending}
                            >
                                {loginMutation.isPending ? "Opening POS..." : "Start POS session"}
                            </Button>
                        </form>
                    )}
                </CardContent>
            </Card>
        </AuthShell>
    );
};

export default PosLoginPage;
