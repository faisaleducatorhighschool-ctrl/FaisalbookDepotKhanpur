import { useMemo } from "react";
import {
  useGetBusinessConfig,
  getGetBusinessConfigQueryKey,
  useUpdateBusinessConfig,
  useApplyBusinessPack,
  getGetBusinessModulesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import * as Icons from "lucide-react";
import { Star, Check, Download, Layers, Boxes, Tag, Ruler, Package } from "lucide-react";

type Pack = {
  key: string;
  label: string;
  description: string;
  icon: string;
  accentColor: string;
  categories: string[];
  brands: string[];
  units: string[];
  productCount: number;
  dashboardWidgets: string[];
};
type ModuleInfo = { key: string; label: string; group: string };
type Config = {
  activeBusinessTypes: string[];
  primaryBusinessType: string | null;
  enabledModules: Record<string, boolean>;
  appliedPacks: string[];
  packs: Pack[];
  modules: ModuleInfo[];
};

function PackIcon({ name, className }: { name: string; className?: string }) {
  const Cmp = (Icons as Record<string, any>)[name] ?? Icons.Boxes;
  return <Cmp className={className} />;
}

export default function BusinessManager() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useGetBusinessConfig({ query: { queryKey: getGetBusinessConfigQueryKey() } });
  const cfg = data as Config | undefined;

  const updateConfig = useUpdateBusinessConfig();
  const applyPack = useApplyBusinessPack();

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: getGetBusinessConfigQueryKey() });
    qc.invalidateQueries({ queryKey: getGetBusinessModulesQueryKey() });
  };

  const isActive = (key: string) => !!cfg?.activeBusinessTypes.includes(key);
  const isApplied = (key: string) => !!cfg?.appliedPacks.includes(key);
  const isPrimary = (key: string) => cfg?.primaryBusinessType === key;

  const toggleActive = (key: string, next: boolean) => {
    if (!cfg) return;
    const active = new Set(cfg.activeBusinessTypes);
    if (next) active.add(key); else active.delete(key);
    let primary = cfg.primaryBusinessType;
    if (!next && primary === key) primary = [...active][0] ?? null;
    if (next && !primary) primary = key;
    updateConfig.mutate(
      { data: { activeBusinessTypes: [...active], primaryBusinessType: primary } },
      { onSuccess: () => { invalidate(); }, onError: (e: any) => toast({ title: "Update failed", description: String(e?.message ?? e), variant: "destructive" }) },
    );
  };

  const setPrimary = (key: string) => {
    if (!cfg) return;
    const active = new Set(cfg.activeBusinessTypes);
    active.add(key);
    updateConfig.mutate(
      { data: { activeBusinessTypes: [...active], primaryBusinessType: key } },
      { onSuccess: () => { invalidate(); toast({ title: "Primary business updated" }); }, onError: (e: any) => toast({ title: "Update failed", description: String(e?.message ?? e), variant: "destructive" }) },
    );
  };

  const loadSampleData = (key: string, label: string) => {
    applyPack.mutate(
      { key },
      {
        onSuccess: (res: any) => {
          invalidate();
          const a = res?.applied ?? {};
          toast({ title: `${label} loaded`, description: `Added ${a.categories ?? 0} categories, ${a.brands ?? 0} brands, ${a.units ?? 0} units, ${a.products ?? 0} sample products.` });
        },
        onError: (e: any) => toast({ title: "Load failed", description: String(e?.message ?? e), variant: "destructive" }),
      },
    );
  };

  const toggleModule = (key: string, next: boolean) => {
    if (!cfg) return;
    updateConfig.mutate(
      { data: { enabledModules: { ...cfg.enabledModules, [key]: next } } },
      { onSuccess: () => invalidate(), onError: (e: any) => toast({ title: "Update failed", description: String(e?.message ?? e), variant: "destructive" }) },
    );
  };

  const moduleGroups = useMemo(() => {
    const groups: Record<string, ModuleInfo[]> = {};
    for (const m of cfg?.modules ?? []) (groups[m.group] ??= []).push(m);
    return groups;
  }, [cfg?.modules]);

  if (isLoading || !cfg) {
    return <div className="p-6 text-muted-foreground">Loading business settings…</div>;
  }

  const primaryPack = cfg.packs.find((p) => p.key === cfg.primaryBusinessType);

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Business Manager</h1>
          <p className="text-muted-foreground mt-1">Choose your business types, load ready-made master data, and turn modules on or off.</p>
        </div>
        <Badge variant="outline" className="text-sm py-1.5 px-3 gap-2">
          <Layers className="w-4 h-4" />
          {primaryPack ? `Primary: ${primaryPack.label}` : "No primary business set"}
        </Badge>
      </div>

      {/* ── Business Types ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Business Types</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cfg.packs.map((pack) => {
            const active = isActive(pack.key);
            const primary = isPrimary(pack.key);
            const applied = isApplied(pack.key);
            return (
              <Card key={pack.key} className={cn("border-2 transition-colors", active ? "border-primary/50" : "border-border")}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-md flex items-center justify-center shrink-0" style={{ backgroundColor: `${pack.accentColor}1a`, color: pack.accentColor }}>
                        <PackIcon name={pack.icon} className="w-5 h-5" />
                      </div>
                      <div>
                        <CardTitle className="text-base flex items-center gap-2">
                          {pack.label}
                          {primary && <Badge className="gap-1"><Star className="w-3 h-3" /> Primary</Badge>}
                        </CardTitle>
                      </div>
                    </div>
                    <Switch checked={active} onCheckedChange={(v) => toggleActive(pack.key, v)} data-testid={`switch-business-${pack.key}`} />
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground min-h-[2.5rem]">{pack.description}</p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Boxes className="w-3.5 h-3.5" /> {pack.categories.length} categories</span>
                    <span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> {pack.brands.length} brands</span>
                    <span className="flex items-center gap-1"><Ruler className="w-3.5 h-3.5" /> {pack.units.length} units</span>
                    <span className="flex items-center gap-1"><Package className="w-3.5 h-3.5" /> {pack.productCount} samples</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant={applied ? "outline" : "default"}
                      className="gap-1.5"
                      disabled={applyPack.isPending || (pack.categories.length === 0 && pack.brands.length === 0 && pack.units.length === 0 && pack.productCount === 0)}
                      onClick={() => loadSampleData(pack.key, pack.label)}
                      data-testid={`button-load-${pack.key}`}
                    >
                      {applied ? <Check className="w-3.5 h-3.5" /> : <Download className="w-3.5 h-3.5" />}
                      {applied ? "Reload Data" : "Load Sample Data"}
                    </Button>
                    {!primary && (
                      <Button size="sm" variant="ghost" className="gap-1.5" onClick={() => setPrimary(pack.key)} data-testid={`button-primary-${pack.key}`}>
                        <Star className="w-3.5 h-3.5" /> Set Primary
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      <Separator />

      {/* ── Module Manager ─────────────────────────────────────────────── */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Module Manager</h2>
          <p className="text-sm text-muted-foreground">Turn features on or off. Disabled modules are hidden from the sidebar and dashboard.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Object.entries(moduleGroups).map(([group, mods]) => (
            <Card key={group}>
              <CardHeader className="pb-2"><CardTitle className="text-sm">{group}</CardTitle></CardHeader>
              <CardContent className="space-y-1">
                {mods.map((m) => (
                  <div key={m.key} className="flex items-center justify-between py-2">
                    <span className="text-sm">{m.label}</span>
                    <Switch
                      checked={cfg.enabledModules[m.key] ?? true}
                      onCheckedChange={(v) => toggleModule(m.key, v)}
                      data-testid={`switch-module-${m.key}`}
                    />
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
