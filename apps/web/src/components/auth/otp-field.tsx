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
                        <div className="flex justify-center">
                            <InputOTP
                                id={String(name)}
                                maxLength={6}
                                autoFocus={autoFocus}
                                value={(field.value as string | undefined) ?? ""}
                                onChange={field.onChange}
                            >
                                <InputOTPGroup className="gap-2">
                                    <InputOTPSlot index={0} className="h-12 w-12 rounded-xl border text-lg" />
                                    <InputOTPSlot index={1} className="h-12 w-12 rounded-xl border text-lg" />
                                    <InputOTPSlot index={2} className="h-12 w-12 rounded-xl border text-lg" />
                                </InputOTPGroup>
                                <InputOTPSeparator className="w-6" />
                                <InputOTPGroup className="gap-2">
                                    <InputOTPSlot index={3} className="h-12 w-12 rounded-xl border text-lg" />
                                    <InputOTPSlot index={4} className="h-12 w-12 rounded-xl border text-lg" />
                                    <InputOTPSlot index={5} className="h-12 w-12 rounded-xl border text-lg" />
                                </InputOTPGroup>
                            </InputOTP>
                        </div>
                        <FieldDescription className="mt-2 flex items-center justify-center gap-2 text-center">
                            <span>Enter the code sent on</span>
                            <img src={whatsAppIcon} alt="WhatsApp" className="h-4 w-4" />
                            <span>WhatsApp.</span>
                        </FieldDescription>
                        <FieldError errors={[fieldState.error]} />
                    </Field>
                )}
            />
        </FieldGroup>
    );
};

export default OtpField;
