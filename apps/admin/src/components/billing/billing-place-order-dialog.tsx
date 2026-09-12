import type { CreateCustomerJSON, CustomerDTO, PaymentMethod, SaleServiceMode } from "@repo/types";
import {
    BillingCheckoutTotals,
    BillingChoiceGroup,
} from "@repo/ui/components/billing";
import { Button } from "@repo/ui/components/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@repo/ui/components/dialog";
import { Input } from "@repo/ui/components/input";
import { PhoneInput } from "@repo/ui/components/phone-input";
import { cn } from "@repo/ui/lib/utils";
import { formatCurrency } from "@repo/ui/lib/money";
import { ArrowLeft, Check, Plus, Printer, Search, ShoppingCart, User, Utensils, X } from "lucide-react";

import CheckoutCustomerFields from "@/components/billing/checkout-customer-fields";
import WhatsAppIcon from "@/components/icons/whatsapp-icon";
import type { InvoiceAction, SettlementMode } from "@/lib/billing/composer";
import type { CheckoutCustomerResolution } from "@/lib/checkout-customer";

const SERVICE_MODE_OPTIONS: Array<{
    value: SaleServiceMode;
    label: string;
    icon: typeof Utensils;
}> = [
    { value: "dine_in", label: "Dine-In", icon: Utensils },
    { value: "pick_up", label: "Pick-Up", icon: ShoppingCart },
];

const settlementOptions: Array<{
    value: SettlementMode;
    label: string;
    activeClassName: string;
}> = [
    { value: "full", label: "Paid", activeClassName: "bg-emerald-500 text-white" },
    { value: "partial", label: "Partial", activeClassName: "bg-sky-500 text-white" },
    { value: "due", label: "Due", activeClassName: "bg-amber-500 text-white" },
];

const paymentMethodOptions: Array<{ value: PaymentMethod; label: string }> = [
    { value: "cash", label: "Cash" },
    { value: "upi", label: "UPI" },
    { value: "card", label: "Card" },
];

export type BillingPlaceOrderCustomerModel = {
    pickerOpen: boolean;
    createOpen: boolean;
    onBack: () => void;
    checkoutPhone: string;
    checkoutName: string;
    resolution: CheckoutCustomerResolution;
    onCheckoutPhoneChange: (value: string) => void;
    onCheckoutNameChange: (value: string) => void;
    onOpenPicker: () => void;
    search: string;
    onSearchChange: (value: string) => void;
    selectedCustomer: CustomerDTO | null;
    customers: CustomerDTO[];
    onSelectCustomer: (customer: CustomerDTO | null) => void;
    onOpenCreate: () => void;
    newCustomerPhone: string;
    onNewCustomerPhoneChange: (value: string) => void;
    newCustomerName: string;
    onNewCustomerNameChange: (value: string) => void;
    createPending?: boolean;
    onCreateCustomer: (payload: CreateCustomerJSON) => void;
    onClosePicker: () => void;
};

export type BillingPlaceOrderDiscountModel = {
    adjustmentsOpen: boolean;
    onToggleAdjustments: () => void;
    orderDiscountAmount: number;
    orderDiscountPercentage?: string | null;
    discountInput: string;
    onDiscountInputChange: (value: string) => void;
    discountMode: "amount" | "percent";
    onDiscountModeChange: (mode: "amount" | "percent") => void;
    presetOptions: Array<{ percentage: number; amount: number }>;
    onApplyPreset: (percentage: number, amount: number) => void;
    onRemove: () => void;
    validationMessage?: string | null;
};

export type BillingPlaceOrderSettlementModel = {
    mode: SettlementMode;
    onModeChange: (mode: SettlementMode) => void;
    paymentMethod: PaymentMethod;
    onPaymentMethodChange: (method: PaymentMethod) => void;
    partialPaymentAmount: string;
    onPartialPaymentAmountChange: (value: string) => void;
    isOverpaid?: boolean;
    isPartialAmountMissing?: boolean;
    matchesFullPayment?: boolean;
};

export type BillingPlaceOrderTotalsModel = {
    itemCount: number;
    subtotal: number;
    lineDiscountTotal: number;
    lineDiscountPercentage?: string | null;
    grandTotal: number;
    dueTotal: number;
};

export type BillingPlaceOrderDialogProps = {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    cartItemCount: number;
    customer: BillingPlaceOrderCustomerModel;
    discount: BillingPlaceOrderDiscountModel;
    settlement: BillingPlaceOrderSettlementModel;
    serviceMode: SaleServiceMode;
    onServiceModeChange: (mode: SaleServiceMode) => void;
    invoiceActions: InvoiceAction[];
    onToggleInvoiceAction: (action: InvoiceAction) => void;
    completePending?: boolean;
    totals: BillingPlaceOrderTotalsModel;
    onCancel: () => void;
    onPlaceOrder: () => void;
    placeOrderDisabled?: boolean;
};

export function BillingPlaceOrderDialog({
    open,
    onOpenChange,
    cartItemCount,
    customer,
    discount,
    settlement,
    serviceMode,
    onServiceModeChange,
    invoiceActions,
    onToggleInvoiceAction,
    completePending,
    totals,
    onCancel,
    onPlaceOrder,
    placeOrderDisabled,
}: BillingPlaceOrderDialogProps) {
    const {
        pickerOpen: customerPickerOpen,
        createOpen: customerCreateOpen,
        onBack: onBackFromCustomerFlow,
        checkoutPhone,
        checkoutName,
        resolution: checkoutResolution,
        onCheckoutPhoneChange,
        onCheckoutNameChange,
        onOpenPicker: onOpenCustomerPicker,
        search: customerSearch,
        onSearchChange: onCustomerSearchChange,
        selectedCustomer,
        customers,
        onSelectCustomer,
        onOpenCreate: onOpenCustomerCreate,
        newCustomerPhone,
        onNewCustomerPhoneChange,
        newCustomerName,
        onNewCustomerNameChange,
        createPending: createCustomerPending,
        onCreateCustomer,
        onClosePicker: onCloseCustomerPicker,
    } = customer;
    const {
        adjustmentsOpen: billingAdjustmentsOpen,
        onToggleAdjustments: onToggleBillingAdjustments,
        orderDiscountAmount,
        orderDiscountPercentage,
        discountInput,
        onDiscountInputChange,
        discountMode,
        onDiscountModeChange,
        presetOptions: discountPresetOptions,
        onApplyPreset: onApplyDiscountPreset,
        onRemove: onRemoveOrderDiscount,
        validationMessage: discountValidationMessage,
    } = discount;
    const {
        mode: settlementMode,
        onModeChange: onSettlementModeChange,
        paymentMethod: selectedPaymentMethod,
        onPaymentMethodChange,
        partialPaymentAmount,
        onPartialPaymentAmountChange,
        isOverpaid,
        isPartialAmountMissing,
        matchesFullPayment,
    } = settlement;
    const {
        itemCount,
        subtotal,
        lineDiscountTotal,
        lineDiscountPercentage,
        grandTotal,
        dueTotal,
    } = totals;
    const hasInvalidDiscount = Boolean(discountValidationMessage);

    return (
        <Dialog open={open} disablePointerDismissal onOpenChange={onOpenChange}>
            <DialogContent
                className={cn(
                    "grid max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] rounded-2xl border-border/70 bg-background/95 p-2 shadow-2xl backdrop-blur-xl sm:w-[calc(100vw-2rem)] sm:p-3 lg:max-w-4xl lg:p-4 xl:max-w-5xl",
                    customerPickerOpen && customerCreateOpen ? "overflow-visible" : "overflow-hidden",
                )}
            >
                <DialogHeader className="space-y-1 border-b border-border/50 pb-2">
                    <div className="flex items-start gap-2 pr-6">
                        {customerPickerOpen ? (
                            <button
                                type="button"
                                onClick={onBackFromCustomerFlow}
                                className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                aria-label={customerCreateOpen ? "Back to customer search" : "Back to complete order"}
                            >
                                <ArrowLeft className="size-4" />
                            </button>
                        ) : null}
                        <div className="min-w-0 flex-1">
                            <DialogTitle className="text-xl font-semibold tracking-tight">
                                {customerCreateOpen
                                    ? "New customer"
                                    : customerPickerOpen
                                      ? "Select customer"
                                      : "Complete order"}
                            </DialogTitle>
                            <DialogDescription className="mt-1 text-xs">
                                {customerCreateOpen
                                    ? "Add phone and name, then save"
                                    : customerPickerOpen
                                      ? "Search by name or phone · optional for paid bills"
                                      : `${cartItemCount} ${cartItemCount === 1 ? "item" : "items"} in this order`}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {customerPickerOpen ? (
                    <div className="flex min-h-0 flex-col gap-2 pt-1">
                        {customerCreateOpen ? (
                            <>
                                <div className="shrink-0 space-y-2">
                                    <div>
                                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                            Phone
                                        </label>
                                        <PhoneInput
                                            autoFocus
                                            inputMode="tel"
                                            autoComplete="tel"
                                            className="h-12 rounded-xl bg-muted/40 text-base"
                                            placeholder="Phone number"
                                            value={newCustomerPhone || undefined}
                                            onChange={(value: string | undefined) =>
                                                onNewCustomerPhoneChange(value ?? "")
                                            }
                                            aria-label="Customer phone"
                                        />
                                    </div>
                                    <div>
                                        <label className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                            Name
                                        </label>
                                        <Input
                                            className="h-12 rounded-xl bg-muted/40 text-base"
                                            placeholder="Customer name"
                                            value={newCustomerName}
                                            onChange={(event) => onNewCustomerNameChange(event.target.value)}
                                            aria-label="Customer name"
                                        />
                                    </div>
                                </div>
                                <p className="shrink-0 text-xs text-muted-foreground">
                                    Phone first keeps the number pad open. Name is required to save.
                                </p>
                                <div className="min-h-0 flex-1" />
                            </>
                        ) : (
                            <>
                                <div className="relative shrink-0">
                                    <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                                    <Input
                                        autoFocus
                                        className="h-11 rounded-xl bg-muted/40 pl-10 text-sm"
                                        placeholder="Search name or phone"
                                        value={customerSearch}
                                        onChange={(event) => onCustomerSearchChange(event.target.value)}
                                        aria-label="Search customer"
                                    />
                                </div>

                                <div className="min-h-0 flex-1 space-y-1 overflow-y-auto overscroll-contain pr-0.5">
                                    <button
                                        type="button"
                                        aria-pressed={!selectedCustomer}
                                        onClick={() => onSelectCustomer(null)}
                                        className={cn(
                                            "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left transition-colors",
                                            !selectedCustomer
                                                ? "bg-primary/10 text-primary ring-1 ring-primary/25"
                                                : "text-foreground hover:bg-muted/80",
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                "flex size-9 shrink-0 items-center justify-center rounded-full",
                                                !selectedCustomer ? "bg-primary/15" : "bg-muted",
                                            )}
                                        >
                                            <User className="size-4" />
                                        </span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-semibold">Walk-in customer</span>
                                            <span className="block text-[11px] text-muted-foreground">
                                                No account · fastest checkout
                                            </span>
                                        </span>
                                        {!selectedCustomer ? <Check className="size-4 shrink-0" /> : null}
                                    </button>

                                    {customers.length > 0 ? (
                                        <>
                                            <p className="px-1 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                                {customerSearch ? "Matches" : "Customers"}
                                            </p>
                                            {customers.map((customer) => {
                                                const isSelected = selectedCustomer?.id === customer.id;
                                                return (
                                                    <button
                                                        key={customer.id}
                                                        type="button"
                                                        aria-pressed={isSelected}
                                                        onClick={() => onSelectCustomer(customer)}
                                                        className={cn(
                                                            "flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left transition-colors",
                                                            isSelected
                                                                ? "bg-primary/10 text-primary ring-1 ring-primary/25"
                                                                : "text-foreground hover:bg-muted/80",
                                                        )}
                                                    >
                                                        <span
                                                            className={cn(
                                                                "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
                                                                isSelected
                                                                    ? "bg-primary/15"
                                                                    : "bg-muted text-muted-foreground",
                                                            )}
                                                        >
                                                            {(customer.name.trim()[0] || "?").toUpperCase()}
                                                        </span>
                                                        <span className="min-w-0 flex-1">
                                                            <span className="block truncate text-sm font-semibold">
                                                                {customer.name}
                                                            </span>
                                                            <span className="block truncate text-[11px] text-muted-foreground">
                                                                {customer.phone || "No phone"}
                                                            </span>
                                                        </span>
                                                        {isSelected ? <Check className="size-4 shrink-0" /> : null}
                                                    </button>
                                                );
                                            })}
                                        </>
                                    ) : (
                                        <div className="space-y-3 px-1 py-6 text-center">
                                            <p className="text-sm text-muted-foreground">No customers found</p>
                                            {customerSearch.trim() ? (
                                                <button
                                                    type="button"
                                                    onClick={onOpenCustomerCreate}
                                                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"
                                                >
                                                    <Plus className="size-4" />
                                                    Create “{customerSearch.trim()}”
                                                </button>
                                            ) : null}
                                        </div>
                                    )}
                                </div>

                                <div className="shrink-0 border-t border-border/50 pt-2">
                                    <button
                                        type="button"
                                        onClick={onOpenCustomerCreate}
                                        className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-border/70 bg-background/60 text-sm font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-foreground"
                                    >
                                        <Plus className="size-4" />
                                        <span>Create new customer</span>
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                ) : (
                    <div className="min-h-0 space-y-3 overflow-y-auto pt-1 pb-0 pr-1 lg:grid lg:grid-cols-2 lg:gap-4 lg:space-y-0">
                        <div className="lg:col-span-2">
                            <CheckoutCustomerFields
                                phone={checkoutPhone}
                                name={checkoutName}
                                resolution={checkoutResolution}
                                onPhoneChange={onCheckoutPhoneChange}
                                onNameChange={onCheckoutNameChange}
                                onOpenPicker={onOpenCustomerPicker}
                            />
                        </div>

                        <section className="min-w-0 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    className="flex min-w-0 flex-1 items-center justify-between text-left text-xs font-semibold text-foreground"
                                    onClick={onToggleBillingAdjustments}
                                    aria-expanded={billingAdjustmentsOpen}
                                >
                                    <span>{orderDiscountAmount > 0 ? "Order discount" : "Add discount"}</span>
                                    <span
                                        className={
                                            orderDiscountAmount > 0
                                                ? "text-emerald-600 dark:text-emerald-400"
                                                : "text-muted-foreground"
                                        }
                                    >
                                        {orderDiscountAmount > 0
                                            ? `-${formatCurrency(orderDiscountAmount)}${orderDiscountPercentage ? ` (${orderDiscountPercentage})` : ""}`
                                            : billingAdjustmentsOpen
                                              ? "Hide"
                                              : "Optional"}
                                    </span>
                                </button>
                                {orderDiscountAmount > 0 || discountInput.trim() !== "" ? (
                                    <button
                                        type="button"
                                        onClick={onRemoveOrderDiscount}
                                        className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-destructive transition-colors hover:bg-destructive/10"
                                        aria-label="Remove discount"
                                    >
                                        <X className="size-3.5" />
                                        <span className="hidden sm:inline">Remove</span>
                                    </button>
                                ) : null}
                            </div>
                            {billingAdjustmentsOpen ? (
                                <div className="mt-3 space-y-2 border-t border-border/50 pt-3">
                                    <div className="flex gap-2">
                                        <Input
                                            type="number"
                                            min="0"
                                            max={discountMode === "percent" ? 100 : undefined}
                                            step="0.01"
                                            inputMode="decimal"
                                            className={cn(
                                                "h-10 min-w-0 flex-1 rounded-xl bg-background/70 text-sm",
                                                discountValidationMessage &&
                                                    "border-destructive focus-visible:ring-destructive",
                                            )}
                                            placeholder={discountMode === "percent" ? "0%" : "₹0.00"}
                                            value={discountInput}
                                            onChange={(event) => onDiscountInputChange(event.target.value)}
                                            aria-label={
                                                discountMode === "percent" ? "Discount percentage" : "Discount amount"
                                            }
                                            aria-invalid={hasInvalidDiscount}
                                        />
                                        <div className="flex h-10 shrink-0 items-center rounded-xl border border-border/60 bg-background/50 p-0.5">
                                            <button
                                                type="button"
                                                onClick={() => onDiscountModeChange("amount")}
                                                aria-label="Discount amount"
                                                aria-pressed={discountMode === "amount"}
                                                className={cn(
                                                    "flex size-7 items-center justify-center rounded-md text-xs font-semibold transition-colors",
                                                    discountMode === "amount"
                                                        ? "bg-foreground text-background"
                                                        : "text-muted-foreground hover:text-foreground",
                                                )}
                                            >
                                                ₹
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => onDiscountModeChange("percent")}
                                                aria-label="Discount percentage"
                                                aria-pressed={discountMode === "percent"}
                                                className={cn(
                                                    "flex size-7 items-center justify-center rounded-md text-xs font-semibold transition-colors",
                                                    discountMode === "percent"
                                                        ? "bg-foreground text-background"
                                                        : "text-muted-foreground hover:text-foreground",
                                                )}
                                            >
                                                %
                                            </button>
                                        </div>
                                    </div>
                                    <div>
                                        {discountPresetOptions.length > 0 ? (
                                            <div className="flex flex-wrap gap-1.5">
                                                {discountPresetOptions.map((preset) => {
                                                    const isSelected =
                                                        discountMode === "percent"
                                                            ? Number(discountInput) === preset.percentage
                                                            : Number(discountInput) === preset.amount;

                                                    return (
                                                        <button
                                                            key={preset.percentage}
                                                            type="button"
                                                            onClick={() =>
                                                                onApplyDiscountPreset(preset.percentage, preset.amount)
                                                            }
                                                            aria-pressed={isSelected}
                                                            className={cn(
                                                                "rounded-full border px-2.5 py-1 text-[11px] font-semibold tabular-nums transition-colors",
                                                                isSelected
                                                                    ? "border-primary bg-primary text-primary-foreground"
                                                                    : "border-border/60 bg-background/70 text-foreground hover:border-primary/40 hover:bg-primary/5",
                                                            )}
                                                        >
                                                            {discountMode === "percent"
                                                                ? `${preset.percentage}%`
                                                                : formatCurrency(preset.amount)}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="rounded-lg bg-background/50 px-2 py-1.5 text-[10px] text-muted-foreground">
                                                Add items to enable discount presets.
                                            </p>
                                        )}
                                    </div>
                                    {discountValidationMessage ? (
                                        <p className="text-xs text-destructive">{discountValidationMessage}</p>
                                    ) : null}
                                </div>
                            ) : null}
                        </section>

                        <section className="min-w-0 rounded-xl border border-border/60 bg-muted/20 px-3 py-2.5">
                            <button
                                type="button"
                                className="flex w-full items-center justify-between text-left text-xs font-semibold text-foreground"
                                onClick={onToggleBillingAdjustments}
                                aria-expanded={billingAdjustmentsOpen}
                            >
                                <span>Settlement</span>
                                <span className="text-muted-foreground">
                                    {settlementMode === "full"
                                        ? "Paid in full"
                                        : settlementMode === "partial"
                                          ? "Balance remains"
                                          : "Pay later"}{" "}
                                    {billingAdjustmentsOpen ? "Hide" : "Edit"}
                                </span>
                            </button>
                            {billingAdjustmentsOpen ? (
                                <div className="mt-3 space-y-2 border-t border-border/50 pt-3">
                                    <BillingChoiceGroup
                                        value={settlementMode}
                                        onChange={onSettlementModeChange}
                                        options={settlementOptions}
                                    />

                                    {settlementMode !== "due" ? (
                                        <div className="space-y-2 border-t border-border/50 pt-2">
                                            <p className="text-xs font-semibold text-foreground">Payment method</p>
                                            <BillingChoiceGroup
                                                value={selectedPaymentMethod}
                                                onChange={onPaymentMethodChange}
                                                options={paymentMethodOptions}
                                            />
                                        </div>
                                    ) : null}

                                    {settlementMode === "partial" ? (
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            inputMode="decimal"
                                            className="h-8 rounded-lg bg-background/60 text-sm"
                                            placeholder="Amount received"
                                            value={partialPaymentAmount}
                                            onChange={(event) => onPartialPaymentAmountChange(event.target.value)}
                                            aria-label="Amount received"
                                        />
                                    ) : null}

                                    {isOverpaid ? (
                                        <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-2.5 py-2 text-xs text-destructive">
                                            Collected amount exceeds the bill total.
                                        </p>
                                    ) : null}
                                    {settlementMode === "partial" && isPartialAmountMissing && !isOverpaid ? (
                                        <p className="rounded-lg border border-sky-500/20 bg-sky-500/10 px-2.5 py-2 text-xs text-sky-700 dark:text-sky-300">
                                            Enter the amount the customer is paying now.
                                        </p>
                                    ) : null}
                                    {settlementMode === "partial" && matchesFullPayment && !isOverpaid ? (
                                        <p className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-2.5 py-2 text-xs text-amber-700 dark:text-amber-300">
                                            Select &quot;Paid&quot; when the customer is settling the entire bill
                                            amount.
                                        </p>
                                    ) : null}
                                </div>
                            ) : null}
                        </section>

                        <section className="min-w-0 space-y-2 rounded-2xl border border-border/60 bg-card/60 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-foreground">Order type</p>
                                <p className="text-[11px] text-muted-foreground">Required</p>
                            </div>
                            <BillingChoiceGroup
                                columns={2}
                                ariaLabel="Order type"
                                value={serviceMode}
                                onChange={onServiceModeChange}
                                disabled={completePending}
                                options={SERVICE_MODE_OPTIONS}
                            />
                        </section>

                        <section className="min-w-0 space-y-2 rounded-2xl border border-border/60 bg-card/60 p-3">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold text-foreground">Invoice options</p>
                                <p className="text-[11px] text-muted-foreground">After placing order</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    type="button"
                                    disabled={completePending}
                                    aria-pressed={invoiceActions.includes("print")}
                                    onClick={() => onToggleInvoiceAction("print")}
                                    className={cn(
                                        "flex h-8 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                        invoiceActions.includes("print")
                                            ? "border-primary bg-primary text-primary-foreground"
                                            : "border-border/60 bg-background/70 text-muted-foreground hover:text-foreground",
                                    )}
                                >
                                    <Printer className="size-3.5" aria-hidden="true" />
                                    Print invoice
                                </button>
                                <button
                                    type="button"
                                    disabled={completePending}
                                    aria-pressed={invoiceActions.includes("whatsapp")}
                                    onClick={() => onToggleInvoiceAction("whatsapp")}
                                    className={cn(
                                        "flex h-8 items-center justify-center gap-1.5 rounded-lg border px-2 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                                        invoiceActions.includes("whatsapp")
                                            ? "border-[#25D366] bg-[#25D366] text-white"
                                            : "border-border/60 bg-background/70 text-muted-foreground hover:text-foreground",
                                    )}
                                >
                                    <WhatsAppIcon />
                                    WhatsApp
                                </button>
                            </div>
                        </section>

                        <aside className="space-y-3 lg:col-span-2">
                            <BillingCheckoutTotals
                                variant="detailed"
                                itemCount={itemCount}
                                subtotal={subtotal}
                                lineDiscountTotal={lineDiscountTotal}
                                lineDiscountPercentage={lineDiscountPercentage}
                                orderDiscountAmount={orderDiscountAmount}
                                orderDiscountPercentage={orderDiscountPercentage}
                                grandTotal={grandTotal}
                                dueTotal={dueTotal}
                            />
                        </aside>
                    </div>
                )}

                <DialogFooter className="border-t border-border/50 bg-background/95 px-3 py-3 sm:px-6 sm:py-4">
                    {customerCreateOpen ? (
                        <div className="grid w-full grid-cols-2 gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="h-11 w-full rounded-xl px-3 text-sm"
                                disabled={createCustomerPending}
                                onClick={onBackFromCustomerFlow}
                            >
                                Back
                            </Button>
                            <Button
                                type="button"
                                className="h-11 w-full rounded-xl px-3 text-sm font-semibold"
                                disabled={createCustomerPending || !newCustomerName.trim()}
                                onClick={() => {
                                    onCreateCustomer({
                                        name: newCustomerName.trim(),
                                        phone: newCustomerPhone.trim() || undefined,
                                        isActive: true,
                                    });
                                }}
                            >
                                {createCustomerPending ? "Saving..." : "Save & use"}
                            </Button>
                        </div>
                    ) : customerPickerOpen ? (
                        <Button
                            type="button"
                            variant="outline"
                            className="h-10 w-full rounded-xl px-3 text-xs"
                            onClick={onCloseCustomerPicker}
                        >
                            Done
                        </Button>
                    ) : (
                        <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
                            <Button
                                type="button"
                                variant="outline"
                                className="h-10 w-full rounded-xl px-3 text-xs sm:w-auto"
                                onClick={onCancel}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="button"
                                className="h-10 w-full rounded-xl px-3 text-xs font-semibold sm:w-auto sm:px-5"
                                disabled={placeOrderDisabled || completePending}
                                onClick={onPlaceOrder}
                            >
                                {completePending ? "Placing..." : "Place order"}
                            </Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
