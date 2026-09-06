import { useEffect, useState } from "react";
import type { ProductResponseDTO } from "@repo/types";
import { parseCustomSellingQuantityInput } from "@repo/types";
import { Button } from "@repo/ui/components/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@repo/ui/components/dialog";
import {
  Field,
  FieldContent,
  FieldError,
  FieldLabel,
} from "@repo/ui/components/field";
import { Input } from "@repo/ui/components/input";

import ProductPriceDisplay from "@/components/catalog/product-price-display";
import { formatCurrency } from "@/lib/format";
import {
  composerFieldsFromSoldAmount,
  customSellingQuantityDialogDefaults,
} from "@/lib/sold-product-portion";

type CustomSellingQuantityDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: ProductResponseDTO | null;
  onConfirm: (product: ProductResponseDTO, soldQuantity: number) => void;
};

const VALIDATION_MESSAGE =
  "Enter a positive amount with at most two decimal places";

const CustomSellingQuantityDialog = ({
  open,
  onOpenChange,
  product,
  onConfirm,
}: CustomSellingQuantityDialogProps) => {
  const productId = product?.id ?? null;
  const defaults = product
    ? customSellingQuantityDialogDefaults(product)
    : null;
  const defaultAmountInput = defaults?.amountInput ?? "";
  const [amountInput, setAmountInput] = useState(defaultAmountInput);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !productId) {
      return;
    }
    setAmountInput(defaultAmountInput);
    setError(null);
  }, [open, productId, defaultAmountInput]);

  const parsedAmount = parseCustomSellingQuantityInput(amountInput);
  const preview =
    product && parsedAmount !== null
      ? composerFieldsFromSoldAmount(product, parsedAmount)
      : null;

  const unitLabel = defaults?.unitLabel ?? "pc";

  const submit = () => {
    if (!product) {
      return;
    }
    const soldQuantity = parseCustomSellingQuantityInput(amountInput);
    if (soldQuantity === null) {
      setError(VALIDATION_MESSAGE);
      return;
    }
    onConfirm(product, soldQuantity);
    onOpenChange(false);
  };

  if (!product || !defaults) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange} disablePointerDismissal>
      <DialogContent className="flex h-auto max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] max-w-md flex-col gap-0 overflow-hidden rounded-2xl border-border/70 bg-background/95 p-0 shadow-2xl sm:max-h-[90dvh] sm:w-[calc(100%-2rem)]">
        <DialogHeader className="shrink-0 space-y-2 border-b border-border/60 px-4 py-4 sm:px-6 sm:py-5">
          <DialogTitle className="break-words pr-8 font-display text-lg font-semibold leading-tight tracking-tight sm:text-xl">
            Custom amount for {product.name}
          </DialogTitle>
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground">
              {defaults.defaultHint}
            </span>
            <ProductPriceDisplay
              price={product.price}
              discount={product.discount}
              size="sm"
              align="right"
            />
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          <Field data-invalid={Boolean(error)}>
            <FieldLabel htmlFor="custom-selling-quantity">
              {defaults.amountFieldLabel}
            </FieldLabel>
            <FieldContent>
              <Input
                id="custom-selling-quantity"
                type="text"
                inputMode="decimal"
                className="h-11 rounded-xl"
                value={amountInput}
                onChange={(event) => {
                  setAmountInput(event.target.value);
                  setError(null);
                }}
                aria-label={`Amount in ${unitLabel}`}
              />
              {error ? <FieldError errors={[{ message: error }]} /> : null}
            </FieldContent>
          </Field>

          {preview ? (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2">
              <p className="text-sm font-semibold text-foreground">
                {preview.name}
              </p>
              <p className="text-sm font-bold text-foreground">
                {formatCurrency(preview.unitPrice - preview.unitDiscount)}
              </p>
            </div>
          ) : null}
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 rounded-b-2xl border-t border-border/60 bg-muted/30 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-4 sm:pb-4">
          <div className="grid w-full grid-cols-2 gap-2">
            <Button
              variant="outline"
              className="h-10 rounded-lg"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button className="h-10 rounded-lg" onClick={submit}>
              Add to order
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CustomSellingQuantityDialog;
