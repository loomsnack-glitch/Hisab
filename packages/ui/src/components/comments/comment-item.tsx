import { cn } from "@repo/ui/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@repo/ui/components/avatar";
import { Button } from "@repo/ui/components/button";
import { formatDate } from "./helper";
import { CommentInput } from "./comment-input";
import { BsFillReplyFill } from "react-icons/bs";
import { MdEditSquare } from "react-icons/md";
import { CommentItemWrapper } from "./comment-item-wrapper";
import { Comment } from "./types";
interface CommentItemProps {
    comment: Comment;
    currentUserId?: string;
    onReply: (commentId: string) => void;
    onEdit: (commentId: string) => void;
    onSaveEdit: (commentId: string, content: string) => Promise<void>;
    onCancelEdit: () => void;
    onSaveReply: (content: string, parentCommentId: string) => Promise<void>;
    onCancelReply: () => void;
    isEditing: boolean;
    isReplying: boolean;
    editValue: string;
    replyValue: string;
    onEditValueChange: (value: string) => void;
    onReplyValueChange: (value: string) => void;
    isEditLoading: boolean;
    isReplyLoading: boolean;
    depth?: number;
}

export function CommentItem({
    comment,
    currentUserId,
    onReply,
    onEdit,
    onSaveEdit,
    onCancelEdit,
    onSaveReply,
    onCancelReply,
    isEditing,
    isReplying,
    editValue,
    replyValue,
    onEditValueChange,
    onReplyValueChange,
    isEditLoading,
    isReplyLoading,
    depth = 0,
}: CommentItemProps) {
    const isOwnComment = currentUserId && comment.user?.id === currentUserId;
    const userName = comment.user?.name || "Unknown User";
    const userInitials = comment.user?.initials;
    const wasEdited = comment.updatedAt && comment.createdAt !== comment.updatedAt;
    const isUnread = comment.readStatus === 'unread';

    return (
        <div
            className={cn(
                "group/comment relative",
                depth > 0 && "pl-8 border-l ml-4"
            )}
        >
            <div className="flex gap-3 py-2">
                {/* Avatar */}
                <Avatar size="sm" className="shrink-0 mt-0.5">
                    {comment.user?.avatarUrl ? (
                        <AvatarImage src={comment.user.avatarUrl} alt={userName} />
                    ) : null}
                    <AvatarFallback>{userInitials}</AvatarFallback>
                </Avatar>

                {/* Comment Content */}
                <div className="flex-1 min-w-0">
                    {/* Header */}
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-foreground truncate">
                            {userName}
                        </span>
                        <span className="text-xs text-muted-foreground shrink-0">
                            {formatDate(comment.createdAt)}
                        </span>
                        {wasEdited && (
                            <span className="text-xs text-muted-foreground italic">
                                (edited)
                            </span>
                        )}
                        {isUnread && (
                            <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-1.5 py-0.5 rounded-full">
                                New
                            </span>
                        )}
                    </div>

                    {/* Content or Edit Input */}
                    {isEditing ? (
                        <CommentInput
                            value={editValue}
                            onChange={onEditValueChange}
                            onSubmit={() => onSaveEdit(comment.id, editValue)}
                            onCancel={onCancelEdit}
                            isEdit
                            isLoading={isEditLoading}
                            autoFocus
                        />
                    ) : (
                        <p className="text-sm text-foreground whitespace-pre-wrap wrap-break-word">
                            {comment.content}
                        </p>
                    )}

                    {/* Action buttons (inline like YouTube) */}
                    {!isEditing && (
                        <div className="flex items-center mt-1">
                            <Button
                                variant="ghost"
                                size="xs"
                                onClick={() => onReply(comment.id)}
                                className="text-muted-foreground hover:text-foreground text-xs px-2"
                            >
                                <BsFillReplyFill className="size-3.5" />
                                Reply
                            </Button>
                            {isOwnComment && (
                                <Button
                                    variant="ghost"
                                    size="xs"
                                    onClick={() => onEdit(comment.id)}
                                    className="text-muted-foreground hover:text-foreground text-xs px-2"
                                >
                                    <MdEditSquare className="size-3.5" />
                                    Edit
                                </Button>
                            )}
                        </div>
                    )}

                    {/* Reply Input */}
                    {isReplying && (
                        <div className="mt-3">
                            <CommentInput
                                value={replyValue}
                                onChange={onReplyValueChange}
                                onSubmit={() => onSaveReply(replyValue, comment.id)}
                                onCancel={onCancelReply}
                                placeholder={`Reply to ${userName}...`}
                                isReply
                                isLoading={isReplyLoading}
                                autoFocus
                            />
                        </div>
                    )}
                </div>

            </div>

            {/* Replies */}
            {comment.replies && comment.replies.length > 0 && (
                <div className="space-y-0 -border-t -divide-y">
                    {comment.replies.map((reply) => (
                        <CommentItemWrapper
                            key={reply.id}
                            comment={reply}
                            currentUserId={currentUserId}
                            depth={depth + 1}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}