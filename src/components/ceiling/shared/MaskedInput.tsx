import * as React from "react";
import { NumericFormat, type NumericFormatProps } from "react-number-format";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n-provider";

export interface MaskedInputProps extends Omit<
  NumericFormatProps,
  "customInput" | "onChange" | "value"
> {
  value?: number | null;
  onChangeValue?: (value: number | undefined) => void;
  formatMode?: "currency" | "percentage" | "numeric";
  currencySymbol?: string;
}

export const MaskedInput = React.forwardRef<HTMLInputElement, MaskedInputProps>(
  ({ value, onChangeValue, formatMode = "numeric", currencySymbol, className, ...props }, ref) => {
    const { locale } = useI18n();

    // Determine separators based on locale
    // In ptBR and es, standard decimal separator is comma (,) and thousand separator is period (.)
    // In English (en), decimal separator is period (.) and thousand separator is comma (,)
    const isEn = locale === "en";
    const thousandSeparator = isEn ? "," : ".";
    const decimalSeparator = isEn ? "." : ",";

    // Determine prefix/suffix
    let prefix = "";
    let suffix = "";

    if (formatMode === "currency") {
      prefix = currencySymbol ? `${currencySymbol} ` : isEn ? "$ " : "R$ ";
    } else if (formatMode === "percentage") {
      suffix = "%";
    }

    return (
      <NumericFormat
        {...props}
        getInputRef={ref}
        customInput={Input}
        className={className}
        value={value ?? ""}
        thousandSeparator={thousandSeparator}
        decimalSeparator={decimalSeparator}
        prefix={prefix}
        suffix={suffix}
        onValueChange={(values) => {
          if (onChangeValue) {
            onChangeValue(values.floatValue);
          }
        }}
        // Remove allowedDecimalSeparators if we want strict decimal separators per locale
        allowedDecimalSeparators={isEn ? [".", ","] : [",", "."]}
        // We do not use valueIsNumericString because we are passing an actual number
      />
    );
  },
);
MaskedInput.displayName = "MaskedInput";
