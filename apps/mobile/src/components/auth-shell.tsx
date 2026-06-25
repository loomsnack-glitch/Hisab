import type { ReactNode } from "react";
import { ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type AuthShellProps = {
    title: string;
    subtitle: string;
    children: ReactNode;
};

const AuthShell = ({ title, subtitle, children }: AuthShellProps) => {
    const insets = useSafeAreaInsets();

    return (
        <ScrollView
            className="flex-1 bg-stone-100"
            contentContainerClassName="px-5 py-6"
            contentContainerStyle={{ paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24 }}
            keyboardShouldPersistTaps="handled"
        >
            <View className="mb-6 gap-2">
                <Text className="text-xs font-bold uppercase tracking-[2px] text-amber-800">Loomsnack</Text>
                <Text className="text-3xl font-bold text-stone-950">Hisab</Text>
            </View>

            <View className="mb-6 gap-2">
                <Text className="text-2xl font-semibold text-stone-950">{title}</Text>
                <Text className="text-sm leading-6 text-stone-600">{subtitle}</Text>
            </View>

            <View className="gap-5 rounded-[28px] border border-amber-100 bg-white p-5">{children}</View>
        </ScrollView>
    );
};

export default AuthShell;
