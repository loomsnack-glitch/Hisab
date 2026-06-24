import React from "react";
import { buildCommentTree } from "./helper";
import { MessageSquare } from "lucide-react";
import { cn } from "@repo/ui/lib/utils";
import { CommentItemWrapper } from "./comment-item-wrapper";
import { Comment } from "./types";

interface CommentListProps {
    comments: Comment[];
    currentUserId?: string;
    className?: string;
    emptyMessage?: string;
}

export function CommentList({
    comments,
    currentUserId,
    className,
    emptyMessage = "No comments yet. Be the first to comment!",
}: CommentListProps) {
    const treeComments = React.useMemo(() => buildCommentTree(comments), [comments]);

    if (treeComments.length === 0) {
        return (
            <div className={cn("flex flex-col items-center justify-center py-12 text-center", className)}>
                <MessageSquare className="size-12 text-muted-foreground/50 mb-3" />
                <p className="text-sm text-muted-foreground">{emptyMessage}</p>
            </div>
        );
    }

    return (
        <div className={cn("-divide-y-2 divide-border", className)}>
            {treeComments.map((comment) => (
                <CommentItemWrapper
                    key={comment.id}
                    comment={comment}
                    currentUserId={currentUserId}
                />
            ))}
        </div>
    );
}