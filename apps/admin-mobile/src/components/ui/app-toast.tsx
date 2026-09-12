import Toast, { BaseToast, type ToastConfig } from "react-native-toast-message";
import { StyleSheet, Text, View } from "react-native";

const iconByTone = {
    error: "!",
    info: "i",
    success: "✓",
} as const;

const toastConfig: ToastConfig = {
    authError: ({ text1, onPress }) => (
        <BaseToast
            text1={text1}
            onPress={onPress}
            style={[styles.toast, styles.errorToast]}
            contentContainerStyle={styles.content}
            text1Style={styles.text}
            text1NumberOfLines={3}
            renderLeadingIcon={() => (
                <View style={[styles.icon, styles.errorIcon]}>
                    <Text style={styles.iconText}>{iconByTone.error}</Text>
                </View>
            )}
        />
    ),
    authInfo: ({ text1, onPress }) => (
        <BaseToast
            text1={text1}
            onPress={onPress}
            style={[styles.toast, styles.infoToast]}
            contentContainerStyle={styles.content}
            text1Style={styles.text}
            text1NumberOfLines={3}
            renderLeadingIcon={() => (
                <View style={[styles.icon, styles.infoIcon]}>
                    <Text style={styles.iconText}>{iconByTone.info}</Text>
                </View>
            )}
        />
    ),
    authSuccess: ({ text1, onPress }) => (
        <BaseToast
            text1={text1}
            onPress={onPress}
            style={[styles.toast, styles.successToast]}
            contentContainerStyle={styles.content}
            text1Style={styles.text}
            text1NumberOfLines={3}
            renderLeadingIcon={() => (
                <View style={[styles.icon, styles.successIcon]}>
                    <Text style={styles.iconText}>{iconByTone.success}</Text>
                </View>
            )}
        />
    ),
};

const styles = StyleSheet.create({
    toast: {
        width: "92%",
        height: 76,
        borderLeftWidth: 0,
        borderRadius: 18,
        borderWidth: 1,
        alignItems: "center",
        paddingRight: 16,
        shadowColor: "#0f172a",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.18,
        shadowRadius: 12,
        elevation: 6,
    },
    errorToast: {
        backgroundColor: "#fff1f2",
        borderColor: "#fecdd3",
    },
    infoToast: {
        backgroundColor: "#eff6ff",
        borderColor: "#bfdbfe",
    },
    successToast: {
        backgroundColor: "#f0fdf4",
        borderColor: "#bbf7d0",
    },
    content: {
        flex: 1,
        justifyContent: "center",
        alignItems: "flex-start",
        paddingLeft: 12,
        paddingRight: 8,
    },
    text: {
        color: "#0f172a",
        fontSize: 14,
        fontWeight: "600",
        lineHeight: 20,
        textAlign: "left",
        width: "100%",
    },
    icon: {
        width: 28,
        height: 28,
        marginLeft: 14,
        borderRadius: 14,
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    errorIcon: {
        backgroundColor: "#dc2626",
    },
    infoIcon: {
        backgroundColor: "#2563eb",
    },
    successIcon: {
        backgroundColor: "#16a34a",
    },
    iconText: {
        color: "#ffffff",
        fontSize: 15,
        fontWeight: "800",
    },
});

export const AppToast = () => (
    <Toast
        config={toastConfig}
        position="top"
        visibilityTime={5000}
        topOffset={56}
        swipeable
    />
);
