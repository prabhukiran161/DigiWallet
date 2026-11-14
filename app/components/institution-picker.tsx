"use client";

import { useEffect, useId, useRef, useState } from "react";
import { ChevronDown, Landmark } from "lucide-react";
import { institutionKind, type Institution } from "@/lib/institutions";
import { normalize } from "@/lib/store/normalize";
import { InstitutionMark } from "./institution-brand";

export function InstitutionPicker({ catalog, type, initial = "", disabled }: {
  catalog: Institution[];
  type: string;
  initial?: string;
  disabled: boolean;
}) {
  const id = useId();
  const search = useRef<HTMLInputElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const [value, setValue] = useState(initial);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const term = normalize(query);
  const entries = catalog.filter((entry) => entry.kind === institutionKind(type));
  const selected = entries.find((entry) => normalize(entry.name) === normalize(value));
  const score = (entry: Institution) => {
    const name = normalize(entry.name);
    if (!term || name === term || entry.id === term) return 0;
    if (name.startsWith(term) || name.split(" ").some((word) => word.startsWith(term))) return 1;
    return name.includes(term) ? 2 : 3;
  };
  const matches = entries.filter((entry) => score(entry) < 3).sort((a, b) =>
    score(a) - score(b) || a.name.localeCompare(b.name),
  );

  useEffect(() => {
    if (open) search.current?.focus();
  }, [open]);

  function choose(name: string) {
    setValue(name);
    setOpen(false);
    trigger.current?.focus();
  }

  return (
    <div className="field" onKeyDown={(event) => {
      if (event.key !== "Escape" || !open) return;
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      trigger.current?.focus();
    }}>
      <span className="field-label" id={`${id}-label`}>Institution / provider</span>
      <input type="hidden" name="institution" value={value} />
      <button type="button" ref={trigger} disabled={disabled} aria-expanded={open}
        aria-labelledby={`${id}-label ${id}-value`} aria-controls={id}
        className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 text-left"
        onClick={() => { setQuery(""); setOpen(!open); }}>
        <InstitutionMark src={selected?.logoUrl}><Landmark size={18} /></InstitutionMark>
        <span id={`${id}-value`} className="flex-1">{value || "Choose an institution"}</span>
        <ChevronDown size={16} />
      </button>
      {disabled && <small>Institution editing is locked after 24 hours.</small>}
      {open && (
        <div id={id} className="mt-2 rounded-xl border border-slate-200 bg-white p-2">
          <input ref={search} type="search" aria-label="Search institutions"
            placeholder="Search institutions" maxLength={100} value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              if (matches[0]) choose(matches[0].name);
              else if (term) choose(query.trim());
            }} />
          <ul className="mt-2 max-h-56 overflow-y-auto overscroll-contain">
            {matches.map((entry) => (
              <li key={entry.id}>
                <button type="button" onClick={() => choose(entry.name)}
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-blue-50">
                  <InstitutionMark src={entry.logoUrl}><Landmark size={18} /></InstitutionMark>
                  {entry.name}
                </button>
              </li>
            ))}
            {term && !matches.some((entry) => normalize(entry.name) === term) && (
              <li><button type="button" className="w-full px-2 py-2 text-left text-blue-700"
                onClick={() => choose(query.trim())}>Use “{query.trim()}”</button></li>
            )}
            {!term && !matches.length && <li className="px-2 py-2">No institutions in this part of the catalog.</li>}
            <li><button type="button" className="w-full px-2 py-2 text-left text-slate-600"
              onClick={() => choose("")}>No institution</button></li>
          </ul>
        </div>
      )}
    </div>
  );
}
