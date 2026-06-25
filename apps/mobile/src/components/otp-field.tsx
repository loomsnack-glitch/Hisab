import { useEffect, useRef } from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { Text, TextInput, View } from "react-native";

type OtpInputProps = {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    autoFocus?: boolean;
};

const OtpInput = ({ value, onChange, error, autoFocus = true }: OtpInputProps) => {
    const inputRef = useRef<TextInput>(null);

    useEffect(() => {
        if (!autoFocus) return undefined;

        const timer = setTimeout(() => inputRef.current?.focus(), 100);
        return () => clearTimeout(timer);
    }, [autoFocus]);

    return (
        <View className="gap-2">
            <TextInput
                ref={inputRef}
                className={`h-14 rounded-2xl border bg-white px-4 text-center text-2xl tracking-[8px] text-stone-950 ${
                    error ? "border-red-400" : "border-stone-300"
                }`}
                value={value}
                onChangeText={(text) => onChange(text.replace(/\D/g, "").slice(0, 6))}
                keyboardType="number-pad"
                maxLength={6}
                placeholder="000000"
                placeholderTextColor="#d6d3d1"
                autoFocus={autoFocus}
            />
            <Text className="text-center text-sm text-stone-500">Enter the 6-digit code sent on WhatsApp.</Text>
            {error ? <Text className="text-center text-sm text-red-600">{error}</Text> : null}
        </View>
    );
};

type OtpFieldProps<T extends FieldValues> = {
    control: Control<T>;
    name: FieldPath<T>;
    autoFocus?: boolean;
};

const OtpField = <T extends FieldValues>({ control, name, autoFocus = true }: OtpFieldProps<T>) => {
    return (
        <Controller
            control={control}
            name={name}
            render={({ field: { onChange, value }, fieldState }) => (
                <OtpInput
                    value={(value as string | undefined) ?? ""}
                    onChange={onChange}
                    error={fieldState.error?.message}
                    autoFocus={autoFocus}
                />
            )}
        />
    );
};

export default OtpField;
