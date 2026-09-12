import { Text, View } from "react-native";

export type AuthFeedbackTone = "error" | "info" | "success";

type AuthFeedbackProps = {
    message: string;
    tone?: AuthFeedbackTone;
};

const feedbackClasses: Record<AuthFeedbackTone, string> = {
    error: "border-admin-danger/20 bg-admin-danger-surface dark:border-admin-danger/30 dark:bg-admin-danger/10",
    info: "border-admin-primary/20 bg-admin-info-surface dark:border-admin-primary/30 dark:bg-admin-primary/10",
    success: "border-admin-success/20 bg-admin-success-surface dark:border-admin-success/30 dark:bg-admin-success/10",
};

const feedbackTextClasses: Record<AuthFeedbackTone, string> = {
    error: "text-admin-danger",
    info: "text-admin-primary",
    success: "text-admin-success",
};

const AuthFeedback = ({ message, tone = "error" }: AuthFeedbackProps) => (
    <View
        className={`rounded-2xl border px-4 py-3 ${feedbackClasses[tone]}`}
        accessibilityRole={tone === "error" ? "alert" : undefined}
        accessibilityLiveRegion={tone === "error" ? "polite" : "none"}
    >
        <Text className={`text-sm leading-5 ${feedbackTextClasses[tone]}`}>{message}</Text>
    </View>
);

export default AuthFeedback;
