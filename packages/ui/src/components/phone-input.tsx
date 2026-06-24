import * as React from "react";
import { CheckIcon, ChevronsUpDown } from "lucide-react";
import * as RPNInput from "react-phone-number-input";
import flags from "react-phone-number-input/flags";
import type { Country } from "react-phone-number-input";

import { Button } from "@repo/ui/components/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, } from "@repo/ui/components/command";
import { Input } from "@repo/ui/components/input";
import { Popover, PopoverContent, PopoverTrigger, } from "@repo/ui/components/popover";
import { ScrollArea } from "@repo/ui/components/scroll-area";
import { cn } from "@repo/ui/lib/utils";

// Type definitions
interface PhoneInputProps extends Omit<React.ComponentProps<typeof RPNInput.default>, 'onChange'> {
    className?: string;
    onChange?: (value: RPNInput.Value | undefined) => void;
}

interface InputComponentProps extends React.ComponentProps<typeof Input> {
    className?: string;
}

interface CountrySelectProps {
    disabled?: boolean;
    value: Country | undefined;
    options: Array<{ value: Country | undefined; label: string }>;
    onChange: (country: Country) => void;
}

interface CountrySelectOptionProps {
    country: Country;
    countryName: string;
    selectedCountry: Country | undefined;
    onChange: (country: Country) => void;
}

interface FlagComponentProps {
    country: Country | undefined;
    countryName: string | undefined;
}

const PhoneInput = React.forwardRef<
    React.ElementRef<typeof RPNInput.default>,
    PhoneInputProps
>(({ className, onChange, ...props }, ref) => {
    return (
        <RPNInput.default
            ref={ref}
            className={cn("flex", className)}
            flagComponent={FlagComponent}
            countrySelectComponent={CountrySelect}
            inputComponent={InputComponent}
            smartCaret={false}
            /**
             * Handles the onChange event.
             *
             * react-phone-number-input might trigger the onChange event as undefined
             * when a valid phone number is not entered. To prevent this,
             * the value is coerced to an empty string.
             *
             * @param {RPNInput.Value | undefined} value - The entered value
             */
            onChange={(value) => onChange?.(value)}
            {...props}
        />
    );
});
PhoneInput.displayName = "PhoneInput";

const InputComponent = React.forwardRef<
    HTMLInputElement,
    InputComponentProps
>(({ className, ...props }, ref) => (
    <Input
        className={cn("rounded-e-md rounded-s-none h-full", className)}
        {...props}
        ref={ref}
    />
));
InputComponent.displayName = "InputComponent";

const CountrySelect: React.FC<CountrySelectProps> = ({
    disabled,
    value: selectedCountry,
    options: countryList,
    onChange,
}) => {
    return (
        <Popover>
            <PopoverTrigger render={
                <Button
                    type="button"
                    variant="outline"
                    className="flex gap-1 rounded-e-none rounded-s-md border-r-0 px-3 h-9 focus:z-10"
                    disabled={disabled}
                >
                    <FlagComponent
                        country={selectedCountry}
                        countryName={selectedCountry}
                    />
                    <ChevronsUpDown
                        className={cn(
                            "-mr-2 size-4 opacity-50",
                            disabled ? "hidden" : "opacity-100",
                        )}
                    />
                </Button>
            } />

            <PopoverContent className="w-[300px] p-0" align="start" >
                <Command>
                    <CommandInput placeholder="Search country..." />
                    <CommandList>
                        <ScrollArea className="h-72">
                            <CommandEmpty>No country found.</CommandEmpty>
                            <CommandGroup>
                                {countryList.map(({ value, label }) =>
                                    value ? (
                                        <CountrySelectOption
                                            key={value}
                                            country={value}
                                            countryName={label}
                                            selectedCountry={selectedCountry}
                                            onChange={onChange}
                                        />
                                    ) : null,
                                )}
                            </CommandGroup>
                        </ScrollArea>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
};

const CountrySelectOption: React.FC<CountrySelectOptionProps> = ({
    country,
    countryName,
    selectedCountry,
    onChange,
}) => {
    return (
        <CommandItem className="gap-2" onSelect={() => onChange(country)}>
            <FlagComponent country={country} countryName={countryName} />
            <span className="flex-1 text-sm">{countryName}</span>
            <span className="text-sm text-foreground/50">{`+${RPNInput.getCountryCallingCode(country)}`}</span>
            <CheckIcon
                className={`ml-auto size-4 ${country === selectedCountry ? "opacity-100" : "opacity-0"}`}
            />
        </CommandItem>
    );
};

const FlagComponent: React.FC<FlagComponentProps> = ({ country, countryName }) => {
    const Flag = country ? flags[country] : null;

    return (
        <span className="flex h-4 w-6 overflow-hidden rounded-sm bg-foreground/20 [&_svg]:!size-full">
            {Flag && <Flag title={countryName || ''} />}
        </span>
    );
};

export { PhoneInput };
