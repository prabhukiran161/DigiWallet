import { ChevronLeft, ChevronRight } from "lucide-react";

interface MonthPickerProps {
  month: string;
  onChangeMonth: (delta: number) => void;
  onSetMonth: (month: string) => void;
}

export function MonthPicker({
  month,
  onChangeMonth,
  onSetMonth,
}: MonthPickerProps) {
  return (
    <div className="month-picker">
      <button aria-label="Previous month" onClick={() => onChangeMonth(-1)}>
        <ChevronLeft size={16} />
      </button>
      <input
        aria-label="Reporting month"
        type="month"
        value={month}
        onChange={(e) => {
          if (e.target.value) onSetMonth(e.target.value);
        }}
      />
      <button aria-label="Next month" onClick={() => onChangeMonth(1)}>
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

