import type {
    WhatsAppCreateMessageTemplateJSON,
    WhatsAppMessageTemplateDTO,
    WhatsAppMessageTemplateKind,
    WhatsAppUpdateMessageTemplateJSON,
} from "@repo/types";
import { pg } from "@/config/db";
import { snakeToCamel } from "@/utils/case";

const mapTemplate = (row: Record<string, unknown>): WhatsAppMessageTemplateDTO => {
    const mapped = snakeToCamel(row) as Record<string, unknown>;
    return {
        id: String(mapped.id),
        organizationId: String(mapped.organizationId),
        storeId: String(mapped.storeId),
        kind: mapped.kind as WhatsAppMessageTemplateKind,
        name: String(mapped.name),
        body: String(mapped.body),
        isDefault: Boolean(mapped.isDefault),
        isActive: Boolean(mapped.isActive),
        createdBy: String(mapped.createdBy),
        updatedBy: (mapped.updatedBy as string | null | undefined) ?? null,
        createdAt: String(mapped.createdAt),
        updatedAt: String(mapped.updatedAt),
    };
};

const isMissingTemplateTable = (error: unknown): boolean =>
    typeof error === "object" && error !== null && "code" in error && error.code === "42P01";

export const listTemplates = async (
    organizationId: string,
    storeId: string,
    kind?: WhatsAppMessageTemplateKind,
): Promise<WhatsAppMessageTemplateDTO[]> => {
    try {
        const rows = kind
            ? await pg`
                SELECT * FROM whatsapp_message_templates
                WHERE organization_id = ${organizationId} AND store_id = ${storeId} AND kind = ${kind}
                ORDER BY is_default DESC, is_active DESC, LOWER(name) ASC
            `
            : await pg`
                SELECT * FROM whatsapp_message_templates
                WHERE organization_id = ${organizationId} AND store_id = ${storeId}
                ORDER BY kind ASC, is_default DESC, is_active DESC, LOWER(name) ASC
            `;
        return rows.map(row => mapTemplate(row as Record<string, unknown>));
    } catch (error) {
        if (isMissingTemplateTable(error)) return [];
        throw error;
    }
};

export const getTemplate = async (
    organizationId: string,
    storeId: string,
    templateId: string,
): Promise<WhatsAppMessageTemplateDTO | null> => {
    try {
        const [row] = await pg`
            SELECT * FROM whatsapp_message_templates
            WHERE organization_id = ${organizationId} AND store_id = ${storeId} AND id = ${templateId}
            LIMIT 1
        `;
        return row ? mapTemplate(row as Record<string, unknown>) : null;
    } catch (error) {
        if (isMissingTemplateTable(error)) return null;
        throw error;
    }
};

export const getDefaultTemplate = async (
    organizationId: string,
    storeId: string,
    kind: WhatsAppMessageTemplateKind,
): Promise<WhatsAppMessageTemplateDTO | null> => {
    try {
        const [row] = await pg`
            SELECT * FROM whatsapp_message_templates
            WHERE organization_id = ${organizationId}
              AND store_id = ${storeId}
              AND kind = ${kind}
              AND is_default = TRUE
              AND is_active = TRUE
            LIMIT 1
        `;
        return row ? mapTemplate(row as Record<string, unknown>) : null;
    } catch (error) {
        if (isMissingTemplateTable(error)) return null;
        throw error;
    }
};

export const createTemplate = async (
    organizationId: string,
    storeId: string,
    createdBy: string,
    data: WhatsAppCreateMessageTemplateJSON,
): Promise<WhatsAppMessageTemplateDTO> => {
    return pg.begin(async tx => {
        const isDefault = data.isDefault ?? false;
        if (isDefault) {
            await tx`
                UPDATE whatsapp_message_templates
                SET is_default = FALSE, updated_at = NOW(), updated_by = ${createdBy}
                WHERE organization_id = ${organizationId} AND store_id = ${storeId} AND kind = ${data.kind}
            `;
        }
        const [row] = await tx`
            INSERT INTO whatsapp_message_templates (
                organization_id, store_id, kind, name, body, is_default, created_by, updated_by
            ) VALUES (
                ${organizationId}, ${storeId}, ${data.kind}, ${data.name}, ${data.body}, ${isDefault}, ${createdBy}, ${createdBy}
            )
            RETURNING *
        `;
        if (!row) throw new Error("Failed to create WhatsApp message template");
        return mapTemplate(row as Record<string, unknown>);
    });
};

export const updateTemplate = async (
    organizationId: string,
    storeId: string,
    templateId: string,
    updatedBy: string,
    data: WhatsAppUpdateMessageTemplateJSON,
): Promise<WhatsAppMessageTemplateDTO | null> => {
    return pg.begin(async tx => {
        const [existing] = await tx`
            SELECT * FROM whatsapp_message_templates
            WHERE organization_id = ${organizationId} AND store_id = ${storeId} AND id = ${templateId}
            FOR UPDATE
        `;
        if (!existing) return null;

        const kind = String(existing.kind) as WhatsAppMessageTemplateKind;
        const nextIsActive = data.isActive ?? Boolean(existing.is_active);
        const nextIsDefault = nextIsActive && (data.isDefault ?? Boolean(existing.is_default));
        if (nextIsDefault) {
            await tx`
                UPDATE whatsapp_message_templates
                SET is_default = FALSE, updated_at = NOW(), updated_by = ${updatedBy}
                WHERE organization_id = ${organizationId} AND store_id = ${storeId} AND kind = ${kind} AND id <> ${templateId}
            `;
        }

        const [row] = await tx`
            UPDATE whatsapp_message_templates
            SET name = ${data.name ?? String(existing.name)},
                body = ${data.body ?? String(existing.body)},
                is_default = ${nextIsDefault},
                is_active = ${nextIsActive},
                updated_by = ${updatedBy},
                updated_at = NOW()
            WHERE organization_id = ${organizationId} AND store_id = ${storeId} AND id = ${templateId}
            RETURNING *
        `;
        return row ? mapTemplate(row as Record<string, unknown>) : null;
    });
};

export const deleteTemplate = async (
    organizationId: string,
    storeId: string,
    templateId: string,
): Promise<boolean> => {
    const result = await pg`
        DELETE FROM whatsapp_message_templates
        WHERE organization_id = ${organizationId} AND store_id = ${storeId} AND id = ${templateId}
        RETURNING id
    `;
    return result.length > 0;
};
