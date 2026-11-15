export const customEmbedCodeLimit = 32000;
export const customEmbedMinHeight = 100;
export const customEmbedMaxHeight = 1200;

// This policy precedes all author HTML. The iframe sandbox is a separate
// boundary and gives the document an opaque origin even when scripts run.
const embedPolicy = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  "img-src data: blob:",
  "media-src data: blob:",
  "font-src data:",
  "base-uri 'none'",
  "form-action 'none'",
].join("; ");

export function customEmbedDocument(code: string) {
  return `<!doctype html><html><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="referrer" content="no-referrer">
<meta http-equiv="Content-Security-Policy" content="${embedPolicy}">
<style>body{margin:0;font:inherit}html{font:16px system-ui,sans-serif}*,*::before,*::after{box-sizing:border-box}</style>
</head><body>${code}</body></html>`;
}
