const MAX_ERROR_BODY_BYTES = 8_192;

export async function providerResponseError(provider, response, model) {
  const rawBody = await readLimitedBody(response);
  const parsedBody = parseErrorBody(rawBody);
  const message = sanitizeDiagnostic(parsedBody.message || describeStatus(response.status));
  const error = new Error(`${provider} request failed: ${message}.`);
  error.name = "AiProviderError";
  error.provider = provider;
  error.model = model;
  error.httpStatus = response.status;
  error.providerCode = parsedBody.code || null;
  error.providerReason = parsedBody.reason || null;
  error.providerMessage = message;
  error.requestId = response.headers.get("x-request-id")
    || response.headers.get("request-id")
    || response.headers.get("x-goog-request-id")
    || response.headers.get("x-cloud-trace-context")
    || response.headers.get("traceparent")
    || null;
  error.retryAfterMs = parseRetryAfter(response.headers.get("retry-after"));
  const quotaExceeded = response.status === 429 && (
    parsedBody.reason === "QUOTA_EXCEEDED"
    || /quota|billing|free[_ -]?tier/i.test(message)
  );
  error.retryable = isRetryableStatus(response.status) && !quotaExceeded;
  error.category = quotaExceeded ? "quota_exceeded" : categorizeStatus(response.status);
  return error;
}

export function isRetryableStatus(status) {
  return [408, 409, 425, 429, 500, 502, 503, 504].includes(status);
}

export function categorizeStatus(status) {
  if (status === 401 || status === 403) return "authentication_rejected";
  if (status === 404) return "model_or_endpoint_not_found";
  if (status === 429) return "rate_limited";
  if (status >= 500) return "provider_server_error";
  return "request_rejected";
}

function parseRetryAfter(value) {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds)) return Math.max(0, seconds * 1_000);
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : Math.max(0, timestamp - Date.now());
}

async function readLimitedBody(response) {
  if (!response.body) return "";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let body = "";
  let bytesRead = 0;
  try {
    while (bytesRead < MAX_ERROR_BODY_BYTES) {
      const { value, done } = await reader.read();
      if (done) break;
      const remaining = MAX_ERROR_BODY_BYTES - bytesRead;
      const chunk = value.subarray(0, remaining);
      bytesRead += chunk.byteLength;
      body += decoder.decode(chunk, { stream: bytesRead < MAX_ERROR_BODY_BYTES });
      if (chunk.byteLength < value.byteLength) {
        await reader.cancel();
        break;
      }
    }
    body += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  return body;
}

function parseErrorBody(body) {
  try {
    const parsed = JSON.parse(body);
    const providerError = parsed?.error || parsed;
    const errorInfo = providerError?.details?.find((detail) =>
      String(detail?.["@type"] || "").endsWith("google.rpc.ErrorInfo")
    );
    return {
      code: providerError?.status || providerError?.code || providerError?.type || null,
      reason: errorInfo?.reason || null,
      message: providerError?.message || providerError?.detail || null
    };
  } catch {
    return { code: null, message: body.trim() || null };
  }
}

function sanitizeDiagnostic(value) {
  return String(value)
    .replace(/Bearer\s+[^\s,;]+/gi, "Bearer [redacted]")
    .replace(/\bAIza[0-9A-Za-z_-]{20,}\b/g, "[redacted]")
    .replace(/([?&](?:key|token|api_key|apikey)=)[^&\s]+/gi, "$1[redacted]")
    .replace(/[\r\n\t]+/g, " ")
    .slice(0, 400);
}

function describeStatus(status) {
  if (status === 401 || status === 403) return "authentication rejected";
  if (status === 404) return "model or endpoint not found";
  if (status === 429) return "rate limited";
  if (status >= 500) return "provider server error";
  return "request rejected";
}
