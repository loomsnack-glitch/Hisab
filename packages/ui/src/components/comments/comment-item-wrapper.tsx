import React, { useState } from "react";
import { findComment } from "./helper";
import { CommentItem } from "./comment-item";
import { Comment, CommentContextValue } from "./types";
import PermissionDeniedDialog from "@repo/ui/components/errors/permission-denied-modal";

interface CommentItemWrapperProps {
    comment: Comment;
    currentUserId?: string;
    depth?: number;
}

interface PermissionDialogConfig {
    title: string;
    message: string;
    action: string;
}

export const CommentContext = React.createContext<CommentContextValue | null>(null);

function useCommentContext() {
    const context = React.useContext(CommentContext);
    if (!context) {
        throw new Error(
            "Comment components must be used within a Comments component"
        );
    }
    return context;
}

export function CommentItemWrapper({
    comment,
    currentUserId,
    depth = 0,
}: CommentItemWrapperProps) {
    const {
        editingCommentId,
        replyingToCommentId,
        editValue,
        replyValue,
        isEditLoading,
        isReplyLoading,
        setEditingCommentId,
        setReplyingToCommentId,
        setEditValue,
        setReplyValue,
        handleSaveEdit,
        handleSaveReply,
        hasCreateCommentPermission,
        hasUpdateCommentPermission,
        permissionKey
    } = useCommentContext();

    const [isPermissionDialogOpen, setIsPermissionDialogOpen] = useState(false);
    const [permissionDialogConfig, setPermissionDialogConfig] = useState<PermissionDialogConfig | null>(null);

    const showPermissionDialog = (action: string, actionType: string, message: string) => {
        setPermissionDialogConfig({
            title: `${actionType} Permission Required`,
            message: message,
            action: `${actionType.toLowerCase()} ${action}`
        })
        setIsPermissionDialogOpen(true)
    }

    const handlePermissionDenied = (action: 'create' | 'update') => {
        const message = action === 'create'
            ? "You don't have permission to add comments."
            : "You don't have permission to edit comments.";
        showPermissionDialog(permissionKey, action, message);
    };

    const handleEdit = (commentId: string) => {
        if (!hasUpdateCommentPermission) return handlePermissionDenied('update')
        setReplyingToCommentId(null);
        setEditingCommentId(commentId);
        const commentToEdit = findComment(comment, commentId);
        setEditValue(commentToEdit?.content || "");
    };

    const handleReply = (commentId: string) => {
        if (!hasCreateCommentPermission) return handlePermissionDenied('create')
        setEditingCommentId(null);
        setReplyingToCommentId(commentId);
        setReplyValue("");
    };

    const handleCancelEdit = () => {
        setEditingCommentId(null);
        setEditValue("");
    };

    const handleCancelReply = () => {
        setReplyingToCommentId(null);
        setReplyValue("");
    };

    return (
        <>
            <PermissionDeniedDialog
                open={isPermissionDialogOpen}
                onOpenChange={setIsPermissionDialogOpen}
                title={permissionDialogConfig?.title}
                message={permissionDialogConfig?.message}
                action={permissionDialogConfig?.action}
            />
            <CommentItem
                comment={comment}
                currentUserId={currentUserId}
                onReply={handleReply}
                onEdit={handleEdit}
                onSaveEdit={handleSaveEdit}
                onCancelEdit={handleCancelEdit}
                onSaveReply={handleSaveReply}
                onCancelReply={handleCancelReply}
                isEditing={editingCommentId === comment.id}
                isReplying={replyingToCommentId === comment.id}
                editValue={editValue}
                replyValue={replyValue}
                onEditValueChange={setEditValue}
                onReplyValueChange={setReplyValue}
                isEditLoading={isEditLoading}
                isReplyLoading={isReplyLoading}
                depth={depth}
            />
        </>
    );
}