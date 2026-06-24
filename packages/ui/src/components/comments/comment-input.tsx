import { cn } from "@repo/ui/lib/utils";
import { TextareaAutosize } from "@repo/ui/components/textarea-autosize";
import { Button } from "@repo/ui/components/button";
import { Pencil, Reply, Send, X } from "lucide-react";

interface CommentInputProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    onCancel?: () => void;
    placeholder?: string;
    isLoading?: boolean;
    isEdit?: boolean;
    isReply?: boolean;
    autoFocus?: boolean;
    className?: string;
    ref?: React.RefObject<HTMLTextAreaElement>;
}

export const CommentInput = ({
    ref,
    value,
    onChange,
    onSubmit,
    onCancel,
    placeholder = "Write a comment...",
    isLoading = false,
    isEdit = false,
    isReply = false,
    autoFocus = false,
    className,
}: CommentInputProps) => {
    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (value.trim()) {
                onSubmit();
            }
        }
        if (e.key === "Escape" && onCancel) {
            onCancel();
        }
    };

    return (
        <div className={cn("relative flex flex-col gap-2", className)}>
            <div className="relative">
                <TextareaAutosize
                    ref={ref}
                    value={value}
                    onValueChange={onChange}
                    placeholder={placeholder}
                    minRows={4}
                    maxRows={6}
                    variant="ringShadow"
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    className={cn(
                        "pr-12 transition-all duration-200",
                        isReply && "text-sm"
                    )}
                    autoFocus={autoFocus}
                />
            </div>
            <div className="flex items-center justify-end gap-2">
                {(isEdit || isReply) && onCancel && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={onCancel}
                        disabled={isLoading}
                    >
                        <X className="size-3" />
                        Cancel
                    </Button>
                )}
                <Button
                    type="button"
                    size="xs"
                    onClick={onSubmit}
                    disabled={!value.trim() || isLoading}
                    isLoading={isLoading}
                    loadingText={isEdit ? "Saving..." : "Posting..."}
                >
                    {isEdit ? (
                        <>
                            <Pencil className="size-3" />
                            Save
                        </>
                    ) : isReply ? (
                        <>
                            <Reply className="size-3" />
                            Reply
                        </>
                    ) : (
                        <>
                            <Send className="size-3" />
                            Post Comment
                        </>
                    )}
                </Button>
            </div>
        </div>
    );
};

CommentInput.displayName = "CommentInput";
