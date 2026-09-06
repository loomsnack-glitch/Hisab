import { BadgeCheck, Search, UserPlus } from "lucide-react";
import { Badge } from "@repo/ui/components/badge";
import { Input } from "@repo/ui/components/input";
import { Spinner } from "@repo/ui/components/spinner";
import { cn } from "@repo/ui/lib/utils";

import type { CheckoutCustomerResolution } from "@/lib/checkout-customer";

type CheckoutCustomerFieldsProps = {
  phone: string;
  name: string;
  resolution: CheckoutCustomerResolution;
  onPhoneChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onOpenPicker: () => void;
};

const CheckoutCustomerFields = ({
  phone,
  name,
  resolution,
  onPhoneChange,
  onNameChange,
  onOpenPicker,
}: CheckoutCustomerFieldsProps) => {
  const isExisting = resolution.status === "existing";
  const isLookingUp = resolution.status === "looking_up";
  const isNewCustomer =
    resolution.status === "create" ||
    (resolution.status === "blocked" &&
      resolution.reason === "Enter a name for this new customer");
  const nameRequired = isNewCustomer || isLookingUp || isExisting;
  const nameDisabled = isExisting || isLookingUp;

  return (
    <section className="space-y-2">
      <div className="flex items-end gap-2">
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="min-w-0">
            <label
              htmlFor="checkout-customer-phone"
              className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
            >
              Phone
            </label>
            <Input
              id="checkout-customer-phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel-national"
              maxLength={10}
              className="h-10 rounded-xl bg-card/60 text-sm"
              placeholder="10-digit number"
              value={phone}
              onChange={(event) => onPhoneChange(event.target.value)}
              aria-label="Customer phone"
            />
          </div>
          <div className="min-w-0">
            <label
              htmlFor="checkout-customer-name"
              className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
            >
              Name
              {nameRequired && !isExisting && !isLookingUp ? (
                <span className="ml-1 text-destructive">*</span>
              ) : null}
            </label>
            <div className="relative">
              <Input
                id="checkout-customer-name"
                className={cn(
                  "h-10 rounded-xl bg-card/60 text-sm",
                  nameDisabled && "pr-9",
                )}
                placeholder={
                  isLookingUp
                    ? "Looking up…"
                    : isExisting
                      ? resolution.customer.name
                      : "Customer name"
                }
                value={name}
                disabled={nameDisabled}
                onChange={(event) => onNameChange(event.target.value)}
                aria-label="Customer name"
                aria-required={isNewCustomer}
              />
              {isLookingUp ? (
                <Spinner className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
              ) : isExisting ? (
                <BadgeCheck className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-emerald-600 dark:text-emerald-400" />
              ) : null}
            </div>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenPicker}
          className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border/60 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Search customers"
        >
          <Search className="size-4" />
        </button>
      </div>

      {isLookingUp ? (
        <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Spinner className="size-3.5" />
          Finding customer…
        </p>
      ) : isExisting ? (
        <Badge variant="secondary" className="gap-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
          <BadgeCheck className="size-3" />
          Existing customer
        </Badge>
      ) : isNewCustomer ? (
        <Badge variant="secondary" className="gap-1 bg-sky-500/10 text-sky-700 dark:text-sky-300">
          <UserPlus className="size-3" />
          New customer
        </Badge>
      ) : resolution.status === "blocked" ? (
        <p className="text-[11px] text-destructive">{resolution.reason}</p>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Optional · leave blank for walk-in
        </p>
      )}
    </section>
  );
};

export default CheckoutCustomerFields;
