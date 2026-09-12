import {
    BillingCartItem,
    BillingCartLineDetail,
    BillingCartLineDetails,
    BillingCartPanel,
    BillingCheckoutTotals,
    BillingMobileCartBar,
} from "@repo/ui/components/billing";
import { Button } from "@repo/ui/components/button";
import { formatCurrency } from "@repo/ui/lib/money";
import { PriceDisplay } from "@repo/ui/components/price-display";

import type { ComposerItem } from "@/lib/billing/composer";
import { getComposerItemPricing } from "@/lib/combo-pricing";

export type BillingCartLinesModel = {
    items: ComposerItem[];
    itemCount: number;
    onClear: () => void;
    onUpdateQuantity: (itemKey: string, quantity: number) => void;
};

export type BillingCartTotalsModel = {
    grandTotal: number;
    subtotal: number;
    lineDiscountTotal: number;
    lineDiscountPercentage?: string | null;
    orderDiscountAmount: number;
    orderDiscountPercentage?: string | null;
    dueTotal: number;
};

export type BillingCartActionsModel = {
    mobileOpen: boolean;
    onMobileOpenChange: (open: boolean) => void;
    maxHeight?: string;
    isReplacingSale?: boolean;
    saveLabel: string;
    saveDisabled?: boolean;
    savePending?: boolean;
    completePending?: boolean;
    onSaveDraft: () => void;
    onPlaceOrder: () => void;
    onCancelEdit?: () => void;
};

export type BillingCartAsideProps = {
    cart: BillingCartLinesModel;
    totals: BillingCartTotalsModel;
    actions: BillingCartActionsModel;
};

export function BillingCartAside({ cart, totals, actions }: BillingCartAsideProps) {
    const { items, itemCount, onClear, onUpdateQuantity } = cart;
    const {
        grandTotal,
        subtotal,
        lineDiscountTotal,
        lineDiscountPercentage,
        orderDiscountAmount,
        orderDiscountPercentage,
        dueTotal,
    } = totals;
    const {
        mobileOpen,
        onMobileOpenChange,
        maxHeight,
        isReplacingSale,
        saveLabel,
        saveDisabled,
        savePending,
        completePending,
        onSaveDraft,
        onPlaceOrder,
        onCancelEdit,
    } = actions;
    return (
        <>
            {!mobileOpen ? (
                <BillingMobileCartBar
                    itemCount={itemCount}
                    total={formatCurrency(grandTotal)}
                    onOpen={() => onMobileOpenChange(true)}
                />
            ) : null}

            <BillingCartPanel
                mobileOpen={mobileOpen}
                onMobileOpenChange={onMobileOpenChange}
                itemCount={itemCount}
                onClear={items.length > 0 ? onClear : undefined}
                maxHeight={maxHeight}
                footer={
                    <>
                        <BillingCheckoutTotals
                            variant="compact"
                            subtotal={subtotal}
                            lineDiscountTotal={lineDiscountTotal}
                            lineDiscountPercentage={lineDiscountPercentage}
                            orderDiscountAmount={orderDiscountAmount}
                            orderDiscountPercentage={orderDiscountPercentage}
                            grandTotal={grandTotal}
                            dueTotal={items.length > 0 ? dueTotal : 0}
                        />
                        <div className="grid grid-cols-2 gap-2">
                            {isReplacingSale ? (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-9 rounded-lg text-xs font-semibold"
                                    disabled={completePending}
                                    onClick={onCancelEdit}
                                >
                                    Cancel edit
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-9 rounded-lg text-xs font-semibold"
                                    disabled={savePending || completePending || saveDisabled || items.length === 0}
                                    onClick={onSaveDraft}
                                >
                                    {savePending ? "Saving..." : saveLabel}
                                </Button>
                            )}
                            <Button
                                type="button"
                                className="h-9 rounded-lg bg-primary text-xs font-semibold text-primary-foreground shadow-md shadow-primary/20 hover:bg-primary/90"
                                disabled={completePending || savePending || items.length === 0}
                                onClick={onPlaceOrder}
                            >
                                {completePending ? "Completing..." : "Place Order"}
                            </Button>
                        </div>
                    </>
                }
            >
                {items.map((item) => {
                    const pricing = getComposerItemPricing(item);
                    return (
                        <BillingCartItem
                            key={item.key}
                            name={item.name}
                            quantity={item.quantity}
                            lineTotal={formatCurrency(pricing.lineTotal)}
                            onDecrease={() => onUpdateQuantity(item.key, item.quantity - 1)}
                            onIncrease={() => onUpdateQuantity(item.key, item.quantity + 1)}
                            onRemove={() => onUpdateQuantity(item.key, 0)}
                            price={
                                <PriceDisplay
                                    price={item.unitPrice}
                                    discount={item.unitDiscount}
                                    size="xs"
                                    align="left"
                                    singleTone="foreground"
                                    className="text-muted-foreground"
                                />
                            }
                            details={
                                <>
                                    {item.addOns.length > 0 ? (
                                        <BillingCartLineDetails>
                                            {item.addOns.map((addOn) => (
                                                <BillingCartLineDetail
                                                    key={`${item.key}-${addOn.addOnId}`}
                                                    label={`+ ${addOn.name} × ${addOn.quantity}`}
                                                    amount={formatCurrency(
                                                        (addOn.unitPrice - addOn.unitDiscount) *
                                                            addOn.quantity *
                                                            item.quantity,
                                                    )}
                                                />
                                            ))}
                                        </BillingCartLineDetails>
                                    ) : null}

                                    {item.comboSelections.length > 0 ? (
                                        <BillingCartLineDetails title="Combo options">
                                            {item.comboSelections.map((selection) => (
                                                <div
                                                    key={`${item.key}-${selection.groupId}-${selection.optionProductId}`}
                                                    className="space-y-0.5 text-xs text-muted-foreground"
                                                >
                                                    <BillingCartLineDetail
                                                        label={`${selection.optionName} × ${selection.quantity}`}
                                                        amount={
                                                            selection.priceAdjustment !== 0
                                                                ? formatCurrency(
                                                                      selection.priceAdjustment *
                                                                          selection.quantity *
                                                                          item.quantity,
                                                                  )
                                                                : undefined
                                                        }
                                                    />
                                                    {selection.addOns.map((addOn) => (
                                                        <div
                                                            key={`${item.key}-${selection.groupId}-${selection.optionProductId}-${addOn.addOnId}`}
                                                            className="pl-3"
                                                        >
                                                            <BillingCartLineDetail
                                                                label={`+ ${addOn.name} × ${addOn.quantity}`}
                                                                amount={formatCurrency(
                                                                    (addOn.unitPrice - addOn.unitDiscount) *
                                                                        addOn.quantity *
                                                                        selection.quantity *
                                                                        item.quantity,
                                                                )}
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            ))}
                                        </BillingCartLineDetails>
                                    ) : item.bundleComponents.length > 0 ? (
                                        <BillingCartLineDetails>
                                            {item.bundleComponents.map((component) => (
                                                <div
                                                    key={`${item.key}-${component.id}`}
                                                    className="space-y-0.5 text-xs text-muted-foreground"
                                                >
                                                    <span className="block truncate">
                                                        {component.name} × {component.quantityPerBundle}
                                                    </span>
                                                    {component.priceAdjustment !== 0 ? (
                                                        <span className="block truncate">
                                                            Option adjustment:{" "}
                                                            {formatCurrency(
                                                                component.priceAdjustment *
                                                                    component.quantityPerBundle *
                                                                    item.quantity,
                                                            )}
                                                        </span>
                                                    ) : null}
                                                    {component.addOns.map((addOn) => (
                                                        <span
                                                            key={`${item.key}-${component.id}-${addOn.addOnId}`}
                                                            className="block truncate pl-3"
                                                        >
                                                            + {addOn.name} × {addOn.quantity} (
                                                            {formatCurrency(
                                                                (addOn.unitPrice - addOn.unitDiscount) *
                                                                    addOn.quantity *
                                                                    component.quantityPerBundle *
                                                                    item.quantity,
                                                            )}
                                                            )
                                                        </span>
                                                    ))}
                                                </div>
                                            ))}
                                        </BillingCartLineDetails>
                                    ) : null}
                                </>
                            }
                        />
                    );
                })}
            </BillingCartPanel>
        </>
    );
}
