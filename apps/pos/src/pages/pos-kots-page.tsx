import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { completePosKitchenKot, getPosKitchenKots } from "@repo/services";
import type { KitchenKotDTO } from "@repo/types";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@repo/ui/components/alert-dialog";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Spinner } from "@repo/ui/components/spinner";
import { Check, ChefHat } from "lucide-react";
import { toast } from "sonner";

import { kotKeys } from "@/lib/query-keys";
import { getKitchenKotContext } from "@/lib/pos-kitchen-kot";
import type { PosRouteContext } from "@/pages/pos-route-context";

const formatItemLine = (item: KitchenKotDTO["items"][number]) =>
    `${item.quantity}× ${item.productNameSnapshot}`;

const PosKotsPage = () => {
    const { session } = useOutletContext<PosRouteContext>();
    const queryClient = useQueryClient();
    const [kotToComplete, setKotToComplete] = useState<KitchenKotDTO | null>(
        null,
    );

    const kitchenKotsQuery = useQuery({
        queryKey: kotKeys.posKitchen(),
        queryFn: getPosKitchenKots,
        refetchInterval: 5_000,
    });

    const completeMutation = useMutation({
        mutationFn: completePosKitchenKot,
        onSuccess: (response) => {
            if (response.status !== "success" || !response.data) {
                toast.error(response.message || "Could not complete KOT");
                return;
            }
            setKotToComplete(null);
            queryClient.setQueryData(kotKeys.posKitchen(), response);
            toast.success(response.message || "KOT completed");
        },
        onError: (error) => {
      toast.error(
        (error as { message?: string })?.message || "Could not complete KOT",
      );
        },
    });

    const kots =
        kitchenKotsQuery.data?.status === "success"
            ? (kitchenKotsQuery.data.data?.kots ?? [])
            : [];

    if (!session.store.kotSystemEnabled) {
        return (
            <div className="flex h-full items-center justify-center px-6 py-10">
        <p className="text-sm text-muted-foreground">
          KOT System is not enabled for this store.
        </p>
            </div>
        );
    }

    if (kitchenKotsQuery.isPending) {
        return (
            <div className="flex h-full items-center justify-center">
                <Spinner className="size-6 text-primary" />
            </div>
        );
    }

    if (kitchenKotsQuery.isError) {
        const message =
            (kitchenKotsQuery.error as { message?: string } | null)?.message ||
            "Could not load KOTs. If you just deployed, run the latest database migration.";
        return (
            <div className="flex h-full items-center justify-center px-6 py-10">
                <p className="text-sm text-destructive">{message}</p>
            </div>
        );
    }

    if (kitchenKotsQuery.data?.status === "error") {
        return (
            <div className="flex h-full items-center justify-center px-6 py-10">
                <p className="text-sm text-destructive">
                    {kitchenKotsQuery.data.message || "Could not load KOTs"}
                </p>
            </div>
        );
    }

    return (
        <div className="flex h-full flex-col overflow-hidden">
            <div className="border-b border-border/50 px-4 py-4 sm:px-6">
                <div className="flex items-center gap-2">
                    <ChefHat className="size-5 text-primary" />
          <h1 className="font-display text-xl font-semibold tracking-tight">
            Kitchen Orders
          </h1>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                    {kots.length === 0
                        ? "No pending KOTs right now."
                        : `${kots.length} pending ${kots.length === 1 ? "order" : "orders"}`}
                </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
                {kots.length === 0 ? (
                    <div className="flex h-full min-h-48 items-center justify-center rounded-2xl border border-dashed border-border/70 bg-card/40 px-6 py-10 text-center">
                        <div>
                            <ChefHat className="mx-auto size-8 text-muted-foreground/70" />
              <p className="mt-3 text-sm font-medium text-foreground">
                All caught up
              </p>
                            <p className="mt-1 text-sm text-muted-foreground">
                                New KOTs will appear here when orders are sent to the kitchen.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                        {kots.map((kot) => {
                            const isCompleting =
                completeMutation.isPending &&
                completeMutation.variables === kot.id;
              const context = getKitchenKotContext(kot);

                            return (
                                <Card
                                    key={kot.id}
                                    className="overflow-hidden rounded-2xl border-border/70 bg-card/80 shadow-sm"
                                >
                                    <CardContent className="flex h-full flex-col gap-4 p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                    KOT
                                                </p>
                                                <p className="font-display text-2xl font-semibold tracking-tight">
                                                    {kot.kotNumber}
                                                </p>
                                            </div>
                                            <div className="rounded-xl bg-muted/60 px-3 py-2 text-right">
                                                <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                          {context.label}
                                                </p>
                        <p className="text-lg font-semibold">{context.value}</p>
                                            </div>
                                        </div>

                                        <div className="min-h-0 flex-1">
                                            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                Items
                                            </p>
                                            <ul className="space-y-1.5 text-sm">
                                                {kot.items.map((item, index) => (
                                                    <li
                                                        key={`${kot.id}-${index}`}
                                                        className="rounded-lg bg-muted/40 px-3 py-2"
                                                    >
                                                        {formatItemLine(item)}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>

                                        <Button
                                            type="button"
                                            className="w-full rounded-xl"
                                            disabled={completeMutation.isPending}
                                            onClick={() => setKotToComplete(kot)}
                                        >
                                            {isCompleting ? (
                                                <Spinner className="size-4" />
                                            ) : (
                                                <>
                                                    <Check className="size-4" />
                                                    Complete
                                                </>
                                            )}
                                        </Button>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            <AlertDialog
                open={Boolean(kotToComplete)}
                onOpenChange={(open) => {
                    if (!open && !completeMutation.isPending) {
                        setKotToComplete(null);
                    }
                }}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Complete this KOT?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Mark KOT {kotToComplete?.kotNumber} as complete? This
                            will remove it from the pending kitchen queue.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={completeMutation.isPending}>
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            disabled={completeMutation.isPending}
                            onClick={() => {
                                if (kotToComplete) {
                                    completeMutation.mutate(kotToComplete.id);
                                }
                            }}
                        >
                            {completeMutation.isPending ? (
                                <Spinner className="size-4" />
                            ) : (
                                "Complete KOT"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
};

export default PosKotsPage;
