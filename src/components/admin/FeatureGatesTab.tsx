import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useI18n } from "@/lib/i18n-provider";
import { useAdminIdToken } from "@/lib/admin/useAdminIdToken";
import { getFeatureGatesFn, updateFeatureGatesFn } from "@/lib/api/admin";
import { DEFAULT_FEATURE_GATES, BOOLEAN_FEATURE_GATE_KEYS, type FeatureGatesConfig } from "@/lib/featureGates";

const FREE_ASSET_LIMIT_MIN = 1;
const FREE_ASSET_LIMIT_MAX = 50;
const FREE_ASSET_LIMIT_FALLBACK = 20;

type BooleanGateKey = (typeof BOOLEAN_FEATURE_GATE_KEYS)[number];

export function FeatureGatesTab() {
  const { t } = useI18n();
  const getIdToken = useAdminIdToken();

  const [gates, setGates] = useState<FeatureGatesConfig | null>(null);
  const [savedGates, setSavedGates] = useState<FeatureGatesConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const idToken = await getIdToken();
        const result = await getFeatureGatesFn({ data: { idToken } });
        if (cancelled) return;
        setGates(result);
        setSavedGates(result);
      } catch (error) {
        console.error("[FeatureGatesTab] load failed:", error);
        if (!cancelled) toast.error(t.admin.featureGates.loadFailed);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [getIdToken, t]);

  function toggleGate(key: BooleanGateKey, value: boolean) {
    setGates((prev) => (prev ? { ...prev, [key]: value } : prev));
  }

  function setFreeAssetLimit(value: number) {
    setGates((prev) => (prev ? { ...prev, freeAssetLimit: value } : prev));
  }

  async function handleSave() {
    if (!gates) return;
    setSaving(true);
    const previous = savedGates;
    try {
      const idToken = await getIdToken();
      await updateFeatureGatesFn({ data: { idToken, gates } });
      setSavedGates(gates);
      toast.success(t.admin.featureGates.saved);
    } catch (error) {
      console.error("[FeatureGatesTab] save failed:", error);
      // Rollback the optimistic UI to the last known-good server state.
      setGates(previous);
      toast.error(t.admin.featureGates.saveFailed);
    } finally {
      setSaving(false);
    }
  }

  const gateRows: Array<{ key: BooleanGateKey; label: string; desc: string }> = [
    { key: "cashflowUnlocked", label: t.admin.featureGates.cashflowUnlocked, desc: t.admin.featureGates.cashflowUnlockedDesc },
    { key: "smartAllocationUnlocked", label: t.admin.featureGates.smartAllocationUnlocked, desc: t.admin.featureGates.smartAllocationUnlockedDesc },
    { key: "customTaxUnlocked", label: t.admin.featureGates.customTaxUnlocked, desc: t.admin.featureGates.customTaxUnlockedDesc },
    { key: "sliderUnlocked", label: t.admin.featureGates.sliderUnlocked, desc: t.admin.featureGates.sliderUnlockedDesc },
    { key: "strategiesUnlocked", label: t.admin.featureGates.strategiesUnlocked, desc: t.admin.featureGates.strategiesUnlockedDesc },
  ];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  const effectiveGates = gates ?? DEFAULT_FEATURE_GATES;
  const displayLimit = Number.isFinite(effectiveGates.freeAssetLimit)
    ? Math.min(Math.max(effectiveGates.freeAssetLimit as number, FREE_ASSET_LIMIT_MIN), FREE_ASSET_LIMIT_MAX)
    : FREE_ASSET_LIMIT_FALLBACK;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.admin.featureGates.title}</CardTitle>
        <CardDescription>{t.admin.featureGates.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {gateRows.map((row) => (
          <div
            key={row.key}
            className="flex items-center justify-between gap-4 border-b border-border/50 py-4 last:border-b-0"
          >
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold">{row.label}</div>
              <div className="text-xs text-muted-foreground">{row.desc}</div>
            </div>
            <Switch
              checked={Boolean(effectiveGates[row.key])}
              onCheckedChange={(checked) => toggleGate(row.key, checked)}
              aria-label={row.label}
            />
          </div>
        ))}

        <div className="pt-4">
          <div className="text-sm font-semibold">{t.admin.featureGates.freeAssetLimit}</div>
          <div className="mb-4 text-xs text-muted-foreground">{t.admin.featureGates.freeAssetLimitDesc}</div>
          <div className="flex items-center gap-4">
            <Slider
              min={FREE_ASSET_LIMIT_MIN}
              max={FREE_ASSET_LIMIT_MAX}
              step={1}
              value={[displayLimit]}
              onValueChange={([value]) => setFreeAssetLimit(value)}
              aria-label={t.admin.featureGates.freeAssetLimit}
            />
            <div className="min-w-12 rounded-md border border-border/50 bg-card px-3 py-1.5 text-center font-semibold tabular-nums">
              {displayLimit}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-6">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? t.common.saving : t.admin.featureGates.save}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
