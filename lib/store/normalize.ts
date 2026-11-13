export function normalize(name: string): string {
  return name.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase("en");
}

