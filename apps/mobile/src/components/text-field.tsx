import { Text, TextInput, View } from "react-native";

type TextFieldProps = {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
    placeholder?: string;
    error?: string;
    required?: boolean;
    keyboardType?: "default" | "phone-pad" | "email-address";
    autoCapitalize?: "none" | "sentences" | "words";
    secureTextEntry?: boolean;
};

const TextField = ({
    label,
    value,
    onChangeText,
    placeholder,
    error,
    required,
    keyboardType = "default",
    autoCapitalize = "sentences",
    secureTextEntry,
}: TextFieldProps) => {
    return (
        <View className="gap-2">
            <Text className="text-sm font-medium text-stone-800">
                {label}
                {required ? <Text className="text-amber-700"> *</Text> : null}
            </Text>
            <TextInput
                className={`h-12 rounded-2xl border bg-white px-4 text-base text-stone-950 ${
                    error ? "border-red-400" : "border-stone-300"
                }`}
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor="#a8a29e"
                keyboardType={keyboardType}
                autoCapitalize={autoCapitalize}
                secureTextEntry={secureTextEntry}
            />
            {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
        </View>
    );
};

export default TextField;
