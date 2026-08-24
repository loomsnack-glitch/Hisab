type GraphErrorBody = {
  error?: {
    message?: unknown;
    type?: unknown;
    code?: unknown;
    error_subcode?: unknown;
    fbtrace_id?: unknown;
  };
};

export type WhatsAppCloudApiFetch = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

export type WhatsAppCloudApiClientOptions = {
  accessToken: string;
  graphVersion: string;
  appId?: string;
  baseUrl?: string;
  fetchImpl?: WhatsAppCloudApiFetch;
  timeoutMs?: number;
};

export type WhatsAppCloudApiRequestOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string> | Array<[string, string]> | Headers;
};

export type WhatsAppCloudMediaUpload = {
  body: Uint8Array;
  mimeType: string;
  fileName: string;
};

export type WhatsAppCloudTemplateDefinition = {
  name: string;
  language: string;
  category: "MARKETING" | "UTILITY" | "AUTHENTICATION";
  components: Array<Record<string, unknown>>;
};

export type WhatsAppCloudTemplateCreateResponse = {
  id?: string;
  status?: string;
  category?: string;
};

export class WhatsAppCloudApiError extends Error {
  readonly status: number | null;
  readonly providerCode: string | null;
  readonly providerSubcode: string | null;
  readonly providerType: string | null;
  readonly fbtraceId: string | null;
  readonly retryable: boolean;
  readonly uncertain: boolean;

  constructor(input: {
    message: string;
    status?: number | null;
    providerCode?: string | null;
    providerSubcode?: string | null;
    providerType?: string | null;
    fbtraceId?: string | null;
    retryable?: boolean;
    uncertain?: boolean;
    cause?: unknown;
  }) {
    super(input.message, { cause: input.cause });
    this.name = "WhatsAppCloudApiError";
    this.status = input.status ?? null;
    this.providerCode = input.providerCode ?? null;
    this.providerSubcode = input.providerSubcode ?? null;
    this.providerType = input.providerType ?? null;
    this.fbtraceId = input.fbtraceId ?? null;
    this.retryable = input.retryable ?? false;
    this.uncertain = input.uncertain ?? false;
  }
}

const asString = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
};

const retryableProviderCodes = new Set([
  "4",
  "80007",
  "130429",
  "131016",
  "131048",
  "131056",
]);

const isRetryableStatus = (
  status: number,
  providerCode?: string | null,
): boolean =>
  status === 408 ||
  status === 425 ||
  status === 429 ||
  status >= 500 ||
  (providerCode !== null &&
    providerCode !== undefined &&
    retryableProviderCodes.has(providerCode));

const graphError = (status: number, body: unknown): WhatsAppCloudApiError => {
  const error = (body as GraphErrorBody | null)?.error;
  const providerCode = asString(error?.code);
  const providerSubcode = asString(error?.error_subcode);
  const message =
    asString(error?.message) ?? "WhatsApp Cloud API request failed";

  return new WhatsAppCloudApiError({
    message,
    status,
    providerCode,
    providerSubcode,
    providerType: asString(error?.type),
    fbtraceId: asString(error?.fbtrace_id),
    retryable: isRetryableStatus(status, providerCode),
  });
};

const normalizePath = (path: string): string => {
  const normalized = path.trim().replace(/^\/+/, "");
  if (!normalized) throw new Error("WhatsApp Cloud API path is required");
  return normalized;
};

const normalizeResourceId = (value: string, label: string): string => {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} is required`);
  return encodeURIComponent(normalized);
};

export class WhatsAppCloudApiClient {
  private readonly accessToken: string;
  private readonly graphVersion: string;
  private readonly appId: string | null;
  private readonly baseUrl: string;
  private readonly fetchImpl: WhatsAppCloudApiFetch;
  private readonly timeoutMs: number;

  constructor(options: WhatsAppCloudApiClientOptions) {
    if (!options.accessToken.trim())
      throw new Error("WhatsApp Cloud API access token is required");
    const graphVersion = options.graphVersion.trim().replace(/^v/i, "v");
    if (!graphVersion)
      throw new Error("WhatsApp Graph API version is required");
    if (!/^v\d+\.\d+$/.test(graphVersion))
      throw new Error("WhatsApp Graph API version must look like v<major>.<minor>");
    if (
      options.timeoutMs !== undefined &&
      (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1)
    ) {
      throw new Error("WhatsApp Cloud API timeout must be a positive integer");
    }

    this.accessToken = options.accessToken.trim();
    this.graphVersion = graphVersion;
    this.appId = options.appId?.trim() || null;
    this.baseUrl = (options.baseUrl ?? "https://graph.facebook.com")
      .trim()
      .replace(/\/+$/, "");
    this.fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
    this.timeoutMs = options.timeoutMs ?? 10_000;
  }

  async requestJson<T>(
    path: string,
    options: WhatsAppCloudApiRequestOptions = {},
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const headers = new Headers(options.headers);
    headers.set("Authorization", `Bearer ${this.accessToken}`);
    if (options.body && !headers.has("Content-Type"))
      headers.set("Content-Type", "application/json");

    const url = `${this.baseUrl}/${this.graphVersion}/${normalizePath(path)}`;
    try {
      let response: Response;
      let text: string;
      try {
        response = await this.fetchImpl(url, {
          ...options,
          headers,
          signal: controller.signal,
        });
        text = await response.text();
      } catch (error) {
        const timedOut = controller.signal.aborted;
        throw new WhatsAppCloudApiError({
          message: timedOut
            ? "WhatsApp Cloud API request timed out"
            : "WhatsApp Cloud API request failed",
          retryable: true,
          uncertain:
            (options.method ?? "GET").toUpperCase() !== "GET" &&
            (options.method ?? "GET").toUpperCase() !== "HEAD",
          cause: error,
        });
      }

      let body: unknown = undefined;
      if (text.trim()) {
        try {
          body = JSON.parse(text);
        } catch {
          if (!response.ok) {
            throw new WhatsAppCloudApiError({
              message: "WhatsApp Cloud API returned an invalid error response",
              status: response.status,
              retryable: isRetryableStatus(response.status),
            });
          }
          throw new WhatsAppCloudApiError({
            message: "WhatsApp Cloud API returned invalid JSON",
            status: response.status,
            retryable: false,
          });
        }
      }

      if (!response.ok) throw graphError(response.status, body);
      return body as T;
    } finally {
      clearTimeout(timeout);
    }
  }

  getBusinessAccount(wabaId: string) {
    return this.requestJson<Record<string, unknown>>(
      normalizeResourceId(wabaId, "WABA ID"),
    );
  }

  getPhoneNumbers(wabaId: string) {
    return this.requestJson<{ data?: Array<Record<string, unknown>> }>(
      `${normalizeResourceId(wabaId, "WABA ID")}/phone_numbers`,
    );
  }

  subscribeBusinessAccount(wabaId: string) {
    return this.requestJson<{ success?: boolean | string }>(
      `${normalizeResourceId(wabaId, "WABA ID")}/subscribed_apps`,
      { method: "POST" },
    );
  }

  getTemplates(wabaId: string): Promise<{ data: Array<Record<string, unknown>> }> {
    return this.getAllGraphPages<Record<string, unknown>>(
      `${normalizeResourceId(wabaId, "WABA ID")}/message_templates`,
    ).then(data => ({ data }));
  }

  createMessageTemplate(
    wabaId: string,
    definition: WhatsAppCloudTemplateDefinition,
  ): Promise<WhatsAppCloudTemplateCreateResponse> {
    return this.requestJson<WhatsAppCloudTemplateCreateResponse>(
      `${normalizeResourceId(wabaId, "WABA ID")}/message_templates`,
      {
        method: "POST",
        body: JSON.stringify(definition),
      },
    );
  }

  editMessageTemplate(
    templateId: string,
    definition: WhatsAppCloudTemplateDefinition,
  ): Promise<{ success?: boolean }> {
    return this.requestJson<{ success?: boolean }>(
      normalizeResourceId(templateId, "template ID"),
      {
        method: "POST",
        body: JSON.stringify(definition),
      },
    );
  }

  deleteMessageTemplate(
    wabaId: string,
    templateName: string,
  ): Promise<{ success?: boolean }> {
    const normalizedName = templateName.trim();
    if (!normalizedName) throw new Error("Template name is required");
    return this.requestJson<{ success?: boolean }>(
      `${normalizeResourceId(wabaId, "WABA ID")}/message_templates?name=${encodeURIComponent(normalizedName)}`,
      { method: "DELETE" },
    );
  }

  private async getAllGraphPages<T>(initialPath: string): Promise<T[]> {
    const pages = new Set<string>();
    const values: T[] = [];
    let path: string | null = initialPath;
    for (let page = 0; path; page += 1) {
      if (page >= 100 || pages.has(path)) {
        throw new WhatsAppCloudApiError({
          message: "WhatsApp Cloud API returned invalid pagination",
          retryable: false,
        });
      }
      pages.add(path);
      const response: { data?: T[]; paging?: { next?: unknown } } = await this.requestJson<{
        data?: T[];
        paging?: { next?: unknown };
      }>(path);
      if (response.data) values.push(...response.data);
      const next: unknown = response.paging?.next;
      if (typeof next !== "string" || !next.trim()) {
        path = null;
        continue;
      }
      const nextUrl: URL = new URL(next);
      const expectedOrigin = new URL(this.baseUrl).origin;
      const versionPrefix = `/${this.graphVersion}/`;
      if (nextUrl.origin !== expectedOrigin || !nextUrl.pathname.startsWith(versionPrefix)) {
        throw new WhatsAppCloudApiError({
          message: "WhatsApp Cloud API returned an invalid pagination URL",
          retryable: false,
        });
      }
      const resourcePath: string = nextUrl.pathname.slice(versionPrefix.length);
      path = resourcePath ? `${resourcePath}${nextUrl.search}` : null;
    }
    return values;
  }

  sendMessage(phoneNumberId: string, payload: Record<string, unknown>) {
    return this.requestJson<{ messages?: Array<{ id?: string }> }>(
      `${normalizeResourceId(phoneNumberId, "Phone Number ID")}/messages`,
      {
        method: "POST",
        body: JSON.stringify(payload),
      },
    );
  }

  async uploadMedia(phoneNumberId: string, media: WhatsAppCloudMediaUpload) {
    const normalizedPhoneNumberId = normalizeResourceId(
      phoneNumberId,
      "Phone Number ID",
    );
    const mimeType = media.mimeType.trim();
    const fileName = media.fileName.trim();
    if (!mimeType || !fileName || media.body.byteLength === 0) {
      throw new WhatsAppCloudApiError({
        message: "WhatsApp Cloud media upload is invalid",
        retryable: false,
      });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const form = new FormData();
    form.set("messaging_product", "whatsapp");
    form.set("type", mimeType);
    form.set(
      "file",
      new Blob([media.body], { type: mimeType }),
      fileName,
    );
    try {
      let response: Response;
      let text: string;
      try {
        response = await this.fetchImpl(
          `${this.baseUrl}/${this.graphVersion}/${normalizedPhoneNumberId}/media`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${this.accessToken}` },
            body: form,
            signal: controller.signal,
          },
        );
        text = await response.text();
      } catch (error) {
        throw new WhatsAppCloudApiError({
          message: controller.signal.aborted
            ? "WhatsApp Cloud media upload timed out"
            : "WhatsApp Cloud media upload failed",
          retryable: true,
          uncertain: true,
          cause: error,
        });
      }

      let body: unknown;
      try {
        body = text.trim() ? JSON.parse(text) : undefined;
      } catch {
        throw new WhatsAppCloudApiError({
          message: "WhatsApp Cloud media upload returned invalid JSON",
          status: response.status,
          retryable: false,
        });
      }
      if (!response.ok) throw graphError(response.status, body);
      const id = asString((body as { id?: unknown } | undefined)?.id);
      if (!id) {
        throw new WhatsAppCloudApiError({
          message: "WhatsApp Cloud media upload returned no media ID",
          status: response.status,
          retryable: false,
        });
      }
      return { id };
    } finally {
      clearTimeout(timeout);
    }
  }

  async uploadTemplateSample(media: WhatsAppCloudMediaUpload) {
    if (!this.appId) {
      throw new WhatsAppCloudApiError({
        message: "WhatsApp Cloud app ID is required for template media uploads",
        retryable: false,
      });
    }
    const mimeType = media.mimeType.trim();
    const fileName = media.fileName.trim();
    if (!mimeType || !fileName || media.body.byteLength === 0) {
      throw new WhatsAppCloudApiError({
        message: "WhatsApp Cloud template media upload is invalid",
        retryable: false,
      });
    }

    const query = new URLSearchParams({
      file_name: fileName,
      file_length: String(media.body.byteLength),
      file_type: mimeType,
    });
    const session = await this.requestJson<{ id?: unknown }>(
      `${normalizeResourceId(this.appId, "App ID")}/uploads?${query.toString()}`,
      { method: "POST" },
    );
    const uploadSessionId = asString(session.id);
    if (!uploadSessionId) {
      throw new WhatsAppCloudApiError({
        message: "WhatsApp Cloud template media upload returned no session ID",
        retryable: false,
      });
    }

    const uploaded = await this.requestJson<{ h?: unknown }>(
      uploadSessionId,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/octet-stream",
          file_offset: "0",
        },
        body: media.body,
      },
    );
    const handle = asString(uploaded.h);
    if (!handle) {
      throw new WhatsAppCloudApiError({
        message: "WhatsApp Cloud template media upload returned no handle",
        retryable: false,
      });
    }
    return { handle };
  }
}
