import { Fragment, useMemo, useState, type ReactNode } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { WhatsAppMessageDTO } from "@repo/types";
import {
    attachWhatsAppConversationCustomer,
    getCustomers,
    getWhatsAppAttachment,
    getWhatsAppConversation,
    getWhatsAppConversations,
} from "@repo/services";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Input } from "@repo/ui/components/input";
import { Spinner } from "@repo/ui/components/spinner";
import { ArrowLeft, CalendarDays, Check, CheckCheck, CircleAlert, Clock3, FileText, Image as ImageIcon, RefreshCw, Search, X } from "lucide-react";
import { toast } from "sonner";

import { whatsappKeys } from "@/lib/query-keys";
import { formatWhatsAppDayLabel, formatWhatsAppTimestamp } from "@/lib/format";
import { filterWhatsAppConversations } from "@/lib/whatsapp-inbox";
import WhatsAppIcon from "@/components/icons/whatsapp-icon";

type InboxViewProps = {
    organizationId: string;
    storeId: string;
    embedded?: boolean;
};

const normalizePhone = (phone: string) => phone.replace(/\D/g, "");

const responseMessage = (response: { status: string; message?: string }) =>
    response.status === "success" ? "" : response.message || "WhatsApp request failed";

export const WhatsAppInboxView = ({ organizationId, storeId, embedded = false }: InboxViewProps) => {
    const queryClient = useQueryClient();
    const [selectedConversationIdState, setSelectedConversationId] = useState<string | null>(null);
    const [openingAttachmentId, setOpeningAttachmentId] = useState<string | null>(null);
    const [conversationSearch, setConversationSearch] = useState("");

    const conversationsKey = whatsappKeys.conversations(organizationId, storeId);
    const conversationsQuery = useQuery({
        queryKey: conversationsKey,
        queryFn: () => getWhatsAppConversations(organizationId, storeId),
        refetchInterval: 5_000,
    });

    const conversations = useMemo(
        () => conversationsQuery.data?.status === "success"
            ? conversationsQuery.data.data?.conversations ?? []
            : [],
        [conversationsQuery.data],
    );
    const accountStatus = conversationsQuery.data?.status === "success"
        ? conversationsQuery.data.data?.accountStatus
        : null;
    const filteredConversations = useMemo(
        () => filterWhatsAppConversations(conversations, conversationSearch),
        [conversations, conversationSearch],
    );
    const unreadMessageCount = filteredConversations.reduce(
        (total, conversation) => total + conversation.unreadCount,
        0,
    );
    const selectedConversationId = selectedConversationIdState && filteredConversations.some(
        (conversation) => conversation.id === selectedConversationIdState,
    )
        ? selectedConversationIdState
        : filteredConversations[0]?.id ?? null;
    const conversationKey = selectedConversationId
        ? whatsappKeys.conversation(organizationId, storeId, selectedConversationId)
        : [...conversationsKey, "selected", "none"];

    const conversationQuery = useQuery({
        queryKey: conversationKey,
        queryFn: () => getWhatsAppConversation(organizationId, storeId, selectedConversationId!),
        enabled: Boolean(selectedConversationId),
        refetchInterval: 5_000,
    });

    const conversationData = conversationQuery.data?.status === "success" ? conversationQuery.data.data : null;
    const selectedConversation = conversationData?.conversation ?? conversations.find(
        (conversation) => conversation.id === selectedConversationId,
    ) ?? null;
    const messages = conversationData?.messages ?? [];

    const customerQuery = useQuery({
        queryKey: [...conversationKey, "customer-candidates"],
        queryFn: () => getCustomers(organizationId, { search: selectedConversation?.contactPhoneNumber, limit: 20 }),
        enabled: Boolean(selectedConversation && !selectedConversation.customerId),
    });

    const customerCandidates = useMemo(() => {
        if (customerQuery.data?.status !== "success") return [];
        const phone = normalizePhone(selectedConversation?.contactPhoneNumber ?? "");
        return (customerQuery.data.data?.customers ?? []).filter((customer) => normalizePhone(customer.phone ?? "") === phone);
    }, [customerQuery.data, selectedConversation?.contactPhoneNumber]);

    const attachMutation = useMutation({
        mutationFn: (customerId: string) =>
            attachWhatsAppConversationCustomer(organizationId, storeId, selectedConversationId!, { customerId }),
        onSuccess: (response) => {
            const message = responseMessage(response);
            if (message) {
                toast.error(message);
                return;
            }
            toast.success("Customer attached to conversation");
            void queryClient.invalidateQueries({ queryKey: conversationKey });
            void queryClient.invalidateQueries({ queryKey: conversationsKey });
            void queryClient.invalidateQueries({ queryKey: [...conversationKey, "customer-candidates"] });
        },
    });

    const openAttachment = async (message: WhatsAppMessageDTO) => {
        if (!selectedConversationId || !message.attachmentFileName) return;
        setOpeningAttachmentId(message.id);
        const response = await getWhatsAppAttachment(organizationId, storeId, selectedConversationId, message.id);
        setOpeningAttachmentId(null);
        const messageText = responseMessage(response);
        if (messageText || response.status !== "success" || !response.data?.url) {
            toast.error(messageText || "Attachment is unavailable");
            return;
        }
        window.open(response.data.url, "_blank", "noopener,noreferrer");
    };

    const Heading = embedded ? "h2" : "h1";

    return (
        <div className="mx-auto flex max-w-7xl flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <Heading className="flex items-center gap-2 font-display text-2xl font-semibold">
                        <WhatsAppIcon className="size-5 text-primary" />
                        {embedded ? "Message history" : "WhatsApp conversations"}
                    </Heading>
                    <p className="mt-1 text-sm text-muted-foreground">
                        {embedded ? "Review customer conversations and delivery status for this Store." : "Direct customer chats for this Store."}
                    </p>
                </div>
                {!embedded ? (
                    <div className="flex flex-wrap items-center justify-end gap-2">
                        <Button variant="outline" render={<Link to={`/organizations/${organizationId}/stores/${storeId}/whatsapp`} />}>
                            <ArrowLeft className="size-4" />
                            Account settings
                        </Button>
                    </div>
                ) : null}
            </div>

            {conversationsQuery.data?.status === "error" ? (
                <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100">
                    <span>{conversationsQuery.data.message || "WhatsApp is not connected for this Store."}</span>
                    <Button size="sm" variant="outline" onClick={() => void conversationsQuery.refetch()}>
                        <RefreshCw className="size-4" />
                        Retry
                    </Button>
                </div>
            ) : null}
            {accountStatus && accountStatus !== "connected" ? (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100">
                    WhatsApp is {accountStatus.replace("_", " ")}. You can read existing messages, but sending is paused until the Store account is connected.
                </div>
            ) : null}

            <Card className="h-[min(78vh,760px)] min-h-[520px] overflow-hidden border-border/60 bg-card/80 shadow-xl shadow-black/5">
                <CardContent className="grid h-full min-h-0 grid-cols-1 grid-rows-[minmax(170px,34%)_minmax(0,1fr)] p-0 md:grid-cols-[minmax(220px,30%)_1fr] md:grid-rows-1">
                    <aside className="flex min-h-0 flex-col border-b border-border/60 md:border-r md:border-b-0">
                        <div className="space-y-3 border-b border-border/60 px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                                <p className="font-semibold">Inbox</p>
                                <div className="flex items-center gap-1.5">
                                    <Badge variant="secondary" aria-label={`${filteredConversations.length} of ${conversations.length} conversations shown`}>
                                        {filteredConversations.length}{filteredConversations.length !== conversations.length ? ` / ${conversations.length}` : ""}
                                    </Badge>
                                    {unreadMessageCount > 0 ? (
                                        <Badge variant="outline" className="border-primary/30 bg-primary/5 text-primary" aria-label={`${unreadMessageCount} unread messages`}>
                                            {unreadMessageCount} unread
                                        </Badge>
                                    ) : null}
                                </div>
                            </div>
                            <div className="relative">
                                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={conversationSearch}
                                    onChange={(event) => setConversationSearch(event.target.value)}
                                    placeholder="Search name or phone"
                                    aria-label="Search conversations by name or phone"
                                    className="h-9 pl-9 pr-9"
                                />
                                {conversationSearch ? (
                                    <button
                                        type="button"
                                        onClick={() => setConversationSearch("")}
                                        className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
                                        aria-label="Clear conversation search"
                                    >
                                        <X className="size-3.5" />
                                    </button>
                                ) : null}
                            </div>
                        </div>
                        {conversationsQuery.isPending ? (
                            <ConversationListSkeleton />
                        ) : conversations.length === 0 ? (
                            <div className="p-6 text-sm text-muted-foreground">No WhatsApp conversations yet.</div>
                        ) : filteredConversations.length === 0 ? (
                            <div className="p-6 text-sm text-muted-foreground">No conversations match your search.</div>
                        ) : (
                            <div className="min-h-0 flex-1 overflow-y-auto">
                                {filteredConversations.map((conversation) => (
                                    <button
                                        key={conversation.id}
                                        type="button"
                                        aria-pressed={selectedConversationId === conversation.id}
                                        aria-label={`Open conversation with ${conversation.displayName}`}
                                        className={`w-full border-b border-border/40 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${selectedConversationId === conversation.id ? "bg-primary/10" : ""}`}
                                        onClick={() => setSelectedConversationId(conversation.id)}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="truncate font-medium">{conversation.displayName}</p>
                                            {conversation.unreadCount > 0 ? <Badge className="shrink-0 rounded-full">{conversation.unreadCount}</Badge> : null}
                                        </div>
                                        <p className="mt-1 truncate text-xs text-muted-foreground">{conversation.contactPhoneNumber}</p>
                                        <p className="mt-1 text-[11px] text-muted-foreground">{formatWhatsAppTimestamp(conversation.lastMessageAt)}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </aside>

                    <section className="flex min-h-0 min-w-0 flex-col">
                        {!selectedConversation ? (
                            <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground sm:p-8">
                                Select a conversation to view messages.
                            </div>
                        ) : (
                            <>
                                <div className="border-b border-border/60 px-4 py-3 sm:px-5 sm:py-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-semibold sm:text-base">{selectedConversation.displayName}</p>
                                            <p className="text-xs text-muted-foreground">{selectedConversation.contactPhoneNumber}</p>
                                        </div>
                                        {selectedConversation.customerId ? (
                                            <Badge variant="outline">Customer linked</Badge>
                                        ) : (
                                            <Badge variant="secondary">Unmatched</Badge>
                                        )}
                                    </div>
                                </div>

                                {!selectedConversation.customerId ? (
                                    <div className="border-b border-amber-500/20 bg-amber-500/5 px-4 py-3 text-sm">
                                        <p className="font-medium">This number is not linked to a customer.</p>
                                        {customerQuery.isPending ? <p className="mt-1 text-muted-foreground">Looking for an exact phone match...</p> : null}
                                        {!customerQuery.isPending && customerCandidates.length === 0 ? (
                                            <p className="mt-1 text-muted-foreground">Create the customer first, then attach them here.</p>
                                        ) : null}
                                        <div className="mt-2 flex flex-wrap gap-2">
                                            {customerCandidates.map((customer) => (
                                                <Button
                                                    key={customer.id}
                                                    size="sm"
                                                    variant="outline"
                                                    disabled={attachMutation.isPending}
                                                    onClick={() => attachMutation.mutate(customer.id)}
                                                >
                                                    Attach {customer.name}
                                                </Button>
                                            ))}
                                        </div>
                                    </div>
                                ) : null}

                                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-muted/20 p-3 sm:p-4" role="log" aria-label={`Messages with ${selectedConversation.displayName}`}>
                                    {conversationQuery.isPending ? (
                                        <div className="flex h-full items-center justify-center"><Spinner className="size-5 text-primary" /></div>
                                    ) : conversationQuery.data?.status === "error" ? (
                                        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                                            {conversationQuery.data.message || "Conversation could not be loaded."}
                                        </div>
                                    ) : messages.length === 0 ? (
                                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No messages in this conversation.</div>
                                    ) : (
                                        messages.map((message, index) => {
                                            const previousMessage = messages[index - 1];
                                            const dayLabel = formatWhatsAppDayLabel(message.createdAt);
                                            const previousDayLabel = previousMessage ? formatWhatsAppDayLabel(previousMessage.createdAt) : null;
                                            return (
                                                <Fragment key={message.id}>
                                                    {dayLabel !== previousDayLabel ? (
                                                        <div className="flex items-center gap-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                                                            <span className="h-px flex-1 bg-border/60" />
                                                            <span className="flex items-center gap-1"><CalendarDays className="size-3" />{dayLabel}</span>
                                                            <span className="h-px flex-1 bg-border/60" />
                                                        </div>
                                                    ) : null}
                                                    <MessageBubble message={message} onOpenAttachment={openAttachment} openingAttachmentId={openingAttachmentId} />
                                                </Fragment>
                                            );
                                        })
                                    )}
                                </div>

                            </>
                        )}
                    </section>
                </CardContent>
            </Card>
        </div>
    );
};

const MessageBubble = ({
    message,
    onOpenAttachment,
    openingAttachmentId,
}: {
    message: WhatsAppMessageDTO;
    onOpenAttachment: (message: WhatsAppMessageDTO) => void;
    openingAttachmentId: string | null;
}) => {
    const outbound = message.direction === "outbound";
    return (
        <div className={`flex ${outbound ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${outbound ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm border border-border/60 bg-card"}`}>
                {message.body ? <p className="whitespace-pre-wrap break-words">{message.body}</p> : null}
                {message.messageType === "template" ? (
                    <div className="space-y-1.5">
                        <p className="break-words text-[11px] opacity-75">Template{message.templateName ? ` · ${message.templateName}` : " message"}</p>
                        {message.templatePreview ? <TemplateMessagePreview preview={message.templatePreview} /> : null}
                    </div>
                ) : null}
                {message.caption ? <p className="mt-1 whitespace-pre-wrap break-words">{message.caption}</p> : null}
                {message.attachmentFileName ? (
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className={`mt-1 max-w-full justify-start px-1 ${outbound ? "text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" : ""}`}
                        onClick={() => onOpenAttachment(message)}
                        disabled={openingAttachmentId === message.id}
                        aria-label={`Open attachment ${message.attachmentFileName}`}
                    >
                        {openingAttachmentId === message.id ? <Spinner className="size-4" /> : <FileText className="size-4" />}
                        <span className="truncate">{message.attachmentFileName}</span>
                    </Button>
                ) : null}
                <p className={`mt-1 text-[10px] ${outbound ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {formatWhatsAppTimestamp(message.createdAt)}
                    {outbound && message.status ? (
                        <>
                            {" · "}
                            <MessageStatus status={message.status} />
                            {` ${message.status}`}
                        </>
                    ) : null}
                </p>
            </div>
        </div>
    );
};

const MessageStatus = ({ status }: { status: WhatsAppMessageDTO["status"] }) => {
    const Icon = status === "failed"
        ? CircleAlert
        : status === "queued" || status === "sending"
            ? Clock3
            : status === "read" || status === "delivered"
                ? CheckCheck
                : Check;
    const label = status === "queued" ? "Queued" : status === "sending" ? "Sending" : status === "sent" ? "Sent" : status === "delivered" ? "Delivered" : status === "read" ? "Read" : "Failed";
    return (
        <span className={`inline-flex items-center align-[-2px] ${status === "failed" ? "text-red-300" : status === "read" ? "text-sky-200" : ""}`} title={label} aria-label={label}>
            <Icon className="size-3" />
        </span>
    );
};

const TemplateMessagePreview = ({ preview }: { preview: WhatsAppMessageDTO["templatePreview"] }) => {
    if (!preview) return null;
    return (
        <div className="overflow-hidden rounded-xl border border-border/60 bg-card text-card-foreground shadow-sm">
            {preview.header?.type === "image" ? (
                preview.header.url ? (
                    <img
                        src={preview.header.url}
                        alt="WhatsApp template header"
                        className="aspect-[16/9] w-full object-cover"
                        loading="lazy"
                        referrerPolicy="no-referrer"
                    />
                ) : (
                    <TemplateMediaPlaceholder icon={<ImageIcon className="size-5" />} label={preview.header.label} />
                )
            ) : null}
            {preview.header?.type === "document" ? (
                preview.header.url ? (
                    <a
                        href={preview.header.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 border-b border-border/60 px-3 py-2 text-xs font-medium text-primary hover:underline"
                    >
                        <FileText className="size-4 shrink-0" />
                        <span className="truncate">{preview.header.label}</span>
                    </a>
                ) : (
                    <TemplateMediaPlaceholder icon={<FileText className="size-5" />} label={preview.header.label} />
                )
            ) : null}
            {preview.header?.type === "text" ? <p className="border-b border-border/60 px-3 pb-2 pt-3 font-semibold">{preview.header.text}</p> : null}
            <p className="whitespace-pre-wrap break-words px-3 py-3 text-sm">{preview.body}</p>
            {preview.footer ? <p className="whitespace-pre-wrap break-words px-3 pb-2 text-xs text-muted-foreground">{preview.footer}</p> : null}
            {preview.buttons.length > 0 ? (
                <div className="border-t border-border/60">
                    {preview.buttons.map((button, index) => button.url ? (
                        <a
                            key={`${button.type}-${index}`}
                            href={button.url}
                            target="_blank"
                            rel="noreferrer"
                            className="block border-b border-border/60 px-3 py-2 text-center text-xs font-medium text-primary last:border-b-0 hover:underline"
                        >
                            {button.text}
                        </a>
                    ) : (
                        <div key={`${button.type}-${index}`} className="border-b border-border/60 px-3 py-2 text-center text-xs font-medium text-primary last:border-b-0">
                            {button.text}
                        </div>
                    ))}
                </div>
            ) : null}
        </div>
    );
};

const TemplateMediaPlaceholder = ({ icon, label }: { icon: ReactNode; label: string }) => (
    <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-3 py-4 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
    </div>
);

const ConversationListSkeleton = () => (
    <div className="space-y-px p-2" aria-label="Loading conversations">
        {[0, 1, 2, 3].map((item) => (
            <div key={item} className="space-y-2 rounded-lg px-2 py-3">
                <div className="h-4 w-3/5 animate-pulse rounded bg-muted" />
                <div className="h-3 w-4/5 animate-pulse rounded bg-muted" />
                <div className="h-3 w-2/5 animate-pulse rounded bg-muted" />
            </div>
        ))}
    </div>
);

const WhatsAppInboxPage = () => {
    const { organizationId = "", storeId = "" } = useParams();
    return <WhatsAppInboxView organizationId={organizationId} storeId={storeId} />;
};

export default WhatsAppInboxPage;
