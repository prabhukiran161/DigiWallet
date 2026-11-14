"use client";

import { useLayoutEffect, useRef, useState, type ComponentProps } from "react";

type AmountInputProps = Omit<ComponentProps<"input">,
  "type" | "inputMode" | "value" | "defaultValue" | "onChange" | "pattern"> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
};

function groupAmount(value: string) {
  const [whole, fraction] = value.split(".");
  const grouped = whole.replace(/\B(?=(?:\d{2})*\d{3}$)/g, ",");
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

export function AmountInput({
  value, defaultValue = "", onValueChange, name, disabled, placeholder = "0.00", ...props
}: AmountInputProps) {
  const [draft, setDraft] = useState(defaultValue);
  const input = useRef<HTMLInputElement>(null);
  const caret = useRef<number | null>(null);
  const raw = value ?? draft.replace(/\.$/, "");
  const display = groupAmount(draft.replace(/\.$/, "") === raw ? draft : raw);

  useLayoutEffect(() => {
    if (caret.current !== null) {
      input.current?.setSelectionRange(caret.current, caret.current);
      caret.current = null;
    }
  });

  return (
    <>
      <input {...props} ref={input} type="text" inputMode="decimal" disabled={disabled}
        placeholder={placeholder} value={display}
        onFocus={(event) => {
          if (!props.readOnly && /^0(?:\.0{1,2})?$/.test(display)) event.currentTarget.select();
          props.onFocus?.(event);
        }}
        onChange={(event) => {
          const field = event.currentTarget;
          let typed = field.value.replace(/[,\s]/g, "");
          if (!/^\d*(?:\.\d{0,2})?$/.test(typed)) return;
          let remaining = field.value.slice(field.selectionStart ?? field.value.length)
            .replace(/[,\s]/g, "").length;
          // Deleting a separator should also delete the digit beside it.
          const edit = event.nativeEvent as InputEvent;
          if (typed === display.replace(/,/g, "") && field.value.length < display.length) {
            const boundary = typed.length - remaining;
            const digit = edit.inputType === "deleteContentBackward" ? boundary - 1
              : edit.inputType === "deleteContentForward" ? boundary : -1;
            if (digit >= 0 && /\d/.test(typed[digit] ?? "")) {
              typed = typed.slice(0, digit) + typed.slice(digit + 1);
              if (digit === boundary) remaining--;
            }
          }
          const next = typed.replace(/^\./, "0.").replace(/^0+(?=\d)/, "");
          const formatted = groupAmount(next);
          let position = formatted.length;
          while (position > 0 && remaining > 0) {
            if (formatted[--position] !== ",") remaining--;
          }
          if (formatted === display) {
            field.value = display;
            field.setSelectionRange(position, position);
          } else {
            caret.current = position;
          }
          setDraft(next);
          onValueChange?.(next.replace(/\.$/, ""));
        }} />
      {name && <input type="hidden" name={name} value={raw} disabled={disabled} />}
    </>
  );
}
