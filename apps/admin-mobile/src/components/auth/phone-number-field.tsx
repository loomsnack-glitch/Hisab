import { useEffect, useMemo, useRef, useState } from "react";
import {
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    Text,
    TextInput,
    View,
} from "react-native";
import { useCSSVariable, useUniwind } from "uniwind";
import { getName as getCountryNameFromList } from "country-list";
import { SafeAreaView } from "../ui/uniwind-native";
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

type CountryOption = {
    country: CountryCode;
    callingCode: string;
    name: string;
    flag: string;
};

const sanitizePhoneDigits = (value: string) => value.replace(/\D/g, "").slice(0, 15);

const getCountryName = (country: CountryCode) =>
    getCountryNameFromList(country)?.replace(/\s+\(the\)$/i, "") ?? country;

const getCountryFlag = (country: CountryCode) =>
    country
        .split("")
        .map((letter) => String.fromCodePoint(letter.charCodeAt(0) + 127397))
        .join("");

const COUNTRY_OPTIONS: CountryOption[] = PHONE_COUNTRIES.map((option) => ({
    ...option,
    name: getCountryName(option.country),
    flag: getCountryFlag(option.country),
})).sort((a, b) => {
    if (a.country === "IN") return -1;
    if (b.country === "IN") return 1;
    return a.name.localeCompare(b.name);
});

const PhoneNumberField = ({
    value,
    onChangeText,
    label = "Mobile number",
    error,
    required = false,
    autoFocus = false,
}: PhoneNumberFieldProps) => {
    const { theme } = useUniwind();
    const placeholderVariable = theme === "dark" ? "--color-admin-muted-dark" : "--color-admin-muted";
    const placeholderValue = useCSSVariable(placeholderVariable);
    const placeholderColor = typeof placeholderValue === "string" ? placeholderValue : "#94a3b8";
    const searchRef = useRef<TextInput>(null);
    const initialParts = getPhoneNumberParts(value);
    const [country, setCountry] = useState<CountryCode>(initialParts?.country ?? "IN");
    const [localNumber, setLocalNumber] = useState(initialParts?.nationalNumber ?? "");
    const [search, setSearch] = useState("");
    const [countryPickerOpen, setCountryPickerOpen] = useState(false);

    const selectedCountry = useMemo(
        () => COUNTRY_OPTIONS.find((option) => option.country === country) ?? COUNTRY_OPTIONS[0],
        [country],
    );

    const filteredCountries = useMemo(() => {
        const query = search.trim().toLowerCase();
        if (!query) return COUNTRY_OPTIONS;

        return COUNTRY_OPTIONS.filter(
            (option) =>
                option.name.toLowerCase().includes(query) ||
                option.country.toLowerCase().includes(query) ||
                option.callingCode.includes(query),
        );
    }, [search]);

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
        const callingCode =
            COUNTRY_OPTIONS.find((option) => option.country === nextCountry)?.callingCode ?? INDIAN_COUNTRY_CODE;
        onChangeText(normalizePhoneNumber(`${callingCode}${digits}`, nextCountry) ?? `${callingCode}${digits}`);
    };

    const openCountryPicker = () => {
        setSearch("");
        setCountryPickerOpen(true);
        setTimeout(() => searchRef.current?.focus(), 150);
    };

    const closeCountryPicker = () => {
        searchRef.current?.blur();
        setCountryPickerOpen(false);
    };

    return (
        <View className="gap-2">
            <Text className="text-sm font-medium text-admin-foreground dark:text-admin-foreground-dark">
                {label}
                {required ? <Text className="text-admin-danger"> *</Text> : null}
            </Text>
            <View
                className={`min-h-14.5 flex-row items-center overflow-hidden rounded-2xl border bg-admin-surface dark:bg-admin-surface-dark ${
                    error ? "border-admin-danger" : "border-admin-border dark:border-admin-border-dark"
                }`}
            >
                <Pressable
                    className="min-h-14 w-24 max-w-24 shrink-0 flex-row items-center px-2"
                    onPress={openCountryPicker}
                    accessibilityRole="button"
                    accessibilityLabel={`Country code ${selectedCountry.name}, ${selectedCountry.callingCode}`}
                >
                    <Text className="text-lg">{selectedCountry.flag}</Text>
                    <View className="ml-1">
                        <Text className="text-base font-extrabold tracking-[0.2px] text-admin-foreground dark:text-admin-foreground-dark">
                            {selectedCountry.callingCode}
                        </Text>
                    </View>
                    <Text className="-mt-1 ml-2 text-base text-admin-muted dark:text-admin-muted-dark">⌄</Text>
                </Pressable>
                <View className="h-7.5 w-px bg-admin-border dark:bg-admin-border-dark" />
                <TextInput
                    className="min-h-14 min-w-0 flex-1 px-3.5 text-[17px] text-admin-foreground dark:text-admin-foreground-dark"
                    value={localNumber}
                    onChangeText={(text) => updateNumber(text)}
                    placeholder="98765 43210"
                    placeholderTextColor={placeholderColor}
                    keyboardType="phone-pad"
                    autoCapitalize="none"
                    autoFocus={autoFocus}
                    maxLength={15}
                    accessibilityLabel={label}
                />
            </View>
            {error ? (
                <Text className="text-sm leading-5 text-admin-danger">{error}</Text>
            ) : null}

            <Modal
                visible={countryPickerOpen}
                transparent
                animationType="slide"
                statusBarTranslucent
                onRequestClose={closeCountryPicker}
            >
                <KeyboardAvoidingView
                    className="flex-1 justify-end"
                    behavior={Platform.OS === "ios" ? "padding" : undefined}
                >
                    <Pressable className="flex-1 bg-black/60" onPress={closeCountryPicker} />
                    <SafeAreaView
                        className="max-h-[88%] rounded-t-[28px] bg-admin-background pt-2.5 dark:bg-admin-background-dark"
                        edges={["bottom"]}
                    >
                        <View className="flex-row items-center justify-between px-5 py-3.5">
                            <View>
                                <Text className="text-[10px] font-extrabold tracking-[1.4px] text-admin-primary">
                                    PHONE NUMBER
                                </Text>
                                <Text className="mt-1 text-[22px] font-extrabold text-admin-foreground dark:text-admin-foreground-dark">
                                    Choose your country
                                </Text>
                            </View>
                            <Pressable
                                className="rounded-xl bg-admin-info-surface px-3 py-2 dark:bg-admin-info-surface-dark"
                                onPress={closeCountryPicker}
                                accessibilityRole="button"
                                accessibilityLabel="Close country selector"
                            >
                                <Text className="text-sm font-extrabold text-admin-primary">Done</Text>
                            </Pressable>
                        </View>
                        <View className="mx-5 mb-2 min-h-[50px] flex-row items-center rounded-[15px] border border-admin-border bg-admin-surface px-3 dark:border-admin-border-dark dark:bg-admin-surface-dark">
                            <Text className="mr-2 text-2xl text-admin-muted dark:text-admin-muted-dark">⌕</Text>
                            <TextInput
                                ref={searchRef}
                                className="min-h-12 flex-1 text-[15px] text-admin-foreground dark:text-admin-foreground-dark"
                                value={search}
                                onChangeText={setSearch}
                                placeholder="Search country or code"
                                placeholderTextColor={placeholderColor}
                                autoCorrect={false}
                                autoCapitalize="none"
                                returnKeyType="search"
                                accessibilityLabel="Search countries"
                            />
                            {search ? (
                                <Pressable onPress={() => setSearch("")} accessibilityLabel="Clear country search">
                                    <Text className="pl-2 text-[26px] text-admin-muted dark:text-admin-muted-dark">×</Text>
                                </Pressable>
                            ) : null}
                        </View>
                        <FlatList
                            data={filteredCountries}
                            keyExtractor={(item) => item.country}
                            keyboardShouldPersistTaps="handled"
                            contentContainerClassName="px-3 pb-4"
                            ListEmptyComponent={
                                <Text className="p-6 text-center text-admin-muted dark:text-admin-muted-dark">
                                    No country found
                                </Text>
                            }
                            renderItem={({ item }) => {
                                const selected = item.country === country;
                                return (
                                    <Pressable
                                        className={`min-h-[62px] flex-row items-center rounded-[15px] px-2.5 ${
                                            selected ? "bg-admin-info-surface dark:bg-admin-info-surface-dark" : ""
                                        }`}
                                        onPress={() => {
                                            setCountry(item.country);
                                            updateNumber(localNumber, item.country);
                                            closeCountryPicker();
                                        }}
                                        accessibilityRole="button"
                                        accessibilityState={{ selected }}
                                        accessibilityLabel={`${item.name}, ${item.callingCode}`}
                                    >
                                        <Text className="w-[42px] text-[25px]">{item.flag}</Text>
                                        <View className="flex-1">
                                            <Text className="text-[15px] font-semibold text-admin-foreground dark:text-admin-foreground-dark">
                                                {item.name}
                                            </Text>
                                            <Text className="mt-0.5 text-[11px] text-admin-muted dark:text-admin-muted-dark">
                                                {item.country}
                                            </Text>
                                        </View>
                                        <Text className="mr-2.5 text-sm text-admin-muted dark:text-admin-muted-dark">
                                            {item.callingCode}
                                        </Text>
                                        {selected ? <Text className="w-5 text-xl font-extrabold text-admin-primary">✓</Text> : null}
                                    </Pressable>
                                );
                            }}
                        />
                    </SafeAreaView>
                </KeyboardAvoidingView>
            </Modal>
        </View>
    );
};

export default PhoneNumberField;
