"use client";

import * as React from "react";
import { cn } from "@repo/ui/lib/utils";
import { useMutation } from "@tanstack/react-query";
import { Comment, CommentContextValue } from "./types";
import { CommentContext } from "./comment-item-wrapper";
import { CommentList } from "./comment-list";
import { CommentInput } from "./comment-input";

export interface CommentsProps {
    comments: Comment[];
    currentUserId?: string;
    onAddComment: ({ content, parentCommentId }: { content: string, parentCommentId?: string | null }) => Promise<void>;
    onEditComment: ({ commentId, content }: { commentId: string, content: string }) => Promise<void>;
    isLoading?: boolean;
    className?: string;
    emptyMessage?: string;
    placeholder?: string;
    hasCreateCommentPermission: boolean;
    hasUpdateCommentPermission: boolean;
    permissionKey: string;
}

export function Comments({
    comments,
    currentUserId,
    onAddComment,
    onEditComment,
    isLoading = false,
    className,
    emptyMessage,
    placeholder = "Write a comment...",
    hasCreateCommentPermission = false,
    hasUpdateCommentPermission = false,
    permissionKey = '',
}: CommentsProps) {
    const [newCommentValue, setNewCommentValue] = React.useState("");

    const [editingCommentId, setEditingCommentId] = React.useState<string | null>(null);
    const [replyingToCommentId, setReplyingToCommentId] = React.useState<string | null>(null);
    const [editValue, setEditValue] = React.useState("");
    const [replyValue, setReplyValue] = React.useState("");

    const addCommentMutation = useMutation({
        mutationFn: onAddComment,
        onSuccess: () => {
            setNewCommentValue("");
            setReplyValue("");
            setReplyingToCommentId(null);
        },
    });

    const editCommentMutation = useMutation({
        mutationFn: onEditComment,
        onSuccess: () => {
            setEditingCommentId(null);
            setEditValue("");
        },
    });

    const handleSubmitNewComment = async () => {
        if (!newCommentValue.trim()) return;
        addCommentMutation.mutate({ content: newCommentValue.trim(), parentCommentId: null })
    };

    const handleSaveEdit = async (commentId: string, content: string) => {
        if (!content.trim()) return;
        editCommentMutation.mutate({ commentId, content: content.trim() })
    };

    const handleSaveReply = async (content: string, parentCommentId: string) => {
        if (!content.trim()) return;
        addCommentMutation.mutate({ content: content.trim(), parentCommentId })
    };

    const contextValue: CommentContextValue = {
        editingCommentId,
        replyingToCommentId,
        editValue,
        replyValue,
        isEditLoading: editCommentMutation.isPending,
        isReplyLoading: addCommentMutation.isPending && addCommentMutation.variables?.parentCommentId !== null,
        setEditingCommentId,
        setReplyingToCommentId,
        setEditValue,
        setReplyValue,
        handleSaveEdit,
        handleSaveReply,
        currentUserId,
        hasCreateCommentPermission,
        hasUpdateCommentPermission,
        permissionKey
    };

    return (
        <CommentContext.Provider value={contextValue}>
            <div className={cn("flex flex-col h-full", className)}>
                {/* Comments List */}
                <div className="flex-1 overflow-y-auto px-4">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin size-6 border-2 border-primary border-t-transparent rounded-full" />
                        </div>
                    ) : (
                        <CommentList
                            comments={comments}
                            currentUserId={currentUserId}
                            emptyMessage={emptyMessage}
                        />
                    )}
                </div>

                {/* New Comment Input */}
                <div className="border-t bg-background p-4 shrink-0">
                    {hasCreateCommentPermission ? < CommentInput
                        value={newCommentValue}
                        onChange={setNewCommentValue}
                        onSubmit={handleSubmitNewComment}
                        placeholder={placeholder}
                        isLoading={addCommentMutation.isPending && addCommentMutation.variables?.parentCommentId === null}
                    /> :
                        <p className="text-sm text-muted-foreground text-center">
                            You don’t have permission to add comments.
                        </p>

                    }
                </div>
            </div>
        </CommentContext.Provider>
    );
}

export * from "./types";