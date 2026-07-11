import * as React from "react";
import type { FieldError as RHFFieldError } from "react-hook-form";
import { Input } from "@repo/ui/components/input";
import { FieldContent, FieldError, FieldLabel, Field } from "@repo/ui/components/field";
import { INDIAN_COUNTRY_CODE } from "@repo/types";

type PhoneNumberFieldProps = {
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    error?: RHFFieldError;
    required?: boolean;
};

const sanitizeIndianMobileNumber = (value: string) => value.replace(/\D/g, "").slice(0, 10);

const PhoneNumberField = React.forwardRef<HTMLInputElement, PhoneNumberFieldProps>(
    ({ value, onChange, onBlur, error, required }, ref) => {
        return (
            <Field data-invalid={!!error}>
                <FieldLabel required={required}>Phone number</FieldLabel>
                <FieldContent>
                    <div
                        className={`flex h-11 w-full rounded-xl border bg-transparent transition-all duration-200 focus-within:ring-[3px] overflow-hidden ${
                            error
                                ? "border-destructive focus-within:border-destructive focus-within:ring-destructive/20 dark:focus-within:ring-destructive/40"
                                : "border-input focus-within:border-ring focus-within:ring-ring/50"
                        }`}
                    >
                        <span className="flex h-full shrink-0 items-center bg-muted px-3 text-sm font-medium text-muted-foreground border-r border-input">
                            {INDIAN_COUNTRY_CODE}
                        </span>
                        <Input
                            ref={ref}
                            className="h-full rounded-none border-0 bg-transparent shadow-none ring-0 focus-visible:ring-0 focus-visible:border-0 flex-1 px-3 text-sm transition-none"
                            inputMode="numeric"
                            autoComplete="tel-national"
                            placeholder="9876543210"
                            value={value}
                            onChange={(event) => onChange(sanitizeIndianMobileNumber(event.target.value))}
                            onBlur={onBlur}
                        />
                    </div>
                    <FieldError errors={[error]} />
                </FieldContent>
            </Field>
        );
    }
);

PhoneNumberField.displayName = "PhoneNumberField";

export default PhoneNumberField;
