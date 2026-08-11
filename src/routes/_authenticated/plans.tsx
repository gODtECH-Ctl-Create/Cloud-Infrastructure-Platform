import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { formatHours, formatMoney, fromMinor, toMinor } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/plans")({
  head: () => ({
    meta: [
      { title: "Plans & Hourly Rates — Waste to Work Console" },
      {
        name: "description",
        content:
          "Configure Waste to Work subscription plans, weekly hour allowances, rollover caps and per-branch hourly rates without touching code.",
      },
      { property: "og:title", content: "Plans & Hourly Rates — Waste to Work Console" },
      {
        property: "og:description",
        content: "Pricing is configuration: adjust plans, rollover caps and branch rate overrides.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Plans,
});

const emptyPlan = {
  name: "",
  description: "",
  price: "",
  weekly_hours: "",
  rollover_enabled: true,
  max_rollover_hours: "",
  max_authorized_users: "0",
  overage_rate: "",
};

const emptyRate = {
  name: "",
  branch_id: "all",
  category: "walk_in" as "walk_in" | "subscriber",
  rate_per_hour: "",
  minimum_minutes: "0",
};

function Plans() {
  const queryClient = useQueryClient();
  const [planForm, setPlanForm] = useState(emptyPlan);
  const [rateForm, setRateForm] = useState(emptyRate);
  const [planOpen, setPlanOpen] = useState(false);
  const [rateOpen, setRateOpen] = useState(false);

  const branches = useQuery({
    queryKey: ["branches-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("branches").select("id, name").order("name");
      if (error) throw error;
      return data;
    },
  });

  const plans = useQuery({
    queryKey: ["plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .order("price_minor");
      if (error) throw error;
      return data;
    },
  });

  const rates = useQuery({
    queryKey: ["rates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pricing_rates")
        .select("*, branches(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const createPlan = useMutation({
    mutationFn: async () => {
      if (!planForm.name.trim()) throw new Error("Plan name is required");
      const { error } = await supabase.from("subscription_plans").insert({
        name: planForm.name.trim(),
        description: planForm.description.trim() || null,
        price_minor: toMinor(planForm.price),
        weekly_hours: Number(planForm.weekly_hours || 0),
        rollover_enabled: planForm.rollover_enabled,
        max_rollover_hours: Number(planForm.max_rollover_hours || 0),
        max_authorized_users: Number(planForm.max_authorized_users || 0),
        overage_rate_minor: planForm.overage_rate ? toMinor(planForm.overage_rate) : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plan created");
      setPlanForm(emptyPlan);
      setPlanOpen(false);
      queryClient.invalidateQueries({ queryKey: ["plans"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const togglePlan = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("subscription_plans")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["plans"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const createRate = useMutation({
    mutationFn: async () => {
      if (!rateForm.name.trim()) throw new Error("Rate name is required");
      const { error } = await supabase.from("pricing_rates").insert({
        name: rateForm.name.trim(),
        branch_id: rateForm.branch_id === "all" ? null : rateForm.branch_id,
        category: rateForm.category,
        rate_per_hour_minor: toMinor(rateForm.rate_per_hour),
        minimum_minutes: Number(rateForm.minimum_minutes || 0),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rate saved");
      setRateForm(emptyRate);
      setRateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["rates"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleRate = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("pricing_rates").update({ is_active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["rates"] }),
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <AppShell>
      <div>
        <h1 className="text-3xl font-semibold">Plans & rates</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pricing is configuration, never code. Branch-specific rates override the global default
          for the same customer category.
        </p>
      </div>

      <section className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">Subscription plans</h2>
          <Dialog open={planOpen} onOpenChange={setPlanOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" /> New plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>New subscription plan</DialogTitle>
                <DialogDescription>
                  Weekly hours reset every Monday; unused hours roll over up to the cap.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Field label="Plan name">
                  <Input
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  />
                </Field>
                <Field label="Description">
                  <Textarea
                    value={planForm.description}
                    onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Price (₦)">
                    <Input
                      type="number"
                      min={0}
                      value={planForm.price}
                      onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                    />
                  </Field>
                  <Field label="Weekly hours">
                    <Input
                      type="number"
                      min={0}
                      step="0.5"
                      value={planForm.weekly_hours}
                      onChange={(e) => setPlanForm({ ...planForm, weekly_hours: e.target.value })}
                    />
                  </Field>
                  <Field label="Max rollover hours">
                    <Input
                      type="number"
                      min={0}
                      step="0.5"
                      value={planForm.max_rollover_hours}
                      onChange={(e) =>
                        setPlanForm({ ...planForm, max_rollover_hours: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Max authorized users">
                    <Input
                      type="number"
                      min={0}
                      value={planForm.max_authorized_users}
                      onChange={(e) =>
                        setPlanForm({ ...planForm, max_authorized_users: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Overage rate per hour (₦)">
                    <Input
                      type="number"
                      min={0}
                      value={planForm.overage_rate}
                      onChange={(e) => setPlanForm({ ...planForm, overage_rate: e.target.value })}
                    />
                  </Field>
                </div>
                <div className="flex items-center justify-between rounded-lg border border-border p-3">
                  <Label htmlFor="rollover">Rollover enabled</Label>
                  <Switch
                    id="rollover"
                    checked={planForm.rollover_enabled}
                    onCheckedChange={(v) => setPlanForm({ ...planForm, rollover_enabled: v })}
                  />
                </div>
                <Button
                  className="w-full"
                  disabled={createPlan.isPending}
                  onClick={() => createPlan.mutate()}
                >
                  Create plan
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(plans.data ?? []).map((p) => (
            <article key={p.id} className="panel p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-lg font-semibold">{p.name}</h3>
                  <p className="code-id text-primary">{formatMoney(p.price_minor)}</p>
                </div>
                <Switch
                  checked={p.is_active}
                  onCheckedChange={(v) => togglePlan.mutate({ id: p.id, is_active: v })}
                  aria-label="Plan active"
                />
              </div>
              {p.description ? (
                <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
              ) : null}
              <dl className="mt-4 space-y-1 text-sm">
                <Row label="Weekly hours" value={formatHours(Number(p.weekly_hours))} />
                <Row
                  label="Rollover"
                  value={
                    p.rollover_enabled
                      ? `up to ${formatHours(Number(p.max_rollover_hours))}`
                      : "disabled"
                  }
                />
                <Row
                  label="Authorized users"
                  value={p.max_authorized_users === 0 ? "unlimited" : String(p.max_authorized_users)}
                />
                <Row
                  label="Overage / hour"
                  value={
                    p.overage_rate_minor == null ? "branch rate" : formatMoney(p.overage_rate_minor)
                  }
                />
              </dl>
            </article>
          ))}
          {plans.data && plans.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No plans yet.</p>
          ) : null}
        </div>
      </section>

      <section className="mt-10">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-display text-xl font-semibold">Hourly rates</h2>
          <Dialog open={rateOpen} onOpenChange={setRateOpen}>
            <DialogTrigger asChild>
              <Button size="sm" variant="secondary">
                <Plus className="size-4" /> New rate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New hourly rate</DialogTitle>
                <DialogDescription>
                  Leave the branch as "All branches" for the system-wide default.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <Field label="Rate name">
                  <Input
                    value={rateForm.name}
                    onChange={(e) => setRateForm({ ...rateForm, name: e.target.value })}
                  />
                </Field>
                <Field label="Branch">
                  <Select
                    value={rateForm.branch_id}
                    onValueChange={(v) => setRateForm({ ...rateForm, branch_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All branches (default)</SelectItem>
                      {(branches.data ?? []).map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Customer category">
                  <Select
                    value={rateForm.category}
                    onValueChange={(v) =>
                      setRateForm({ ...rateForm, category: v as typeof rateForm.category })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="walk_in">Walk-in</SelectItem>
                      <SelectItem value="subscriber">Subscriber (overage)</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Rate per hour (₦)">
                    <Input
                      type="number"
                      min={0}
                      value={rateForm.rate_per_hour}
                      onChange={(e) => setRateForm({ ...rateForm, rate_per_hour: e.target.value })}
                    />
                  </Field>
                  <Field label="Minimum minutes">
                    <Input
                      type="number"
                      min={0}
                      value={rateForm.minimum_minutes}
                      onChange={(e) => setRateForm({ ...rateForm, minimum_minutes: e.target.value })}
                    />
                  </Field>
                </div>
                <Button
                  className="w-full"
                  disabled={createRate.isPending}
                  onClick={() => createRate.mutate()}
                >
                  Save rate
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="panel mt-4 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-strong text-left text-xs uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Rate</th>
                <th className="px-4 py-3">Scope</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Per hour</th>
                <th className="px-4 py-3">Min. minutes</th>
                <th className="px-4 py-3">Active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {(rates.data ?? []).map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 font-medium">{r.name}</td>
                  <td className="px-4 py-3">
                    {r.branches?.name ? (
                      <Badge variant="outline">{r.branches.name}</Badge>
                    ) : (
                      <Badge variant="secondary">All branches</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {r.category === "subscriber" ? "Subscriber overage" : "Walk-in"}
                  </td>
                  <td className="code-id px-4 py-3">
                    {formatMoney(r.rate_per_hour_minor)}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({fromMinor(r.rate_per_hour_minor).toFixed(2)})
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{r.minimum_minutes}</td>
                  <td className="px-4 py-3">
                    <Switch
                      checked={r.is_active}
                      onCheckedChange={(v) => toggleRate.mutate({ id: r.id, is_active: v })}
                      aria-label="Rate active"
                    />
                  </td>
                </tr>
              ))}
              {rates.data && rates.data.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-muted-foreground">
                    No rates configured yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </AppShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
