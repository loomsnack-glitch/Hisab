import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { Text, TextInput, View } from "react-native";

type OtpFieldProps<T extends FieldValues> = {
    control: Control<T>;
    name: FieldPath<T>;
};

const OtpField = <T extends FieldValues>({ control, name }: OtpFieldProps<T>) => {
    return (
        <Controller
            control={control}
            name={name}
            render={({ field: { onChange, value }, fieldState }) => (
                <View className="gap-2">
                    <TextInput
                        className={`h-14 rounded-2xl border bg-white px-4 text-center text-2xl tracking-[8px] text-stone-950 ${
                            fieldState.error ? "border-red-400" : "border-stone-300"
                        }`}
                        value={(value as string | undefined) ?? ""}
                        onChangeText={(text) => onChange(text.replace(/\D/g, "").slice(0, 6))}
                        keyboardType="number-pad"
                        maxLength={6}
                        placeholder="000000"
                        placeholderTextColor="#d6d3d1"
                    />
                    <Text className="text-center text-sm text-stone-500">Enter the 6-digit code sent on WhatsApp.</Text>
                    {fieldState.error ? (
                        <Text className="text-center text-sm text-red-600">{fieldState.error.message}</Text>
                    ) : null}
                </View>
            )}
        />
    );
};

export default OtpField;
