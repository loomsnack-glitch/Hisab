import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    createWhatsAppCloudTemplateBinding,
    getWhatsAppCloudTemplateBindings,
    getWhatsAppCloudTemplates,
    getWhatsAppMessageTemplates,
    syncWhatsAppCloudTemplates,
} from "@repo/services";
import type { WhatsAppCloudAccountSnapshot, WhatsAppMessageTemplateKind } from "@repo/types";
import { Badge } from "@repo/ui/components/badge";
import { Button } from "@repo/ui/components/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@repo/ui/components/select";
import { AlertCircle, CheckCircle2, Link2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { whatsappKeys } from "@/lib/query-keys";

export type WhatsAppCloudAccountOption = {
    id: string;
    phoneNumber: string;
    snapshot: WhatsAppCloudAccountSnapshot;
};

type Props = {
    organizationId: string;
    storeId: string;
    accounts: WhatsAppCloudAccountOption[];
};

const kinds: Array<{ value: WhatsAppMessageTemplateKind; label: string }> = [
    { value: "bill", label: "Bill" },
    { value: "due_reminder", label: "Due reminder" },
    { value: "promotion", label: "Promotion" },
];

const WhatsAppCloudTemplateManager = ({ organizationId, storeId, accounts }: Props) => {
    const queryClient = useQueryClient();
    const [accountId, setAccountId] = useState(accounts[0]?.id ?? "");
    const [kind, setKind] = useState<WhatsAppMessageTemplateKind>("bill");
    const [localTemplateId, setLocalTemplateId] = useState("");
    const [cloudTemplateId, setCloudTemplateId] = useState("");
    const [isDefault, setIsDefault] = useState(true);
    const account = accounts.find(item => item.id === accountId) ?? accounts[0];
    const internalBusinessAccountId = account?.snapshot.whatsappBusinessAccountId ?? "";

    useEffect(() => {
        if (!accounts.some(item => item.id === accountId)) setAccountId(accounts[0]?.id ?? "");
    }, [accounts, accountId]);

    const localQuery = useQuery({
        queryKey: whatsappKeys.templates(organizationId, storeId, kind),
        queryFn: () => getWhatsAppMessageTemplates(organizationId, storeId, kind),
        enabled: Boolean(organizationId && storeId),
    });
    const cloudQuery = useQuery({
        queryKey: whatsappKeys.cloudTemplates(organizationId, accountId),
        queryFn: () => getWhatsAppCloudTemplates(organizationId, accountId),
        enabled: Boolean(organizationId && accountId),
    });
    const bindingsQuery = useQuery({
        queryKey: [whatsappKeys.all, "cloud-bindings", organizationId, storeId, internalBusinessAccountId],
        queryFn: () => getWhatsAppCloudTemplateBindings(organizationId, storeId, internalBusinessAccountId),
        enabled: Boolean(organizationId && storeId && internalBusinessAccountId),
    });
    const localTemplates = localQuery.data?.status === "success" ? localQuery.data.data?.templates ?? [] : [];
    const approvedCloudTemplates = useMemo(
        () => (cloudQuery.data?.status === "success" ? cloudQuery.data.data?.templates ?? [] : []).filter(template => template.status === "approved"),
        [cloudQuery.data],
    );
    const bindings = bindingsQuery.data?.status === "success" ? bindingsQuery.data.data?.bindings ?? [] : [];

    useEffect(() => {
        setLocalTemplateId(current => localTemplates.some(template => template.id === current) ? current : localTemplates.find(template => template.isDefault)?.id ?? localTemplates[0]?.id ?? "");
    }, [localTemplates]);
    useEffect(() => {
        setCloudTemplateId(current => approvedCloudTemplates.some(template => template.id === current) ? current : approvedCloudTemplates[0]?.id ?? "");
    }, [approvedCloudTemplates]);

    const refreshBindings = () => queryClient.invalidateQueries({ queryKey: [whatsappKeys.all, "cloud-bindings", organizationId, storeId, internalBusinessAccountId] });
    const syncMutation = useMutation({
        mutationFn: () => syncWhatsAppCloudTemplates(organizationId, accountId),
        onSuccess: response => {
            if (response.status !== "success") toast.error(response.message);
            else {
                queryClient.invalidateQueries({ queryKey: whatsappKeys.cloudTemplates(organizationId, accountId) });
                toast.success("Meta templates synchronized");
            }
        },
        onError: (error: { message?: string }) => toast.error(error.message ?? "Unable to synchronize Meta templates"),
    });
    const bindMutation = useMutation({
        mutationFn: () => createWhatsAppCloudTemplateBinding(organizationId, storeId, {
            localTemplateId,
            cloudTemplateId,
            whatsappBusinessAccountId: internalBusinessAccountId,
            kind,
            isDefault,
        }),
        onSuccess: response => {
            if (response.status !== "success") toast.error(response.message);
            else {
                refreshBindings();
                toast.success(`${kinds.find(item => item.value === kind)?.label ?? "Template"} Cloud binding saved`);
            }
        },
        onError: (error: { message?: string }) => toast.error(error.message ?? "Unable to save Cloud template binding"),
    });

    if (accounts.length === 0) {
        return <div className="rounded-xl border border-dashed border-border/70 bg-muted/10 p-4 text-sm text-muted-foreground">Assign a connected Cloud account to this Store before mapping Meta templates.</div>;
    }

    return <div className="space-y-4 rounded-xl border border-border/60 bg-background/50 p-3 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
                <p className="text-sm font-semibold">Meta Cloud templates</p>
                <p className="text-xs leading-relaxed text-muted-foreground">Sync approved Meta templates, then assign one to each Store message type.</p>
            </div>
            <Button type="button" variant="outline" size="sm" className="rounded-xl" disabled={syncMutation.isPending || !accountId} onClick={() => syncMutation.mutate()}>
                {syncMutation.isPending ? <RefreshCw className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Sync Meta
            </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {accounts.length > 1 ? <Select value={accountId} onValueChange={setAccountId}><SelectTrigger className="rounded-xl" aria-label="Cloud account"><SelectValue placeholder="Cloud account" /></SelectTrigger><SelectContent>{accounts.map(item => <SelectItem key={item.id} value={item.id}>{item.phoneNumber}</SelectItem>)}</SelectContent></Select> : <div className="flex h-10 items-center gap-2 rounded-xl border border-border/60 px-3 text-sm"><Link2 className="size-4 text-primary" />{account?.phoneNumber}</div>}
            <Select value={kind} onValueChange={value => setKind(value as WhatsAppMessageTemplateKind)}><SelectTrigger className="rounded-xl" aria-label="Message type"><SelectValue /></SelectTrigger><SelectContent>{kinds.map(item => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent></Select>
            <Select value={localTemplateId} onValueChange={setLocalTemplateId}><SelectTrigger className="rounded-xl" aria-label="Local template"><SelectValue placeholder="Local template" /></SelectTrigger><SelectContent>{localTemplates.map(template => <SelectItem key={template.id} value={template.id}>{template.name}{template.isDefault ? " · Default" : ""}</SelectItem>)}</SelectContent></Select>
            <Select value={cloudTemplateId} onValueChange={setCloudTemplateId}><SelectTrigger className="rounded-xl" aria-label="Approved Meta template"><SelectValue placeholder="Approved Meta template" /></SelectTrigger><SelectContent>{approvedCloudTemplates.map(template => <SelectItem key={template.id} value={template.id}>{template.name} · {template.languageCode}</SelectItem>)}</SelectContent></Select>
        </div>

        <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/70 p-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-start gap-2 text-sm"><input className="mt-1" type="checkbox" checked={isDefault} onChange={event => setIsDefault(event.target.checked)} /><span>Use this binding as the Store default for {kinds.find(item => item.value === kind)?.label.toLowerCase()}</span></label>
            <Button type="button" className="rounded-xl" disabled={bindMutation.isPending || !localTemplateId || !cloudTemplateId || !internalBusinessAccountId} onClick={() => bindMutation.mutate()}>{bindMutation.isPending ? "Saving…" : "Save binding"}</Button>
        </div>

        {cloudQuery.isError || cloudQuery.data?.status === "error" ? <p className="flex items-center gap-2 text-xs text-destructive"><AlertCircle className="size-4" />Meta templates could not be loaded. Check the Cloud account and try Sync Meta.</p> : null}
        {!cloudQuery.isPending && approvedCloudTemplates.length === 0 ? <p className="text-xs text-muted-foreground">No approved Meta templates are available yet. Submit/approve a template in Meta, then synchronize again.</p> : null}
        {bindings.length > 0 ? <div className="space-y-2"><p className="text-xs font-semibold text-muted-foreground">Current Store bindings</p>{bindings.filter(binding => binding.isActive).map(binding => <div key={binding.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/60 px-3 py-2 text-xs"><span>{kinds.find(item => item.value === binding.kind)?.label ?? binding.kind}</span><span className="flex items-center gap-1.5 text-muted-foreground"><CheckCircle2 className="size-3.5 text-emerald-600" />Mapped</span></div>)}</div> : null}
    </div>;
};

export default WhatsAppCloudTemplateManager;
