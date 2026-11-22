export class RequestSizeError extends Error {
  constructor() {
    super("Content is too large.");
  }
}

export async function readBoundedText(request: Request, maxBytes: number) {
  const advertised = request.headers.get("content-length");
  if (advertised && /^\d+$/.test(advertised) && Number(advertised) > maxBytes) {
    void request.body?.cancel().catch(() => {});
    throw new RequestSizeError();
  }
  if (!request.body) return "";
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let size = 0;
  let text = "";
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxBytes) throw new RequestSizeError();
      text += decoder.decode(value, { stream: true });
    }
    return text + decoder.decode();
  } catch (error) {
    // Do not wait for an untrusted sender to finish its request after rejection.
    void reader.cancel().catch(() => {});
    throw error;
  } finally {
    reader.releaseLock();
  }
}
