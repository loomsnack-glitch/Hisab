import { useEffect } from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "@repo/ui/components/input-otp";
import { Field, FieldDescription, FieldError, FieldGroup } from "@repo/ui/components/field";
import whatsAppIcon from "@repo/assets/services/whatsapp.webp";

type OtpFieldProps<T extends FieldValues> = {
    control: Control<T>;
    name: FieldPath<T>;
    autoFocus?: boolean;
};

const OtpField = <T extends FieldValues>({ control, name, autoFocus = true }: OtpFieldProps<T>) => {
    useEffect(() => {
        if (!autoFocus) return undefined;

        const timer = window.setTimeout(() => {
            document.getElementById(String(name))?.focus();
        }, 100);

        return () => window.clearTimeout(timer);
    }, [autoFocus, name]);

    return (
        <FieldGroup>
            <Controller
                name={name}
                control={control}
                render={({ field, fieldState }) => (
                    <Field data-invalid={fieldState.invalid}>
                        <div className="flex justify-center w-full">
                            <InputOTP
                                id={String(name)}
                                maxLength={6}
                                autoFocus={autoFocus}
                                value={(field.value as string | undefined) ?? ""}
                                onChange={field.onChange}
                            >
                                <InputOTPGroup className="gap-1.5 sm:gap-2.5">
                                    <InputOTPSlot index={0} className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl text-base sm:text-lg font-semibold" />
                                    <InputOTPSlot index={1} className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl text-base sm:text-lg font-semibold" />
                                    <InputOTPSlot index={2} className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl text-base sm:text-lg font-semibold" />
                                </InputOTPGroup>
                                <InputOTPSeparator className="w-3 sm:w-6 flex justify-center shrink-0 text-muted-foreground" />
                                <InputOTPGroup className="gap-1.5 sm:gap-2.5">
                                    <InputOTPSlot index={3} className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl text-base sm:text-lg font-semibold" />
                                    <InputOTPSlot index={4} className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl text-base sm:text-lg font-semibold" />
                                    <InputOTPSlot index={5} className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl text-base sm:text-lg font-semibold" />
                                </InputOTPGroup>
                            </InputOTP>
                        </div>
                        <FieldDescription className="mt-2.5 flex items-center justify-center gap-1.5 text-center text-xs text-muted-foreground">
                            <span>Enter the code sent on</span>
                            <img src={whatsAppIcon} alt="WhatsApp" className="h-3.5 w-3.5" />
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">WhatsApp</span>
                        </FieldDescription>
                        <FieldError errors={[fieldState.error]} />
                    </Field>
                )}
            />
        </FieldGroup>
    );
};

export default OtpField;
