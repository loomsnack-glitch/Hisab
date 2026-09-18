import { useCallback, useState } from "react";

import {
  readCheckoutCustomerAutoFocus,
  writeCheckoutCustomerAutoFocus,
} from "@/lib/checkout-customer-focus-preferences";

export const useCheckoutCustomerAutoFocus = () => {
  const [checkoutCustomerAutoFocus, setCheckoutCustomerAutoFocusState] = useState(
    readCheckoutCustomerAutoFocus,
  );

  const setCheckoutCustomerAutoFocus = useCallback((enabled: boolean) => {
    setCheckoutCustomerAutoFocusState(enabled);
    writeCheckoutCustomerAutoFocus(enabled);
  }, []);

  return {
    checkoutCustomerAutoFocus,
    setCheckoutCustomerAutoFocus,
  };
};
