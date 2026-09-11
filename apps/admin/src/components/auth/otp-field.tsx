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
            const input = document.getElementById(String(name)) 
                ?? document.querySelector<HTMLInputElement>('.cn-input-otp input')
                ?? document.querySelector<HTMLInputElement>('input[data-slot="input-otp"]');
            try {
                input?.focus({ preventScroll: true });
            } catch {
                input?.focus();
            }
        }, 80);

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
                                    <InputOTPSlot index={0} className="h-11 w-10 sm:h-13 sm:w-12 md:h-14 md:w-14 rounded-xl text-base sm:text-lg md:text-xl font-semibold" />
                                    <InputOTPSlot index={1} className="h-11 w-10 sm:h-13 sm:w-12 md:h-14 md:w-14 rounded-xl text-base sm:text-lg md:text-xl font-semibold" />
                                    <InputOTPSlot index={2} className="h-11 w-10 sm:h-13 sm:w-12 md:h-14 md:w-14 rounded-xl text-base sm:text-lg md:text-xl font-semibold" />
                                </InputOTPGroup>
                                <InputOTPSeparator className="w-2 sm:w-5 flex justify-center shrink-0 text-muted-foreground" />
                                <InputOTPGroup className="gap-1.5 sm:gap-2.5">
                                    <InputOTPSlot index={3} className="h-11 w-10 sm:h-13 sm:w-12 md:h-14 md:w-14 rounded-xl text-base sm:text-lg md:text-xl font-semibold" />
                                    <InputOTPSlot index={4} className="h-11 w-10 sm:h-13 sm:w-12 md:h-14 md:w-14 rounded-xl text-base sm:text-lg md:text-xl font-semibold" />
                                    <InputOTPSlot index={5} className="h-11 w-10 sm:h-13 sm:w-12 md:h-14 md:w-14 rounded-xl text-base sm:text-lg md:text-xl font-semibold" />
                                </InputOTPGroup>
                            </InputOTP>
                        </div>
                        <FieldDescription className="mt-3 flex items-center justify-center gap-1.5 text-center text-sm text-muted-foreground">
                            <span>Enter the code sent on</span>
                            <img src={whatsAppIcon} alt="WhatsApp" className="h-4 w-4" />
                            <span className="font-semibold text-emerald-600 dark:text-emerald-400">WhatsApp</span>
                        </FieldDescription>
                        <FieldError errors={[fieldState.error]} className="text-xs" />
                    </Field>
                )}
            />
        </FieldGroup>
    );
};

export default OtpField;
