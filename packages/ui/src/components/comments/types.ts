export interface CommentUser {
    id: string;
    name: string;
    avatarUrl?: string;
    initials?: string;
}

export interface Comment {
    id: string;
    content: string;
    createdAt: Date | string;
    updatedAt?: Date | string | null;
    parentCommentId?: string | null;
    user: CommentUser | null;
    replies?: Comment[];
    readStatus?: 'read' | 'unread';
}

// Context for managing comment state
export interface CommentContextValue {
    editingCommentId: string | null;
    replyingToCommentId: string | null;
    editValue: string;
    replyValue: string;
    isEditLoading: boolean;
    isReplyLoading: boolean;
    setEditingCommentId: (id: string | null) => void;
    setReplyingToCommentId: (id: string | null) => void;
    setEditValue: (value: string) => void;
    setReplyValue: (value: string) => void;
    handleSaveEdit: (commentId: string, content: string) => Promise<void>;
    handleSaveReply: (content: string, parentCommentId: string) => Promise<void>;
    currentUserId?: string;
    hasCreateCommentPermission: boolean;
    hasUpdateCommentPermission: boolean;
    permissionKey: string;
}