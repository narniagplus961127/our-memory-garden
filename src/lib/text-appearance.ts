// Shared by the inline editor and server HTML validation. Never accept arbitrary CSS.
export function textColour(value: string): string | null {
  if (/^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value))
    return value.length === 4
      ? "#" + [...value.slice(1)].map((c) => c + c).join("")
      : value.toLowerCase();
  const rgb = /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i.exec(
    value,
  );
  if (!rgb || rgb.slice(1).some((n) => Number(n) > 255)) return null;
  return (
    "#" +
    rgb
      .slice(1)
      .map((n) => Number(n).toString(16).padStart(2, "0"))
      .join("")
  );
}
export function textPixels(
  value: string,
  min: number,
  max: number,
): string | null {
  if (!/^-?\d+(?:\.\d{1,2})?px$/.test(value)) return null;
  const number = Number(value.slice(0, -2));
  return number >= min && number <= max ? number + "px" : null;
}
export function validTextStyle(style: string): boolean {
  const declarations = style.split(";").filter((part) => part.trim());
  const seen = new Set<string>();
  return (
    declarations.length > 0 &&
    declarations.every((part) => {
      const pair = part.split(":");
      if (pair.length !== 2) return false;
      const [name, value] = pair.map((s) => s.trim());
      if (seen.has(name)) return false;
      seen.add(name);
      return name === "color"
        ? !!textColour(value)
        : name === "font-size"
          ? !!textPixels(value, 8, 120)
          : name === "letter-spacing"
            ? !!textPixels(value, -2, 20)
            : false;
    })
  );
}
