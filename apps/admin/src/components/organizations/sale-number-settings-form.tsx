import { useQuery } from "@tanstack/react-query";
import { getSaleNumberSettings } from "@repo/services";
import type { StoreDTO } from "@repo/types";
import { Badge } from "@repo/ui/components/badge";
import { Card, CardContent } from "@repo/ui/components/card";
import { Spinner } from "@repo/ui/components/spinner";
import { CalendarDays, Hash, ReceiptText, Ticket } from "lucide-react";

import { billingKeys } from "@/lib/query-keys";

type SaleNumberSettingsFormProps = {
    organizationId: string;
    store: StoreDTO;
};

type NumberingRuleRowProps = {
    icon: typeof ReceiptText;
    iconClassName: string;
    title: string;
    description: string;
};

const NumberingRuleRow = ({ icon: Icon, iconClassName, title, description }: NumberingRuleRowProps) => (
    <div className="rounded-xl border border-border/60 bg-muted/15 p-3.5">
        <div className="flex items-start gap-3">
            <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${iconClassName}`}>
                <Icon className="size-4" />
            </div>
            <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium text-foreground">{title}</p>
                <p className="text-xs text-muted-foreground">{description}</p>
            </div>
        </div>
    </div>
);

const SaleNumberSettingsForm = ({ organizationId, store }: SaleNumberSettingsFormProps) => {
    const settingsQuery = useQuery({
        queryKey: billingKeys.saleNumberSettings(organizationId, store.id),
        queryFn: () => getSaleNumberSettings(organizationId, store.id),
    });

    const settings =
        settingsQuery.data?.status === "success" ? settingsQuery.data.data?.settings : null;

    return (
        <Card className="group overflow-hidden rounded-2xl border-border/60 bg-card/80 shadow-2xs transition-all duration-200 hover:border-primary/20 hover:shadow-md">
            <CardContent className="p-0">
                <div className="relative overflow-hidden border-b border-border/50 px-5 py-5 sm:px-6">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.10),_transparent_55%)]" />
                    <div className="relative flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-start gap-3">
                            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-sky-500/15 bg-sky-500/10 text-sky-600 shadow-sm dark:text-sky-400">
                                <ReceiptText className="size-5" />
                            </div>
                            <div className="min-w-0 space-y-1">
                                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Billing</p>
                                <h3 className="font-display text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                                    Bill numbering
                                </h3>
                            </div>
                        </div>
                        <Badge variant="outline" className="rounded-full shrink-0">
                            Fixed rules
                        </Badge>
                    </div>
                </div>

                <div className="space-y-3 px-5 py-4 sm:px-6">
                    <p className="text-sm text-muted-foreground">
                        Numbering rules are fixed for every store and cannot be customized.
                    </p>

                    {settingsQuery.isPending ? (
                        <div className="flex min-h-32 items-center justify-center">
                            <Spinner className="size-6 text-primary" />
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <NumberingRuleRow
                                icon={Hash}
                                iconClassName="bg-primary/10 text-primary"
                                title="Bill numbers"
                                description={`Reset each financial year and print as plain sequences like 1, 2, 3.${
                                    settings ? ` Timezone: ${settings.timezone}.` : ""
                                }`}
                            />
                            <NumberingRuleRow
                                icon={Ticket}
                                iconClassName="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                title="Token numbers"
                                description="Always enabled and reset daily (example: 001)."
                            />
                            <NumberingRuleRow
                                icon={CalendarDays}
                                iconClassName="bg-violet-500/10 text-violet-600 dark:text-violet-400"
                                title="KOT numbers"
                                description="Always reset daily (example: KOT-001)."
                            />
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default SaleNumberSettingsForm;
