import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { useSession } from "@/hooks/use-auth";
import { useActiveBranch } from "@/hooks/use-branch";
import { formatDateTime, formatHours, formatMoney, toMinor } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/customers/$customerId")({
  head: () => ({
    meta: [
      { title: "Customer Record — Waste to Work Console" },
      {
        name: "description",
        content:
          "Full customer record: subscription plan, weekly hours and rollover, authorized users, session history and payments across all branches.",
      },
      { property: "og:title", content: "Customer Record — Waste to Work Console" },
      {
        property: "og:description",
        content: "Subscription hours, authorized users, visit history and payments in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CustomerDetail,
});

function CustomerDetail() {
  const { customerId } = Route.useParams();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const { activeBranchId } = useActiveBranch();
  const [planId, setPlanId] = useState("");
  const [authForm, setAuthForm] = useState({ full_name: "", phone: "", relationship: "" });
  const [payForm, setPayForm] = useState({ amount: "", method: "cash", reference: "" });

  const customer = useQuery({
    queryKey: ["customer", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customers")
        .select("*, branches:registered_branch_id(name)")
        .eq("id", customerId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const subscriptions = useQuery({
    queryKey: ["customer-subs", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_subscriptions")
        .select(
          "*, subscription_plans(name, weekly_hours, price_minor, max_rollover_hours, rollover_enabled), subscription_weekly_allowances(*), subscription_authorized_users(*)",
        )
        .eq("customer_id", customerId)
        .order("started_on", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const plans = useQuery({
    queryKey: ["plans-active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans")
        .select("*")
        .eq("is_active", true)
        .order("price_minor");
      if (error) throw error;
      return data;
    },
  });

  const sessions = useQuery({
    queryKey: ["customer-sessions", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sessions")
        .select("*, branches(name)")
        .eq("customer_id", customerId)
        .order("started_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return data;
    },
  });

  const payments = useQuery({
    queryKey: ["customer-payments", customerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payments")
        .select("*, branches(name)")
        .eq("customer_id", customerId)
        .order("paid_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return data;
    },
  });

  const activeSub = (subscriptions.data ?? []).find((s) => s.status === "active");

  const assignPlan = useMutation({
    mutationFn: async () => {
      if (!planId) throw new Error("Choose a plan");
      const { error } = await supabase.from("customer_subscriptions").insert({
        customer_id: customerId,
        plan_id: planId,
        sold_at_branch_id: activeBranchId,
        created_by: user?.id ?? null,
      });
      if (error) throw error;
      const { error: catError } = await supabase
        .from("customers")
        .update({ category: "subscriber" })
        .eq("id", customerId);
      if (catError) throw catError;
    },
    onSuccess: () => {
      toast.success("Subscription activated");
      queryClient.invalidateQueries({ queryKey: ["customer-subs", customerId] });
      queryClient.invalidateQueries({ queryKey: ["customer", customerId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const addAuthorized = useMutation({
    mutationFn: async () => {
      if (!activeSub) throw new Error("No active subscription");
      if (!authForm.full_name.trim()) throw new Error("Name is required");
      const { error } = await supabase.from("subscription_authorized_users").insert({
        subscription_id: activeSub.id,
        full_name: authForm.full_name.trim(),
        phone: authForm.phone.trim() || null,
        relationship: authForm.relationship.trim() || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Authorized user added");
      setAuthForm({ full_name: "", phone: "", relationship: "" });
      queryClient.invalidateQueries({ queryKey: ["customer-subs", customerId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const recordPayment = useMutation({
    mutationFn: async () => {
      const minor = toMinor(payForm.amount);
      if (minor <= 0) throw new Error("Enter an amount");
      if (!activeBranchId) throw new Error("Select a branch first");
      const { error } = await supabase.from("payments").insert({
        customer_id: customerId,
        branch_id: activeBranchId,
        subscription_id: activeSub?.id ?? null,
        amount_minor: minor,
        method: payForm.method,
        reference: payForm.reference.trim() || null,
        recorded_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment recorded");
      setPayForm({ amount: "", method: "cash", reference: "" });
      queryClient.invalidateQueries({ queryKey: ["customer-payments", customerId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const c = customer.data;
  const thisWeek = activeSub?.subscription_weekly_allowances
    ?.slice()
    .sort((a, b) => b.week_start.localeCompare(a.week_start))[0];

  return (
    <AppShell>
      {c ? (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="code-id text-sm text-primary">{c.customer_code}</p>
              <h1 className="mt-1 text-3xl font-semibold">{c.full_name}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {c.phone ?? "No phone"} · {c.email ?? "No email"} · registered at{" "}
                {c.branches?.name ?? "—"}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant={c.category === "subscriber" ? "default" : "secondary"}>
                {c.category === "subscriber" ? "Subscriber" : "Walk-in"}
              </Badge>
              <Badge variant="outline" className="code-id">
                QR {c.qr_token.slice(0, 8)}
              </Badge>
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            <section className="panel p-6 lg:col-span-2">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-semibold">Subscription</h2>
                {!activeSub ? (
                  <div className="flex gap-2">
                    <Select value={planId} onValueChange={setPlanId}>
                      <SelectTrigger className="w-[190px]">
                        <SelectValue placeholder="Choose plan" />
                      </SelectTrigger>
                      <SelectContent>
                        {(plans.data ?? []).map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name} · {formatMoney(p.price_minor)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button size="sm" onClick={() => assignPlan.mutate()}>
                      Activate
                    </Button>
                  </div>
                ) : null}
              </div>

              {activeSub ? (
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <Metric label="Plan" value={activeSub.subscription_plans?.name ?? "—"} />
                  <Metric
                    label="Weekly allowance"
                    value={formatHours(Number(activeSub.subscription_plans?.weekly_hours ?? 0))}
                  />
                  <Metric
                    label="Hours left this week"
                    value={formatHours(
                      thisWeek
                        ? Number(thisWeek.allowance_hours) +
                            Number(thisWeek.rollover_in_hours) -
                            Number(thisWeek.hours_used)
                        : Number(activeSub.subscription_plans?.weekly_hours ?? 0),
                    )}
                  />
                  <Metric
                    label="Rolled over in"
                    value={formatHours(Number(thisWeek?.rollover_in_hours ?? 0))}
                  />
                  <Metric
                    label="Used this week"
                    value={formatHours(Number(thisWeek?.hours_used ?? 0))}
                  />
                  <Metric label="Started" value={activeSub.started_on} />
                </div>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  No active subscription — sessions bill at the configured walk-in rate.
                </p>
              )}

              {activeSub ? (
                <div className="mt-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">Authorized users</h3>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button size="sm" variant="secondary">
                          Add
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Add authorized user</DialogTitle>
                          <DialogDescription>
                            Someone else permitted to use this subscription's hours at any branch.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="au_name">Full name</Label>
                            <Input
                              id="au_name"
                              value={authForm.full_name}
                              onChange={(e) =>
                                setAuthForm({ ...authForm, full_name: e.target.value })
                              }
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="au_phone">Phone</Label>
                            <Input
                              id="au_phone"
                              value={authForm.phone}
                              onChange={(e) => setAuthForm({ ...authForm, phone: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="au_rel">Relationship</Label>
                            <Input
                              id="au_rel"
                              value={authForm.relationship}
                              onChange={(e) =>
                                setAuthForm({ ...authForm, relationship: e.target.value })
                              }
                            />
                          </div>
                          <Button className="w-full" onClick={() => addAuthorized.mutate()}>
                            Add authorized user
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <ul className="mt-3 divide-y divide-border text-sm">
                    {(activeSub.subscription_authorized_users ?? []).map((a) => (
                      <li key={a.id} className="flex justify-between py-2">
                        <span>{a.full_name}</span>
                        <span className="text-muted-foreground">
                          {a.relationship ?? "—"} · {a.phone ?? "—"}
                        </span>
                      </li>
                    ))}
                    {(activeSub.subscription_authorized_users ?? []).length === 0 ? (
                      <li className="py-2 text-muted-foreground">No authorized users yet.</li>
                    ) : null}
                  </ul>
                </div>
              ) : null}
            </section>

            <section className="panel p-6">
              <h2 className="font-semibold">Record payment</h2>
              <div className="mt-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="amt">Amount</Label>
                  <Input
                    id="amt"
                    type="number"
                    min={0}
                    step="0.01"
                    value={payForm.amount}
                    onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Method</Label>
                  <Select
                    value={payForm.method}
                    onValueChange={(v) => setPayForm({ ...payForm, method: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="transfer">Bank transfer</SelectItem>
                      <SelectItem value="pos">POS / card</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ref">Reference</Label>
                  <Input
                    id="ref"
                    value={payForm.reference}
                    onChange={(e) => setPayForm({ ...payForm, reference: e.target.value })}
                  />
                </div>
                <Button className="w-full" onClick={() => recordPayment.mutate()}>
                  Record payment
                </Button>
              </div>
            </section>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-2">
            <section className="panel p-6">
              <h2 className="font-semibold">Session history</h2>
              <ul className="mt-4 divide-y divide-border text-sm">
                {(sessions.data ?? []).map((s) => (
                  <li key={s.id} className="flex justify-between py-3">
                    <div>
                      <p>{s.branches?.name ?? "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(s.started_at)} · {s.status}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="code-id">{formatMoney(s.amount_due_minor)}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.billable_minutes ?? 0} billed min
                      </p>
                    </div>
                  </li>
                ))}
                {sessions.data && sessions.data.length === 0 ? (
                  <li className="py-3 text-muted-foreground">No sessions yet.</li>
                ) : null}
              </ul>
            </section>

            <section className="panel p-6">
              <h2 className="font-semibold">Payment history</h2>
              <ul className="mt-4 divide-y divide-border text-sm">
                {(payments.data ?? []).map((p) => (
                  <li key={p.id} className="flex justify-between py-3">
                    <div>
                      <p>{p.method}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.branches?.name ?? "—"} · {formatDateTime(p.paid_at)}
                      </p>
                    </div>
                    <p className="code-id">{formatMoney(p.amount_minor)}</p>
                  </li>
                ))}
                {payments.data && payments.data.length === 0 ? (
                  <li className="py-3 text-muted-foreground">No payments yet.</li>
                ) : null}
              </ul>
            </section>
          </div>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">Loading customer…</p>
      )}
    </AppShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-lg font-semibold">{value}</p>
    </div>
  );
}
