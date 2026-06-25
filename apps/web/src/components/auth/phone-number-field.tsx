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

const PhoneNumberField = ({ value, onChange, onBlur, error, required }: PhoneNumberFieldProps) => {
    return (
        <Field data-invalid={!!error}>
            <FieldLabel required={required}>Phone number</FieldLabel>
            <FieldContent>
                <div className="flex">
                    <span className="flex h-11 shrink-0 items-center rounded-l-xl border border-r-0 border-input bg-muted px-3 text-sm font-medium text-muted-foreground">
                        {INDIAN_COUNTRY_CODE}
                    </span>
                    <Input
                        className="h-11 rounded-l-none rounded-r-xl transition-colors duration-200"
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
};

export default PhoneNumberField;
