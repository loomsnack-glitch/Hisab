import type { Comment } from "./types";

export const formatDate = (date: Date | string): string => {
    const d = typeof date === "string" ? new Date(date) : date;
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;

    return d.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
    });
};

export const getInitials = (name: string): string => {
    return name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
};

export const buildCommentTree = (comments: Comment[]): Comment[] => {
    const commentMap = new Map<string, Comment>();
    const rootComments: Comment[] = [];

    // First pass: create map of all comments
    comments.forEach((comment) => {
        commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: build tree structure
    comments.forEach((comment) => {
        const mappedComment = commentMap.get(comment.id)!;
        if (comment.parentCommentId) {
            const parent = commentMap.get(comment.parentCommentId);
            if (parent) {
                parent.replies = parent.replies || [];
                parent.replies.push(mappedComment);
            } else {
                // Parent not found, treat as root comment
                rootComments.push(mappedComment);
            }
        } else {
            rootComments.push(mappedComment);
        }
    });

    return rootComments;
};

// Helper function to find a comment by ID in the tree
export function findComment(comment: Comment, id: string): Comment | null {
    if (comment.id === id) return comment;
    if (comment.replies) {
        for (const reply of comment.replies) {
            const found = findComment(reply, id);
            if (found) return found;
        }
    }
    return null;
}