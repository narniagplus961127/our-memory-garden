export const maxPhotoLabels = 20;
export const maxPhotoLabelLength = 40;
const controls = /[\u0000-\u001f\u007f-\u009f]/;
export function normalizePhotoLabels(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length > maxPhotoLabels) return null;
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") return null;
    const label = item.trim();
    if (!label || label.length > maxPhotoLabelLength || controls.test(label))
      return null;
    const key = label.normalize("NFC").toLocaleLowerCase();
    if (!seen.has(key)) {
      labels.push(label);
      seen.add(key);
    }
  }
  return labels;
}
export function photoMetadata(name: unknown, labels: unknown) {
  const normalized = normalizePhotoLabels(labels);
  if (
    typeof name !== "string" ||
    !name.trim() ||
    name.trim().length > 200 ||
    controls.test(name) ||
    !normalized
  )
    return null;
  return { name: name.trim(), labels: normalized };
}
