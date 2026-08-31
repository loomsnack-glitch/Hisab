import { useState } from "react";
import { Button } from "@repo/ui/components/button";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
} from "@repo/ui/components/dialog";
import { Field, FieldContent, FieldLabel } from "@repo/ui/components/field";
import { Textarea } from "@repo/ui/components/textarea";

type PayableReasonDialogProps = {
    open: boolean;
    title: string;
    description: string;
    confirmLabel: string;
    pendingLabel: string;
    placeholder: string;
    pending: boolean;
    onOpenChange: (open: boolean) => void;
    onConfirm: (reason: string) => void;
};

const PayableReasonDialog = ({
    open,
    title,
    description,
    confirmLabel,
    pendingLabel,
    placeholder,
    pending,
    onOpenChange,
    onConfirm,
}: PayableReasonDialogProps) => {
    const [reason, setReason] = useState("");
    const trimmed = reason.trim();

    return (
        <Dialog
            open={open}
            onOpenChange={(nextOpen) => {
                if (!nextOpen) {
                    setReason("");
                }
                onOpenChange(nextOpen);
            }}
            disablePointerDismissal
        >
            <DialogContent className="sm:max-w-md">
                <DialogHeader title={title} subtitle={description} />
                <Field>
                    <FieldLabel required>Reason</FieldLabel>
                    <FieldContent>
                        <Textarea
                            className="min-h-24 rounded-lg"
                            placeholder={placeholder}
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                        />
                    </FieldContent>
                </Field>
                <DialogFooter>
                    <Button
                        variant="outline"
                        className="rounded-full"
                        disabled={pending}
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="destructive"
                        className="rounded-full"
                        disabled={pending || trimmed.length === 0}
                        onClick={() => onConfirm(trimmed)}
                    >
                        {pending ? pendingLabel : confirmLabel}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default PayableReasonDialog;
