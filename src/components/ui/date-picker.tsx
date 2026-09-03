import * as React from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useI18n } from "@/lib/i18n-provider";
import { formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";

export type DatePickerRangeMode = "past" | "future" | "custom";

export interface DatePickerProps {
  /** Value can be Date object, ISO string 'YYYY-MM-DD', timestamp number, or undefined/null */
  value?: Date | string | number | null;
  /** Callback fired when a date is selected. Passes both Date object (or undefined) and ISO string 'YYYY-MM-DD' */
  onChange?: (date: Date | undefined, dateStr: string) => void;
  placeholder?: string;
  disabled?: boolean | ((date: Date) => boolean);
  rangeMode?: DatePickerRangeMode;
  startMonth?: Date;
  endMonth?: Date;
  className?: string;
  buttonClassName?: string;
  id?: string;
  align?: "start" | "center" | "end";
}

function parseToLocalDate(value?: Date | string | number | null): Date | undefined {
  if (!value) return undefined;
  if (value instanceof Date) return isNaN(value.getTime()) ? undefined : value;
  if (typeof value === "number") return new Date(value);
  if (typeof value === "string") {
    // Check YYYY-MM-DD
    const parts = value.split("T")[0].split("-");
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month, day);
      }
    }
    const d = new Date(value);
    return isNaN(d.getTime()) ? undefined : d;
  }
  return undefined;
}

function formatToISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function DatePicker({
  value,
  onChange,
  placeholder,
  disabled,
  rangeMode = "past",
  startMonth: customStartMonth,
  endMonth: customEndMonth,
  className,
  buttonClassName,
  id,
  align = "start",
}: DatePickerProps) {
  const { locale } = useI18n();
  const [open, setOpen] = React.useState(false);

  const selectedDate = React.useMemo(() => parseToLocalDate(value), [value]);

  const currentYear = new Date().getFullYear();

  const startMonth = React.useMemo(() => {
    if (customStartMonth) return customStartMonth;
    if (rangeMode === "future") {
      return new Date(currentYear, 0);
    }
    // past or custom default: 15 years ago
    return new Date(currentYear - 15, 0);
  }, [customStartMonth, rangeMode, currentYear]);

  const endMonth = React.useMemo(() => {
    if (customEndMonth) return customEndMonth;
    if (rangeMode === "future") {
      return new Date(currentYear + 40, 11);
    }
    // past default: current date / month
    return new Date();
  }, [customEndMonth, rangeMode, currentYear]);

  const formattedDisplay = React.useMemo(() => {
    if (!selectedDate) return null;
    try {
      return formatDate(selectedDate, locale, { dateStyle: "medium" });
    } catch {
      return selectedDate.toLocaleDateString();
    }
  }, [selectedDate, locale]);

  const handleSelect = (date: Date | undefined) => {
    if (!onChange) return;
    const isoStr = date ? formatToISO(date) : "";
    onChange(date, isoStr);
    setOpen(false);
  };

  const isDisabledFn = (date: Date): boolean => {
    if (typeof disabled === "boolean") return disabled;
    if (typeof disabled === "function") return disabled(date);
    return false;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          disabled={typeof disabled === "boolean" ? disabled : false}
          className={cn(
            "w-full justify-start text-left font-normal bg-background/60 border border-border/50",
            !selectedDate && "text-muted-foreground",
            buttonClassName,
            className
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-primary shrink-0" />
          {formattedDisplay ? <span>{formattedDisplay}</span> : <span>{placeholder ?? "Select date"}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-background" align={align}>
        <Calendar
          mode="single"
          captionLayout="dropdown"
          startMonth={startMonth}
          endMonth={endMonth}
          selected={selectedDate}
          onSelect={handleSelect}
          disabled={isDisabledFn}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
