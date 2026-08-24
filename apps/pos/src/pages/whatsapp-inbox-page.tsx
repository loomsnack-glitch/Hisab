import { useEffect, useMemo, useState } from "react";
import { Link, useOutletContext, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { DeviceSessionDTO, WhatsAppMessageDTO } from "@repo/types";
import {
    attachPosWhatsAppConversationCustomer,
    attachWhatsAppConversationCustomer,
    getCustomers,
    getPosCustomers,
    getPosWhatsAppAttachment,
    getPosWhatsAppConversation,
    getPosWhatsAppConversations,
    getWhatsAppAttachment,
    getWhatsAppConversation,
    getWhatsAppConversations,
} from "@repo/services";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Card, CardContent } from "@repo/ui/components/card";
import { Spinner } from "@repo/ui/components/spinner";
import { ArrowLeft, FileText, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { whatsappKeys } from "@/lib/query-keys";
import type { PosRouteContext } from "@/pages/pos-route-context";
import WhatsAppIcon from "@/components/icons/whatsapp-icon";

type AdminInbox = {
    mode: "admin";
    organizationId: string;
    storeId: string;
};

type DeviceInbox = {
    mode: "device";
    session: DeviceSessionDTO;
};

type InboxViewProps = AdminInbox | DeviceInbox;

const normalizePhone = (phone: string) => phone.replace(/\D/g, "");

const formatTimestamp = (value?: string | Date | null) => {
    if (!value) return "No messages yet";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? "" : date.toLocaleString([], { dateStyle: "short", timeStyle: "short" });
};

const responseMessage = (response: { status: string; message?: string }) =>
    response.status === "success" ? "" : response.message || "WhatsApp request failed";

const WhatsAppInboxView = (props: InboxViewProps) => {
    const queryClient = useQueryClient();
    const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
    const [openingAttachmentId, setOpeningAttachmentId] = useState<string | null>(null);

    const organizationId = props.mode === "admin" ? props.organizationId : props.session.organization.id;
    const storeId = props.mode === "admin" ? props.storeId : props.session.store.id;
    const conversationsKey = whatsappKeys.conversations(organizationId, storeId);
    const conversationKey = selectedConversationId
        ? whatsappKeys.conversation(organizationId, storeId, selectedConversationId)
        : [...conversationsKey, "selected", "none"];

    const conversationsQuery = useQuery({
        queryKey: conversationsKey,
        queryFn: () => props.mode === "admin"
            ? getWhatsAppConversations(organizationId, storeId)
            : getPosWhatsAppConversations(),
        refetchInterval: 5_000,
    });

    const conversations = conversationsQuery.data?.status === "success"
        ? conversationsQuery.data.data?.conversations ?? []
        : [];
    const accountStatus = conversationsQuery.data?.status === "success"
        ? conversationsQuery.data.data?.accountStatus
        : null;
    useEffect(() => {
        if (!selectedConversationId && conversations[0]) {
            setSelectedConversationId(conversations[0].id);
            return;
        }
        if (selectedConversationId && !conversations.some((conversation) => conversation.id === selectedConversationId)) {
            setSelectedConversationId(conversations[0]?.id ?? null);
        }
    }, [conversations, selectedConversationId]);

    const conversationQuery = useQuery({
        queryKey: conversationKey,
        queryFn: () => props.mode === "admin"
            ? getWhatsAppConversation(organizationId, storeId, selectedConversationId!)
            : getPosWhatsAppConversation(selectedConversationId!),
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
        queryFn: () => props.mode === "admin"
            ? getCustomers(organizationId, { search: selectedConversation?.contactPhoneNumber, limit: 20 })
            : getPosCustomers({ search: selectedConversation?.contactPhoneNumber, limit: 20 }),
        enabled: Boolean(selectedConversation && !selectedConversation.customerId),
    });

    const customerCandidates = useMemo(() => {
        if (customerQuery.data?.status !== "success") return [];
        const phone = normalizePhone(selectedConversation?.contactPhoneNumber ?? "");
        return (customerQuery.data.data?.customers ?? []).filter((customer) => normalizePhone(customer.phone ?? "") === phone);
    }, [customerQuery.data, selectedConversation?.contactPhoneNumber]);

    const attachMutation = useMutation({
        mutationFn: (customerId: string) => props.mode === "admin"
            ? attachWhatsAppConversationCustomer(organizationId, storeId, selectedConversationId!, { customerId })
            : attachPosWhatsAppConversationCustomer(selectedConversationId!, { customerId }),
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
        const response = props.mode === "admin"
            ? await getWhatsAppAttachment(organizationId, storeId, selectedConversationId, message.id)
            : await getPosWhatsAppAttachment(selectedConversationId, message.id);
        setOpeningAttachmentId(null);
        const messageText = responseMessage(response);
        if (messageText || response.status !== "success" || !response.data?.url) {
            toast.error(messageText || "Attachment is unavailable");
            return;
        }
        window.open(response.data.url, "_blank", "noopener,noreferrer");
    };

    return (
        <div className="mx-auto flex max-w-7xl flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h1 className="flex items-center gap-2 font-display text-2xl font-semibold">
                        <WhatsAppIcon className="size-5 text-primary" />
                        WhatsApp conversations
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">Direct customer chats for this Store.</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                    {props.mode === "admin" ? (
                        <Button variant="outline" render={<Link to={`/organizations/${organizationId}/stores/${storeId}/whatsapp`} />}>
                            <ArrowLeft className="size-4" />
                            Account settings
                        </Button>
                    ) : null}
                </div>
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
                        <div className="border-b border-border/60 px-4 py-3">
                            <div className="flex items-center justify-between gap-3">
                                <p className="font-semibold">Inbox</p>
                                <Badge variant="secondary">{conversations.length}</Badge>
                            </div>
                        </div>
                        {conversationsQuery.isPending ? (
                            <div className="flex justify-center p-8"><Spinner className="size-5 text-primary" /></div>
                        ) : conversations.length === 0 ? (
                            <div className="p-6 text-sm text-muted-foreground">No WhatsApp conversations yet.</div>
                        ) : (
                            <div className="min-h-0 flex-1 overflow-y-auto">
                                {conversations.map((conversation) => (
                                    <button
                                        key={conversation.id}
                                        type="button"
                                        className={`w-full border-b border-border/40 px-4 py-3 text-left transition-colors hover:bg-muted/50 ${selectedConversationId === conversation.id ? "bg-primary/10" : ""}`}
                                        onClick={() => setSelectedConversationId(conversation.id)}
                                    >
                                        <div className="flex items-start justify-between gap-2">
                                            <p className="truncate font-medium">{conversation.displayName}</p>
                                            {conversation.unreadCount > 0 ? <Badge className="shrink-0 rounded-full">{conversation.unreadCount}</Badge> : null}
                                        </div>
                                        <p className="mt-1 truncate text-xs text-muted-foreground">{conversation.contactPhoneNumber}</p>
                                        <p className="mt-1 text-[11px] text-muted-foreground">{formatTimestamp(conversation.lastMessageAt)}</p>
                                    </button>
                                ))}
                            </div>
                        )}
                    </aside>

                    <section className="flex min-h-0 min-w-0 flex-col">
                        {!selectedConversation ? (
                            <div className="flex flex-1 items-center justify-center p-8 text-center text-sm text-muted-foreground">
                                Select a conversation to view messages.
                            </div>
                        ) : (
                            <>
                                <div className="border-b border-border/60 px-4 py-3">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="truncate font-semibold">{selectedConversation.displayName}</p>
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

                                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-muted/20 p-4">
                                    {conversationQuery.isPending ? (
                                        <div className="flex h-full items-center justify-center"><Spinner className="size-5 text-primary" /></div>
                                    ) : conversationQuery.data?.status === "error" ? (
                                        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                                            {conversationQuery.data.message || "Conversation could not be loaded."}
                                        </div>
                                    ) : messages.length === 0 ? (
                                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No messages in this conversation.</div>
                                    ) : (
                                        messages.map((message) => <MessageBubble key={message.id} message={message} onOpenAttachment={openAttachment} openingAttachmentId={openingAttachmentId} />)
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
                {message.messageType === "template" ? <p className="whitespace-pre-wrap break-words">Template{message.templateName ? ` · ${message.templateName}` : " message"}</p> : null}
                {message.caption ? <p className="mt-1 whitespace-pre-wrap break-words">{message.caption}</p> : null}
                {message.attachmentFileName ? (
                    <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className={`mt-1 max-w-full justify-start px-1 ${outbound ? "text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" : ""}`}
                        onClick={() => onOpenAttachment(message)}
                        disabled={openingAttachmentId === message.id}
                    >
                        {openingAttachmentId === message.id ? <Spinner className="size-4" /> : <FileText className="size-4" />}
                        <span className="truncate">{message.attachmentFileName}</span>
                    </Button>
                ) : null}
                <p className={`mt-1 text-[10px] ${outbound ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                    {formatTimestamp(message.createdAt)}{outbound && message.status ? ` · ${message.status}` : ""}
                </p>
            </div>
        </div>
    );
};

const WhatsAppInboxPage = () => {
    const { organizationId = "", storeId = "" } = useParams();
    return <WhatsAppInboxView mode="admin" organizationId={organizationId} storeId={storeId} />;
};

export const PosWhatsAppInboxPage = () => {
    const { session } = useOutletContext<PosRouteContext>();
    return <WhatsAppInboxView mode="device" session={session} />;
};

export default WhatsAppInboxPage;
