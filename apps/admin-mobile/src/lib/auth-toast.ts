import Toast from "react-native-toast-message";

export type AuthToastTone = "error" | "info" | "success";

const toastTypeByTone: Record<AuthToastTone, string> = {
    error: "authError",
    info: "authInfo",
    success: "authSuccess",
};

export const showAuthToast = (
    message: string,
    tone: AuthToastTone = "error",
) => {
    Toast.show({
        type: toastTypeByTone[tone],
        text1: message,
        position: "top",
        visibilityTime: 5000,
        topOffset: 56,
        swipeable: true,
    });
};
