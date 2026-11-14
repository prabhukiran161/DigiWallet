"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Institution } from "@/lib/institutions";

export const InstitutionCatalog = createContext<Institution[]>([]);

export function useInstitutionCatalog() {
  return useContext(InstitutionCatalog);
}

export function InstitutionMark({ src, children }: { src?: string; children: ReactNode }) {
  const [failed, setFailed] = useState<string>();
  return src && failed !== src ? (
    <img src={src} alt="" width={24} height={24} className="size-6 object-contain"
      loading="lazy" onError={() => setFailed(src)} />
  ) : children;
}
