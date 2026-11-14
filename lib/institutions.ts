import { normalize } from "./store/normalize";

export interface Institution {
  id: string;
  name: string;
  kind: string;
  country: string;
  logoUrl?: string;
}

const bankMarks: Record<string, string> = {
  sbi: "sbin", hdfc: "hdfc", icici: "icic",
  axis: "utib", pnb: "punb", kotak: "kkbk",
  barb: "barb", bkid: "bkid", cnrb: "cnrb", cbin: "cbin",
  fdrl: "fdrl", ibkl: "ibkl", idfb: "idfb", idib: "idib",
  ioba: "ioba", indb: "indb", ubin: "ubin", yesb: "yesb",
};

export function institutionLogoUrl(id: string, uploaded: boolean) {
  if (uploaded) return `/api/wallet?institutionLogo=${encodeURIComponent(id)}`;
  const mark = Object.hasOwn(bankMarks, id) ? bankMarks[id] : undefined;
  return mark ? `https://www.finassets.fyi/symbols/svg/${mark}.svg` : undefined;
}

export function institutionKind(type: string) {
  return type === "loan" ? "lender" : type === "investment" ? "investment" : "bank";
}

export function findInstitution(catalog: Institution[], name: string, type: string) {
  return catalog.find((entry) =>
    entry.kind === institutionKind(type) && normalize(entry.name) === normalize(name),
  );
}
