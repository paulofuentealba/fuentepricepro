import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n-provider";

export function CloudCostsCard() {
  const { t } = useI18n();

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.admin.cloudCosts.title}</CardTitle>
        <CardDescription>{t.admin.cloudCosts.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <a
          href="https://console.cloud.google.com/billing"
          target="_blank"
          rel="noopener"
          className="text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80"
        >
          {t.admin.cloudCosts.link}
        </a>
      </CardContent>
    </Card>
  );
}
