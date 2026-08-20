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
  baseUrl?: string;
  fetchImpl?: WhatsAppCloudApiFetch;
  timeoutMs?: number;
};

export type WhatsAppCloudApiRequestOptions = Omit<RequestInit, "headers"> & {
  headers?: Record<string, string> | Array<[string, string]> | Headers;
};

export class WhatsAppCloudApiError extends Error {
  readonly status: number | null;
  readonly providerCode: string | null;
  readonly providerSubcode: string | null;
  readonly providerType: string | null;
  readonly fbtraceId: string | null;
  readonly retryable: boolean;

  constructor(input: {
    message: string;
    status?: number | null;
    providerCode?: string | null;
    providerSubcode?: string | null;
    providerType?: string | null;
    fbtraceId?: string | null;
    retryable?: boolean;
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
  }
}

const asString = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
};

const isRetryableStatus = (status: number): boolean =>
  status === 408 || status === 425 || status === 429 || status >= 500;

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
    retryable: isRetryableStatus(status),
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
      throw new Error("WhatsApp Graph API version must look like v23.0");
    if (
      options.timeoutMs !== undefined &&
      (!Number.isInteger(options.timeoutMs) || options.timeoutMs < 1)
    ) {
      throw new Error("WhatsApp Cloud API timeout must be a positive integer");
    }

    this.accessToken = options.accessToken.trim();
    this.graphVersion = graphVersion;
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

  getTemplates(wabaId: string) {
    return this.requestJson<{ data?: Array<Record<string, unknown>> }>(
      `${normalizeResourceId(wabaId, "WABA ID")}/message_templates`,
    );
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
}
