import { Pencil, Store } from "lucide-react";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@repo/ui/components/card";

import StoreWorkspacePageGate from "@/components/dashboard/store-workspace-page-gate";
import EditStoreDialog from "@/components/organizations/edit-store-dialog";
import InvoiceAppearanceSettingsForm from "@/components/organizations/invoice-appearance-settings-form";
import SaleNumberSettingsForm from "@/components/organizations/sale-number-settings-form";
import StoreFeatureSettingsForm from "@/components/organizations/store-feature-settings-form";
import StorePaymentRoutingForm from "@/components/organizations/store-payment-routing-form";
import StoreWhatsAppLinkCard from "@/components/organizations/store-whatsapp-link-card";

const StoreWorkspaceSettingsPage = () => (
    <StoreWorkspacePageGate testId="store-settings-page">
        {({ organizationId, store }) => (
            <>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
                    <Card className="border-border/60 bg-card/80 shadow-xl shadow-black/5">
                        <CardHeader>
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex items-start gap-3 min-w-0">
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                                        <Store className="size-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <CardTitle className="font-display text-xl">Store details</CardTitle>
                                        <CardDescription>
                                            Name, address, and customer-facing profile for this store.
                                        </CardDescription>
                                    </div>
                                </div>
                                <EditStoreDialog
                                    organizationId={organizationId}
                                    store={store}
                                    trigger={
                                        <Button variant="outline" className="rounded-full h-9 text-xs sm:h-10 sm:text-sm px-3.5 sm:px-4 shrink-0">
                                            <Pencil className="size-3.5 sm:size-4" />
                                            Edit store
                                        </Button>
                                    }
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            <p className="font-semibold text-foreground truncate">{store.name}</p>
                            <p className="text-sm text-muted-foreground">{store.address ?? "Address not added yet"}</p>
                        </CardContent>
                    </Card>
                    <StoreWhatsAppLinkCard organizationId={organizationId} storeId={store.id} />
                </div>
                <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:items-start">
                    <StoreFeatureSettingsForm organizationId={organizationId} store={store} />
                    <SaleNumberSettingsForm organizationId={organizationId} store={store} />
                </div>
                <StorePaymentRoutingForm organizationId={organizationId} store={store} />
                <InvoiceAppearanceSettingsForm organizationId={organizationId} store={store} />
            </>
        )}
    </StoreWorkspacePageGate>
);

export default StoreWorkspaceSettingsPage;
