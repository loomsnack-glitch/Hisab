import { useQuery } from "@tanstack/react-query";
import { getSaleNumberSettings } from "@repo/services";
import type { StoreDTO } from "@repo/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";
import { LoaderCircle, ReceiptText } from "lucide-react";

import { billingKeys } from "@/lib/query-keys";

type SaleNumberSettingsFormProps = {
    organizationId: string;
    store: StoreDTO;
};

const SaleNumberSettingsForm = ({ organizationId, store }: SaleNumberSettingsFormProps) => {
    const settingsQuery = useQuery({
        queryKey: billingKeys.saleNumberSettings(organizationId, store.id),
        queryFn: () => getSaleNumberSettings(organizationId, store.id),
    });

    const settings =
        settingsQuery.data?.status === "success" ? settingsQuery.data.data?.settings : null;

    return (
        <Card className="max-w-xl border-border/60 bg-card/80 shadow-sm sm:shadow-md">
            <CardHeader>
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <ReceiptText className="size-4" />
                    </div>
                    <div>
                        <CardTitle className="font-display text-xl">Bill numbering</CardTitle>
                        <CardDescription>
                            Numbering rules are fixed for every store and cannot be customized.
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {settingsQuery.isPending ? (
                    <div className="flex min-h-32 items-center justify-center">
                        <LoaderCircle className="size-5 animate-spin text-primary" />
                    </div>
                ) : (
                    <ul className="space-y-3 text-sm text-muted-foreground">
                        <li>
                            <span className="font-medium text-foreground">Bill numbers</span>
                            {" — "}reset each financial year and print as plain sequences like 1, 2, 3.
                            {settings ? ` Timezone: ${settings.timezone}.` : null}
                        </li>
                        <li>
                            <span className="font-medium text-foreground">Token numbers</span>
                            {" — "}always enabled and reset daily (example: 001).
                        </li>
                        <li>
                            <span className="font-medium text-foreground">KOT Numbers</span>
                            {" — "}always reset daily (example: KOT-001).
                        </li>
                    </ul>
                )}
            </CardContent>
        </Card>
    );
};

export default SaleNumberSettingsForm;
