export type MessageEventDirection = "inbound" | "outbound";
export type MessageEventSource = "realtime" | "history";

export const classifyMessageEvent = (fromMe: boolean, source: MessageEventSource): {
    direction: MessageEventDirection;
    source: MessageEventSource;
} => ({
    direction: fromMe ? "outbound" : "inbound",
    source,
});
