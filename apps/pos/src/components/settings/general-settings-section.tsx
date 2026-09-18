import { UserRoundSearch } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@repo/ui/components/card";
import { Label } from "@repo/ui/components/label";
import { Switch } from "@repo/ui/components/switch";

import { useCheckoutCustomerAutoFocus } from "@/hooks/use-checkout-customer-auto-focus";

const sectionCardClassName = "h-full border-border/60 bg-card/80 shadow-xs";

const GeneralSettingsSection = () => {
  const { checkoutCustomerAutoFocus, setCheckoutCustomerAutoFocus } =
    useCheckoutCustomerAutoFocus();

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Card className={sectionCardClassName}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold">
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <UserRoundSearch className="size-4" />
            </span>
            Checkout
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4 rounded-xl border border-border/60 bg-muted/20 p-3">
            <div className="min-w-0 space-y-1">
              <Label htmlFor="checkout-customer-auto-focus" className="text-sm font-medium">
                Focus customer phone on complete order
              </Label>
              <p className="text-xs leading-relaxed text-muted-foreground">
                When enabled, the phone field is focused automatically when you open
                the Complete order dialog. Keep this off on tablets so the keyboard
                stays hidden until you need it.
              </p>
            </div>
            <Switch
              id="checkout-customer-auto-focus"
              checked={checkoutCustomerAutoFocus}
              onCheckedChange={setCheckoutCustomerAutoFocus}
              aria-label="Focus customer phone on complete order"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default GeneralSettingsSection;
