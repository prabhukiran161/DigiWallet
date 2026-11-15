export const categoryColors = {
  "blue": { label: "Blue", hex: "#1d4ed8" },
  "light-blue": { label: "Light blue", hex: "#4c91dc" },
  "green": { label: "Green", hex: "#167348" },
  "light-green": { label: "Light green", hex: "#4a9b68" },
  "red": { label: "Red", hex: "#be2538" },
  "light-red": { label: "Light red", hex: "#d56663" },
  "yellow": { label: "Yellow", hex: "#a87908" },
  "orange": { label: "Orange", hex: "#c16916" },
  "purple": { label: "Purple", hex: "#6737b4" },
  "light-purple": { label: "Light purple", hex: "#9472cf" },
  "pink": { label: "Pink", hex: "#b72a72" },
  "light-pink": { label: "Light pink", hex: "#d36d9b" },
  "maroon": { label: "Maroon", hex: "#801b42" },
  "teal": { label: "Teal", hex: "#087e83" },
  "gray": { label: "Gray", hex: "#626d7d" },
  "black": { label: "Black", hex: "#1d2530" },
} as const;

export type CategoryColor = keyof typeof categoryColors;

export function isCategoryColor(value: string): value is CategoryColor {
  return Object.hasOwn(categoryColors, value);
}

export function categoryColorHex(color?: string) {
  return color && isCategoryColor(color) ? categoryColors[color].hex : undefined;
}

export function categoryBadgeStyle(color?: string) {
  const hex = categoryColorHex(color);
  return hex ? { color: hex, backgroundColor: `${hex}20` } : undefined;
}
