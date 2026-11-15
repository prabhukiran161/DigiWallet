"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { Institution } from "@/lib/institutions";

export const InstitutionCatalog = createContext<Institution[]>([]);

export function useInstitutionCatalog() {
  return useContext(InstitutionCatalog);
}

export function InstitutionMark({ src, size = 24, children }: { src?: string; size?: number; children: ReactNode }) {
  const [failed, setFailed] = useState<string>();
  return src && failed !== src ? (
    <img src={src} alt="" width={size} height={size} className="object-contain"
      loading="lazy" onError={() => setFailed(src)} />
  ) : children;
}
