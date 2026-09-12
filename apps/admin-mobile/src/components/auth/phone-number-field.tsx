import { useEffect, useMemo, useState } from "react";
import { FlatList, Modal, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
    getPhoneNumberParts,
    INDIAN_COUNTRY_CODE,
    normalizePhoneNumber,
    PHONE_COUNTRIES,
    type CountryCode,
} from "@repo/types";

type PhoneNumberFieldProps = {
    value: string;
    onChangeText: (value: string) => void;
    label?: string;
    error?: string;
    required?: boolean;
    autoFocus?: boolean;
};

const sanitizePhoneDigits = (value: string) => value.replace(/\D/g, "").slice(0, 15);

const PhoneNumberField = ({
    value,
    onChangeText,
    label = "Phone number",
    error,
    required = false,
    autoFocus = false,
}: PhoneNumberFieldProps) => {
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
            <Text className="text-sm font-medium text-admin-foreground dark:text-admin-foreground-dark">
                {label}
                {required ? <Text className="text-admin-danger"> *</Text> : null}
            </Text>
            <View className="flex-row">
                <Pressable
                    className={`min-h-12 shrink-0 flex-row items-center justify-center rounded-l-2xl border border-r-0 bg-admin-background px-3 dark:bg-admin-background-dark ${
                        error ? "border-admin-danger" : "border-admin-border dark:border-admin-border-dark"
                    }`}
                    onPress={() => setCountryPickerOpen(true)}
                    accessibilityRole="button"
                    accessibilityLabel="Select country code"
                >
                    <Text className="text-sm font-medium text-admin-foreground dark:text-admin-foreground-dark">
                        {countryCallingCode}
                    </Text>
                    <Text className="ml-1 text-xs text-admin-muted dark:text-admin-muted-dark">{country}</Text>
                </Pressable>
                <TextInput
                    className={`min-h-12 flex-1 rounded-r-2xl border bg-admin-surface px-4 text-base text-admin-foreground dark:bg-admin-surface-dark dark:text-admin-foreground-dark ${
                        error ? "border-admin-danger" : "border-admin-border dark:border-admin-border-dark"
                    }`}
                    value={localNumber}
                    onChangeText={(text) => updateNumber(text)}
                    placeholder="9876543210"
                    placeholderTextColor="#94a3b8"
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    autoFocus={autoFocus}
                    maxLength={15}
                    accessibilityLabel={label}
                />
            </View>
            {error ? <Text className="text-sm leading-5 text-admin-danger">{error}</Text> : null}
            <Modal
                visible={countryPickerOpen}
                animationType="slide"
                onRequestClose={() => setCountryPickerOpen(false)}
            >
                <SafeAreaView className="flex-1 bg-admin-background dark:bg-admin-background-dark">
                    <View className="flex-row items-center justify-between border-b border-admin-border px-5 pb-3 dark:border-admin-border-dark">
                        <Text className="text-xl font-semibold text-admin-foreground dark:text-admin-foreground-dark">
                            Select country
                        </Text>
                        <Pressable
                            onPress={() => setCountryPickerOpen(false)}
                            accessibilityRole="button"
                            accessibilityLabel="Close country selector"
                        >
                            <Text className="text-base font-semibold text-admin-primary">Done</Text>
                        </Pressable>
                    </View>
                    <FlatList
                        data={PHONE_COUNTRIES}
                        keyExtractor={(item) => item.country}
                        renderItem={({ item }) => (
                            <Pressable
                                className="flex-row items-center justify-between border-b border-admin-border px-5 py-4 dark:border-admin-border-dark"
                                onPress={() => {
                                    setCountry(item.country);
                                    updateNumber(localNumber, item.country);
                                    setCountryPickerOpen(false);
                                }}
                                accessibilityRole="button"
                                accessibilityLabel={`${item.country}, ${item.callingCode}`}
                            >
                                <Text className="text-base text-admin-foreground dark:text-admin-foreground-dark">{item.country}</Text>
                                <Text className="text-base text-admin-muted dark:text-admin-muted-dark">{item.callingCode}</Text>
                            </Pressable>
                        )}
                    />
                </SafeAreaView>
            </Modal>
        </View>
    );
};

export default PhoneNumberField;
