import * as React from "react";
import type { FieldError as RHFFieldError } from "react-hook-form";
import type { Value } from "react-phone-number-input";
import { FieldContent, FieldError, FieldLabel, Field } from "@repo/ui/components/field";
import { PhoneInput } from "@repo/ui/components/phone-input";

type PhoneNumberFieldProps = {
    value: string;
    onChange: (value: string) => void;
    onBlur?: () => void;
    error?: RHFFieldError;
    required?: boolean;
    autoFocus?: boolean;
};

const PhoneNumberField = React.forwardRef<React.ElementRef<typeof PhoneInput>, PhoneNumberFieldProps>(
    ({ value, onChange, onBlur, error, required, autoFocus }, ref) => {
        const inputRef = React.useRef<HTMLInputElement | null>(null);

        React.useEffect(() => {
            if (!autoFocus) return undefined;
            const timer = window.setTimeout(() => {
                try {
                    if (inputRef.current) {
                        inputRef.current.focus({ preventScroll: true });
                    } else {
                        const el = (document.querySelector('input[type="tel"]') ?? document.getElementById("phone")) as HTMLInputElement | null;
                        el?.focus({ preventScroll: true });
                    }
                } catch {
                    inputRef.current?.focus();
                }
            }, 60);
            return () => window.clearTimeout(timer);
        }, [autoFocus]);

        return (
            <Field data-invalid={!!error} className="space-y-1.5">
                <FieldLabel required={required} className="text-sm font-medium">Phone number</FieldLabel>
                <FieldContent>
                    <PhoneInput
                        id="phone"
                        ref={(node) => {
                            inputRef.current = node as unknown as HTMLInputElement;
                            if (typeof ref === "function") {
                                ref(node);
                            } else if (ref) {
                                ref.current = node;
                            }
                        }}
                        autoFocus={autoFocus}
                        className={`h-11 sm:h-12 w-full rounded-xl border bg-transparent transition-colors duration-200 focus-within:ring-[3px] text-base ${
                            error
                                ? "border-destructive focus-within:border-destructive focus-within:ring-destructive/20 dark:focus-within:ring-destructive/40"
                                : "border-input focus-within:border-ring focus-within:ring-ring/50"
                        }`}
                        value={value || undefined}
                        onChange={(nextValue: Value | undefined) => onChange(nextValue ?? "")}
                        onBlur={onBlur}
                        autoComplete="tel"
                        placeholder="9876543210"
                    />
                    <FieldError errors={[error]} className="text-xs" />
                </FieldContent>
            </Field>
        );
    }
);

PhoneNumberField.displayName = "PhoneNumberField";

export default PhoneNumberField;
