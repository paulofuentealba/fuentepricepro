import { useMemo } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { DatePicker } from "@/components/ui/date-picker";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { useI18n } from "@/lib/i18n-provider";
import { toIntlLocale } from "@/lib/i18n";
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
      const monthStr = new Intl.DateTimeFormat(toIntlLocale(locale), { month: "short" }).format(firstTxDateObj);
      const yearStr = firstTxDateObj.getFullYear();
      const capitalizedMonth = monthStr.charAt(0).toUpperCase() + monthStr.slice(1);
      return `${capitalizedMonth}/${yearStr}`;
    } catch {
      return firstTxDateObj.toLocaleDateString();
    }
  }, [firstTxDateObj, locale]);

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
    <DatePicker
      value={value}
      onChange={(date) => date && onChange(date)}
      placeholder={t.form.investingSince}
      disabled={(date) => date > new Date() || date < new Date("1990-01-01")}
      rangeMode="past"
      buttonClassName="text-xs sm:text-sm h-9 px-3"
      className={className}
    />
  );
}
