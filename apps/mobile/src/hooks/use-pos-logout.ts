import { Alert } from "react-native";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { clearAuthToken, deviceLogout } from "@repo/services";
import { posStorage } from "../lib/storage";
import { clearPosCart } from "../store/pos-cart.store";
import { clearPosPayments } from "../store/pos-payment.store";
import { clearPosCompletedSale } from "../store/pos-sale-complete.store";
import { usePosSessionDispatch } from "../store/pos-session.store";

export const usePosLogout = () => {
    const { t } = useTranslation("common");
    const dispatch = usePosSessionDispatch();

    return useMutation({
        mutationFn: deviceLogout,
        onMutate: () => dispatch({ type: "LOGOUT_STARTED" }),
        onSuccess: async (response) => {
            if (response.status !== "success") {
                dispatch({ type: "LOGOUT_FAILED", message: response.message });
                Alert.alert(t("logoutFailedTitle"), t("genericError"));
                return;
            }

            await clearAuthToken();
            await posStorage.clearSession();
            clearPosCart();
            clearPosPayments();
            clearPosCompletedSale();
            dispatch({ type: "LOGOUT_COMPLETED" });
            Alert.alert(t("loggedOutTitle"), t("loggedOutMessage"));
        },
        onError: () => {
            const message = t("genericError");
            dispatch({ type: "LOGOUT_FAILED", message });
            Alert.alert(t("logoutFailedTitle"), message);
        },
    });
};
