import * as React from "react";
import type { FieldError as RHFFieldError } from "react-hook-form";
import { FieldContent, FieldError, FieldLabel, Field } from "@repo/ui/components/field";
import { PhoneInput } from "@repo/ui/components/phone-input";

type PhoneNumberFieldProps = {
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    error?: RHFFieldError;
    required?: boolean;
};

const PhoneNumberField = React.forwardRef<HTMLInputElement, PhoneNumberFieldProps>(
    ({ value, onChange, onBlur, error, required }, ref) => {
        return (
            <Field data-invalid={!!error} className="space-y-1">
                <FieldLabel required={required} className="text-xs">Phone number</FieldLabel>
                <FieldContent>
                    <PhoneInput
                        ref={ref}
                        className={`h-10 w-full rounded-xl border bg-transparent transition-colors duration-200 focus-within:ring-[3px] ${
                            error
                                ? "border-destructive focus-within:border-destructive focus-within:ring-destructive/20 dark:focus-within:ring-destructive/40"
                                : "border-input focus-within:border-ring focus-within:ring-ring/50"
                        }`}
                        value={value || undefined}
                        onChange={(nextValue) => onChange(nextValue ?? "")}
                        onBlur={onBlur}
                        autoComplete="tel"
                        placeholder="9876543210"
                    />
                    <FieldError errors={[error]} className="text-[10px]" />
                </FieldContent>
            </Field>
        );
    }
);

PhoneNumberField.displayName = "PhoneNumberField";

export default PhoneNumberField;
