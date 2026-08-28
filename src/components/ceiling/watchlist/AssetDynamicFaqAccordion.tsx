import { useMemo } from "react";
import { HelpCircle } from "lucide-react";
import type { Asset } from "@/lib/domain";
import type { ValuationResult } from "@/lib/calculations";
import { generateDynamicAssetFaq } from "@/lib/dynamicAssetFaq";
import { useI18n } from "@/lib/i18n-provider";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";

interface Props {
  asset: Asset;
  valuation?: ValuationResult | null;
}

export function AssetDynamicFaqAccordion({ asset, valuation }: Props) {
  const { t, locale } = useI18n();

  const faqItems = useMemo(() => {
    return generateDynamicAssetFaq(asset, valuation, t, locale);
  }, [asset, valuation, t, locale]);

  if (faqItems.length === 0) return null;

  return (
    <div className="rounded-xl border border-border/50 bg-background p-4 sm:p-5 shadow-sm space-y-3">
      <div className="flex items-center gap-2">
        <HelpCircle className="h-4 w-4 text-primary" />
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            {t.assetFaq.title}
          </h3>
          <p className="text-xs text-muted-foreground">
            {t.assetFaq.subtitle}
          </p>
        </div>
      </div>

      <Accordion type="multiple" className="w-full space-y-1">
        {faqItems.map((item) => (
          <AccordionItem
            key={item.id}
            value={item.id}
            className="border border-border/40 rounded-lg px-3 bg-background transition-colors"
          >
            <AccordionTrigger className="text-xs font-medium text-foreground hover:no-underline py-2.5">
              {item.question}
            </AccordionTrigger>
            <AccordionContent className="text-xs text-muted-foreground leading-relaxed pt-1 pb-3">
              {item.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}
