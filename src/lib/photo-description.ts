export function isGenericPhotoDescription(value: string | undefined) {
  const text = value?.trim() ?? "";
  return (
    !text ||
    /^(?:a photograph from our garden|photo(?:graph)?|image|gallery photo)(?:\s+\d+)?[.!]?$/i.test(
      text,
    ) ||
    /^(?:img|dsc|pxl)[_-]?\d[\w-]*(?:\.(?:jpe?g|png|webp|heic))?$/i.test(text)
  );
}

export function photoDescription(alt?: string, caption?: string) {
  if (!isGenericPhotoDescription(alt)) return alt!.trim();
  if (!isGenericPhotoDescription(caption)) return caption!.trim();
  return undefined;
}
