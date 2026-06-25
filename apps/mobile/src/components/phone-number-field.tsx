import { Text, TextInput, View } from "react-native";
import { INDIAN_COUNTRY_CODE } from "@repo/types";

type PhoneNumberFieldProps = {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
    error?: string;
    required?: boolean;
};

const sanitizeIndianMobileNumber = (value: string) => value.replace(/\D/g, "").slice(0, 10);

const PhoneNumberField = ({ label, value, onChangeText, error, required }: PhoneNumberFieldProps) => {
    return (
        <View className="gap-2">
            <Text className="text-sm font-medium text-stone-800">
                {label}
                {required ? <Text className="text-amber-700"> *</Text> : null}
            </Text>
            <View className="flex-row">
                <View
                    className={`h-12 shrink-0 items-center justify-center rounded-l-2xl border border-r-0 bg-stone-100 px-3 ${
                        error ? "border-red-400" : "border-stone-300"
                    }`}
                >
                    <Text className="text-sm font-medium text-stone-600">{INDIAN_COUNTRY_CODE}</Text>
                </View>
                <TextInput
                    className={`h-12 flex-1 rounded-r-2xl border bg-white px-4 text-base text-stone-950 ${
                        error ? "border-red-400" : "border-stone-300"
                    }`}
                    value={value}
                    onChangeText={(text) => onChangeText(sanitizeIndianMobileNumber(text))}
                    placeholder="9876543210"
                    placeholderTextColor="#a8a29e"
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    maxLength={10}
                />
            </View>
            {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
        </View>
    );
};

export default PhoneNumberField;
