import { useEffect, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, Text, TextInput, View } from "react-native";
import {
    getPhoneNumberParts,
    INDIAN_COUNTRY_CODE,
    normalizePhoneNumber,
    PHONE_COUNTRIES,
    type CountryCode,
} from "@repo/types";

type PhoneNumberFieldProps = {
    label: string;
    value: string;
    onChangeText: (value: string) => void;
    error?: string;
    required?: boolean;
};

const sanitizePhoneDigits = (value: string) => value.replace(/\D/g, "").slice(0, 15);

const PhoneNumberField = ({ label, value, onChangeText, error, required }: PhoneNumberFieldProps) => {
    const initialParts = getPhoneNumberParts(value);
    const [country, setCountry] = useState<CountryCode>(initialParts?.country ?? "IN");
    const [localNumber, setLocalNumber] = useState(initialParts?.nationalNumber ?? "");
    const [countryPickerOpen, setCountryPickerOpen] = useState(false);
    const countryCallingCode = useMemo(
        () => PHONE_COUNTRIES.find((option) => option.country === country)?.callingCode ?? INDIAN_COUNTRY_CODE,
        [country],
    );

    useEffect(() => {
        if (!value) {
            setLocalNumber("");
            setCountry("IN");
            return;
        }

        const parts = getPhoneNumberParts(value);
        if (parts) {
            setCountry(parts.country ?? "IN");
            setLocalNumber(parts.nationalNumber);
        }
    }, [value]);

    const updateNumber = (nextLocalNumber: string, nextCountry = country) => {
        const digits = sanitizePhoneDigits(nextLocalNumber);
        setLocalNumber(digits);
        const callingCode = PHONE_COUNTRIES.find((option) => option.country === nextCountry)?.callingCode ?? INDIAN_COUNTRY_CODE;
        onChangeText(normalizePhoneNumber(`${callingCode}${digits}`, nextCountry) ?? `${callingCode}${digits}`);
    };

    return (
        <View className="gap-2">
            <Text className="text-sm font-medium text-stone-800">
                {label}
                {required ? <Text className="text-amber-700"> *</Text> : null}
            </Text>
            <View className="flex-row">
                <Pressable
                    className={`h-12 shrink-0 flex-row items-center justify-center rounded-l-2xl border border-r-0 bg-stone-100 px-3 ${
                        error ? "border-red-400" : "border-stone-300"
                    }`}
                    onPress={() => setCountryPickerOpen(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Select country code"
                >
                    <Text className="text-sm font-medium text-stone-600">{countryCallingCode}</Text>
                    <Text className="ml-1 text-xs text-stone-500">{country}</Text>
                </Pressable>
                <TextInput
                    className={`h-12 flex-1 rounded-r-2xl border bg-white px-4 text-base text-stone-950 ${
                        error ? "border-red-400" : "border-stone-300"
                    }`}
                    value={localNumber}
                    onChangeText={(text) => updateNumber(text)}
                    placeholder="9876543210"
                    placeholderTextColor="#a8a29e"
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    maxLength={15}
                />
            </View>
            {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
            <Modal visible={countryPickerOpen} animationType="slide" onRequestClose={() => setCountryPickerOpen(false)}>
                <View className="flex-1 bg-white px-4 pt-14">
                    <View className="mb-3 flex-row items-center justify-between">
                        <Text className="text-xl font-semibold text-stone-900">Select country</Text>
                        <Pressable onPress={() => setCountryPickerOpen(false)}>
                            <Text className="text-base font-medium text-amber-700">Done</Text>
                        </Pressable>
                    </View>
                    <FlatList
                        data={PHONE_COUNTRIES}
                        keyExtractor={(item) => item.country}
                        renderItem={({ item }) => (
                            <Pressable
                                className="flex-row items-center justify-between border-b border-stone-100 py-4"
                                onPress={() => {
                                    setCountry(item.country);
                                    updateNumber(localNumber, item.country);
                                    setCountryPickerOpen(false);
                                }}
                            >
                                <Text className="text-base text-stone-800">{item.country}</Text>
                                <Text className="text-base text-stone-500">{item.callingCode}</Text>
                            </Pressable>
                        )}
                    />
                </View>
            </Modal>
        </View>
    );
};

export default PhoneNumberField;
