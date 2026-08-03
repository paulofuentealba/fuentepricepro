import { useMemo } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { useI18n } from "@/lib/i18n-provider";
import { cn } from "@/lib/utils";

export interface InvestingSinceFieldProps {
  value: number | undefined;
  onChange: (date: Date) => void;
  firstTransactionDate: number | null;
  className?: string;
}

export function InvestingSinceField({
  value,
  onChange,
  firstTransactionDate,
  className,
}: InvestingSinceFieldProps) {
  const { t, locale } = useI18n();

  const isReadOnly = firstTransactionDate != null;

  const firstTxDateObj = useMemo(() => {
    if (firstTransactionDate == null) return null;
    return new Date(firstTransactionDate);
  }, [firstTransactionDate]);

  const formattedFirstTxDate = useMemo(() => {
    if (!firstTxDateObj) return "";
    try {
      const monthStr = new Intl.DateTimeFormat(locale, { month: "short" }).format(firstTxDateObj);
      const yearStr = firstTxDateObj.getFullYear();
      const capitalizedMonth = monthStr.charAt(0).toUpperCase() + monthStr.slice(1);
      return `${capitalizedMonth}/${yearStr}`;
    } catch {
      return firstTxDateObj.toLocaleDateString();
    }
  }, [firstTxDateObj, locale]);

  const selectedDate = useMemo(() => {
    if (value == null) return undefined;
    return new Date(value);
  }, [value]);

  const formattedSelectedDate = useMemo(() => {
    if (!selectedDate) return null;
    try {
      return new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(selectedDate);
    } catch {
      return selectedDate.toLocaleDateString();
    }
  }, [selectedDate, locale]);

  if (isReadOnly) {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1.5 h-9 px-3 rounded-md border border-border/50 bg-background/60 text-xs sm:text-sm font-medium text-foreground",
          className,
        )}
      >
        <CalendarIcon className="h-4 w-4 text-primary shrink-0" />
        <span>{formattedFirstTxDate}</span>
        <InfoTooltip content={t.form.investingSinceReadOnlyHint} />
      </div>
    );
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "justify-start text-left font-normal bg-background/60 border border-border/50 text-xs sm:text-sm h-9 px-3",
            !selectedDate && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-primary shrink-0" />
          {formattedSelectedDate ? (
            <span>{formattedSelectedDate}</span>
          ) : (
            <span>{t.form.investingSince}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 bg-background" align="start">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={(date) => date && onChange(date)}
          disabled={(date) => date > new Date() || date < new Date("1990-01-01")}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
